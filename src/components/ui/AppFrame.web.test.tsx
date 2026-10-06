import { appFrame, appFrameMode } from './AppFrame.web';

describe('appFrameMode (web masaüstü çerçevesi)', () => {
  it('dar ekranda (mobil web) tam genişlik', () => {
    expect(appFrameMode(390, 844)).toBe('full');
    expect(appFrameMode(appFrame.framedMinWidth - 1, 1000)).toBe('full');
  });

  it('geniş ama alçak pencerede kenar boşluksuz sütun', () => {
    expect(appFrameMode(1280, 650)).toBe('framed');
  });

  it('geniş ve yeterince yüksek pencerede yüzen kart', () => {
    expect(appFrameMode(1440, 900)).toBe('floating');
    expect(appFrameMode(appFrame.framedMinWidth, appFrame.floatingMinHeight)).toBe('floating');
  });

  it('sütun, çerçeve eşiğine iki yanda boşluk bırakacak kadar dar', () => {
    expect(appFrame.width).toBeLessThan(appFrame.framedMinWidth);
  });
});
