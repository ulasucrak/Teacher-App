import { act, renderHook } from '@testing-library/react-native';
import * as Haptics from 'expo-haptics';
import { createElement, type ReactNode } from 'react';
import { AppState, Platform, type AppStateStatus } from 'react-native';

import { Providers } from '@/features/forms/test-utils';
import * as history from '@/features/history';
import {
  DEFAULT_LIVE_TABLES,
  dataMentionsId,
  isUnrelatedDelete,
  useRemoteData,
} from '@/features/classes/useRemoteData';
import { applyOps, msUntilNextDay, reconcileOps, type PendingOp } from '@/features/formview/board';
import { event, plusMinusForm, tally } from '@/features/formview/fixtures';
import { appendPage, mergeTimeline, useHistoryData } from '@/features/formview/useHistoryData';
import { markEchoKey, useMarkBoard } from '@/features/formview/useMarkBoard';
import type { FormMarkRow } from '@/types/database';

import {
  nextChannelName,
  normalizeSpecs,
  payloadRowId,
  useRealtimeRefresh,
  type RealtimePayload,
} from './realtime';

// --- Supabase istemcisi taklidi ------------------------------------------------

interface FakeChannel {
  name: string;
  handlers: { config: { event: string; table: string; filter?: string }; callback: (p: RealtimePayload) => void }[];
  status?: (status: string) => void;
  on: jest.Mock;
  subscribe: jest.Mock;
}

type AuthCallback = (event: string, session: { user: { id: string } } | null) => void;

const mockRt = {
  channels: [] as FakeChannel[],
  removed: [] as FakeChannel[],
  auth: [] as AuthCallback[],
  /** onAuthStateChange'in ilk bildirimi (INITIAL_SESSION); undefined → bildirim yok. */
  session: { user: { id: 'u1' } } as { user: { id: string } } | null | undefined,
};

jest.mock('@/lib/supabase', () => ({
  supabaseConfigError: null,
  supabase: {
    channel: jest.fn((name: string) => {
      const channel: FakeChannel = {
        name,
        handlers: [],
        on: jest.fn((_type: string, config: FakeChannel['handlers'][number]['config'], callback: (p: RealtimePayload) => void) => {
          channel.handlers.push({ config, callback });
          return channel;
        }),
        subscribe: jest.fn((cb: (status: string) => void) => {
          channel.status = cb;
          cb('SUBSCRIBED');
          return channel;
        }),
      };
      mockRt.channels.push(channel);
      return channel;
    }),
    removeChannel: jest.fn((channel: FakeChannel) => {
      mockRt.removed.push(channel);
      return Promise.resolve('ok');
    }),
    auth: {
      onAuthStateChange: jest.fn((cb: AuthCallback) => {
        mockRt.auth.push(cb);
        if (mockRt.session !== undefined) cb('INITIAL_SESSION', mockRt.session);
        return {
          data: {
            subscription: {
              unsubscribe: () => {
                mockRt.auth = mockRt.auth.filter((x) => x !== cb);
              },
            },
          },
        };
      }),
    },
  },
}));

jest.mock('expo-router', () => {
  const { useEffect } = jest.requireActual<typeof import('react')>('react');
  return { useFocusEffect: (effect: () => void | (() => void)) => useEffect(effect, [effect]) };
});

jest.mock('@/features/history/api', () => {
  const actual = jest.requireActual<typeof import('@/features/history/api')>('@/features/history/api');
  return {
    ...actual,
    getTallies: jest.fn(),
    getFormSummary: jest.fn(),
    listHistory: jest.fn(),
    addMark: jest.fn(),
    removeMark: jest.fn(),
    undoLastMark: jest.fn(),
  };
});

const mockedHistory = jest.mocked(history);

let appStateListeners: ((state: AppStateStatus) => void)[] = [];

beforeEach(() => {
  jest.useFakeTimers();
  mockRt.channels = [];
  mockRt.removed = [];
  mockRt.auth = [];
  mockRt.session = { user: { id: 'u1' } };
  appStateListeners = [];
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, listener) => {
    appStateListeners.push(listener as (state: AppStateStatus) => void);
    return {
      remove: () => {
        appStateListeners = appStateListeners.filter((l) => l !== listener);
      },
    } as ReturnType<typeof AppState.addEventListener>;
  });
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
  jest.clearAllMocks();
});

