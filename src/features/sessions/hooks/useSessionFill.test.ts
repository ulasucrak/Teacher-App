import { act, renderHook } from '@testing-library/react-native';
import { createElement, type ReactNode } from 'react';

import { Providers } from '@/features/forms/test-utils';
import { attendanceForm } from '@/features/formview/fixtures';
import type { RealtimePayload } from '@/lib/realtime';
import type { FormEntryRow, FormSessionRow, StudentRow } from '@/types/database';

import * as api from '../api';
import { NEW_SESSION_ID } from '../routes';
import { useSessionFill } from './useSessionFill';

type Handler = { config: { table: string; filter?: string }; callback: (p: RealtimePayload) => void };
const mockLive = { handlers: [] as Handler[] };

jest.mock('@/lib/supabase', () => ({
  supabaseConfigError: null,
  supabase: {
    channel: jest.fn(() => {
      const channel: { on: jest.Mock; subscribe: jest.Mock } = {
        on: jest.fn((_t: string, config: Handler['config'], callback: Handler['callback']) => {
          mockLive.handlers.push({ config, callback });
          return channel;
        }),
        subscribe: jest.fn(() => channel),
      };
      return channel;
    }),
    removeChannel: jest.fn(() => Promise.resolve('ok')),
    auth: { onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: jest.fn() } } })) },
  },
}));

jest.mock('expo-router', () => ({
  useNavigation: () => ({ addListener: jest.fn(() => jest.fn()), setOptions: jest.fn(), dispatch: jest.fn() }),
}));

jest.mock('../api', () => {
  const actual = jest.requireActual<typeof import('../api')>('../api');
  return {
    ...actual,
    findSessionByDate: jest.fn(),
    getSession: jest.fn(),
    listStudents: jest.fn(),
    listEntries: jest.fn(),
    upsertEntries: jest.fn(),
    ensureSessionForDate: jest.fn(),
    updateSessionStatus: jest.fn(),
  };
});

const mocked = jest.mocked(api);

const student = (id: string, full_name: string): StudentRow =>
  ({ id, full_name, class_id: 'c1', teacher_id: 't', number: null, created_at: '' }) as unknown as StudentRow;

const session: FormSessionRow = {
  id: 'sess1',
  form_id: 'f1',
  teacher_id: 't',
  session_date: '2026-10-06',
  status: 'published',
  created_at: '',
} as unknown as FormSessionRow;

const entry = (student_id: string, option_key: string): FormEntryRow =>
  ({ id: `e-${student_id}`, session_id: 'sess1', student_id, teacher_id: 't', option_key, note: null }) as unknown as FormEntryRow;

function wrapper({ children }: { children: ReactNode }) {
  return createElement(Providers, null, children);
}

function remoteChange() {
  for (const h of mockLive.handlers) {
    if (h.config.table === 'form_events') h.callback({ new: { kind: 'entry_updated' } } as unknown as RealtimePayload);
  }
}

async function advance(ms: number) {
  await act(async () => {
    jest.advanceTimersByTime(ms);
  });
}

beforeEach(() => {
  jest.useFakeTimers();
  mockLive.handlers = [];
  mocked.findSessionByDate.mockResolvedValue(session);
  mocked.listStudents.mockResolvedValue([student('s1', 'Ali'), student('s2', 'Ayşe')]);
  mocked.listEntries.mockResolvedValue([entry('s1', 'var')]);
  mocked.upsertEntries.mockResolvedValue();
});

afterEach(() => {
  jest.useRealTimers();
  jest.clearAllMocks();
});

async function renderFill() {
  const hook = await renderHook(
    () => useSessionFill({ classId: 'c1', formId: 'f1', sessionId: NEW_SESSION_ID, date: '2026-10-06', form: attendanceForm }),
    { wrapper },
  );
  await act(async () => undefined);
  return hook;
}

it('subscribes to the form events and the class roster', async () => {
  await renderFill();
  expect(mockLive.handlers.map((h) => h.config)).toEqual([
    expect.objectContaining({ table: 'form_events', filter: 'form_id=eq.f1' }),
    expect.objectContaining({ table: 'students', filter: 'class_id=eq.c1' }),
  ]);
});

