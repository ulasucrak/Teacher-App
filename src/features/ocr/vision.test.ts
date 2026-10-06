import { parseOcrResult } from './parser';
import { VISION_OPTIONS, visionToOcrResult } from './vision';

describe('visionToOcrResult', () => {
  it("Vision'ın normalize sol-alt orijinli kutusunu piksel, sol-üst orijinli ML Kit çerçevesine çevirir", () => {
    const result = visionToOcrResult({
      width: 1000,
      height: 2000,
      observations: [
        // Sayfanın en altı: y=0 (alt kenar). Üst kenarı alttan 0.05 yukarıda.
        { text: 'alt', confidence: 1, x: 0.1, y: 0, width: 0.5, height: 0.05 },
        // Sayfanın en üstü: y + height = 1.
        { text: 'üst', confidence: 1, x: 0.25, y: 0.9, width: 0.2, height: 0.1 },
      ],
    });
    expect(result.blocks[0].lines[0].frame).toEqual({ left: 100, top: 1900, width: 500, height: 100 });
    const top = result.blocks[1].lines[0].frame;
    expect(top).toMatchObject({ left: 250, width: 200, height: 200 });
    expect(top?.top).toBeCloseTo(0, 6);
  });

  it('dik olmayan (yatay) görüntüde en ve boyu ayrı ölçekler', () => {
    const [block] = visionToOcrResult({
      width: 2000,
      height: 1000,
      observations: [{ text: 'a', confidence: 1, x: 0.5, y: 0.5, width: 0.25, height: 0.1 }],
    }).blocks;
    expect(block.lines[0].frame).toEqual({ left: 1000, top: 400, width: 500, height: 100 });
  });

  it('her gözlemi tek satırlı ayrı blok yapar, boş metinleri atar, düz metni birleştirir', () => {
    const result = visionToOcrResult({
      width: 100,
      height: 100,
      observations: [
        { text: 'Ali Veli', confidence: 1, x: 0, y: 0.8, width: 0.5, height: 0.1 },
        { text: '   ', confidence: 0, x: 0, y: 0.5, width: 0.5, height: 0.1 },
        { text: 'Ayşe Kaya', confidence: 1, x: 0, y: 0.6, width: 0.5, height: 0.1 },
      ],
    });
    expect(result.blocks.map((b) => b.lines.map((l) => l.text))).toEqual([['Ali Veli'], ['Ayşe Kaya']]);
    expect(result.text).toBe('Ali Veli\nAyşe Kaya');
  });

  it('güveni, aday okumaları ve köşe noktalarını (piksel, sol-üst orijin) aktarır', () => {
    const [block] = visionToOcrResult({
      width: 1000,
      height: 2000,
      observations: [
        {
          text: 'DOGAN',
          confidence: 0.5,
          x: 0.1,
          y: 0.5,
          width: 0.2,
          height: 0.05,
          candidates: [
            { text: 'DOGAN', confidence: 0.5 },
            { text: 'DOĞAN', confidence: 0.3 },
          ],
          corners: [
            { x: 0.1, y: 0.55 },
            { x: 0.3, y: 0.56 },
            { x: 0.3, y: 0.51 },
            { x: 0.1, y: 0.5 },
          ],
        },
      ],
    }).blocks;
    const [line] = block.lines;
    expect(line.confidence).toBe(0.5);
    expect(line.candidates?.map((c) => c.text)).toEqual(['DOGAN', 'DOĞAN']);
    expect(line.cornerPoints?.[0].x).toBeCloseTo(100, 6);
    expect(line.cornerPoints?.[0].y).toBeCloseTo(900, 6);
    expect(line.cornerPoints?.[1].y).toBeCloseTo(880, 6);
    expect(line.cornerPoints?.[3].y).toBeCloseTo(1000, 6);
  });

  it('eski modül çıktısında (aday/köşe yok) yalnızca güveni aktarır', () => {
    const [block] = visionToOcrResult({
      width: 10,
      height: 10,
      observations: [{ text: 'a', confidence: 1, x: 0, y: 0, width: 1, height: 1 }],
    }).blocks;
    expect(block.lines[0]).not.toHaveProperty('candidates');
    expect(block.lines[0]).not.toHaveProperty('cornerPoints');
  });

  it('gözlem yoksa boş sonuç döner', () => {
    expect(visionToOcrResult({ width: 10, height: 10, observations: [] })).toEqual({ text: '', blocks: [] });
  });

  it("parser'la uçtan uca: üstten alta sıralar, sayı ve ad sütunlarını aynı satırda birleştirir", () => {
    // Vision sırası karışık; sütunlar ayrı gözlemler (numara | ad). Üst satır y büyük olandır.
    const students = parseOcrResult(
      visionToOcrResult({
        width: 1000,
        height: 1000,
        observations: [
          { text: 'Ömer Güneş', confidence: 1, x: 0.2, y: 0.7, width: 0.3, height: 0.03 },
          { text: '112', confidence: 1, x: 0.05, y: 0.8, width: 0.05, height: 0.03 },
          { text: 'İrem Şahin', confidence: 1, x: 0.2, y: 0.8, width: 0.3, height: 0.03 },
          { text: '245', confidence: 1, x: 0.05, y: 0.7, width: 0.05, height: 0.03 },
        ],
      }),
    );
    expect(students).toEqual([
      { number: '112', fullName: 'İrem Şahin', warnings: [], confidence: 1 },
      { number: '245', fullName: 'Ömer Güneş', warnings: [], confidence: 1 },
    ]);
  });
});

describe('VISION_OPTIONS', () => {
  it('Türkçe dil ve dil düzeltmesi açık', () => {
    expect(VISION_OPTIONS).toEqual({ languages: ['tr-TR'], usesLanguageCorrection: true });
  });
});
