import { act, renderHook } from '@testing-library/react-native';
import * as Haptics from 'expo-haptics';
import { createElement, type ReactNode } from 'react';
import { AppState, Platform, type AppStateStatus } from 'react-native';

import { Providers } from '@/features/forms/test-utils';
import * as history from '@/features/history';
import { applyOps, msUntilNextDay, reconcileOps, type PendingOp } from '@/features/formview/board';
import { plusMinusForm, tally } from '@/features/formview/fixtures';
import { useMarkBoard } from '@/features/formview/useMarkBoard';
import type { FormMarkRow } from '@/types/database';

import { nextChannelName, normalizeSpecs, useRealtimeRefresh, type RealtimePayload } from './realtime';

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

jest.mock('@/features/history/api', () => {
  const actual = jest.requireActual<typeof import('@/features/history/api')>('@/features/history/api');
  return {
    ...actual,
    getTallies: jest.fn(),
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

function payload(table: string, row: Record<string, unknown> = {}): RealtimePayload {
  return {
    schema: 'public',
    table,
    commit_timestamp: '',
    eventType: 'INSERT',
    new: row,
    old: {},
    errors: [],
  } as unknown as RealtimePayload;
}

function emit(channel: FakeChannel, table: string, row: Record<string, unknown> = {}) {
  for (const h of channel.handlers) if (h.config.table === table) h.callback(payload(table, row));
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

    emit(channel, 'form_events', { mark_id: 'm-own' });
    await advance(400);
    expect(mockedHistory.getTallies).toHaveBeenCalledTimes(calls);

    mockedHistory.getTallies.mockResolvedValue(server(3));
    emit(channel, 'form_events', { mark_id: 'm-other' });
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