function payload(table: string, row: Record<string, unknown> = {}, eventType = 'INSERT'): RealtimePayload {
  return {
    schema: 'public',
    table,
    commit_timestamp: '',
    eventType,
    new: eventType === 'DELETE' ? {} : row,
    old: eventType === 'DELETE' ? row : {},
    errors: [],
  } as unknown as RealtimePayload;
}

function emit(channel: FakeChannel, table: string, row: Record<string, unknown> = {}, eventType = 'INSERT') {
  for (const h of channel.handlers) {
    if (h.config.table !== table) continue;
    // Gerçek Realtime gibi: olay türü eşleşmeli; süzgeçli abonelik DELETE almaz.
    if (h.config.event !== '*' && h.config.event !== eventType) continue;
    if (eventType === 'DELETE' && h.config.filter) continue;
    h.callback(payload(table, row, eventType));
  }
}

async function advance(ms: number) {
  await act(async () => {
    jest.advanceTimersByTime(ms);
  });
}

// --- Yardımcılar ---------------------------------------------------------------

describe('normalizeSpecs / nextChannelName', () => {
  it('applies the shared filter to plain table names and keeps explicit specs', () => {
    expect(normalizeSpecs(['students', { table: 'form_events', event: 'INSERT', filter: 'form_id=eq.f' }], 'class_id=eq.c')).toEqual([
      { table: 'students', event: '*', filter: 'class_id=eq.c' },
      { table: 'form_events', event: 'INSERT', filter: 'form_id=eq.f' },
    ]);
    expect(normalizeSpecs(['classes'])).toEqual([{ table: 'classes', event: '*' }]);
  });

  it('turns own tables into a teacher filter and drops them without a user', () => {
    expect(normalizeSpecs([{ table: 'classes', own: true }, { table: 'classes', event: 'DELETE' }], undefined, 'u1')).toEqual([
      { table: 'classes', event: '*', filter: 'teacher_id=eq.u1' },
      { table: 'classes', event: 'DELETE' },
    ]);
    expect(normalizeSpecs([{ table: 'classes', own: true }], undefined, null)).toEqual([]);
  });

  it('reads the row id from new rows and from deleted rows', () => {
    expect(payloadRowId(payload('classes', { id: 'c1' }))).toBe('c1');
    expect(payloadRowId(payload('classes', { id: 'c2' }, 'DELETE'))).toBe('c2');
    expect(payloadRowId(payload('classes', {}))).toBeNull();
  });

  it('produces unique channel names', () => {
    expect(nextChannelName('x')).not.toBe(nextChannelName('x'));
  });
});

// --- useRealtimeRefresh --------------------------------------------------------

