import { showBrowserAlert, type BrowserDialogs } from './platformAlert';

function dialogs(confirmResult: boolean) {
  return {
    alert: jest.fn<void, [string]>(),
    confirm: jest.fn<boolean, [string]>(() => confirmResult),
  } satisfies BrowserDialogs;
}

describe('showBrowserAlert', () => {
  const cancel = { text: 'Vazgeç', style: 'cancel' as const, onPress: jest.fn() };
  const destroy = { text: 'Listeyi sil', style: 'destructive' as const, onPress: jest.fn() };

  beforeEach(() => jest.clearAllMocks());

  it('runs the destructive action when the user confirms', () => {
    const d = dialogs(true);
    showBrowserAlert(d, 'Liste silinsin mi?', 'Eklemediğiniz öğrenciler kaybolur.', [cancel, destroy]);
    expect(d.confirm).toHaveBeenCalledWith('Liste silinsin mi?\n\nEklemediğiniz öğrenciler kaybolur.');
    expect(destroy.onPress).toHaveBeenCalledTimes(1);
    expect(cancel.onPress).not.toHaveBeenCalled();
  });

  it('runs the cancel button when the user declines', () => {
    const d = dialogs(false);
    showBrowserAlert(d, 'Çıkılsın mı?', undefined, [cancel, destroy]);
    expect(d.confirm).toHaveBeenCalledWith('Çıkılsın mı?');
    expect(destroy.onPress).not.toHaveBeenCalled();
    expect(cancel.onPress).toHaveBeenCalledTimes(1);
  });

  it('falls back to the last non-cancel button when none is destructive', () => {
    const first = { text: 'A', onPress: jest.fn() };
    const last = { text: 'B', onPress: jest.fn() };
    showBrowserAlert(dialogs(true), 'Seçin', undefined, [first, cancel, last]);
    expect(last.onPress).toHaveBeenCalledTimes(1);
    expect(first.onPress).not.toHaveBeenCalled();
  });

  it('shows a plain alert for zero or one button', () => {
    const d = dialogs(true);
    const ok = { text: 'Tamam', onPress: jest.fn() };
    showBrowserAlert(d, 'Bilgi', 'Kaydedildi', [ok]);
    showBrowserAlert(d, 'Bilgi');
    expect(d.alert).toHaveBeenCalledTimes(2);
    expect(d.confirm).not.toHaveBeenCalled();
    expect(ok.onPress).toHaveBeenCalledTimes(1);
  });
});
