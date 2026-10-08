import type { GuardWindow } from './leaveGuard';

/* Yalnızca testler için: leaveGuard testlerinin sahte tarayıcı penceresi. */

type Listener = (event: Event) => void;

interface Entry {
  state: unknown;
  url: string;
}

/**
 * Tarayıcı geçmişinin küçük bir benzeri: pushState ileri kayıtları siler, back() popstate'i
 * eşzamansız gönderir; yakalama dinleyicileri önce çalışır, stopImmediatePropagation desteklenir.
 */
export class FakeWindow implements GuardWindow {
  entries: Entry[];
  index: number;
  capture: Listener[] = [];
  bubble: Listener[] = [];
  unload: Listener[] = [];
  /** expo-router'ın popstate dinleyicisi yerine. */
  appPops: string[] = [];

  constructor(url: string, state: unknown) {
    this.entries = [
      { url: '/', state: { id: 'home' } },
      { url, state },
    ];
    this.index = 1;
    this.bubble.push(() => this.appPops.push(this.location.href));
    Object.defineProperty(this.history, 'state', { get: () => this.entries[this.index].state });
  }

  history = {
    state: undefined as unknown,
    pushState: (data: unknown, _unused: string, url?: string | null) => {
      this.entries = this.entries.slice(0, this.index + 1);
      this.entries.push({ state: data, url: url ?? this.location.href });
      this.index = this.entries.length - 1;
    },
    replaceState: (data: unknown, _unused: string, url?: string | null) => {
      this.entries[this.index] = { state: data, url: url ?? this.location.href };
    },
    back: () => {
      setTimeout(() => this.go(-1), 0);
    },
  };

  get location() {
    return { href: this.entries[this.index].url };
  }

  /** Kullanıcının tarayıcıda geri / ileri gitmesi (eşzamanlı popstate). */
  go(delta: number) {
    const next = this.index + delta;
    if (next < 0 || next >= this.entries.length) return;
    this.index = next;
    let stopped = false;
    const event = { stopImmediatePropagation: () => (stopped = true) } as unknown as Event;
    for (const l of [...this.capture, ...this.bubble]) {
      if (stopped) break;
      l(event);
    }
  }

  unloadEvent() {
    const event = { preventDefault: jest.fn(), returnValue: undefined as unknown } as unknown as Event & {
      preventDefault: jest.Mock;
    };
    for (const l of this.unload) l(event);
    return event;
  }

  addEventListener(type: string, listener: Listener, options?: boolean | AddEventListenerOptions) {
    const capture = options === true || (typeof options === 'object' && options.capture);
    if (type === 'beforeunload') this.unload.push(listener);
    else if (type === 'popstate') (capture ? this.capture : this.bubble).push(listener);
  }

  removeEventListener(type: string, listener: Listener, options?: boolean | EventListenerOptions) {
    const capture = options === true || (typeof options === 'object' && options.capture);
    const remove = (list: Listener[]) => list.filter((l) => l !== listener);
    if (type === 'beforeunload') this.unload = remove(this.unload);
    else if (type === 'popstate') {
      if (capture) this.capture = remove(this.capture);
      else this.bubble = remove(this.bubble);
    }
  }
}

