import type { ReviewRow } from '../review';
import { mergeParsed, parsePastedList, parseTypedLine } from './rows';

let n = 0;
const makeId = () => `id-${++n}`;
const row = (fullName: string, number = ''): ReviewRow => ({
  id: makeId(),
  fullName,
  number,
  include: true,
  photoId: null,
  ocrDigits: false,
});

describe('mergeParsed', () => {
  it('adds new students and skips ones already in the list or the class', () => {
    const rows = [row('Selin Bayezit', '112')];
    const result = mergeParsed(
      rows,
      [
        { number: '112', fullName: 'Selin Bayezit', warnings: [] },
        { number: '389', fullName: 'Burak Öztürk', warnings: [] },
        { number: '401', fullName: 'Efe Kaan', warnings: [] },
      ],
      'p1',
      [{ full_name: 'Burak Öztürk', number: '389' }],
      makeId,
    );
    expect(result.added).toBe(1);
    expect(result.skipped).toBe(2);
    expect(result.rows.map((r) => r.fullName)).toEqual(['Selin Bayezit', 'Efe Kaan']);
    expect(result.rows[1].photoId).toBe('p1');
  });
});

describe('parsePastedList', () => {
  it('reads one student per line with an optional leading school number', () => {
    expect(parsePastedList('12 ayşe yılmaz\n\nMehmet Kaya\n')).toEqual([
      { number: '12', fullName: 'Ayşe Yılmaz', warnings: [] },
      { number: null, fullName: 'Mehmet Kaya', warnings: [] },
    ]);
  });
});

describe('parsePastedList — e-Okul biçimleri', () => {
  it('ardışık okul numaraları korunur', () => {
    expect(parsePastedList('1 Ali Yılmaz\n2 Ayşe Kaya').map((s) => [s.number, s.fullName])).toEqual([
      ['1', 'Ali Yılmaz'],
      ['2', 'Ayşe Kaya'],
    ]);
    expect(parsePastedList('123\tAli Yılmaz\n124\tAyşe Kaya').map((s) => s.number)).toEqual(['123', '124']);
  });

  it('"1. Ali" liste sırasıdır', () => {
    expect(parsePastedList('1. Ali Yılmaz\n2. Ayşe Kaya').map((s) => s.number)).toEqual([null, null]);
  });
});

describe('parseTypedLine', () => {
  it('splits number and name', () => {
    expect(parseTypedLine('7 can su', makeId)).toMatchObject({ number: '7', fullName: 'Can Su', include: true });
  });

  it('keeps a bare number even when it is 1', () => {
    expect(parseTypedLine('1 Ali Yılmaz', makeId)).toMatchObject({ number: '1', fullName: 'Ali Yılmaz' });
  });

  it('ignores empty input', () => {
    expect(parseTypedLine('   ', makeId)).toBeNull();
  });
});
