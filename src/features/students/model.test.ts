import { filterStudents, sortStudents, studentNumberKey, validateStudentDraft, type StudentListItem } from './model';

const s = (id: string, full_name: string, number: string | null): StudentListItem => ({ id, full_name, number });

describe('sortStudents', () => {
  it('orders by school number numerically, then name; students without a number last', () => {
    const list = [
      s('a', 'Zeynep Ak', null),
      s('b', 'Çağan Er', '12'),
      s('c', 'Ahmet Bal', '9'),
      s('d', 'Ceren Su', null),
      s('e', 'Burak Can', '105'),
      s('f', 'Ömer Tan', '12'),
    ];
    expect(sortStudents(list).map((x) => x.id)).toEqual(['c', 'b', 'f', 'e', 'd', 'a']);
  });

  it('uses Turkish collation for names (Ç after C, Ş after S, İ after I)', () => {
    const list = [s('1', 'Şule', null), s('2', 'Sena', null), s('3', 'Çınar', null), s('4', 'Cem', null), s('5', 'İlke', null), s('6', 'Irmak', null)];
    expect(sortStudents(list).map((x) => x.full_name)).toEqual(['Cem', 'Çınar', 'Irmak', 'İlke', 'Sena', 'Şule']);
  });

  it('does not mutate the input', () => {
    const list = [s('b', 'B', '2'), s('a', 'A', '1')];
    sortStudents(list);
    expect(list[0].id).toBe('b');
  });
});

describe('filterStudents', () => {
  const list = [s('1', 'Ayşe Yılmaz', '12'), s('2', 'Işıl Demir', '120'), s('3', 'Mehmet Öz', '7')];

  it('matches names ignoring Turkish case and diacritics', () => {
    expect(filterStudents(list, 'ayse').map((x) => x.id)).toEqual(['1']);
    expect(filterStudents(list, 'ISIL').map((x) => x.id)).toEqual(['2']);
    expect(filterStudents(list, 'oz').map((x) => x.id)).toEqual(['3']);
  });

  it('matches school number prefixes', () => {
    expect(filterStudents(list, '12').map((x) => x.id)).toEqual(['1', '2']);
  });

  it('returns everything for an empty query', () => {
    expect(filterStudents(list, '  ')).toHaveLength(3);
  });
});

describe('validateStudentDraft', () => {
  const others = [s('1', 'Ayşe Yılmaz', '12')];

  it('normalizes the name and empty number', () => {
    expect(validateStudentDraft({ fullName: ' selin BAYEZİT ', number: ' ' }, others)).toEqual({
      ok: true,
      value: { full_name: 'Selin Bayezit', number: null },
    });
  });

  it('requires a name', () => {
    const r = validateStudentDraft({ fullName: '   ', number: '3' }, others);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.fullName).toMatch(/adını/);
  });

  it('accepts alphanumeric school numbers, trimmed and uppercased', () => {
    expect(validateStudentDraft({ fullName: 'Ali Veli', number: ' 12a ' }, others)).toEqual({
      ok: true,
      value: { full_name: 'Ali Veli', number: '12A' },
    });
    expect(validateStudentDraft({ fullName: 'Ali Veli', number: '1234567B' }, others).ok).toBe(true);
  });

  it('rejects symbols and numbers longer than 8 characters', () => {
    const symbol = validateStudentDraft({ fullName: 'Ali Veli', number: '12-A' }, others);
    expect(!symbol.ok && symbol.errors.number).toMatch(/harf ve rakam/);
    const long = validateStudentDraft({ fullName: 'Ali Veli', number: '123456789' }, others);
    expect(!long.ok && long.errors.number).toMatch(/en fazla 8/);
  });

  it('skips format checks when an existing number is unchanged', () => {
    // Fotoğraftan içe aktarılmış, kurala uymayan eski numara düzenlemede engel olmaz.
    expect(validateStudentDraft({ fullName: 'Ali Veli', number: '2024-0012' }, others, '2024-0012')).toEqual({
      ok: true,
      value: { full_name: 'Ali Veli', number: '2024-0012' },
    });
    const changed = validateStudentDraft({ fullName: 'Ali Veli', number: '2024-0013' }, others, '2024-0012');
    expect(changed.ok).toBe(false);
  });

  it('detects duplicates ignoring leading zeros and case', () => {
    const dup = validateStudentDraft({ fullName: 'Ali Veli', number: '012' }, others);
    expect(!dup.ok && dup.errors.number).toMatch(/Ayşe Yılmaz/);
    const withLetter = [s('9', 'Can Er', '7b')];
    const dupLetter = validateStudentDraft({ fullName: 'Ali Veli', number: '007B' }, withLetter);
    expect(!dupLetter.ok && dupLetter.errors.number).toMatch(/Can Er/);
    expect(validateStudentDraft({ fullName: 'Ali Veli', number: '120' }, others).ok).toBe(true);
  });
});

describe('studentNumberKey', () => {
  it('strips leading zeros and folds case', () => {
    expect(studentNumberKey(' 0012a ')).toBe('12A');
    expect(studentNumberKey('000')).toBe('0');
    expect(studentNumberKey(null)).toBe('');
  });
});
