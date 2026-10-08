let owned = false;
let requested = false;

/** Called directly from the entry gesture; unsupported/denied fullscreen is optional. */
export function requestPresentationFullscreen(): void {
  if (typeof document === 'undefined' || document.fullscreenElement || !document.documentElement.requestFullscreen) return;
  requested = true;
  try {
    void document.documentElement.requestFullscreen().then(() => {
      owned = true;
      if (!requested) releasePresentationFullscreen();
    }).catch(() => { requested = false; });
  } catch { requested = false; }
}

export function releasePresentationFullscreen(): void {
  requested = false;
  if (owned && document.fullscreenElement) {
    void document.exitFullscreen().catch(() => undefined);
  }
  owned = false;
}

export function subscribePresentationExit(onExit: () => void): () => void {
  const onKey = (event: KeyboardEvent) => {
    if (event.key === 'Escape' && !event.defaultPrevented) onExit();
  };
  // Browsers may consume Esc when leaving fullscreen before dispatching keydown.
  const onFullscreen = () => { if (owned && !document.fullscreenElement) { owned = false; onExit(); } };
  document.addEventListener('keydown', onKey);
  document.addEventListener('fullscreenchange', onFullscreen);
  return () => {
    document.removeEventListener('keydown', onKey);
    document.removeEventListener('fullscreenchange', onFullscreen);
  };
}

export function subscribeMotionPreference(update: (reduced: boolean) => void): () => void {
  if (typeof window.matchMedia !== 'function') return () => {};
  const query = window.matchMedia('(prefers-reduced-motion: reduce)');
  const sync = () => update(query.matches);
  sync();
  query.addEventListener('change', sync);
  return () => query.removeEventListener('change', sync);
}
