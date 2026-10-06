import { photoImportUnavailableMessage } from './availability.web';
import { isExpoGo, loadTextReader, preparePhoto, recognizeMessages, recognizePhoto } from './recognize.web';

describe('OCR on web', () => {
  it('keeps the photo path closed with a Turkish explanation', () => {
    expect(photoImportUnavailableMessage()).toBe(recognizeMessages.webUnavailable);
    expect(recognizeMessages.webUnavailable).toMatch(/yalnızca mobil uygulamada/);
  });

  it('never loads a native reader and reports the web message', async () => {
    expect(isExpoGo()).toBe(false);
    expect(loadTextReader()).toBeNull();
    await expect(preparePhoto('blob:x')).resolves.toBe('blob:x');
    await expect(recognizePhoto()).resolves.toEqual({
      ok: false,
      reason: 'webUnavailable',
      message: recognizeMessages.webUnavailable,
    });
  });
});
