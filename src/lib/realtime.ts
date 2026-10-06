/**
 * Canlı eşitleme: aynı öğretmenin başka cihazında (telefon ↔ web) yapılan değişiklikler
 * ekrana yenileme gerektirmeden gelsin diye Supabase Realtime (postgres_changes) aboneliği.
 *
 * Değişiklik olayı veriyi taşımak için değil, "yeniden yükle" sinyali olarak kullanılır: olaylar
 * ~300 ms toplanır, sonra ekranın mevcut yükleme fonksiyonu bir kez çalışır. Uygulama/sekme ön
 * plana dönünce de (arada kaçan olaylar için) yenilenir.
 *
 * Notlar:
 * - INSERT/UPDATE olaylarını Realtime RLS'e göre süzer (yalnızca öğretmenin kendi satırları).
 * - DELETE olaylarında RLS uygulanamaz ve süzgeç çalışmaz; olay yalnızca birincil anahtarı taşır.
 *   Bu yüzden süzgeçli abonelikler DELETE'i dinlemez; işaret/kayıt silmeleri `form_events`
 *   tablosuna düşen (süzülebilir) INSERT olaylarıyla yakalanır.
 */
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Platform, type AppStateStatus } from 'react-native';

import { supabase, supabaseConfigError } from '@/lib/supabase';

/** Yayına (supabase_realtime) eklenen tablolar; göç: 20261009000000_realtime_publication.sql. */
export type RealtimeTable = 'classes' | 'students' | 'forms' | 'form_events';

export type RealtimeEvent = 'INSERT' | 'UPDATE' | 'DELETE' | '*';

export interface RealtimeTableSpec {
  table: RealtimeTable;
  /** Varsayılan '*' (süzgeç verilmişse DELETE olayı gelmez; bkz. dosya başı). */
  event?: RealtimeEvent;
  /** PostgREST biçiminde süzgeç, ör. `form_id=eq.<uuid>`. */
  filter?: string;
  /**
   * true → yalnızca oturumdaki öğretmenin satırları (`teacher_id=eq.<uid>`; `filter` yerine geçer).
   * Kullanıcı bilinene kadar bu tablo dinlenmez; oturum yoksa hiç dinlenmez.
   */
  own?: boolean;
}

export type RealtimePayload = RealtimePostgresChangesPayload<Record<string, unknown>>;

/** Yenilemenin nedeni: veri değişikliği, ön plana dönüş ya da yeniden bağlanma/oturum değişimi. */
export type RefreshReason = 'change' | 'foreground' | 'resync';

export interface UseRealtimeRefreshOptions {
  /** Dinlenecek tablolar; dize verilirse `filter` (varsa) ona uygulanır. */
  tables: readonly (RealtimeTable | RealtimeTableSpec)[];
  filter?: string;
  /** Toplanmış olaylardan sonra bir kez çağrılır. Her çizimde değişebilir (ref'te tutulur). */
  onChange: (reason: RefreshReason) => void;
  /** false → abone olmaz, ön plan dinlemez (ör. ekran odakta değil). Varsayılan true. */
  enabled?: boolean;
  /** true dönerse olay yok sayılır (ör. cihazın kendi yazdığı satırın yankısı). */
  ignore?: (payload: RealtimePayload) => boolean;
  /** Olay toplama süresi (ms). Varsayılan 300. */
  debounceMs?: number;
  /** Kanal adı öneki (hata ayıklama için). */
  name?: string;
}

export const REALTIME_DEBOUNCE_MS = 300;

let channelCounter = 0;

/** Her bağlama için benzersiz kanal adı (aynı ekran iki kez açıksa kanallar karışmasın). */
export function nextChannelName(prefix = 'live'): string {
  channelCounter += 1;
  return `${prefix}:${channelCounter}:${Date.now().toString(36)}`;
}

/**
 * Süzgeci dize tablolara uygular, `own` tabloları öğretmen süzgecine çevirir (kullanıcı yoksa
 * çıkarır); sırayı ve içeriği kararlı bir anahtara çevirir.
 */
export function normalizeSpecs(
  tables: readonly (RealtimeTable | RealtimeTableSpec)[],
  filter?: string,
  userId?: string | null,
): RealtimeTableSpec[] {
  const out: RealtimeTableSpec[] = [];
  for (const t of tables) {
    const spec: RealtimeTableSpec = typeof t === 'string' ? { table: t, filter } : t;
    if (spec.own && !userId) continue;
    const resolved = spec.own ? `teacher_id=eq.${userId}` : spec.filter;
    out.push({ table: spec.table, event: spec.event ?? '*', ...(resolved ? { filter: resolved } : {}) });
  }
  return out;
}

/** Olaydaki satır kimliği (DELETE'te eski satırın, diğerlerinde yeni satırın `id`'si). */
export function payloadRowId(payload: RealtimePayload): string | null {
  const row = (payload.eventType === 'DELETE' ? payload.old : payload.new) as Record<string, unknown> | undefined;
  const id = row?.id;
  return typeof id === 'string' || typeof id === 'number' ? String(id) : null;
}

