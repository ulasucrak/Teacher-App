import { createAlertQueue, DEFAULT_BUTTON_TEXT, mapAlertButtons } from './platformAlert';

const texts = (m: ReturnType<typeof mapAlertButtons>) => m.buttons.map((b) => `${b.index}:${b.text}:${b.kind}`);

describe('mapAlertButtons', () => {
  it('shows a single "Tamam" button when none are given', () => {
    for (const input of [undefined, []]) {
      const m = mapAlertButtons(input);
      expect(texts(m)).toEqual([`0:${DEFAULT_BUTTON_TEXT}:default`]);
      expect(m.cancelIndex).toBe(0);
      expect(m.primaryIndex).toBe(0);
      expect(m.stacked).toBe(false);
    }
  });

  it('keeps real labels and maps styles to kinds', () => {
    const m = mapAlertButtons([
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Kaydetmeden çık', style: 'destructive' },
    ]);
    expect(texts(m)).toEqual(['0:Vazgeç:cancel', '1:Kaydetmeden çık:destructive']);
    expect(m.cancelIndex).toBe(0);
    expect(m.primaryIndex).toBe(1);
    expect(m.stacked).toBe(false);
  });

  it('puts cancel on the left for two buttons (iOS order)', () => {
    const m = mapAlertButtons([{ text: 'Sil', style: 'destructive' }, { text: 'Vazgeç', style: 'cancel' }]);
    expect(texts(m)).toEqual(['1:Vazgeç:cancel', '0:Sil:destructive']);
    expect(m.cancelIndex).toBe(1);
    expect(m.primaryIndex).toBe(0);
  });

  it('stacks more than two buttons with cancel at the bottom', () => {
    const m = mapAlertButtons([{ text: 'Vazgeç', style: 'cancel' }, { text: 'A' }, { text: 'B', style: 'default' }]);
    expect(m.stacked).toBe(true);
    expect(texts(m)).toEqual(['1:A:default', '2:B:default', '0:Vazgeç:cancel']);
    // Yıkıcı yoksa iptal olmayan son düğme birincildir.
    expect(m.primaryIndex).toBe(2);
  });

  it('prefers the destructive button as primary', () => {
    const m = mapAlertButtons([{ text: 'A' }, { text: 'Sil', style: 'destructive' }, { text: 'B' }]);
    expect(m.primaryIndex).toBe(1);
    expect(m.cancelIndex).toBeNull();
  });

  it('treats only the first cancel button as cancel', () => {
    const m = mapAlertButtons([{ text: 'X', style: 'cancel' }, { text: 'Y', style: 'cancel' }]);
    expect(texts(m)).toEqual(['0:X:cancel', '1:Y:default']);
    expect(m.primaryIndex).toBe(1);
  });

  it('falls back to "Tamam" for an empty label', () => {
    expect(mapAlertButtons([{ text: '' }]).buttons[0].text).toBe(DEFAULT_BUTTON_TEXT);
  });
});

describe('createAlertQueue', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  const cancel = () => ({ text: 'Vazgeç', style: 'cancel' as const, onPress: jest.fn() });
  const destroy = () => ({ text: 'Listeyi sil', style: 'destructive' as const, onPress: jest.fn() });

  it('shows one alert at a time, in order', () => {
    const q = createAlertQueue();
    const listener = jest.fn();
    q.subscribe(listener);
    const a = q.push('Bir');
    const b = q.push('İki', 'Mesaj');
    expect(listener).toHaveBeenCalledTimes(2);
    expect(q.size()).toBe(2);
    expect(q.current()?.id).toBe(a);
    expect(q.current()?.title).toBe('Bir');
    expect(q.press(a, 0)).toBe(true);
    expect(q.current()).toMatchObject({ id: b, title: 'İki', message: 'Mesaj' });
    expect(q.press(b, 0)).toBe(true);
    expect(q.current()).toBeNull();
  });

  it('runs the pressed button on the next tick, once', () => {
    const q = createAlertQueue();
    const c = cancel();
    const d = destroy();
    const id = q.push('Liste silinsin mi?', 'Eklemediğiniz öğrenciler kaybolur.', [c, d]);
    expect(q.press(id, 1)).toBe(true);
    // Eylem dinleyicinin içinde değil, bir sonraki turda çalışır.
    expect(d.onPress).not.toHaveBeenCalled();
    // Çift tıklama yok sayılır.
    expect(q.press(id, 1)).toBe(false);
    jest.runAllTimers();
    expect(d.onPress).toHaveBeenCalledTimes(1);
    expect(c.onPress).not.toHaveBeenCalled();
  });

  it('Escape presses cancel, Enter presses the primary button', () => {
    const q = createAlertQueue();
    const c = cancel();
    const d = destroy();
    const first = q.push('Çıkılsın mı?', undefined, [c, d]);
    expect(q.cancel(first)).toBe(true);
    const second = q.push('Çıkılsın mı?', undefined, [c, d]);
    expect(q.confirm(second)).toBe(true);
    jest.runAllTimers();
    expect(c.onPress).toHaveBeenCalledTimes(1);
    expect(d.onPress).toHaveBeenCalledTimes(1);
  });

  it('Escape closes a single-button alert through its button', () => {
    const q = createAlertQueue();
    const ok = { text: 'Tamam', onPress: jest.fn() };
    const id = q.push('Bilgi', 'Kaydedildi', [ok]);
    expect(q.cancel(id)).toBe(true);
    jest.runAllTimers();
    expect(ok.onPress).toHaveBeenCalledTimes(1);
  });

  it('Escape does nothing without a cancel button unless cancelable', () => {
    const q = createAlertQueue();
    const onDismiss = jest.fn();
    const a = { text: 'A', onPress: jest.fn() };
    const b = { text: 'B', onPress: jest.fn() };
    const id = q.push('Seçin', undefined, [a, b]);
    expect(q.cancel(id)).toBe(false);
    expect(q.current()?.id).toBe(id);
    q.press(id, 0);
    const id2 = q.push('Seçin', undefined, [a, b], { cancelable: true, onDismiss });
    expect(q.cancel(id2)).toBe(true);
    jest.runAllTimers();
    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(b.onPress).not.toHaveBeenCalled();
  });

  it('ignores actions for an alert that is not shown', () => {
    const q = createAlertQueue();
    const first = q.push('Bir');
    const second = q.push('İki');
    expect(q.press(second, 0)).toBe(false);
    expect(q.confirm(second)).toBe(false);
    expect(q.cancel(second)).toBe(false);
    expect(q.press(first, 5)).toBe(false);
    expect(q.current()?.id).toBe(first);
  });

  it('unsubscribes listeners', () => {
    const q = createAlertQueue();
    const listener = jest.fn();
    const off = q.subscribe(listener);
    off();
    q.push('Bir');
    expect(listener).not.toHaveBeenCalled();
  });
});
