import { act, renderHook } from '@testing-library/react-native';
import { Alert, type AlertButton } from 'react-native';

import { useLeaveGuard } from './useLeaveGuard';

type BeforeRemove = (event: { preventDefault: () => void; data: { action: unknown } }) => void;

const mockListeners: BeforeRemove[] = [];
const mockNavigation = {
  addListener: jest.fn((_type: string, l: BeforeRemove) => {
    mockListeners.push(l);
    return () => mockListeners.splice(mockListeners.indexOf(l), 1);
  }),
  dispatch: jest.fn(),
};

jest.mock('expo-router', () => ({ useNavigation: () => mockNavigation }));

const prompt = () => ({ title: 'Çıkılsın mı?', message: 'Kaybolur.', confirmText: 'Çık' });

function attemptLeave() {
  const event = { preventDefault: jest.fn(), data: { action: { type: 'GO_BACK' } } };
  for (const l of [...mockListeners]) l(event);
  return event;
}

let alert: jest.SpyInstance;
const buttons = (): AlertButton[] => alert.mock.calls[alert.mock.calls.length - 1][2];

beforeEach(() => {
  mockListeners.length = 0;
  mockNavigation.dispatch.mockClear();
  mockNavigation.addListener.mockClear();
  alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
});
afterEach(() => alert.mockRestore());

describe('useLeaveGuard (native)', () => {
  it('lets the screen go when nothing is dirty', async () => {
    await renderHook(() => useLeaveGuard({ dirty: false, prompt }));
    const event = attemptLeave();
    expect(event.preventDefault).not.toHaveBeenCalled();
    expect(alert).not.toHaveBeenCalled();
  });

  it('blocks and asks while dirty; Vazgeç stays, Çık dispatches the original action', async () => {
    await renderHook(() => useLeaveGuard({ dirty: true, prompt }));
    const event = attemptLeave();
    expect(event.preventDefault).toHaveBeenCalled();
    expect(alert).toHaveBeenCalledWith('Çıkılsın mı?', 'Kaybolur.', expect.any(Array), undefined);
    buttons()[0].onPress?.();
    expect(mockNavigation.dispatch).not.toHaveBeenCalled();
    buttons()[1].onPress?.();
    expect(mockNavigation.dispatch).toHaveBeenCalledWith({ type: 'GO_BACK' });
    // Onaydan sonra gelen beforeRemove artık durdurulmaz.
    expect(attemptLeave().preventDefault).not.toHaveBeenCalled();
  });

  it('uses the latest dirty value and prompt without re-subscribing', async () => {
    const { rerender } = await renderHook(
      ({ dirty, n }: { dirty: boolean; n: number }) =>
        useLeaveGuard({ dirty, prompt: () => ({ title: `${n}`, confirmText: 'Çık' }) }),
      { initialProps: { dirty: false, n: 1 } },
    );
    await rerender({ dirty: true, n: 2 });
    attemptLeave();
    expect(alert.mock.calls[0][0]).toBe('2');
    expect(mockNavigation.addListener).toHaveBeenCalledTimes(1);
  });

  it('leave() skips the prompt and navigates', async () => {
    const { result } = await renderHook(() => useLeaveGuard({ dirty: true, prompt }));
    const navigate = jest.fn();
    await act(async () => result.current.leave(navigate));
    expect(navigate).toHaveBeenCalled();
    expect(attemptLeave().preventDefault).not.toHaveBeenCalled();
    expect(alert).not.toHaveBeenCalled();
  });
});
