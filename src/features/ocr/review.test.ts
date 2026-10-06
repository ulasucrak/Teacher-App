import type { ParsedStudent } from './parser';
import { appendParsed, computeIssues, createManualRow, isLowConfidence, issueLabels, toDrafts, type ReviewRow } from './review';

function idMaker() {
  let n = 0;
  return () => {
    n += 1;
    return `t${n}`;
  };
}

const p = (fullName: string, number: string | null = null, warnings: ParsedStudent['warnings'] = []): ParsedStudent => ({
  fullName,
  number,
  warnings,
});

describe('appendParsed', () => {
  it('yeni satırları işaretli ekler, sınıfta olanları işaretsiz ekler', () => {
    const rows = appendParsed(
      [],
      [p('Selin Bayezit', '112'), p('Mehmet Kara', '245')],
      'photo-1',
      [{ full_name: 'Mehmet KARA', number: null }],
      idMaker(),
    );
    expect(rows.map((r) => [r.fullName, r.include, r.photoId])).toEqual([
      ['Selin Bayezit', true, 'photo-1'],
      ['Mehmet Kara', false, 'photo-1'],
    ]);
  });

  it('çakışan ikinci sayfadaki tekrarları işaretsiz ekler', () => {
    const make = idMaker();
    const first = appendParsed([], [p('Ali Veli', '1'), p('Can Su', '2')], 'a', [], make);
    const both = appendParsed(first, [p('Can Su', '2'), p('Deniz Ak', '3')], 'b', [], make);
    expect(both.map((r) => [r.fullName, r.include])).toEqual([
      ['Ali Veli', true],
      ['Can Su', true],
      ['Can Su', false],
      ['Deniz Ak', true],
    ]);
  });

  it('yalnızca numarası sınıftakiyle aynı olan satırı işaretli bırakır (regresyon)', () => {
    const rows = appendParsed(
      [],
      [p('Selin Bayezit', '112'), p('Can Su', '7'), p('Can Su', null)],
      'photo-1',
      [
        { full_name: 'Başka Öğrenci', number: '112' },
        { full_name: 'Can Su', number: '8' },
      ],
      idMaker(),
    );
    expect(rows.map((r) => r.include)).toEqual([true, true, false]);
    const issues = computeIssues(rows, [
      { full_name: 'Başka Öğrenci', number: '112' },
      { full_name: 'Can Su', number: '8' },
    ]);
    expect(issues.get(rows[0].id)).toEqual(['existingNumber']);
    expect(issues.get(rows[1].id)).toEqual(['existingName']);
    expect(issues.get(rows[2].id)).toEqual(['existing']);
  });

  it('okumada rakam düzeltildiyse bunu satırda saklar', () => {
    const [row] = appendParsed([], [p('Ahmet Yılmaz', '5', ['digits'])], 'a', [], idMaker());
    expect(row.ocrDigits).toBe(true);
  });
});

describe('computeIssues', () => {
  const row = (over: Partial<ReviewRow>): ReviewRow => ({
    id: over.id ?? 'x',
    number: '',
    fullName: 'Ayşe Yılmaz',
    include: true,
    photoId: null,
    ocrDigits: false,
    ...over,
  });

  it('sınıfta olan öğrenciyi ad + numaradan tanır, yalnızca numara tutuyorsa ayrı uyarır', () => {
    const issues = computeIssues(
      [row({ id: 'a', number: '12', fullName: 'Başka Ad' }), row({ id: 'b', fullName: 'AYŞE YILMAZ' })],
      [{ full_name: 'Ayşe Yılmaz', number: '12' }],
    );
    expect(issues.get('a')).toEqual(['existingNumber']);
    expect(issues.get('b')).toEqual(['existing']);
  });

  it('listede tekrar edeni ikinci satırda işaretler, hariç tutulanı saymaz', () => {
    const issues = computeIssues(
      [
        row({ id: 'a', number: '7' }),
        row({ id: 'b', number: '7', fullName: 'Ayse Yilmaz' }),
        row({ id: 'c', include: false }),
      ],
      [],
    );
    expect(issues.get('a')).toEqual([]);
    expect(issues.get('b')).toEqual(['repeated']);
    expect(issues.get('c')).toEqual([]);
  });

  it('düzenlenen addan düşük güven uyarılarını yeniden hesaplar', () => {
    const issues = computeIssues(
      [row({ id: 'a', fullName: 'Efe' }), row({ id: 'b', fullName: '  ' }), row({ id: 'c', ocrDigits: true })],
      [],
    );
    expect(issues.get('a')).toEqual(['short', 'singleWord']);
    expect(issues.get('b')).toEqual(['emptyName']);
    expect(issues.get('c')).toEqual(['digits']);
  });
});

describe('toDrafts', () => {
  it('yalnızca işaretli ve adı dolu satırları sade biçimde döner', () => {
    const make = idMaker();
    const manual = { ...createManualRow(make), fullName: '  Zeynep   Çelik ', number: ' 389 ' };
    const empty = createManualRow(make);
    const rows: ReviewRow[] = [
      manual,
      empty,
      { ...createManualRow(make), fullName: 'Burak Öz', include: false },
      { ...createManualRow(make), fullName: 'Can Er' },
    ];
    expect(toDrafts(rows)).toEqual([
      { fullName: 'Zeynep Çelik', number: '389' },
      { fullName: 'Can Er', number: null },
    ]);
  });
});

describe('düşük okuma güveni', () => {
  const low = (fullName: string, number: string | null, confidence?: number): ParsedStudent => ({
    ...p(fullName, number),
    ...(confidence === undefined ? {} : { confidence }),
  });

  it('eşik altındaki satırı işaretler; güven bilinmiyorsa işaretlemez', () => {
    expect(isLowConfidence({ confidence: 0.5 })).toBe(true);
    expect(isLowConfidence({ confidence: 1 })).toBe(false);
    expect(isLowConfidence({})).toBe(false);
    const rows = appendParsed([], [low('Ali Veli', '12', 0.5), low('Can Su', '13', 1), low('Ece Ak', '14')], 'a', [], idMaker());
    const issues = computeIssues(rows, []);
    expect(rows.map((r) => issues.get(r.id))).toEqual([['lowConfidence'], [], []]);
    expect(issueLabels.lowConfidence).toBe('Okuma belirsiz, kontrol edin');
  });

  it('öğretmen adı ya da numarayı düzeltince uyarı kalkar', () => {
    const [row] = appendParsed([], [low('Ali Veli', '12', 0.3)], 'a', [], idMaker());
    expect(computeIssues([{ ...row, fullName: 'Ali Velioğlu' }], []).get(row.id)).toEqual([]);
    expect(computeIssues([{ ...row, number: '21' }], []).get(row.id)).toEqual([]);
    expect(computeIssues([row], []).get(row.id)).toEqual(['lowConfidence']);
  });

  it('yineleme uyarıları önce gelir', () => {
    const rows = appendParsed([], [low('Ali Veli', '12', 0.3)], 'a', [{ full_name: 'Ali Veli', number: '12' }], idMaker());
    expect(computeIssues(rows, [{ full_name: 'Ali Veli', number: '12' }]).get(rows[0].id)).toEqual(['existing', 'lowConfidence']);
  });

  it('elle eklenen satırda uyarı yok', () => {
    const row = createManualRow(idMaker());
    expect(row.lowConfidenceRead).toBeUndefined();
  });
});
