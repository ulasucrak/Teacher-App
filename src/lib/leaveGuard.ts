import { Alert, type AlertButton } from 'react-native';

/**
 * Kaydedilmemiş değişiklik koruması — ortak parçalar.
 *
 * `useLeaveGuard` (native: `beforeRemove` + Alert) ve `useLeaveGuard.web` (ek olarak tarayıcı
 * geri/ileri, yenileme ve sekme kapatma) bu dosyadaki iletişim kutusunu ve web denetleyicisini
 * kullanır. Denetleyici React'ten bağımsızdır; testte sahte `window` ile sınanır.
 */

/** Çıkış onayı metinleri (ekranın o anki durumuna göre çağrı anında üretilir). */
export interface LeavePrompt {
  title: string;
  message?: string;
  /** Sayfada kalma düğmesi; varsayılan "Vazgeç". */
  cancelText?: string;
  /** Çıkış (yıkıcı) düğmesi, ör. "Çık", "Kaydetmeden çık". */
  confirmText: string;
}

export interface LeaveGuardOptions {
  /** Kaydedilmemiş veri var mı? Yalnızca `true` iken sorulur. */
  dirty: boolean;
  /** Onay metinleri; her soruşta yeniden çağrılır (ör. güncel değişiklik sayısı için). */
  prompt: () => LeavePrompt;
}

export interface LeaveGuard {
  /**
   * Korumayı kalıcı olarak kapatıp `navigate`'i çalıştırır (kaydettikten sonra çıkış gibi).
   * Web'de önce eklenen geçmiş kaydı temizlenir; `navigate` bu yüzden bir sonraki adımda çalışabilir.
   */
  leave: (navigate: () => void) => void;
}

export const DEFAULT_CANCEL_TEXT = 'Vazgeç';

/** Uygulamanın Alert'i ile (web'de uygulama içi AlertDialog) çıkış onayı sorar. */
export function showLeavePrompt(prompt: LeavePrompt, onConfirm: () => void, onDismiss?: () => void): void {
  const cancel: AlertButton = { text: prompt.cancelText ?? DEFAULT_CANCEL_TEXT, style: 'cancel' };
  const confirm: AlertButton = {
    text: prompt.confirmText,
    style: 'destructive',
    onPress: () => {
      onDismiss?.();
      onConfirm();
    },
  };
  if (!onDismiss) {
    // Native: önceki Alert çağrısıyla birebir aynı (Android'de dışarı dokunma kapatmaz).
    Alert.alert(prompt.title, prompt.message, [cancel, confirm]);
    return;
  }
  Alert.alert(prompt.title, prompt.message, [{ ...cancel, onPress: onDismiss }, confirm], {
    cancelable: true,
    onDismiss,
  });
}

// ---------------------------------------------------------------------------- web

/** Geçmiş kaydına yazılan işaret anahtarı (expo-router'ın `{ id }` durumunun yanına eklenir). */
export const SENTINEL_KEY = '__leaveGuard';

/** Kendi `history.back()` çağrımızın popstate'i gelmezse beklemenin üst sınırı (ms). */
export const SWALLOW_TIMEOUT_MS = 400;

/** Denetleyicinin kullandığı `window` alt kümesi (testte sahtesi verilir). */
export interface GuardWindow {
  history: {
    readonly state: unknown;
    pushState(data: unknown, unused: string, url?: string | null): void;
    replaceState(data: unknown, unused: string, url?: string | null): void;
    back(): void;
  };
  location: { readonly href: string };
  addEventListener(type: string, listener: (event: Event) => void, options?: boolean | AddEventListenerOptions): void;
  removeEventListener(type: string, listener: (event: Event) => void, options?: boolean | EventListenerOptions): void;
}

export interface WebLeaveGuard {
  /** Korumayı açar: işaret kaydı eklenir, popstate ve beforeunload dinlenir. */
  arm(): void;
  /** Korumayı kapatır; işaret kaydı üstteyse geri alınır (popstate uygulamaya ulaşmaz). */
  disarm(): Promise<void>;
  /** Kalıcı kapatma (ekrandan çıkış). */
  destroy(): void;
  readonly armed: boolean;
}

export interface WebLeaveGuardHandlers {
  /** Korunan ekrandayken tarayıcıda geri gidildi: işaret kaydı yeniden eklendi, onay sorulmalı. */
  onLeaveAttempt: () => void;
}

let tokenSeq = 0;

function stateObject(state: unknown): Record<string, unknown> {
  return state && typeof state === 'object' ? { ...(state as Record<string, unknown>) } : {};
}

