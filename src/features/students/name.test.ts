import { foldForSearch, normalizeStudentName } from './name';

describe('normalizeStudentName', () => {
  it.each([
    ['serra güngör', 'Serra Güngör'],
    ['SELİN BAYEZİT', 'Selin Bayezit'],
    ['ılgaz IŞIK', 'Ilgaz Işık'],
    ['  ayşe   nur  yılmaz ', 'Ayşe Nur Yılmaz'],
    ['ali-rıza ÇELİK', 'Ali-Rıza Çelik'],
    ['iREM öZTÜRK', 'İrem Öztürk'],
    ['', ''],
  ])('%p -> %p', (input, expected) => {
    expect(normalizeStudentName(input)).toBe(expected);
  });
});

describe('foldForSearch', () => {
  it('ignores Turkish case and diacritics', () => {
    expect(foldForSearch('AYŞE Işık')).toBe('ayse isik');
    expect(foldForSearch('İPEK Çağlar Ünlü Göğüş')).toBe('ipek caglar unlu gogus');
  });
});