describe('useRealtimeRefresh', () => {
  it('subscribes one channel per mount with every table and filter', async () => {
    const onChange = jest.fn();
    await renderHook(() =>
      useRealtimeRefresh({ tables: ['students', { table: 'form_events', event: 'INSERT' }], filter: 'class_id=eq.c1', onChange }),
    );
    await renderHook(() => useRealtimeRefresh({ tables: ['classes'], onChange }));
    expect(mockRt.channels).toHaveLength(2);
    expect(mockRt.channels[0]?.name).not.toBe(mockRt.channels[1]?.name);
    expect(mockRt.channels[0]?.handlers.map((h) => h.config)).toEqual([
      { event: '*', schema: 'public', table: 'students', filter: 'class_id=eq.c1' },
      // Açık tanımlı tabloya ortak süzgeç uygulanmaz.
      { event: 'INSERT', schema: 'public', table: 'form_events' },
    ]);
    expect(mockRt.channels[0]?.subscribe).toHaveBeenCalledTimes(1);
  });

  it('debounces a burst of changes into a single refresh', async () => {
    const onChange = jest.fn();
    await renderHook(() => useRealtimeRefresh({ tables: ['classes'], onChange }));
    const channel = mockRt.channels[0] as FakeChannel;
    emit(channel, 'classes');
    await advance(100);
    emit(channel, 'classes');
    emit(channel, 'classes');
    await advance(299);
    expect(onChange).not.toHaveBeenCalled();
    await advance(1);
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith('change');
  });

  it('skips ignored payloads (own echoes)', async () => {
    const onChange = jest.fn();
    await renderHook(() =>
      useRealtimeRefresh({ tables: ['form_events'], onChange, ignore: (p) => (p.new as { mark_id?: string }).mark_id === 'mine' }),
    );
    const channel = mockRt.channels[0] as FakeChannel;
    emit(channel, 'form_events', { mark_id: 'mine' });
    await advance(500);
    expect(onChange).not.toHaveBeenCalled();
    emit(channel, 'form_events', { mark_id: 'other' });
    await advance(500);
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('removes the channel and cancels a pending refresh on unmount', async () => {
    const onChange = jest.fn();
    const hook = await renderHook(() => useRealtimeRefresh({ tables: ['classes'], onChange }));
    const channel = mockRt.channels[0] as FakeChannel;
    emit(channel, 'classes');
    await hook.unmount();
    await advance(1000);
    expect(mockRt.removed).toContain(channel);
    expect(onChange).not.toHaveBeenCalled();
    expect(appStateListeners).toHaveLength(0);
    expect(mockRt.auth).toHaveLength(0);
  });

  it('does nothing while disabled and subscribes once enabled', async () => {
    const onChange = jest.fn();
    const hook = await renderHook(
      ({ enabled }: { enabled: boolean }) => useRealtimeRefresh({ tables: ['classes'], onChange, enabled }),
      { initialProps: { enabled: false } },
    );
    expect(mockRt.channels).toHaveLength(0);
    expect(appStateListeners).toHaveLength(0);
    await hook.rerender({ enabled: true });
    expect(mockRt.channels).toHaveLength(1);
  });

  it('refreshes when the app returns to the foreground', async () => {
    const onChange = jest.fn();
    await renderHook(() => useRealtimeRefresh({ tables: ['classes'], onChange }));
    await act(async () => {
      appStateListeners.forEach((l) => l('background'));
      appStateListeners.forEach((l) => l('active'));
    });
    await advance(300);
    expect(onChange).toHaveBeenCalledWith('foreground');
  });

  it('refreshes on web when the tab becomes visible', async () => {
    const original = Platform.OS;
    Object.defineProperty(Platform, 'OS', { configurable: true, get: () => 'web' });
    const listeners: (() => void)[] = [];
    const fakeDocument = {
      visibilityState: 'visible',
      addEventListener: jest.fn((_: string, l: () => void) => listeners.push(l)),
      removeEventListener: jest.fn(),
    };
    (globalThis as { document?: unknown }).document = fakeDocument;
    try {
      const onChange = jest.fn();
      const hook = await renderHook(() => useRealtimeRefresh({ tables: ['classes'], onChange }));
      expect(appStateListeners).toHaveLength(0);
      await act(async () => listeners.forEach((l) => l()));
      await advance(300);
      expect(onChange).toHaveBeenCalledWith('foreground');
      await hook.unmount();
      expect(fakeDocument.removeEventListener).toHaveBeenCalled();
    } finally {
      delete (globalThis as { document?: unknown }).document;
      Object.defineProperty(Platform, 'OS', { configurable: true, get: () => original });
    }
  });

  it('waits for the signed-in user before subscribing own tables', async () => {
    mockRt.session = undefined;
    await renderHook(() => useRealtimeRefresh({ tables: [{ table: 'classes', own: true }], onChange: jest.fn() }));
    expect(mockRt.channels).toHaveLength(0);
    await act(async () => mockRt.auth.forEach((cb) => cb('INITIAL_SESSION', { user: { id: 'u9' } })));
    expect(mockRt.channels).toHaveLength(1);
    expect(mockRt.channels[0]?.handlers[0]?.config.filter).toBe('teacher_id=eq.u9');
  });

  it('re-subscribes and refreshes when the signed-in user changes', async () => {
    const onChange = jest.fn();
    await renderHook(() => useRealtimeRefresh({ tables: ['classes'], onChange }));
    await act(async () => mockRt.auth.forEach((cb) => cb('INITIAL_SESSION', { user: { id: 'u1' } })));
    await act(async () => mockRt.auth.forEach((cb) => cb('TOKEN_REFRESHED', { user: { id: 'u1' } })));
    expect(mockRt.channels).toHaveLength(1);
    await act(async () => mockRt.auth.forEach((cb) => cb('SIGNED_IN', { user: { id: 'u2' } })));
    expect(mockRt.channels).toHaveLength(2);
    expect(mockRt.removed).toContain(mockRt.channels[0]);
    await advance(300);
    expect(onChange).toHaveBeenCalledWith('resync');
  });

  it('refreshes after the channel reconnects (missed events)', async () => {
    const onChange = jest.fn();
    await renderHook(() => useRealtimeRefresh({ tables: ['classes'], onChange }));
    const channel = mockRt.channels[0] as FakeChannel;
    await act(async () => {
      channel.status?.('CHANNEL_ERROR');
      channel.status?.('SUBSCRIBED');
    });
    await advance(300);
    expect(onChange).toHaveBeenCalledWith('resync');
  });
});

// --- İşaretleme tahtası birleştirme --------------------------------------------

describe('board op helpers', () => {
  const rows = [tally({ studentId: 's1', fullName: 'A', counts: { arti: 2 }, dayCounts: { arti: 1 } })];
  const op = (key: number, delta: 1 | -1, issuedAt: number, settledAt: number | null): PendingOp => ({
    key,
    studentId: 's1',
    optionKey: 'arti',
    delta,
    issuedAt,
    settledAt,
  });

  it('applies pending ops on top of the server snapshot', () => {
    expect(applyOps(rows, [])).toBe(rows);
    expect(applyOps(rows, [op(1, 1, 1, null), op(2, 1, 2, 3)])[0]?.counts).toEqual({ arti: 4 });
    expect(applyOps(rows, [op(1, -1, 1, null)])[0]?.dayCounts).toEqual({});
  });

  it('drops ops settled before the snapshot started and flags the rest as ambiguous', () => {
    const ops = [op(1, 1, 1, 2), op(2, 1, 3, null), op(3, 1, 4, 6)];
    const { kept, ambiguous } = reconcileOps(ops, 5);
    expect(kept.map((o) => o.key)).toEqual([2, 3]);
    expect(ambiguous).toBe(true);
    expect(reconcileOps([op(1, 1, 1, 2)], 5)).toEqual({ kept: [], ambiguous: false });
  });

  it('computes the time until local midnight', () => {
    expect(msUntilNextDay(new Date(2026, 9, 6, 23, 59, 0))).toBe(61_000);
    expect(msUntilNextDay(new Date(2026, 9, 6, 23, 59, 59, 999))).toBe(1001);
    expect(msUntilNextDay(new Date(2026, 9, 7, 0, 0, 0, 500))).toBe(86_400_500);
  });
});

function wrapper({ children }: { children: ReactNode }) {
  return createElement(Providers, null, children);
}

const savedMark = (id: string, option_key = 'arti'): FormMarkRow => ({
  id,
  form_id: 'f2',
  student_id: 's1',
  teacher_id: 't',
  option_key,
  mark_date: '',
  marked_at: '',
  note: null,
  created_at: '',
});

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe('useMarkBoard', () => {
  const server = (arti: number) => [
    tally({ studentId: 's1', fullName: 'Ali', number: '1', counts: { arti }, dayCounts: { arti } }),
  ];

  async function renderBoard() {
    const hook = await renderHook(() => useMarkBoard(plusMinusForm), { wrapper });
    await act(async () => hook.result.current.reload());
    return hook;
  }

  const count = (hook: Awaited<ReturnType<typeof renderBoard>>) => hook.result.current.rows?.[0]?.counts.arti ?? 0;

  it('does not double-roll back a failed mark when a reload ran while it was saving', async () => {
    mockedHistory.getTallies.mockResolvedValue(server(1));
    const save = deferred<FormMarkRow>();
    mockedHistory.addMark.mockReturnValue(save.promise);
    const hook = await renderBoard();
    expect(count(hook)).toBe(1);

    await act(async () => hook.result.current.mark('s1', 'arti'));
    expect(count(hook)).toBe(2);

    // Başka cihazdan bir değişiklik: sunucu görüntüsü (bu işaret henüz yok) gelir.
    await act(async () => hook.result.current.reload());
    expect(count(hook)).toBe(2);

    await act(async () => save.reject(new Error('network')));
    expect(count(hook)).toBe(1);
  });

  it('keeps a confirmed mark once and resyncs after an ambiguous reload', async () => {
    mockedHistory.getTallies.mockResolvedValue(server(1));
    const save = deferred<FormMarkRow>();
    mockedHistory.addMark.mockReturnValue(save.promise);
    const hook = await renderBoard();

    await act(async () => hook.result.current.mark('s1', 'arti'));
    // Yükleme sırasında işaret sunucuya yazılmış: görüntü onu içeriyor.
    mockedHistory.getTallies.mockResolvedValue(server(2));
    await act(async () => hook.result.current.reload());
    expect(mockedHistory.getTallies).toHaveBeenCalledTimes(2);
    expect(count(hook)).toBe(3); // belirsiz: kısa süre fazla görünebilir

    await act(async () => save.resolve(savedMark('m1')));
    // İşlem bitti → belirsizliği gidermek için yeniden yüklenir; sayı iki kez sayılmaz.
    expect(mockedHistory.getTallies).toHaveBeenCalledTimes(3);
    expect(count(hook)).toBe(2);
  });

  it('ignores the realtime echo of its own mark but reloads for other devices', async () => {
    mockedHistory.getTallies.mockResolvedValue(server(0));
    mockedHistory.addMark.mockResolvedValue(savedMark('m-own'));
    const hook = await renderBoard();
    await act(async () => hook.result.current.mark('s1', 'arti'));
    const channel = mockRt.channels.find((c) => c.handlers.some((h) => h.config.table === 'form_events')) as FakeChannel;
    expect(channel.handlers[0]?.config).toEqual({ event: 'INSERT', schema: 'public', table: 'form_events', filter: 'form_id=eq.f2' });
    const calls = mockedHistory.getTallies.mock.calls.length;

    emit(channel, 'form_events', { kind: 'mark_added', mark_id: 'm-own' });
    await advance(400);
    expect(mockedHistory.getTallies).toHaveBeenCalledTimes(calls);

    mockedHistory.getTallies.mockResolvedValue(server(3));
    emit(channel, 'form_events', { kind: 'mark_added', mark_id: 'm-other' });
    await advance(400);
    expect(mockedHistory.getTallies).toHaveBeenCalledTimes(calls + 1);
    expect(count(hook)).toBe(3);
  });

  it('rolls "today" over at midnight and on the next mark after the day changed', async () => {
    jest.setSystemTime(new Date(2026, 9, 6, 23, 59, 0));
    mockedHistory.getTallies.mockResolvedValue(server(1));
    mockedHistory.addMark.mockResolvedValue(savedMark('m1'));
    const hook = await renderBoard();
    expect(hook.result.current.today).toBe('2026-10-06');

    await advance(61_000);
    expect(hook.result.current.today).toBe('2026-10-07');
    expect(mockedHistory.getTallies).toHaveBeenLastCalledWith('f2', { day: '2026-10-07' });

    // Zamanlayıcı kaçsa bile (uyku) işaretleme yeni günü fark eder.
    jest.setSystemTime(new Date(2026, 9, 8, 9, 0, 0));
    await act(async () => hook.result.current.mark('s1', 'arti'));
    expect(mockedHistory.addMark).toHaveBeenLastCalledWith(expect.objectContaining({ markDate: '2026-10-08' }));
    expect(hook.result.current.today).toBe('2026-10-08');
  });

  it('skips haptics on web', async () => {
    const original = Platform.OS;
    Object.defineProperty(Platform, 'OS', { configurable: true, get: () => 'web' });
    try {
      mockedHistory.getTallies.mockResolvedValue(server(0));
      mockedHistory.addMark.mockResolvedValue(savedMark('m1'));
      const hook = await renderBoard();
      await act(async () => hook.result.current.mark('s1', 'arti'));
      expect(Haptics.impactAsync).not.toHaveBeenCalled();
      expect(count(hook)).toBe(1);
    } finally {
      Object.defineProperty(Platform, 'OS', { configurable: true, get: () => original });
    }
  });
});

describe('useMarkBoard echoes', () => {
  it('keys echoes by event kind and mark id', () => {
    expect(markEchoKey(payload('form_events', { kind: 'mark_added', mark_id: 'm1' }))).toBe('mark_added:m1');
    expect(markEchoKey(payload('form_events', { kind: 'entry_updated', mark_id: null }))).toBeNull();
  });

  it('reloads when another device undoes a mark this device added', async () => {
    mockedHistory.getTallies.mockResolvedValue([tally({ studentId: 's1', fullName: 'Ali', counts: { arti: 0 } })]);
    mockedHistory.addMark.mockResolvedValue(savedMark('m-x'));
    const hook = await renderHook(() => useMarkBoard(plusMinusForm), { wrapper });
    await act(async () => hook.result.current.reload());
    await act(async () => hook.result.current.mark('s1', 'arti'));
    expect(hook.result.current.rows?.[0]?.counts.arti).toBe(1);
    const channel = mockRt.channels.find((c) => c.handlers.some((h) => h.config.table === 'form_events')) as FakeChannel;
    const calls = mockedHistory.getTallies.mock.calls.length;

    emit(channel, 'form_events', { kind: 'mark_added', mark_id: 'm-x' });
    await advance(400);
    expect(mockedHistory.getTallies).toHaveBeenCalledTimes(calls);

    mockedHistory.getTallies.mockResolvedValue([tally({ studentId: 's1', fullName: 'Ali', counts: {} })]);
    emit(channel, 'form_events', { kind: 'mark_removed', mark_id: 'm-x' });
    await advance(400);
    expect(mockedHistory.getTallies).toHaveBeenCalledTimes(calls + 1);
    expect(hook.result.current.rows?.[0]?.counts.arti).toBeUndefined();
  });
});

// --- useRemoteData -------------------------------------------------------------

describe('useRemoteData live sync', () => {
  it('listens to own inserts/updates and to deletes', () => {
    expect(DEFAULT_LIVE_TABLES).toEqual([
      { table: 'classes', own: true },
      { table: 'classes', event: 'DELETE' },
      { table: 'students', own: true },
      { table: 'students', event: 'DELETE' },
      { table: 'forms', own: true },
      { table: 'forms', event: 'DELETE' },
    ]);
  });

  it('treats deletes of rows that are not on screen as unrelated', () => {
    const data = [{ id: 'c1', name: 'A' }];
    expect(dataMentionsId(data, 'c1')).toBe(true);
    expect(dataMentionsId(data, 'c')).toBe(false);
    expect(isUnrelatedDelete(payload('classes', { id: 'other' }, 'DELETE'), data)).toBe(true);
    expect(isUnrelatedDelete(payload('classes', { id: 'c1' }, 'DELETE'), data)).toBe(false);
    expect(isUnrelatedDelete(payload('classes', { id: 'other' }), data)).toBe(false);
  });

  it('refetches for own changes and on-screen deletes, not for other tenants deletes', async () => {
    const load = jest.fn(() => Promise.resolve([{ id: 'c1', name: 'A' }]));
    await renderHook(() => useRemoteData(load, 'hata'));
    await act(async () => undefined);
    expect(load).toHaveBeenCalledTimes(1);
    const channel = mockRt.channels[0] as FakeChannel;
    expect(channel.handlers.map((h) => h.config)).toEqual(
      expect.arrayContaining([
        { event: '*', schema: 'public', table: 'classes', filter: 'teacher_id=eq.u1' },
        { event: 'DELETE', schema: 'public', table: 'classes' },
      ]),
    );

    emit(channel, 'classes', { id: 'someone-else' }, 'DELETE');
    await advance(400);
    expect(load).toHaveBeenCalledTimes(1);

    emit(channel, 'classes', { id: 'c1' }, 'DELETE');
    await advance(400);
    expect(load).toHaveBeenCalledTimes(2);

    emit(channel, 'students', { id: 's9', class_id: 'c1' }, 'INSERT');
    await advance(400);
    expect(load).toHaveBeenCalledTimes(3);
  });
});

// --- useHistoryData ------------------------------------------------------------

describe('history timeline merge', () => {
  const ev = (id: number) => event({ id });
  const cursor = (id: number) => ({ occurredAt: `t${id}`, id });

  it('prepends new events and keeps loaded pages and cursor', () => {
    const current = { events: [ev(5), ev(4), ev(3), ev(2)], nextCursor: cursor(2) };
    const { timeline, replaced } = mergeTimeline(current, { events: [ev(7), ev(6), ev(5), ev(4)], nextCursor: cursor(4) });
    expect(replaced).toBe(false);
    expect(timeline.events.map((e) => e.id)).toEqual([7, 6, 5, 4, 3, 2]);
    expect(timeline.nextCursor).toEqual(cursor(2));
  });

  it('returns the same timeline when nothing is new and replaces it when there is a gap', () => {
    const current = { events: [ev(5), ev(4)], nextCursor: null };
    expect(mergeTimeline(current, { events: [ev(5), ev(4)], nextCursor: null }).timeline).toBe(current);
    const gap = mergeTimeline(current, { events: [ev(9), ev(8)], nextCursor: cursor(8) });
    expect(gap.replaced).toBe(true);
    expect(gap.timeline.events.map((e) => e.id)).toEqual([9, 8]);
  });

  it('appends a page without duplicating events', () => {
    const next = appendPage({ events: [ev(6), ev(5), ev(4)], nextCursor: cursor(5) }, { events: [ev(4), ev(3)], nextCursor: null });
    expect(next.events.map((e) => e.id)).toEqual([6, 5, 4, 3]);
    expect(next.nextCursor).toBeNull();
  });
});

describe('useHistoryData live refresh', () => {
  const range = { from: null, to: null };
  const ev = (id: number) => event({ id });
  const page = (ids: number[], next: number | null) => ({
    events: ids.map(ev),
    nextCursor: next === null ? null : { occurredAt: `t${next}`, id: next },
  });

  it('keeps loaded pages, merges new events and ignores a failed silent refresh', async () => {
    mockedHistory.listHistory.mockResolvedValueOnce(page([4, 3], 3));
    const hook = await renderHook(() =>
      useHistoryData(plusMinusForm, { active: true, view: 'list', range, studentId: null }),
    );
    await act(async () => undefined);
    mockedHistory.listHistory.mockResolvedValueOnce(page([2, 1], null));
    await act(async () => hook.result.current.loadMore());
    expect(hook.result.current.timeline?.events.map((e) => e.id)).toEqual([4, 3, 2, 1]);

    const channel = mockRt.channels[0] as FakeChannel;
    mockedHistory.listHistory.mockResolvedValueOnce(page([5, 4], 4));
    emit(channel, 'form_events', { kind: 'mark_added' });
    await advance(400);
    expect(hook.result.current.timeline?.events.map((e) => e.id)).toEqual([5, 4, 3, 2, 1]);
    expect(hook.result.current.timeline?.nextCursor).toBeNull();

    mockedHistory.listHistory.mockRejectedValueOnce(new Error('network'));
    emit(channel, 'form_events', { kind: 'mark_added' });
    await advance(400);
    expect(hook.result.current.timelineError).toBeNull();
    expect(hook.result.current.timeline?.events).toHaveLength(5);
  });

  it('does not let an in-flight loadMore drop events merged by a live refresh', async () => {
    mockedHistory.listHistory.mockResolvedValueOnce(page([4, 3], 3));
    const hook = await renderHook(() =>
      useHistoryData(plusMinusForm, { active: true, view: 'list', range, studentId: null }),
    );
    await act(async () => undefined);
    const more = deferred<ReturnType<typeof page>>();
    mockedHistory.listHistory.mockReturnValueOnce(more.promise);
    await act(async () => hook.result.current.loadMore());

    const channel = mockRt.channels[0] as FakeChannel;
    mockedHistory.listHistory.mockResolvedValueOnce(page([5, 4], 4));
    emit(channel, 'form_events', { kind: 'mark_added' });
    await advance(400);
    await act(async () => more.resolve(page([2, 1], null)));
    expect(hook.result.current.timeline?.events.map((e) => e.id)).toEqual([5, 4, 3, 2, 1]);
  });

  it('keeps the summary on a failed silent refresh', async () => {
    const summary = { students: [] } as unknown as Awaited<ReturnType<typeof history.getFormSummary>>;
    mockedHistory.getFormSummary.mockResolvedValueOnce(summary);
    const hook = await renderHook(() =>
      useHistoryData(plusMinusForm, { active: true, view: 'summary', range, studentId: null }),
    );
    await act(async () => undefined);
    mockedHistory.getFormSummary.mockRejectedValueOnce(new Error('network'));
    emit(mockRt.channels[0] as FakeChannel, 'form_events', { kind: 'mark_added' });
    await advance(400);
    expect(hook.result.current.summary).toBe(summary);
    expect(hook.result.current.summaryError).toBeNull();
  });
});
