import { releasePresentationFullscreen, requestPresentationFullscreen, subscribeMotionPreference, subscribePresentationExit } from './presentation.web';

const listeners = new Map<string, (event?: unknown) => void>();
const documentMock = {
  fullscreenElement: null as object | null,
  documentElement: { requestFullscreen: jest.fn() },
  exitFullscreen: jest.fn(),
  addEventListener: jest.fn((key: string, callback) => listeners.set(key, callback)),
  removeEventListener: jest.fn((key: string) => listeners.delete(key)),
};
beforeEach(() => {
  jest.clearAllMocks(); listeners.clear();
  Object.defineProperty(globalThis, 'document', { value: documentMock, configurable: true });
  documentMock.fullscreenElement = null;
  documentMock.documentElement.requestFullscreen.mockImplementation(async () => { documentMock.fullscreenElement = documentMock.documentElement; });
  documentMock.exitFullscreen.mockImplementation(async () => { documentMock.fullscreenElement = null; });
});
afterEach(() => { releasePresentationFullscreen(); });

it('requests fullscreen, exits with Esc and removes listeners', async () => {
  const exit = jest.fn();
  const stop = subscribePresentationExit(exit);
  requestPresentationFullscreen();
  await Promise.resolve();
  expect(documentMock.documentElement.requestFullscreen).toHaveBeenCalled();
  listeners.get('keydown')?.({ key: 'Escape' });
  expect(exit).toHaveBeenCalled();
  releasePresentationFullscreen();
  expect(documentMock.exitFullscreen).toHaveBeenCalled();
  stop();
  expect(listeners.size).toBe(0);
});

it('closes when the browser consumes Esc to leave fullscreen', async () => {
  const exit = jest.fn();
  subscribePresentationExit(exit);
  requestPresentationFullscreen();
  await Promise.resolve();
  documentMock.fullscreenElement = null;
  listeners.get('fullscreenchange')?.();
  expect(exit).toHaveBeenCalled();
});

it('silently handles a denied request and leaves existing fullscreen alone', async () => {
  documentMock.documentElement.requestFullscreen.mockRejectedValueOnce(new Error('Denied'));
  requestPresentationFullscreen();
  await Promise.resolve(); await Promise.resolve();
  releasePresentationFullscreen();
  expect(documentMock.exitFullscreen).not.toHaveBeenCalled();
  documentMock.fullscreenElement = {};
  requestPresentationFullscreen();
  releasePresentationFullscreen();
  expect(documentMock.documentElement.requestFullscreen).toHaveBeenCalledTimes(1);
  expect(documentMock.exitFullscreen).not.toHaveBeenCalled();
});

it('releases a fullscreen request that finishes after the view closes', async () => {
  let finish = () => {};
  documentMock.documentElement.requestFullscreen.mockImplementation(() => new Promise<void>((resolve) => {
    finish = () => { documentMock.fullscreenElement = documentMock.documentElement; resolve(); };
  }));
  requestPresentationFullscreen();
  releasePresentationFullscreen();
  finish(); await Promise.resolve();
  expect(documentMock.exitFullscreen).toHaveBeenCalled();
});

it('tracks the web reduced-motion preference and cleans up', () => {
  const query = { matches: true, addEventListener: jest.fn(), removeEventListener: jest.fn() };
  Object.defineProperty(window, 'matchMedia', { value: jest.fn(() => query), configurable: true });
  const update = jest.fn();
  const stop = subscribeMotionPreference(update);
  expect(update).toHaveBeenCalledWith(true);
  query.matches = false;
  query.addEventListener.mock.calls[0][1]();
  expect(update).toHaveBeenCalledWith(false);
  stop();
  expect(query.removeEventListener).toHaveBeenCalled();
});
