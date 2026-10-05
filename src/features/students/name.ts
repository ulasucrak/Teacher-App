/**
 * Öğrenci adlarını Türkçe kurallarla düzenler.
 * "serra güngör" → "Serra Güngör", "SELİN BAYEZİT" → "Selin Bayezit", "ılgaz" → "Ilgaz".
 */

const LOCALE = 'tr-TR';

function capitalizeWord(word: string): string {
  if (!word) return word;
  const [first, ...rest] = Array.from(word);
  return first.toLocaleUpperCase(LOCALE) + rest.join('').toLocaleLowerCase(LOCALE);
}

/** Tek bir kelimeyi (tire ve kesme işaretiyle ayrılmış parçalar dahil) baş harfi büyük yazar. */
function titleCaseToken(token: string): string {
  // "ali-rıza" → "Ali-Rıza"; kesme işaretinden sonrası küçük kalır ("d'ALEMBERT" → "D'alembert").
  return token
    .split('-')
    .map((part) => capitalizeWord(part))
    .join('-');
}

/** Boşlukları sadeleştirir ve her kelimeyi Türkçe baş harf büyük yazar. */
export function normalizeStudentName(input: string): string {
  return input
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map(titleCaseToken)
    .join(' ');
}

/** Türkçe büyük/küçük harf ve aksan farkını yok sayan arama anahtarı ("Ayşe" ~ "ayse"). */
export function foldForSearch(input: string): string {
  return input
    .toLocaleLowerCase(LOCALE)
    .replace(/ç/g, 'c')
    .replace(/ğ/g, 'g')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ş/g, 's')
    .replace(/ü/g, 'u')
    .replace(/[âà]/g, 'a')
    .replace(/[îì]/g, 'i')
    .replace(/[ûù]/g, 'u')
    .replace(/\s+/g, ' ')
    .trim();
}
