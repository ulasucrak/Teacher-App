import { Alert, Platform, type AlertButton } from 'react-native';

/** Tarayıcı iletişim kutuları (test için enjekte edilebilir). */
export interface BrowserDialogs {
  alert: (text: string) => void;
  confirm: (text: string) => boolean;
}

function dialogText(title: string, message?: string): string {
  return message ? `${title}\n\n${message}` : title;
}

/**
 * `Alert.alert`'in tarayıcı karşılığı. react-native-web'de `Alert.alert` hiçbir şey yapmaz;
 * uygulamadaki onaylar (vazgeç + eylem) `window.confirm` ile sorulur.
 * - Düğme yok / tek düğme: bilgi kutusu, ardından (varsa) düğmenin eylemi.
 * - Birden çok düğme: "Tamam" → iptal olmayan ilk yıkıcı (yoksa son) düğme; "İptal" → iptal düğmesi.
 */
export function showBrowserAlert(
  dialogs: BrowserDialogs,
  title: string,
  message?: string,
  buttons?: AlertButton[],
): void {
  const text = dialogText(title, message);
  const list = buttons ?? [];
  if (list.length <= 1) {
    dialogs.alert(text);
    list[0]?.onPress?.();
    return;
  }
  const cancel = list.find((b) => b.style === 'cancel');
  const actions = list.filter((b) => b !== cancel);
  const primary = actions.find((b) => b.style === 'destructive') ?? actions[actions.length - 1];
  if (dialogs.confirm(text)) primary?.onPress?.();
  else cancel?.onPress?.();
}

let installed = false;

/** Web'de `Alert.alert`'i tarayıcı iletişim kutularına bağlar. Mobilde hiçbir şey yapmaz. */
export function installWebAlert(): void {
  if (Platform.OS !== 'web' || installed || typeof window === 'undefined') return;
  installed = true;
  const dialogs: BrowserDialogs = {
    alert: (text) => window.alert(text),
    confirm: (text) => window.confirm(text),
  };
  Alert.alert = (title, message, buttons) => showBrowserAlert(dialogs, title, message, buttons);
}
