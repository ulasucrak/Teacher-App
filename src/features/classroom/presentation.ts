/** Native: presentation remains a full-screen modal. */
export function requestPresentationFullscreen(): void {}
export function releasePresentationFullscreen(): void {}
export function subscribePresentationExit(_onExit: () => void): () => void { return () => {}; }
export function subscribeMotionPreference(update: (reduced: boolean) => void): () => void { update(false); return () => {}; }
