import { Alert } from 'react-native';

import { createWebLeaveGuard, SENTINEL_KEY, showLeavePrompt } from './leaveGuard';
import { FakeWindow } from './leaveGuard.testWindow';

function setup() {
  const win = new FakeWindow('/class/new', { id: 'wizard' });
  const onLeaveAttempt = jest.fn();
  const guard = createWebLeaveGuard(win, { onLeaveAttempt });
  return { win, guard, onLeaveAttempt };
}

const flush = async () => {
  await jest.runAllTimersAsync();
};

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

describe('createWebLeaveGuard', () => {
  it('pushes a same-URL sentinel entry that keeps the router state id', () => {
    const { win, guard } = setup();
    guard.arm();
    expect(guard.armed).toBe(true);
    expect(win.entries).toHaveLength(3);
    expect(win.location.href).toBe('/class/new');
    expect(win.history.state).toMatchObject({ id: 'wizard', [SENTINEL_KEY]: expect.any(String) });
    // İkinci arm yeni kayıt eklemez.
    guard.arm();
    expect(win.entries).toHaveLength(3);
  });

  it('intercepts browser Back: the app does not navigate, sentinel is re-pushed, prompt is asked', () => {
    const { win, guard, onLeaveAttempt } = setup();
    guard.arm();
    win.go(-1);
    expect(onLeaveAttempt).toHaveBeenCalledTimes(1);
    expect(win.appPops).toEqual([]);
    expect(win.location.href).toBe('/class/new');
    expect(win.index).toBe(2);
    expect(win.history.state).toMatchObject({ [SENTINEL_KEY]: expect.any(String) });
    // Vazgeç sonrası ikinci geri de yakalanır.
    win.go(-1);
    expect(onLeaveAttempt).toHaveBeenCalledTimes(2);
    expect(win.appPops).toEqual([]);
  });

  it('disarm removes the sentinel without the app seeing the pop, then Back leaves normally', async () => {
    const { win, guard, onLeaveAttempt } = setup();
    guard.arm();
    const done = jest.fn();
    void guard.disarm().then(done);
    await flush();
    expect(done).toHaveBeenCalled();
    expect(guard.armed).toBe(false);
    expect(win.index).toBe(1);
    expect(win.location.href).toBe('/class/new');
    expect(win.appPops).toEqual([]);
    win.go(-1);
    expect(onLeaveAttempt).not.toHaveBeenCalled();
    expect(win.appPops).toEqual(['/']);
  });

  it('confirm flow: after a leave attempt, disarm returns to the real entry so the app can go back', async () => {
    const { win, guard } = setup();
    guard.arm();
    win.go(-1);
    const p = guard.disarm();
    await flush();
    await p;
    expect(win.index).toBe(1);
    expect(win.history.state).toEqual({ id: 'wizard' });
    expect(win.appPops).toEqual([]);
  });

  it('warns on reload / tab close only while armed', async () => {
    const { win, guard } = setup();
    expect(win.unloadEvent().preventDefault).not.toHaveBeenCalled();
    guard.arm();
    expect(win.unloadEvent().preventDefault).toHaveBeenCalled();
    const p = guard.disarm();
    await flush();
    await p;
    expect(win.unloadEvent().preventDefault).not.toHaveBeenCalled();
  });

  it('re-arming while a disarm is in flight ends armed with exactly one sentinel', async () => {
    const { win, guard } = setup();
    guard.arm();
    void guard.disarm();
    guard.arm();
    await flush();
    expect(guard.armed).toBe(true);
    expect(win.entries.slice(0, win.index + 1)).toHaveLength(3);
    expect(win.history.state).toMatchObject({ [SENTINEL_KEY]: expect.any(String) });
  });

  it('does not pop when the sentinel was already replaced by the router', async () => {
    const { win, guard } = setup();
    guard.arm();
    win.history.replaceState({ id: 'wizard' }, '', '/class/abc');
    const p = guard.disarm();
    await flush();
    await p;
    expect(win.index).toBe(2);
    expect(win.location.href).toBe('/class/abc');
  });

  it('reuses its sentinel when the screen regains focus after Back from a pushed screen', async () => {
    const { win, guard, onLeaveAttempt } = setup();
    guard.arm();
    // Uygulama üstüne yeni ekran açar; korunan ekran odağı kaybeder.
    win.history.pushState({ id: 'next' }, '', '/class/new/help');
    const p = guard.disarm();
    await flush();
    await p;
    expect(win.index).toBe(3);
    // Geri: sentinel kaydına dönülür, uygulama gezinir, ekran yeniden odaklanır.
    win.go(-1);
    expect(win.appPops).toEqual(['/class/new']);
    guard.arm();
    expect(win.entries).toHaveLength(4);
    win.go(-1);
    expect(onLeaveAttempt).toHaveBeenCalledTimes(1);
    expect(win.index).toBe(2);
  });

  it('destroy removes the sentinel and all listeners', async () => {
    const { win, guard } = setup();
    guard.arm();
    guard.destroy();
    await flush();
    expect(win.index).toBe(1);
    expect(win.capture).toHaveLength(0);
    expect(win.unload).toHaveLength(0);
    win.go(-1);
    expect(win.appPops).toEqual(['/']);
  });

  it('destroy without arming just detaches', () => {
    const { win, guard } = setup();
    guard.destroy();
    expect(win.capture).toHaveLength(0);
    guard.arm();
    expect(win.entries).toHaveLength(2);
  });

  it('lets Forward into its own sentinel through', () => {
    const { win, guard, onLeaveAttempt } = setup();
    guard.arm();
    // Sentinel'in altına geçici olarak inip geri dönmek (ör. ekranın üstüne açılan sayfadan dönüş).
    win.index = 1;
    win.go(1);
    expect(onLeaveAttempt).not.toHaveBeenCalled();
    expect(win.appPops).toEqual(['/class/new']);
  });
});

describe('showLeavePrompt', () => {
  it('shows Vazgeç (cancel) and a destructive confirm that runs the callback', () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    const onConfirm = jest.fn();
    showLeavePrompt({ title: 'Başlık', message: 'Mesaj', confirmText: 'Çık' }, onConfirm);
    const [title, message, buttons, options] = alert.mock.calls[0];
    expect(title).toBe('Başlık');
    expect(message).toBe('Mesaj');
    expect(options).toBeUndefined();
    expect(buttons?.map((b) => [b.text, b.style])).toEqual([
      ['Vazgeç', 'cancel'],
      ['Çık', 'destructive'],
    ]);
    buttons?.[0].onPress?.();
    expect(onConfirm).not.toHaveBeenCalled();
    buttons?.[1].onPress?.();
    expect(onConfirm).toHaveBeenCalledTimes(1);
    alert.mockRestore();
  });

  it('reports dismissal for every way the dialog closes when asked', () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    const onDismiss = jest.fn();
    showLeavePrompt({ title: 'T', confirmText: 'Çık', cancelText: 'Kal' }, jest.fn(), onDismiss);
    const [, , buttons, options] = alert.mock.calls[0];
    expect(buttons?.[0].text).toBe('Kal');
    buttons?.[0].onPress?.();
    buttons?.[1].onPress?.();
    options?.onDismiss?.();
    expect(onDismiss).toHaveBeenCalledTimes(3);
    alert.mockRestore();
  });
});
