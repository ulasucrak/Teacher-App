import { avatarColors } from '@/theme';

const TR = 'tr-TR';

/**
 * Ad soyaddan baş harfler: ilk ve son kelimenin ilk harfi, Türkçe büyütme ile
 * ("ilkay şahin" → "İŞ"). Boş isim için "?".
 */
export function getInitials(name: string): string {
  const words = name
    .trim()
    .split(/\s+/)
    .filter((w) => /\p{L}/u.test(w));
  if (words.length === 0) return '?';
  const firstLetter = (word: string) => Array.from(word).find((ch) => /\p{L}/u.test(ch)) ?? '';
  const first = firstLetter(words[0] ?? '');
  const last = words.length > 1 ? firstLetter(words[words.length - 1] ?? '') : '';
  return (first + last).toLocaleUpperCase(TR);
}

/** İsimden sabit (deterministik) avatar zemini; aynı isim hep aynı rengi alır. */
export function getAvatarColor(name: string): string {
  const key = name.trim().toLocaleLowerCase(TR).replace(/\s+/g, ' ');
  let hash = 5381;
  for (const ch of key) {
    hash = ((hash << 5) + hash + (ch.codePointAt(0) ?? 0)) | 0;
  }
  const index = Math.abs(hash) % avatarColors.length;
  return avatarColors[index] ?? avatarColors[0];
}
