import { appFrame, appFrameMode, overlayColumnStyle } from './AppFrame.web';

describe('appFrameMode (web masaüstü çerçevesi)', () => {
  it('dar ekranda (mobil web) tam genişlik', () => {
    expect(appFrameMode(390, 844)).toBe('full');
    expect(appFrameMode(appFrame.framedMinWidth - 1, 1000)).toBe('full');
  });

  it('geniş pencerede masa üstünde kâğıt sütun', () => {
    expect(appFrameMode(1280, 650)).toBe('framed');
    expect(appFrameMode(appFrame.framedMinWidth, 400)).toBe('framed');
  });

  it('sütun, çerçeve eşiğine iki yanda boşluk bırakacak kadar dar', () => {
    expect(appFrame.width).toBeLessThan(appFrame.framedMinWidth);
  });
});

describe('overlayColumnStyle (masaüstünde Sheet paneli sütunda)', () => {
  it('dar ekranda yok: panel tüm ekranı kullanır', () => {
    expect(overlayColumnStyle(390, 844)).toBeNull();
  });

  it('kâğıt sütunun iç kutusu: ortalı, çerçevenin içinde, alta yaslı, üst köşeleri yuvarlak', () => {
    const top = appFrame.inset + appFrame.border;
    expect(overlayColumnStyle(1440, 900)).toMatchObject({
      position: 'absolute',
      left: (1440 - appFrame.width) / 2 + appFrame.border,
      width: appFrame.width - appFrame.border * 2,
      top,
      bottom: 0,
      height: 900 - top,
      borderTopLeftRadius: appFrame.radius - appFrame.border,
      borderTopRightRadius: appFrame.radius - appFrame.border,
      overflow: 'hidden',
    });
  });

  it('uygulama çubuğu varsa sütun onun altından başlar', () => {
    const style = overlayColumnStyle(1440, 900, 68);
    expect(style).toMatchObject({ top: 68 + appFrame.inset + appFrame.border, bottom: 0 });
  });
});
