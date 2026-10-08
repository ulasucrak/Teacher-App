import { avatarColors, colors, hardShadow, layout, paper, palette, pressedIn, tones, typography, type ToneName } from './index';

/** WCAG 2.x göreli parlaklık / kontrast oranı. */
function luminance(hex: string): number {
  const channel = (i: number) => {
    const v = parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * channel(0) + 0.7152 * channel(1) + 0.0722 * channel(2);
}
function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
}

describe('v3 "Pano ve Damga" renk kontrastları (WCAG AA metin ≥ 4.5:1)', () => {
  it('ana metin ve soluk metin zeminlerinde okunur', () => {
    expect(contrast(colors.text, colors.background)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(colors.textMuted, colors.background)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(colors.textMuted, colors.surfaceMuted)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(colors.onAccent, colors.accent)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(colors.accentPressed, colors.onAccent)).toBeGreaterThanOrEqual(4.5);
  });

  it('etkileşim, hata, damga ve pano renkleri okunur', () => {
    expect(contrast(colors.primary, colors.background)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(colors.textInverse, colors.board)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(colors.stamp, colors.background)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(colors.danger, colors.background)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(colors.danger, colors.dangerMuted)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(colors.onDangerSolid, colors.dangerSolid)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(colors.onDangerSolid, colors.dangerSolidPressed)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(colors.plusText, colors.background)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(colors.textInverse, colors.text)).toBeGreaterThanOrEqual(4.5); // toast, sayaç
    expect(contrast(colors.accent, colors.text)).toBeGreaterThanOrEqual(4.5); // toast eylemi (kurşun üstünde sarı)
  });

  it.each(Object.keys(tones) as ToneName[])('%s tonu: dolgu ve açık kâğıt üstünde yazı okunur', (name) => {
    const t = tones[name];
    expect(contrast(t.onSolid, t.solid)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(t.onSolid, t.solidPressed)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(t.onSoft, t.soft)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(t.onSoft, colors.background)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(colors.text, t.soft)).toBeGreaterThanOrEqual(4.5);
  });

  it('el işi kâğıdı renkleri ve avatar zeminleri kurşun yazıyla ≥ 9:1', () => {
    for (const hex of [...Object.values(paper), ...avatarColors]) {
      expect(contrast(colors.text, hex)).toBeGreaterThanOrEqual(9);
    }
  });

  it('eski palet adları geriye uyumlu (v1/v2 kodu kırılmaz)', () => {
    expect(palette.tukenmez).toBe(palette.pano);
    expect(palette.murekkep).toBe(palette.kursun);
    expect(colors.primary).toBe(palette.pano);
    expect(colors.marginRule).toBe(colors.rule);
  });
});

describe('sert gölge yardımcıları', () => {
  it('hardShadow bulanıksız (blur 0) ofsetli boxShadow üretir', () => {
    expect(hardShadow('md')).toEqual({ boxShadow: `4px 4px 0px ${colors.shadow}` });
    expect(hardShadow('xs', colors.primary)).toEqual({ boxShadow: `2px 2px 0px ${colors.primary}` });
    expect(hardShadow(6)).toEqual({ boxShadow: `6px 6px 0px ${colors.shadow}` });
  });

  it('pressedIn düğmeyi gölgesinin ofseti kadar kaydırır', () => {
    expect(pressedIn('md')).toEqual({ transform: [{ translateX: 4 }, { translateY: 4 }] });
  });
});

describe('ölçekler', () => {
  it('ayraç ve kenar kalınlıkları v3 değerlerinde', () => {
    expect(layout.hairline).toBe(2);
    expect(layout.inputBorder).toBe(2.5);
    expect(layout.buttonHeight).toBeGreaterThanOrEqual(layout.minTouch);
  });

  it('başlık varyantları Bricolage 800, vurgulu metin Atkinson 800', () => {
    for (const v of ['hero', 'poster', 'display', 'title', 'headline', 'heading'] as const) {
      expect(typography[v].fontFamily).toBe('BricolageGrotesque_800ExtraBold');
    }
    expect(typography.bodyStrong.fontFamily).toBe('AtkinsonHyperlegibleNext_800ExtraBold');
    expect(typography.poster.fontSize).toBeGreaterThan(typography.title.fontSize ?? 0);
  });
});
