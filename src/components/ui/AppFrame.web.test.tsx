import { appFrame, appFrameMode, overlayColumnStyle } from './AppFrame.web';

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

describe('overlayColumnStyle (masaüstünde Sheet paneli sütunda)', () => {
  it('dar ekranda yok: panel tüm ekranı kullanır', () => {
    expect(overlayColumnStyle(390, 844)).toBeNull();
  });

  it('yüzen kartta kartla aynı kutu: ortalı, üst/alt boşluklu, yuvarlak köşeli', () => {
    expect(overlayColumnStyle(1440, 900)).toMatchObject({
      position: 'absolute',
      left: (1440 - appFrame.width) / 2,
      width: appFrame.width,
      top: appFrame.inset,
      bottom: appFrame.inset,
      height: 900 - appFrame.inset * 2,
      borderRadius: appFrame.radius,
      overflow: 'hidden',
    });
  });

  it('alçak pencerede kenar boşluksuz, köşesiz sütun', () => {
    expect(overlayColumnStyle(1280, 650)).toMatchObject({ top: 0, bottom: 0, height: 650, borderRadius: 0 });
  });
});
