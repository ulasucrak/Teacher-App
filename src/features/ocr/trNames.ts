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

// ---------------------------------------------------------------------------
// Türkçe harf geri getirme sözlüğü
// ---------------------------------------------------------------------------
//
// Yaygın Türkçe ad ve soyadları (tr-TR küçük harf, Türkçe karakterleriyle).
//
// OCR Türkçe harflerin işaretlerini sık kaçırır: Vision kelime başındaki "İ"nin noktasını
// ("Irem"), "Ğ"nin kuyruğunu ("DOGAN") düşürür; ML Kit "Ş/Ç/Ö/Ü"yü düz harf okuyabilir.
// parser.ts okunan kelimeyi aksansız biçimiyle bu listede arar; okunan harflerle çelişmeyen
// TEK bir yazım varsa onu kullanır ("Ozturk" → "Öztürk", "Sahin" → "Şahin", "Irem" → "İrem").
// Listede olmayan kelimeler okunduğu gibi kalır.
//
// Aynı aksansız biçimde iki yaygın yazım varsa (ör. "ırmak" / "irmak", "ilgın" / "ılgın")
// ikisi de listededir; o zaman parser kelimeye dokunmaz (ya da okunan harflere göre seçer).
// Aksansız yazımı da yaygın olan adların yalnızca aksansızı varsa listeye eklenmemelidir:
// "Ozan" listede, "Özan" yok; "Can" var, "Çan" yok.

const DICTIONARY_GIVEN_NAMES = `
abdullah abdulkadir abdurrahman abdülkadir abdülsamet adem adil adnan ahmet akif alara alaattin ali alican
alihan alim alp alparslan alper alperen alptekin altan ahsen asaf asena aslan asude atakan atalay ataberk atilla avni
ayberk aybüke aybars aykut aylin aysel aysu aysun ayşe ayşegül ayşenur aytaç aytekin ayten aziz azra
bahadır bahar bahri baran batuhan battal batu bayram bedirhan bedia begüm belgin belinay belis bengisu
bengü beren berat berfin berk berkay berkant berke berna beril betül beyza bilal bilge bilgehan bilgin birsen birol
buğra buğrahan bulut burak burcu burçin burhan buse büşra bülent cafer can canan candan caner cansu cem cemal
cemil cemile cenk cengiz ceren cevdet ceyda ceylan ceyhun cihan cihangir coşkun cumali cüneyt çağan çağatay çağdaş
çağıl çağla çağlar çağın çetin çiçek çiğdem damla defne demet demir demirhan deniz derin derya devrim didem
dilan dilara dilek dilşad dilber doğa doğan doğukan doğuş dora duru durmuş duygu dursun ebru ecrin ece ecem eda edanur
edip efe efecan ege egemen ekin ekrem elçin elanur elif elifnur emel emine emir emirhan emre emrullah enes engin
ensar erdal erdem erdoğan eren ergin ergün erhan erkan erol ersin ertan ertuğrul esat esin eslem esma esra eylem eylül
ezgi faruk fatih fatma fatmanur fazıl ferda ferdi feride ferhat feyza fikret filiz fuat funda furkan gamze gizem
gonca gökay gökben gökçe gökhan göksel göktuğ gönül görkem gözde gül gülay gülbahar gülcan güler gülşen gülsüm gülten
güner güney gürkan güven hacer hakan halil halime hamdi hamza handan hande harun hasan hatice hayati hayriye hazal
helin hilal hira hülya hüseyin hüsnü ilhami ilkay ilke ilker ilknur ilyas irem ismail ismet ipek ilayda ihsan
ilhan ibrahim idil ilgın ılgın irmak ırmak kaan kader kadir kağan kamil kemal kenan kerem kevser kezban koray
kubilay kübra kutay lale lamia latife levent leyla mahmut mehmet melek melike melis meltem menekşe meral merve meryem
mert mesut metin mihriban miraç miray muhammed muhammet murat musa mustafa muzaffer nalan necati necla nedim nehir
nergis nermin neslihan nesrin nevin nihal nil nilay nisa nur nuran nurcan nuri nurten oğuz oğuzhan oktay okan olcay
onur orhan osman ozan öykü ömer önder özden özge özgür özlem öznur rabia rahmi ramazan raşit recep rüya rümeysa rüveyda
saadet sabri sadık sadullah sait salih saliha selçuk selim selin selma semih semra serap seda sedat sefa selda sema
semiha serdar serhat serkan sena senem serra sertaç sevda sevgi sevil sevim seyfi sezai sezen sezer simge sinan
songül soner suat sude sultan süleyman sümeyye şaban şahin şenay şengül şeyma şimal şükran şükrü şule şebnem şerif
şerife şirin taha tahsin talha tamer tarkan taylan tayfun tekin timur tolga toprak tuba tuğba tuğçe tuğrul
tuna tunahan tuncay turan turgay turgut tülay tülin ufuk uğur uğurcan ulaş umut utku ümit ümran ünal üzeyir vedat
veli veysel volkan yağmur yahya yaren yasemin yasin yavuz yeliz yeşim yiğit yunus yusuf yüksel zafer zahide zehra
zekai zeki zeliha zerrin zeynep zeynel ziya zübeyde zümra zülfikar
asya aras berra çisel ebrar elvan eflin hiranur meva mina nisanur pelin reyyan sare yaprak zehranur bade cemre
dicle elis esila hafsa lina masal melda poyraz rüzgar mira eymen ömür alya ayaz kuzey mete selen zeren
`;

