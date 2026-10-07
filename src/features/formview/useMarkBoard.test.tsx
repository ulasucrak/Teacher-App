import { act, renderHook } from '@testing-library/react-native';

import { Providers } from '@/features/forms/test-utils';
import * as history from '@/features/history';
import { useRealtimeRefresh, type RealtimePayload } from '@/lib/realtime';
import type { FormMarkRow } from '@/types/database';

import { plusMinusForm, tally } from './fixtures';
import { useMarkBoard } from './useMarkBoard';

jest.mock('@/features/history/api', () => ({
  ...jest.requireActual('@/features/history/api'),
  getTallies: jest.fn(), addMark: jest.fn(), undoLastMark: jest.fn(), removeMark: jest.fn(),
}));
jest.mock('@/lib/realtime', () => ({ useRealtimeRefresh: jest.fn() }));

const mocked = jest.mocked(history);
const server = (count: number) => [tally({ studentId: 's1', fullName: 'Ali', counts: { arti: count }, dayCounts: { arti: count } })];
const saved = { id: 'm1', option_key: 'arti' } as FormMarkRow;
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}
async function board() {
  const hook = await renderHook(() => useMarkBoard(plusMinusForm), { wrapper: Providers });
  await act(async () => hook.result.current.reload());
  return hook;
}
beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date(2026, 9, 7, 23, 59));
  jest.clearAllMocks();
  mocked.getTallies.mockResolvedValue(server(1));
  mocked.addMark.mockResolvedValue(saved);
  mocked.undoLastMark.mockResolvedValue(saved);
});
afterEach(() => jest.useRealTimers());

it('keeps a past selection across midnight, foreground refresh and realtime echoes', async () => {
  const hook = await board();
  await act(async () => hook.result.current.changeDay('2026-10-02'));
  await act(async () => jest.advanceTimersByTime(61_000));
  expect(hook.result.current.today).toBe('2026-10-08');
  expect(hook.result.current.day).toBe('2026-10-02');
  await act(async () => hook.result.current.mark('s1', 'arti'));
  expect(mocked.addMark).toHaveBeenLastCalledWith(expect.objectContaining({ markDate: '2026-10-02' }));
  const live = jest.mocked(useRealtimeRefresh).mock.calls.at(-1)![0];
  expect(live.ignore?.({ new: { kind: 'mark_added', mark_id: 'm1' } } as unknown as RealtimePayload)).toBe(true);
  expect(live.ignore?.({ new: { kind: 'mark_removed', mark_id: 'm1' } } as unknown as RealtimePayload)).toBe(false);
  await act(async () => live.onChange('foreground'));
  expect(mocked.getTallies).toHaveBeenLastCalledWith('f2', { day: '2026-10-02' });
  await act(async () => live.onChange('change'));
  expect(hook.result.current.day).toBe('2026-10-02');
});

it('rejects future dates and discards outdated tally responses', async () => {
  const hook = await board();
  await act(async () => hook.result.current.changeDay('2026-10-08'));
  expect(hook.result.current.day).toBe('2026-10-07');
  const old = deferred<history.StudentTally[]>();
  mocked.getTallies.mockReturnValueOnce(old.promise);
  await act(async () => hook.result.current.reload());
  mocked.getTallies.mockResolvedValue(server(3));
  await act(async () => hook.result.current.changeDay('2026-10-02'));
  await act(async () => old.resolve(server(99)));
  expect(hook.result.current.rows?.[0]?.dayCounts.arti).toBe(3);
});

it('does not put a late mark or undo banner onto another day', async () => {
  const hook = await board();
  const save = deferred<FormMarkRow>();
  mocked.addMark.mockReturnValueOnce(save.promise);
  await act(async () => hook.result.current.mark('s1', 'arti'));
  await act(async () => hook.result.current.changeDay('2026-10-02'));
  await act(async () => save.resolve(saved));
  expect(hook.result.current.rows?.[0]?.dayCounts.arti).toBe(1);
  expect(hook.result.current.lastMark).toBeNull();
  const undo = deferred<FormMarkRow | null>();
  mocked.undoLastMark.mockReturnValueOnce(undo.promise);
  let pending!: Promise<void>;
  await act(async () => { pending = hook.result.current.undoStudent('s1'); });
  await act(async () => hook.result.current.changeDay('2026-10-01'));
  await act(async () => { undo.resolve(saved); await pending; });
  expect(hook.result.current.rows?.[0]?.dayCounts.arti).toBe(1);
  expect(hook.result.current.undoingIds.size).toBe(0);
});