/** Realtime kullanılabilir mi (yapılandırma tamam ve istemci gerçek). Testlerde çoğunlukla false. */
export function realtimeAvailable(): boolean {
  const client = supabase as unknown as { channel?: unknown } | undefined;
  return !supabaseConfigError && typeof client?.channel === 'function';
}

interface AuthUser {
  /** Oturum kullanıcısı; undefined → henüz bilinmiyor, null → oturum yok. */
  userId: string | null | undefined;
  /** Kullanıcı değişince artar; abonelikler yeni oturumla yeniden kurulur. */
  epoch: number;
}

function useAuthUser(enabled: boolean): AuthUser {
  const [epoch, setEpoch] = useState(0);
  const [userId, setUserId] = useState<string | null | undefined>(undefined);
  const userRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    if (!enabled || !realtimeAvailable()) return;
    const auth = (supabase as unknown as { auth?: typeof supabase.auth }).auth;
    if (typeof auth?.onAuthStateChange !== 'function') return;
    const { data } = auth.onAuthStateChange((_event, session) => {
      const userId = session?.user?.id ?? null;
      const previous = userRef.current;
      userRef.current = userId;
      setUserId(userId);
      // İlk bildirim (INITIAL_SESSION) yalnızca başlangıç değerini kaydeder.
      if (previous !== undefined && previous !== userId) setEpoch((n) => n + 1);
    });
    return () => data.subscription.unsubscribe();
  }, [enabled]);

  return { userId, epoch };
}

/**
 * Tablolardaki değişikliklerde (ve ön plana dönüşte) `onChange`'i toplu olarak çağırır.
 * Bağlantı koptuktan sonra yeniden abone olunduğunda ya da oturum değiştiğinde de bir kez çağırır
 * (arada kaçan olaylar için). Ayrılınca kanal kapatılır, zamanlayıcı temizlenir.
 */
export function useRealtimeRefresh(options: UseRealtimeRefreshOptions): void {
  const { tables, filter, enabled = true, debounceMs = REALTIME_DEBOUNCE_MS, name = 'live' } = options;
  const onChangeRef = useRef(options.onChange);
  const ignoreRef = useRef(options.ignore);
  const debounceRef = useRef(debounceMs);
  useEffect(() => {
    onChangeRef.current = options.onChange;
    ignoreRef.current = options.ignore;
    debounceRef.current = debounceMs;
  });

  const { userId, epoch } = useAuthUser(enabled);
  // Öğretmen süzgeçli tablo varken kullanıcı bilinmeden abone olunmaz (gereksiz yeniden abonelik).
  const waitingForUser = userId === undefined && tables.some((t) => typeof t !== 'string' && t.own);
  const specKey = JSON.stringify(normalizeSpecs(tables, filter, userId));

  // Toplama zamanlayıcısı; en "güçlü" neden korunur (change < resync).
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reasonRef = useRef<RefreshReason | null>(null);
  const schedule = useCallback((reason: RefreshReason) => {
    if (reasonRef.current === null || reasonRef.current === 'change') reasonRef.current = reason;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      const fired = reasonRef.current ?? reason;
      reasonRef.current = null;
      onChangeRef.current(fired);
    }, debounceRef.current);
  }, []);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = null;
      reasonRef.current = null;
    },
    [],
  );

  // Postgres değişiklik aboneliği.
  useEffect(() => {
    if (!enabled || waitingForUser || !realtimeAvailable()) return;
    const specs = JSON.parse(specKey) as RealtimeTableSpec[];
    if (specs.length === 0) return;
    let channel = supabase.channel(nextChannelName(name));
    for (const spec of specs) {
      channel = channel.on(
        'postgres_changes',
        {
          event: spec.event ?? '*',
          schema: 'public',
          table: spec.table,
          ...(spec.filter ? { filter: spec.filter } : {}),
        } as { event: '*'; schema: string; table: string; filter?: string },
        (payload: RealtimePayload) => {
          if (ignoreRef.current?.(payload)) return;
          schedule('change');
        },
      );
    }
    let subscribedOnce = false;
    let lost = false;
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        // Kopup yeniden bağlandıysak arada kaçan değişiklikler için bir kez yenile.
        if (subscribedOnce && lost) schedule('resync');
        subscribedOnce = true;
        lost = false;
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
        lost = true;
      }
    });
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [enabled, waitingForUser, specKey, name, epoch, schedule]);

  // Oturum değişti: yeni oturumun verisini yükle.
  useEffect(() => {
    if (epoch > 0 && enabled) schedule('resync');
  }, [epoch, enabled, schedule]);

  // Ön plana dönüş (yerelde AppState, webde sekme görünürlüğü).
  useEffect(() => {
    if (!enabled) return;
    if (Platform.OS === 'web') {
      if (typeof document === 'undefined' || typeof document.addEventListener !== 'function') return;
      const onVisibility = () => {
        if (document.visibilityState === 'visible') schedule('foreground');
      };
      document.addEventListener('visibilitychange', onVisibility);
      return () => document.removeEventListener('visibilitychange', onVisibility);
    }
    let previous: AppStateStatus = AppState.currentState;
    const subscription = AppState.addEventListener('change', (next) => {
      if (next === 'active' && previous !== 'active') schedule('foreground');
      previous = next;
    });
    return () => subscription.remove();
  }, [enabled, schedule]);
}
