import { computeFitFontSize } from './fitText.web';

describe('computeFitFontSize (web adjustsFontSizeToFit karşılığı)', () => {
  it('sığan etiketin boyutuna dokunmaz', () => {
    expect(computeFitFontSize(15, 80, 60, 0.8)).toBe(15);
    expect(computeFitFontSize(15, 80, 80, 0.8)).toBe(15);
  });

  it('taşan etiketi oranla küçültür ve çeyrek piksele aşağı yuvarlar', () => {
    // 15 * 70/75 = 14 → tam sığar
    expect(computeFitFontSize(15, 70, 75, 0.8)).toBe(14);
    // 15 * 60/66 = 13.636… → 13.5
    expect(computeFitFontSize(15, 60, 66, 0.8)).toBe(13.5);
  });

  it('minimumFontScale altına inmez (iOS gibi kalan kısım "…" olur)', () => {
    expect(computeFitFontSize(15, 30, 100, 0.8)).toBe(12);
  });

  it('ölçülemeyen (0 genişlik) düğümde taban boyutta kalır', () => {
    expect(computeFitFontSize(15, 0, 100, 0.8)).toBe(15);
  });
});
