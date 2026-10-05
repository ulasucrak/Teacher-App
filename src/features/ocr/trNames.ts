/**
 * Noktasız "ı" içeren yaygın Türkçe ad ve soyadları (tr-TR küçük harf).
 *
 * ML Kit büyük harfli listelerde "İ"nin noktasını sık kaçırır; bu yüzden fotoğrafta hiç "İ"
 * okunmadıysa "I" harfleri varsayılan olarak "İ" kabul edilir ("SELIN" → "Selin"). Bu liste,
 * aynı kelimenin "ı"lı yazımı bilinen bir ad/soyad olduğunda o yazımın seçilmesini sağlar
 * ("YILMAZ" → "Yılmaz", "NAZLI" → "Nazlı"). Liste bilerek kısa tutulur: noktalı yazımı da
 * yaygın olan adlar (İlkay, İlhan, İrfan, İlayda, İlgin, İlkim, İrmak) eklenmez.
 */

const GIVEN_NAMES = [
  'akın', 'alkım', 'altın', 'arın', 'aslı', 'aslıhan', 'asım', 'aşkın', 'aydın', 'ayışığı',
  'aysıla', 'balkız', 'barış', 'barışcan', 'batıkan', 'cansın', 'çağrı', 'çınar', 'fırat',
  'fıratcan', 'gülhanım', 'hakkı', 'hanım', 'hazım', 'ılgaz',
  'ışıl', 'ışın', 'ışık', 'kasım', 'kayıhan', 'kazım', 'kıvanç', 'kıymet',
  'mısra', 'nazım', 'nazlı', 'pınar', 'rıdvan', 'rıfat', 'rıza', 'sıdıka', 'sıla', 'sırma',
  'sırrı', 'sıtkı', 'şıhmus', 'tarık', 'yağız', 'yıldırım', 'yıldız',
] as const;

const SURNAMES = [
  'akıncı', 'akkılıç', 'akyıldız', 'alkış', 'altınbaş', 'altınışık', 'altınkaya', 'altınok',
  'altıntaş', 'altıntop', 'arı', 'arıcan', 'arıcı', 'arıkan', 'avcı', 'aşçı', 'aydıner',
  'aydınlı', 'aydınlık', 'aydınoğlu', 'ayyıldız', 'bağcı', 'bakır', 'bakırcı', 'balcı',
  'baltacı', 'bayındır', 'boyacı', 'bıçakçı', 'bıyık', 'bıyıklı', 'cıvelek', 'çakır',
  'çakıroğlu', 'çalık', 'çalış', 'çalışır', 'çalışkan', 'çıkrıkçı', 'çıtak', 'dağlı',
  'dalgıç', 'dalkılıç', 'elmacı', 'fındık', 'fındıkçı', 'hacı', 'hacıoğlu', 'halıcı',
  'hasırcı', 'ılıcak', 'kalaycı', 'kantarcı', 'karakılıç', 'karayılan', 'karslı', 'kasımoğlu',
  'kayalı', 'kayıkçı', 'kazancı', 'kaşıkçı', 'kılıç', 'kılıçarslan', 'kılıçaslan',
  'kılıçdaroğlu', 'kılınç', 'kıran', 'kırcı', 'kırdar', 'kırık', 'kırmızı', 'kıvrak', 'kızıl',
  'kızılırmak', 'kızılkaya', 'kızıltaş', 'sakallı', 'sarı', 'sarıbaş', 'sarıçam', 'sarıgül',
  'sarıkaya', 'sarıoğlu', 'satıcı', 'sayın', 'sıcak', 'tanrıkulu', 'tanrısever', 'tanrıverdi',
  'tatlı', 'tatlıcı', 'tıraş', 'tunalı', 'yağcı', 'yalçın', 'yanık', 'yazıcı', 'yazıcıoğlu',
  'yılmaz',
] as const;

const KNOWN_DOTLESS = new Set<string>([...GIVEN_NAMES, ...SURNAMES]);

/** Küçük harfli (tr-TR) kelime, "ı" içeren bilinen bir ad ya da soyad mı? */
export function isKnownDotlessName(lowerWord: string): boolean {
  return KNOWN_DOTLESS.has(lowerWord);
}

/** Test ve denetim için listedeki kelime sayısı. */
export const KNOWN_DOTLESS_COUNT = KNOWN_DOTLESS.size;
