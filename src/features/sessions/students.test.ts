import { filterStudents, sortStudents } from './students';

const s = (full_name: string, number: string | null) => ({ full_name, number });

describe('sortStudents', () => {
  it('sorts by school number numerically, then name, numberless last', () => {
    const sorted = sortStudents([
      s('Zeynep Kaya', '112'),
      s('Ömer Aslan', null),
      s('Ali Demir', '9'),
      s('Çağla Er', null),
      s('Berk Su', '45'),
    ]);
    expect(sorted.map((x) => x.full_name)).toEqual(['Ali Demir', 'Berk Su', 'Zeynep Kaya', 'Çağla Er', 'Ömer Aslan']);
  });

  it('uses Turkish collation for names', () => {
    const sorted = sortStudents([s('Şule', null), s('Sena', null), s('Ilgaz', null), s('İpek', null), s('Cem', null), s('Çınar', null)]);
    expect(sorted.map((x) => x.full_name)).toEqual(['Cem', 'Çınar', 'Ilgaz', 'İpek', 'Sena', 'Şule']);
  });

  it('does not mutate the input', () => {
    const input = [s('B', '2'), s('A', '1')];
    sortStudents(input);
    expect(input[0].full_name).toBe('B');
  });
});

describe('filterStudents', () => {
  const list = [s('İrem Işık', '12'), s('Serra Güngör', '121'), s('Selin Bayezit', '7')];

  it('matches names with Turkish lower-casing', () => {
    expect(filterStudents(list, 'irem').map((x) => x.full_name)).toEqual(['İrem Işık']);
    expect(filterStudents(list, 'IŞIK').map((x) => x.full_name)).toEqual(['İrem Işık']);
    expect(filterStudents(list, 'se').map((x) => x.full_name)).toEqual(['Serra Güngör', 'Selin Bayezit']);
  });

  it('matches number prefixes', () => {
    expect(filterStudents(list, '12').map((x) => x.full_name)).toEqual(['İrem Işık', 'Serra Güngör']);
  });

  it('returns everything for an empty query', () => {
    expect(filterStudents(list, '  ')).toBe(list);
  });
});
