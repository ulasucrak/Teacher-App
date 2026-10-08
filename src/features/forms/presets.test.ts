import { PRESETS, formPaper, presetIcon } from './presets';

describe('formPaper', () => {
  it('gives each preset a fixed paper colour (mockup): yoklama mint, artı/eksi sky, sözlü lilac, ödev orange, katılım pink', () => {
    expect(formPaper('Yoklama')).toBe('nane');
    expect(formPaper('Artı / eksi')).toBe('gok');
    expect(formPaper('Sözlü')).toBe('lila');
    expect(formPaper('Ödev kontrolü')).toBe('turuncu');
    expect(formPaper('Derse katılım')).toBe('pembe');
  });

  it('matches by preset id as well as by title, ignoring case', () => {
    expect(formPaper('artieksi')).toBe('gok');
    expect(formPaper('  YOKLAMA ')).toBe('nane');
    for (const p of PRESETS) expect(formPaper(p.id)).toBe(formPaper(p.title));
  });

  it('cycles custom forms through non-yellow papers (yellow stays the main action)', () => {
    const colors = [0, 1, 2, 3, 4, 5].map((i) => formPaper('Proje notu', i));
    expect(colors).not.toContain('sari');
    expect(new Set(colors).size).toBe(5);
    expect(colors[5]).toBe(colors[0]);
  });
});

describe('presetIcon', () => {
  it('uses the speech and plus-minus glyphs of the mockup', () => {
    expect(presetIcon('Sözlü')).toBe('speech');
    expect(presetIcon('Artı / eksi')).toBe('plusMinus');
    expect(presetIcon('Yoklama')).toBe('checklist');
    expect(presetIcon('Bilinmeyen')).toBe('list');
  });
});