const DICTIONARY_SURNAMES = `
acar ağaoğlu akbaş akbulut akça akdağ akdemir akdoğan akgül akgün akkaya akkoç akkuş akman akpınar aksoy aksu
aktaş aktürk akyol akyüz alkan altay altun altuntaş arslan ataş ateş aydemir aydoğan
aygün aykaç ayhan başar başaran başer baş baştürk batur bayrak baysal bektaş bilgiç bilir bingöl bozdağ bozkurt
boztepe cankurt cömert çakar çakmak çam çamur çay çelebi çelik çetinkaya çevik çiftçi çolak
demirci demirel demirtaş doğru doğruer dönmez durmaz duman dumlu durak
ekinci ekşi elmas er eraslan erbaş erçelik erkoç eroğlu ersoy ertaş ertürk eser esen eşsiz evren gedik genç gezer
gök gökalp gökdemir göktaş güleç gültekin gümüş gündoğdu gündüz güngör günay gür gürbüz gürel gürsoy güzel harmancı
işcan inan ince ışık işler kahraman kalkan kandemir kaplan kara karabulut karaca karadağ
karadeniz karagöz karahan karakaya karakoç karakuş karaman karataş kartal kavak kaya kayabaşı kaymaz keleş keskin
kınık kıratlı kocaman kocabaş kocaer koç korkmaz korkut koyuncu kozan kurt kurtuluş
kuş kutlu kutlay kuzu küçük mutlu oral oruç özbek özcan özçelik özdemir özer özgen özkan özkaya
özmen özsoy öztürk özyurt öztekin öğüt önal öner örnek öz pala parlak pehlivan polat sağlam sakarya saraç
savaş sevinç seçkin sezgin soylu sönmez söğüt sözen subaşı sungur süer şen şener
şenol şenyurt şeker şimşek şahbaz tan taş taşdemir taşkın tatar tekeli temel tepe
tok toksöz topal topçu tosun tunç tutar türk türkmen uçar uçan ulu uludağ uslu uysal uzun
üner ünlü ürün varol yaman yetkin yüce yücel yurt yurdakul zengin uğurlu çoban kocabıyık bozoğlu
karabacak dalkıran şahan kökten ekici tekin güler aslan çetin doğan erdoğan yiğit yavuz turan
bulut çınar deniz ipek irmak ilhan aydın yıldırım yıldız
`;

function wordsOf(text: string): string[] {
  return text.split(/\s+/).filter(Boolean);
}

/** Sözlükteki tüm kelimeler (tr-TR küçük harf, tekrarsız): yukarıdaki listeler + "ı"lı adlar. */
export const TR_NAME_WORDS: readonly string[] = [
  ...new Set([...wordsOf(DICTIONARY_GIVEN_NAMES), ...wordsOf(DICTIONARY_SURNAMES), ...KNOWN_DOTLESS]),
];

/** Türkçe harfleri ASCII karşılığına indirir (küçük harf girdi; uzunluk korunur). */
export function asciiFoldLower(lower: string): string {
  return lower
    .replace(/ı/g, 'i')
    .replace(/ş/g, 's')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/[îí]/g, 'i')
    .replace(/[âá]/g, 'a')
    .replace(/[ûú]/g, 'u');
}

let dictionaryIndex: Map<string, string[]> | null = null;

function getDictionaryIndex(): Map<string, string[]> {
  if (dictionaryIndex) return dictionaryIndex;
  const built = new Map<string, string[]>();
  for (const word of TR_NAME_WORDS) {
    const key = asciiFoldLower(word);
    const list = built.get(key);
    if (list) list.push(word);
    else built.set(key, [word]);
  }
  dictionaryIndex = built;
  return built;
}

/** ASCII küçük harf biçimi verilen kelimenin sözlükteki yazımları ("dogan" → ["doğan"]); yoksa boş. */
export function dictionarySpellings(asciiLower: string): readonly string[] {
  return getDictionaryIndex().get(asciiLower) ?? [];
}
