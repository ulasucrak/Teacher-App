import { act, renderHook } from '@testing-library/react-native';
import { Alert, type AlertButton } from 'react-native';

import { SENTINEL_KEY } from './leaveGuard';
import { FakeWindow } from './leaveGuard.testWindow';
import { useLeaveGuard } from './useLeaveGuard.web';

type BeforeRemove = (event: { preventDefault: () => void; data: { action: unknown } }) => void;

const mockListeners: BeforeRemove[] = [];
const mockNavigation = {
  addListener: jest.fn((_type: string, l: BeforeRemove) => {
    mockListeners.push(l);
    return () => mockListeners.splice(mockListeners.indexOf(l), 1);
  }),
  dispatch: jest.fn(),
  goBack: jest.fn(),
  canGoBack: jest.fn(() => true),
};
const mockFocus = { value: true };

jest.mock('expo-router', () => ({
  useNavigation: () => mockNavigation,
  useIsFocused: () => mockFocus.value,
}));

const prompt = () => ({ title: 'Yeni sınıf bırakılsın mı?', confirmText: 'Çık' });

let win: FakeWindow;
let alert: jest.SpyInstance;
const lastButtons = (): AlertButton[] => alert.mock.calls[alert.mock.calls.length - 1][2];
const isSentinel = () => Boolean((win.history.state as Record<string, unknown>)[SENTINEL_KEY]);

beforeEach(() => {
  jest.useFakeTimers();
  mockListeners.length = 0;
  mockFocus.value = true;
  jest.clearAllMocks();
  win = new FakeWindow('/class/new', { id: 'wizard' });
  jest.replaceProperty(globalThis as unknown as { window: unknown }, 'window', win);
  alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
});

afterEach(() => {
  alert.mockRestore();
  jest.restoreAllMocks();
  jest.useRealTimers();
});

const flush = () => act(async () => void (await jest.runAllTimersAsync()));

function render(dirty: boolean) {
  return renderHook(({ d }: { d: boolean }) => useLeaveGuard({ dirty: d, prompt }), { initialProps: { d: dirty } });
}

describe('useLeaveGuard (web)', () => {
  it('does nothing while clean', async () => {
    await render(false);
    expect(win.entries).toHaveLength(2);
    win.go(-1);
    expect(alert).not.toHaveBeenCalled();
    expect(win.appPops).toEqual(['/']);
  });

  it('browser Back while dirty: asks; Vazgeç stays on the page', async () => {
    await render(true);
    expect(isSentinel()).toBe(true);
    await act(async () => win.go(-1));
    expect(alert).toHaveBeenCalledTimes(1);
    expect(win.appPops).toEqual([]);
    lastButtons()[0].onPress?.();
    expect(win.location.href).toBe('/class/new');
    expect(isSentinel()).toBe(true);
    expect(mockNavigation.goBack).not.toHaveBeenCalled();
    // İletişim kutusu açıkken ikinci geri yeni kutu açmaz; kapandıktan sonra yine sorar.
    await act(async () => win.go(-1));
    expect(alert).toHaveBeenCalledTimes(2);
  });

  it('does not stack dialogs on repeated Back', async () => {
    await render(true);
    await act(async () => win.go(-1));
    await act(async () => win.go(-1));
    expect(alert).toHaveBeenCalledTimes(1);
  });

  it('browser Back + Çık removes the sentinel, then navigates back in the app', async () => {
    await render(true);
    await act(async () => win.go(-1));
    lastButtons()[1].onPress?.();
    await flush();
    expect(win.index).toBe(1);
    expect(isSentinel()).toBe(false);
    expect(win.appPops).toEqual([]);
    expect(mockNavigation.goBack).toHaveBeenCalledTimes(1);
    // Uygulamanın goBack'i beforeRemove'u tetikler: artık durdurulmaz.
    const event = { preventDefault: jest.fn(), data: { action: {} } };
    mockListeners.forEach((l) => l(event));
    expect(event.preventDefault).not.toHaveBeenCalled();
  });

  it('falls back to history.back() when the app has nothing to go back to', async () => {
    mockNavigation.canGoBack.mockReturnValue(false);
    await render(true);
    await act(async () => win.go(-1));
    lastButtons()[1].onPress?.();
    await flush();
    expect(mockNavigation.goBack).not.toHaveBeenCalled();
    expect(win.index).toBe(0);
    expect(win.appPops).toEqual(['/']);
  });

  it('in-app close (beforeRemove) asks, then dispatches after removing the sentinel', async () => {
    await render(true);
    const event = { preventDefault: jest.fn(), data: { action: { type: 'GO_BACK' } } };
    mockListeners.forEach((l) => l(event));
    expect(event.preventDefault).toHaveBeenCalled();
    lastButtons()[1].onPress?.();
    expect(mockNavigation.dispatch).not.toHaveBeenCalled();
    await flush();
    expect(isSentinel()).toBe(false);
    expect(mockNavigation.dispatch).toHaveBeenCalledWith({ type: 'GO_BACK' });
  });

  it('warns on reload while dirty and clears everything when clean again', async () => {
    const { rerender } = await render(true);
    expect(win.unloadEvent().preventDefault).toHaveBeenCalled();
    await rerender({ d: false });
    await flush();
    expect(win.unloadEvent().preventDefault).not.toHaveBeenCalled();
    expect(win.index).toBe(1);
    expect(isSentinel()).toBe(false);
    win.go(-1);
    expect(alert).not.toHaveBeenCalled();
    expect(win.appPops).toEqual(['/']);
  });

  it('is inactive while another screen is focused', async () => {
    mockFocus.value = false;
    await render(true);
    expect(win.entries).toHaveLength(2);
    expect(win.unloadEvent().preventDefault).not.toHaveBeenCalled();
  });

  it('leave() navigates without asking, after removing the sentinel', async () => {
    const { result } = await render(true);
    const navigate = jest.fn();
    await act(async () => result.current.leave(navigate));
    await flush();
    expect(navigate).toHaveBeenCalled();
    expect(isSentinel()).toBe(false);
    expect(alert).not.toHaveBeenCalled();
  });

  it('cleans up on unmount', async () => {
    const { unmount } = await render(true);
    await act(async () => unmount());
    await flush();
    expect(win.index).toBe(1);
    expect(win.capture).toHaveLength(0);
    expect(win.unload).toHaveLength(0);
  });
});