/**
 * Tarayıcı geçmişi için çıkış koruması.
 *
 * Koruma açıkken geçerli kaydın üstüne aynı adresli bir işaret kaydı eklenir. Geri tuşu bu
 * işareti tüketir; popstate (yakalama evresinde, expo-router'dan önce) durdurulur, işaret yeniden
 * eklenir ve `onLeaveAttempt` çağrılır. Böylece adres ve ekran değişmeden onay sorulabilir.
 * `beforeunload` ile yenileme / sekme kapatma da tarayıcı uyarısı gösterir.
 */
export function createWebLeaveGuard(win: GuardWindow, handlers: WebLeaveGuardHandlers): WebLeaveGuard {
  tokenSeq += 1;
  const token = `${Date.now().toString(36)}-${tokenSeq}`;

  let armed = false;
  let destroyed = false;
  let listening = false;
  let guardHref = '';
  let baseState: Record<string, unknown> = {};
  /** Kendi `history.back()` çağrımızın popstate'ini bekleyen çözücü. */
  let swallow: (() => void) | null = null;
  /** arm/disarm sırayla çalışır (geri alma eşzamansız). */
  let queue: Promise<void> = Promise.resolve();

  const isSentinel = (state: unknown) =>
    Boolean(state && typeof state === 'object' && (state as Record<string, unknown>)[SENTINEL_KEY] === token);

  const onPopState = (event: Event) => {
    if (swallow) {
      event.stopImmediatePropagation();
      swallow();
      return;
    }
    if (!armed) return;
    // İleri tuşuyla yeniden işaret kaydına gelindi: ekran zaten bu.
    if (isSentinel(win.history.state)) return;
    // Geri gidildi: uygulama gezinmesin, işaret yeniden eklensin, onay sorulsun.
    event.stopImmediatePropagation();
    win.history.pushState({ ...baseState, [SENTINEL_KEY]: token }, '', guardHref);
    handlers.onLeaveAttempt();
  };

  const onBeforeUnload = (event: Event) => {
    if (!armed) return;
    event.preventDefault();
    // Eski tarayıcılar için.
    (event as BeforeUnloadEvent).returnValue = '';
  };

  const listen = () => {
    if (listening) return;
    listening = true;
    // Yakalama evresi: hedefteki (window) dinleyiciler arasında expo-router'ınkinden önce çalışır.
    win.addEventListener('popstate', onPopState, true);
    win.addEventListener('beforeunload', onBeforeUnload);
  };

  const unlisten = () => {
    if (!listening) return;
    listening = false;
    win.removeEventListener('popstate', onPopState, true);
    win.removeEventListener('beforeunload', onBeforeUnload);
  };

  const doArm = () => {
    if (armed || destroyed) return;
    listen();
    guardHref = win.location.href;
    const current = win.history.state;
    if (isSentinel(current)) {
      // Üstteki ekrandan geri dönüldü; işaret kaydı hâlâ yerinde.
      baseState = stateObject(current);
      delete baseState[SENTINEL_KEY];
    } else {
      baseState = stateObject(current);
      win.history.pushState({ ...baseState, [SENTINEL_KEY]: token }, '', guardHref);
    }
    armed = true;
  };

  const doDisarm = (): Promise<void> => {
    armed = false;
    if (!isSentinel(win.history.state)) {
      if (destroyed) unlisten();
      return Promise.resolve();
    }
    const href = win.location.href;
    return new Promise<void>((resolve) => {
      let timer: ReturnType<typeof setTimeout> | null = null;
      const finish = () => {
        if (timer !== null) clearTimeout(timer);
        swallow = null;
        // İşaretin adresi bu arada değiştiyse (replaceState) adres korunur.
        if (win.location.href !== href) win.history.replaceState(win.history.state, '', href);
        if (destroyed) unlisten();
        resolve();
      };
      swallow = finish;
      timer = setTimeout(finish, SWALLOW_TIMEOUT_MS);
      win.history.back();
    });
  };

  /** Sıradaki / çalışan işlem sayısı; sıfırsa `arm` hemen çalışır. */
  let pending = 0;
  const schedule = (op: () => void | Promise<void>): Promise<void> => {
    pending += 1;
    const run = async () => {
      try {
        await op();
      } finally {
        pending -= 1;
      }
    };
    queue = queue.then(run, run);
    return queue;
  };

  return {
    arm() {
      if (destroyed) return;
      if (pending === 0) doArm();
      else void schedule(doArm);
    },
    disarm() {
      if (pending === 0 && !armed) return Promise.resolve();
      return schedule(doDisarm);
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      if (pending === 0 && !armed) {
        unlisten();
        return;
      }
      void schedule(doDisarm);
    },
    get armed() {
      return armed;
    },
  };
}
