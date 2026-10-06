import { Alert, Platform, type AlertButton, type AlertOptions } from 'react-native';

/** Düğme türü: iOS Alert ile aynı (iptal kalın, yıkıcı kırmızı, varsayılan düz). */
export type AlertButtonKind = 'default' | 'cancel' | 'destructive';

/** Uygulama içi iletişim kutusunda gösterilen tek düğme. */
export interface AlertDialogButton {
  /** `Alert.alert`'e verilen dizideki sıra (testID: `alert-button-<index>`). */
  index: number;
  text: string;
  kind: AlertButtonKind;
  onPress?: () => void;
}

/** Kuyruktaki bir `Alert.alert` çağrısı. */
export interface AlertRequest {
  id: number;
  title: string;
  message?: string;
  /** Ekranda görünen sırayla (iOS düzeni; bkz. `mapAlertButtons`). */
  buttons: AlertDialogButton[];
  /** Escape ile basılan düğmenin `index`'i; yoksa `null` (Escape yalnızca `cancelable` ise kapatır). */
  cancelIndex: number | null;
  /** Enter ile basılan düğmenin `index`'i. */
  primaryIndex: number;
  /** İkiden çok düğme alt alta dizilir. */
  stacked: boolean;
  /** Düğmesiz kapatılabilir mi (Escape, iptal düğmesi yoksa). */
  cancelable: boolean;
  onDismiss?: () => void;
}

/** Düğme verilmezse gösterilen tek düğmenin adı (iOS "OK" karşılığı). */
export const DEFAULT_BUTTON_TEXT = 'Tamam';

export interface MappedButtons {
  buttons: AlertDialogButton[];
  cancelIndex: number | null;
  primaryIndex: number;
  stacked: boolean;
}

/**
 * `Alert.alert` düğmelerini iletişim kutusu düzenine çevirir (iOS UIAlertController gibi):
 * - Düğme yoksa tek "Tamam".
 * - En çok iki düğme yan yana; iptal düğmesi solda. İkiden çoksa alt alta; iptal en altta.
 * - Escape → iptal düğmesi (tek düğmeli bilgi kutusunda o düğme).
 * - Enter → iptal olmayan ilk yıkıcı düğme, yoksa iptal olmayan son düğme, yoksa iptal.
 */
export function mapAlertButtons(input?: AlertButton[]): MappedButtons {
  const source: AlertButton[] = input && input.length > 0 ? input : [{ text: DEFAULT_BUTTON_TEXT }];
  const all: AlertDialogButton[] = source.map((b, index) => ({
    index,
    text: b.text || DEFAULT_BUTTON_TEXT,
    kind: b.style === 'cancel' || b.style === 'destructive' ? b.style : 'default',
    onPress: b.onPress ? () => b.onPress?.() : undefined,
  }));
  // iOS yalnızca bir iptal düğmesi gösterir; ilkini iptal sayarız, diğerleri sıradan kalır.
  const cancel = all.find((b) => b.kind === 'cancel') ?? null;
  const others = all.filter((b) => b !== cancel).map((b) => (b.kind === 'cancel' ? { ...b, kind: 'default' as const } : b));
  const stacked = all.length > 2;
  const buttons = cancel ? (stacked ? [...others, cancel] : [cancel, ...others]) : others;
  const primary = others.find((b) => b.kind === 'destructive') ?? others[others.length - 1] ?? cancel;
  const cancelIndex = cancel ? cancel.index : all.length === 1 ? all[0].index : null;
  return { buttons, cancelIndex, primaryIndex: primary ? primary.index : 0, stacked };
}

type Listener = () => void;

/** `Alert.alert` çağrılarını sırayla gösteren kuyruk: aynı anda tek iletişim kutusu. */
export interface AlertQueue {
  push: (title: string, message?: string, buttons?: AlertButton[], options?: AlertOptions) => number;
  /** Ekranda olması gereken istek (kuyruğun başı) ya da `null`. */
  current: () => AlertRequest | null;
  /** Bekleyen istek sayısı (gösterilen dahil). */
  size: () => number;
  subscribe: (listener: Listener) => () => void;
  /**
   * Düğmeye basıldı: istek kapanır, düğmenin eylemi bir sonraki görev turunda çalışır.
   * `beforeRemove` dinleyicisinde açılan onayda `navigation.dispatch` süren gezinmenin
   * ortasında tetiklenmez. Gösterilen istek değilse (çift tıklama) yok sayılır.
   */
  press: (id: number, buttonIndex: number) => boolean;
  /** Escape: iptal düğmesine basar; iptal yoksa ve `cancelable` ise düğmesiz kapatır. */
  cancel: (id: number) => boolean;
  /** Enter: birincil düğmeye basar. */
  confirm: (id: number) => boolean;
}

export function createAlertQueue(schedule: (fn: () => void) => void = (fn) => setTimeout(fn, 0)): AlertQueue {
  let items: AlertRequest[] = [];
  let nextId = 1;
  const listeners = new Set<Listener>();
  const notify = () => listeners.forEach((l) => l());

  const close = (id: number, action?: () => void): boolean => {
    if (items[0]?.id !== id) return false;
    items = items.slice(1);
    notify();
    if (action) schedule(action);
    return true;
  };

  const press = (id: number, buttonIndex: number): boolean => {
    const head = items[0];
    if (!head || head.id !== id) return false;
    const button = head.buttons.find((b) => b.index === buttonIndex);
    if (!button) return false;
    return close(id, button.onPress);
  };

  return {
    push(title, message, buttons, options) {
      const id = nextId++;
      items = [
        ...items,
        {
          id,
          title,
          message: message || undefined,
          ...mapAlertButtons(buttons),
          cancelable: options?.cancelable ?? false,
          onDismiss: options?.onDismiss,
        },
      ];
      notify();
      return id;
    },
    current: () => items[0] ?? null,
    size: () => items.length,
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    press,
    cancel(id) {
      const head = items[0];
      if (!head || head.id !== id) return false;
      if (head.cancelIndex !== null) return press(id, head.cancelIndex);
      if (!head.cancelable) return false;
      return close(id, head.onDismiss);
    },
    confirm(id) {
      const head = items[0];
      if (!head || head.id !== id) return false;
      return press(id, head.primaryIndex);
    },
  };
}

/** Uygulamanın tek kuyruğu; web'de `AlertDialogHost` bunu gösterir. */
export const alertQueue = createAlertQueue();

let installed = false;

/**
 * Web'de `Alert.alert`'i uygulama içi iletişim kutusuna bağlar (react-native-web'de `Alert.alert`
 * hiçbir şey yapmaz). Çağrılar `alertQueue`'ya eklenir; `AlertDialogHost` (app/_layout.tsx) gösterir.
 * Mobilde hiçbir şey yapmaz: gerçek sistem Alert'i kalır.
 */
export function installWebAlert(): void {
  if (Platform.OS !== 'web' || installed || typeof window === 'undefined') return;
  installed = true;
  Alert.alert = (title, message, buttons, options) => {
    alertQueue.push(title, message, buttons, options);
  };
}