it('applies remote changes when there is no unsaved draft', async () => {
  const hook = await renderFill();
  expect(hook.result.current.draft.s2).toBeUndefined();
  mocked.listEntries.mockResolvedValue([entry('s1', 'var'), entry('s2', 'yok')]);
  remoteChange();
  await advance(400);
  expect(hook.result.current.draft.s2?.optionKey).toBe('yok');
  expect(hook.result.current.loadError).toBeNull();
});

it('defers remote changes while the user has unsaved edits, then loads after saving', async () => {
  const hook = await renderFill();
  await act(async () => hook.result.current.onToggle('s1', 'yok'));
  expect(hook.result.current.dirtyCount).toBe(1);
  const loads = mocked.listEntries.mock.calls.length;

  mocked.listEntries.mockResolvedValue([entry('s1', 'var'), entry('s2', 'yok')]);
  remoteChange();
  await advance(400);
  // Taslak ezilmedi, yükleme yapılmadı.
  expect(mocked.listEntries).toHaveBeenCalledTimes(loads);
  expect(hook.result.current.draft.s1?.optionKey).toBe('yok');

  mocked.listEntries.mockResolvedValue([entry('s1', 'yok'), entry('s2', 'yok')]);
  await act(async () => hook.result.current.onSave());
  await act(async () => undefined);
  expect(mocked.listEntries.mock.calls.length).toBeGreaterThan(loads);
  expect(hook.result.current.draft.s1?.optionKey).toBe('yok');
  expect(hook.result.current.draft.s2?.optionKey).toBe('yok');
  expect(hook.result.current.dirtyCount).toBe(0);
});

it('does not apply a background load that finishes after the user started editing', async () => {
  const hook = await renderFill();
  let finish!: (rows: FormEntryRow[]) => void;
  mocked.listEntries.mockReturnValueOnce(new Promise((resolve) => (finish = resolve)));
  remoteChange();
  await advance(400);
  await act(async () => hook.result.current.onToggle('s2', 'var'));
  await act(async () => finish([entry('s1', 'yok')]));
  expect(hook.result.current.draft.s1?.optionKey).toBe('var');
  expect(hook.result.current.draft.s2?.optionKey).toBe('var');
});

it('keeps the screen data when a background load fails', async () => {
  const hook = await renderFill();
  mocked.listEntries.mockRejectedValueOnce(new Error('network'));
  remoteChange();
  await advance(400);
  expect(hook.result.current.loadError).toBeNull();
  expect(hook.result.current.data).not.toBeNull();
});

it('shows an error when another device deleted the open session', async () => {
  mocked.getSession.mockResolvedValue(session);
  const hook = await renderHook(
    () => useSessionFill({ classId: 'c1', formId: 'f1', sessionId: 'sess1', form: attendanceForm }),
    { wrapper },
  );
  await act(async () => undefined);
  expect(hook.result.current.loadError).toBeNull();
  mocked.getSession.mockRejectedValue(new api.SessionNotFoundError());
  remoteChange();
  await advance(400);
  expect(hook.result.current.loadError).toBe('Kayıt bulunamadı. Silinmiş olabilir; kayıt listesine dönün.');
});

it('also detects a deleted open session while the user has unsaved edits', async () => {
  mocked.getSession.mockResolvedValue(session);
  const hook = await renderHook(
    () => useSessionFill({ classId: 'c1', formId: 'f1', sessionId: 'sess1', form: attendanceForm }),
    { wrapper },
  );
  await act(async () => undefined);
  await act(async () => hook.result.current.onToggle('s2', 'var'));
  mocked.getSession.mockRejectedValue(new api.SessionNotFoundError());
  remoteChange();
  await advance(400);
  expect(hook.result.current.loadError).toContain('Kayıt bulunamadı');
});

it('forgets a day record deleted elsewhere but keeps the draft (re-created on save)', async () => {
  const hook = await renderFill();
  await act(async () => hook.result.current.onToggle('s2', 'var'));
  mocked.findSessionByDate.mockResolvedValue(null);
  remoteChange();
  await advance(400);
  expect(hook.result.current.data?.session).toBeNull();
  expect(hook.result.current.draft.s2?.optionKey).toBe('var');
  expect(hook.result.current.loadError).toBeNull();
});
