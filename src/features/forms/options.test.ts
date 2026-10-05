import {
  MAX_OPTIONS,
  createDraftOption,
  finalizeOptions,
  moveOption,
  normalizeLabel,
  parseOptions,
  removedOptions,
  slugify,
  toDraftOptions,
  uniqueKey,
  validateForm,
  type DraftOption,
} from './options';
import { PRESETS } from './presets';

function draft(label: string, key: string | null = null, tone: DraftOption['tone'] = 'neutral'): DraftOption {
  return { ...createDraftOption(tone), key, label };
}

describe('slugify', () => {
  it('turns Turkish characters into ASCII', () => {
    expect(slugify('Geç geldi')).toBe('gec_geldi');
    expect(slugify('İzinli')).toBe('izinli');
    expect(slugify('Çok iyi')).toBe('cok_iyi');
    expect(slugify('Zayıf')).toBe('zayif');
    expect(slugify('ŞÜĞÖ ışık')).toBe('sugo_isik');
    expect(slugify('Yapmadı')).toBe('yapmadi');
  });

  it('collapses punctuation and trims separators', () => {
    expect(slugify('  Ödev / Proje!! ')).toBe('odev_proje');
    expect(slugify('5')).toBe('5');
  });

  it('falls back when nothing is left', () => {
    expect(slugify('')).toBe('secenek');
    expect(slugify('—!?')).toBe('secenek');
  });
});

describe('uniqueKey', () => {
  it('appends a counter when taken', () => {
    expect(uniqueKey('eksik', new Set())).toBe('eksik');
    expect(uniqueKey('eksik', new Set(['eksik']))).toBe('eksik_2');
    expect(uniqueKey('eksik', new Set(['eksik', 'eksik_2']))).toBe('eksik_3');
  });
});

describe('finalizeOptions', () => {
  it('keeps existing keys when a label is renamed', () => {
    const result = finalizeOptions([draft('Derse geldi', 'geldi', 'positive')]);
    expect(result).toEqual([{ key: 'geldi', label: 'Derse geldi', tone: 'positive' }]);
  });

  it('generates keys once for new options without colliding', () => {
    const result = finalizeOptions([draft('Geldi', 'geldi'), draft('  Geldi  '), draft('Geç  geldi')]);
    expect(result.map((o) => o.key)).toEqual(['geldi', 'geldi_2', 'gec_geldi']);
    expect(result[1]?.label).toBe('Geldi');
    expect(result[2]?.label).toBe('Geç geldi');
  });
});

describe('finalizeOptions with saved keys', () => {
  it('never reuses the key of a removed saved option', () => {
    // "Gelmedi" (gelmedi) kaldırıldı, aynı adla yeni seçenek eklendi.
    const result = finalizeOptions([draft('Geldi', 'geldi'), draft('Gelmedi')], ['geldi', 'gelmedi']);
    expect(result.map((o) => o.key)).toEqual(['geldi', 'gelmedi_2']);
  });
});

describe('moveOption', () => {
  it('moves up and down within bounds', () => {
    expect(moveOption(['a', 'b', 'c'], 1, -1)).toEqual(['b', 'a', 'c']);
    expect(moveOption(['a', 'b', 'c'], 1, 1)).toEqual(['a', 'c', 'b']);
    expect(moveOption(['a', 'b', 'c'], 0, -1)).toEqual(['a', 'b', 'c']);
    expect(moveOption(['a', 'b', 'c'], 2, 1)).toEqual(['a', 'b', 'c']);
  });
});

describe('validateForm', () => {
  const base = { title: 'Yoklama', subject: '', description: '' };

  it('accepts a valid form', () => {
    const v = validateForm({ ...base, options: [draft('Geldi'), draft('Gelmedi')] });
    expect(v.valid).toBe(true);
  });

  it('requires a title', () => {
    const v = validateForm({ ...base, title: '   ', options: [draft('A'), draft('B')] });
    expect(v.valid).toBe(false);
    expect(v.title).toBeDefined();
  });

  it('requires at least two and at most twelve options', () => {
    expect(validateForm({ ...base, options: [draft('A')] }).options).toMatch(/En az 2/);
    const many = Array.from({ length: MAX_OPTIONS + 1 }, (_, i) => draft(`S${i}`));
    expect(validateForm({ ...base, options: many }).options).toMatch(/En fazla 12/);
  });

  it('flags empty and duplicate labels (Turkish case-insensitive)', () => {
    const a = draft('İzinli');
    const b = draft('izinli');
    const c = draft('  ');
    const v = validateForm({ ...base, options: [a, b, c] });
    expect(v.valid).toBe(false);
    expect(v.optionErrors[a.id]).toBeUndefined();
    expect(v.optionErrors[b.id]).toMatch(/başka bir seçenekte/);
    expect(v.optionErrors[c.id]).toMatch(/boş olamaz/);
  });

  it('normalizes labels with Turkish casing', () => {
    expect(normalizeLabel('  İYİ  ')).toBe('iyi');
    expect(normalizeLabel('IŞIK')).toBe('ışık');
  });
});

describe('removedOptions', () => {
  it('lists saved options that are no longer in the draft', () => {
    const original = PRESETS[0]!.options;
    const drafts = toDraftOptions(original).filter((d) => d.key !== 'izinli');
    drafts.push(draft('Yeni'));
    expect(removedOptions(original, drafts).map((o) => o.key)).toEqual(['izinli']);
  });
});

describe('parseOptions', () => {
  it('keeps only valid option objects', () => {
    expect(
      parseOptions([
        { key: 'a', label: 'A', tone: 'positive' },
        { key: 'b', label: 'B', tone: 'loud' },
        null,
        'x',
      ]),
    ).toEqual([{ key: 'a', label: 'A', tone: 'positive' }]);
    expect(parseOptions(null)).toEqual([]);
  });
});

describe('PRESETS', () => {
  it('are valid forms with unique keys', () => {
    for (const preset of PRESETS) {
      const v = validateForm({
        title: preset.title,
        subject: '',
        description: '',
        options: toDraftOptions(preset.options),
      });
      expect(v.valid).toBe(true);
      const keys = preset.options.map((o) => o.key);
      expect(new Set(keys).size).toBe(keys.length);
    }
  });

  it('match the agreed option lists', () => {
    const byId = Object.fromEntries(PRESETS.map((p) => [p.id, p.options.map((o) => `${o.label}:${o.tone}`)]));
    expect(byId.yoklama).toEqual(['Geldi:positive', 'Gelmedi:negative', 'Geç geldi:warning', 'İzinli:neutral']);
    expect(byId.odev).toEqual([
      'Tamamlandı:positive',
      'Eksik:warning',
      'Getirmedi:negative',
      'Geç getirdi:warning',
      'Yapmadı:negative',
      'Gelmedi:neutral',
    ]);
    expect(byId.sozlu).toEqual(['5:positive', '4:positive', '3:neutral', '2:warning', '1:negative']);
    expect(byId.katilim).toEqual(['Çok iyi:positive', 'İyi:positive', 'Orta:neutral', 'Zayıf:negative']);
  });
});
