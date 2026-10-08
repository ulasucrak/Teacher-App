import {
  assessName,
  estimateSkew,
  foldTurkish,
  groupIntoCells,
  groupIntoRows,
  parseCellRows,
  parseOcrResult,
  parsePlainNameList,
  parsePlainText,
  parseRows,
  pickCandidate,
  restoreTurkishLetters,
  toTurkishTitleCase,
  type OcrBlock,
  type OcrResult,
} from './parser';
import { dictionarySpellings, isKnownDotlessName, KNOWN_DOTLESS_COUNT, TR_NAME_WORDS } from './trNames';

// ---------------------------------------------------------------------------
// Fixture yardımcıları: ML Kit'in tablo sütunlarını ayrı bloklar olarak okumasını taklit eder.
// ---------------------------------------------------------------------------

const LINE_HEIGHT = 24;
const ROW_GAP = 40;

interface Column {
  left: number;
  /** Satır başına hücre metni; null = boş hücre. */
  cells: (string | null)[];
  /** Satır başına dikey kayma (eğik fotoğraf / el titremesi). */
  jitter?: number[];
}

function columnBlock({ left, cells, jitter = [] }: Column, firstTop: number): OcrBlock {
  const lines = cells.flatMap((text, i) =>
    text === null
      ? []
      : [
          {
            text,
            frame: { left, top: firstTop + i * ROW_GAP + (jitter[i] ?? 0), width: 10 * text.length, height: LINE_HEIGHT },
          },
        ],
  );
  return { text: lines.map((l) => l.text).join('\n'), lines };
}

function line(text: string, top: number, left = 20) {
  return { text, frame: { left, top, width: 10 * text.length, height: LINE_HEIGHT } };
}

function headerBlock(texts: string[], firstTop: number): OcrBlock {
  return { lines: texts.map((t, i) => line(t, firstTop + i * 30, 120)) };
}

function names(result: { fullName: string }[]) {
  return result.map((s) => s.fullName);
}

// ---------------------------------------------------------------------------
// Türkçe yardımcılar
// ---------------------------------------------------------------------------

describe('toTurkishTitleCase', () => {
  it('İ/ı harflerini tr-TR kurallarıyla düzeltir', () => {
    expect(toTurkishTitleCase('SELİN BAYEZİT')).toBe('Selin Bayezit');
    expect(toTurkishTitleCase('IŞIK ILGIN')).toBe('Işık Ilgın');
    expect(toTurkishTitleCase('ismail  çağrı')).toBe('İsmail Çağrı');
  });

  it('tireli adları her parçada büyütür', () => {
    expect(toTurkishTitleCase('AYŞE-NUR ÖZTÜRK')).toBe('Ayşe-Nur Öztürk');
  });
});

describe('foldTurkish', () => {
  it('aksanları ve büyük/küçük harfi yok sayar', () => {
    expect(foldTurkish('  ŞÜKRÜ   Öğüt ')).toBe('sukru ogut');
    expect(foldTurkish('İLKNUR')).toBe(foldTurkish('ılknur'));
  });
});

describe('assessName', () => {
  it('tek kelime, kısa ve rakamlı adları işaretler', () => {
    expect(assessName('Ali')).toEqual(['short', 'singleWord']);
    expect(assessName('Ayşe Yılmaz')).toEqual([]);
    expect(assessName('Ayşe Y')).toEqual(['short']);
    expect(assessName('Ali Ve1i')).toEqual(['digits']);
    expect(assessName('Mehmet Ali', true)).toEqual(['digits']);
  });
});

// ---------------------------------------------------------------------------
// e-Okul sınıf listesi
// ---------------------------------------------------------------------------

describe('parseOcrResult — e-Okul listesi', () => {
  const header = headerBlock(
    [
      'T.C.',
      'MİLLÎ EĞİTİM BAKANLIĞI',
      'Atatürk Anadolu Lisesi',
      '2025-2026 Eğitim Öğretim Yılı',
      '9/A Sınıfı Sınıf Listesi',
      'Sınıf Öğretmeni: Hakan Demir',
    ],
    10,
  );
  const columnHeader: OcrBlock = {
    lines: [line('S.No', 220, 20), line('Okul No', 220, 80), line('Adı Soyadı', 220, 180), line('Cinsiyeti', 220, 480)],
  };
  const footer: OcrBlock = {
    lines: [line('Sayfa 1 / 1', 600, 200), line('12.09.2025', 630, 400), line('Erkek: 2 Kız: 2', 660, 20)],
  };

  const table: OcrResult = {
    blocks: [
      header,
      columnHeader,
      columnBlock({ left: 20, cells: ['1', '2', '3', '4'] }, 260),
      columnBlock({ left: 80, cells: ['112', '245', '1O7', '389'] }, 260),
      columnBlock({ left: 180, cells: ['SELİN BAYEZİT', 'MEHMET ALİ KARA', 'ZEYNEP ÇELİK', 'BURAK ÖZTÜRK'] }, 260),
      columnBlock({ left: 480, cells: ['Kız', 'Erkek', 'Kız', 'Erkek'] }, 260),
      footer,
    ],
  };

  it('sütunları satırlarda birleştirir, başlık ve altlıkları atar', () => {
    expect(parseOcrResult(table)).toEqual([
      { number: '112', fullName: 'Selin Bayezit', warnings: [] },
      { number: '245', fullName: 'Mehmet Ali Kara', warnings: [] },
      { number: '107', fullName: 'Zeynep Çelik', warnings: [] },
      { number: '389', fullName: 'Burak Öztürk', warnings: [] },
    ]);
  });

  it('bloklar karışık sırada gelse de satır sırasını korur', () => {
    const shuffled: OcrResult = { blocks: [...table.blocks].reverse() };
    expect(names(parseOcrResult(shuffled))).toEqual([
      'Selin Bayezit',
      'Mehmet Ali Kara',
      'Zeynep Çelik',
      'Burak Öztürk',
    ]);
  });

  it('eğik fotoğrafta küçük dikey kaymaları tolere eder', () => {
    const skewed: OcrResult = {
      blocks: [
        columnBlock({ left: 20, cells: ['1', '2', '3'] }, 100),
        columnBlock({ left: 80, cells: ['501', '502', '517'], jitter: [4, 5, 6] }, 100),
        columnBlock({ left: 180, cells: ['ELİF ŞAHİN', 'CAN YURT', 'ECE GÜL'], jitter: [9, 10, 11] }, 100),
        columnBlock({ left: 480, cells: ['K', 'E', 'K'], jitter: [11, 11, 11] }, 100),
      ],
    };
    expect(parseOcrResult(skewed).map((s) => [s.number, s.fullName])).toEqual([
      ['501', 'Elif Şahin'],
      ['502', 'Can Yurt'],
      ['517', 'Ece Gül'],
    ]);
  });

  it('"Adı" ve "Soyadı" ayrı sütunlarda olduğunda aynı satırda birleştirir', () => {
    const split: OcrResult = {
      blocks: [
        { lines: [line('S.No', 60, 20), line('Okul No', 60, 80), line('Adı', 60, 180), line('Soyadı', 60, 340)] },
        columnBlock({ left: 20, cells: ['1', '2'] }, 100),
        columnBlock({ left: 80, cells: ['731', '744'] }, 100),
        columnBlock({ left: 180, cells: ['AYŞE NUR', 'İBRAHİM'] }, 100),
        columnBlock({ left: 340, cells: ['YILDIRIM', 'ŞİMŞEK'] }, 100),
      ],
    };
    expect(parseOcrResult(split)).toEqual([
      { number: '731', fullName: 'Ayşe Nur Yıldırım', warnings: [] },
      { number: '744', fullName: 'İbrahim Şimşek', warnings: [] },
    ]);
  });

  it('tek satırda okunmuş tablo satırlarını ve dikey çubukları çözer', () => {
    const rows = [
      ['| 1 | 1203 | DEFNE ARSLAN | Kız |'],
      ['2 | 1204 | EMİR TAŞ | Erkek'],
      ['3 I 1210 I KEREM AKSOY I E'],
    ];
    expect(parseRows(rows).map((s) => [s.number, s.fullName])).toEqual([
      ['1203', 'Defne Arslan'],
      ['1204', 'Emir Taş'],
      ['1210', 'Kerem Aksoy'],
    ]);
  });

  it('sayılardaki O/0 ve l/1 karışıklığını düzeltir', () => {
    const rows = [['1', 'l02', 'ASLI KOÇ'], ['2', '2O5', 'UMUT EREN'], ['3', '3l0', 'NİL SU']];
    expect(parseRows(rows).map((s) => s.number)).toEqual(['102', '205', '310']);
  });

  it('adlardaki rakam ve l/I karışıklığını düzeltip rakamlı satırı uyarır', () => {
    const rows = [['1', '402', 'AHMET Y1LDIZ'], ['2', '403', 'lŞIK KAYA'], ['3', '404', 'SeIin Ak0n']];
    const result = parseRows(rows);
    expect(names(result)).toEqual(['Ahmet Yıldız', 'Işık Kaya', 'Selin Akon']);
    expect(result[0].warnings).toContain('digits');
    expect(result[1].warnings).toEqual([]);
    expect(result[2].warnings).toContain('digits');
  });

  it('aynı öğrenciyi iki kez okursa tekilleştirir, sırayı korur', () => {
    const rows = [['1', '901', 'ALİ VELİ'], ['2', '902', 'CEM SU'], ['1', '901', 'Ali Veli'], ['3', '903', 'DUYGU ER']];
    expect(names(parseRows(rows))).toEqual(['Ali Veli', 'Cem Su', 'Duygu Er']);
  });

  it('başlık satırlarını, tarihleri ve yalnızca sayı içeren satırları atar', () => {
    const rows = [
      ['T.C.'],
      ['ÇANKAYA KAYMAKAMLIĞI'],
      ['Kızılay Ortaokulu Müdürlüğü'],
      ['5/B Şubesi Öğrenci Listesi'],
      ['e-Okul Öğretmen Modülü'],
      ['Tarih: 03.10.2026'],
      ['1/2'],
      ['42'],
      ['1', '87', 'MERT KILIÇ', 'E'],
    ];
    expect(parseRows(rows)).toEqual([{ number: '87', fullName: 'Mert Kılıç', warnings: [] }]);
  });

  it('okul numarası adın sağındaysa onu kullanır', () => {
    expect(parseRows([['EBRU DOĞAN', '612']])).toEqual([{ number: '612', fullName: 'Ebru Doğan', warnings: [] }]);
  });

  it('kısa ve tek kelimelik adları düşük güvenle işaretler', () => {
    const result = parseRows([['1', '11', 'EFE'], ['2', '12', 'AY DENİZ']]);
    expect(result[0].warnings).toEqual(['short', 'singleWord']);
    expect(result[1].warnings).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Düz liste (el yazısı / daktilo)
// ---------------------------------------------------------------------------

describe('parsePlainText — düz liste', () => {
  it('"12. Ali Veli" biçiminde sıra numarasını atar', () => {
    const text = '1. Ali Veli\n2. ayşe fatma yılmaz\n3. Can Ercan';
    expect(parsePlainText(text)).toEqual([
      { number: null, fullName: 'Ali Veli', warnings: [] },
      { number: null, fullName: 'Ayşe Fatma Yılmaz', warnings: [] },
      { number: null, fullName: 'Can Ercan', warnings: [] },
    ]);
  });

  it('"12 - Ali Veli" biçiminde ardışık olmayan sayıları okul numarası sayar', () => {
    const text = '512 - Ali Veli\n487 - Ece Nur Kaya\n1093 - Oğuz Han';
    expect(parsePlainText(text).map((s) => [s.number, s.fullName])).toEqual([
      ['512', 'Ali Veli'],
      ['487', 'Ece Nur Kaya'],
      ['1093', 'Oğuz Han'],
    ]);
  });

  it('numarasız listeyi olduğu gibi alır', () => {
    expect(names(parsePlainText('Deniz Akın\n\nBerra Uçar\nTuna Kılınç'))).toEqual([
      'Deniz Akın',
      'Berra Uçar',
      'Tuna Kılınç',
    ]);
  });

  it('bitişik yazılmış numarayı ayırır: "7.Ali Veli", "245SELİN AK"', () => {
    expect(parsePlainText('7.Ali Veli\n8.Can Su').map((s) => [s.number, s.fullName])).toEqual([
      [null, 'Ali Veli'],
      [null, 'Can Su'],
    ]);
    expect(parsePlainText('245SELİN AK').map((s) => [s.number, s.fullName])).toEqual([['245', 'Selin Ak']]);
  });

  it('ikinci sayfanın ardışık sıra numaralarını da sıra numarası sayar', () => {
    const text = '31. Kaan Er\n32. Lale Su\n33. Mina Ay';
    expect(parsePlainText(text).every((s) => s.number === null)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// İnceleme sonrası regresyonlar
// ---------------------------------------------------------------------------

describe('regresyon — noktasız İ', () => {
  it('BÜYÜK HARF kelimede ASCII I harfini İ yapar', () => {
    expect(names(parseRows([['1', '12', 'SELIN BAYEZIT'], ['2', '13', 'ILKER EREN']]))).toEqual([
      'Selin Bayezit',
      'İlker Eren',
    ]);
  });

  it('ünlüleri yalnızca I olan kelimeleri ı olarak bırakır', () => {
    expect(names(parseRows([['1', '12', 'IŞIK KILIÇ'], ['2', '13', 'ALI YILDIZ']]))).toEqual([
      'Işık Kılıç',
      'Ali Yıldız',
    ]);
  });

  it('fotoğrafta İ okunmuşsa I harflerine dokunmaz', () => {
    expect(names(parseRows([['1', '12', 'SELİN YILMAZ'], ['2', '13', 'ASLI KOÇ']]))).toEqual([
      'Selin Yılmaz',
      'Aslı Koç',
    ]);
  });
  it('İ okunmamış fotoğrafta bilinen ı\'lı ad ve soyadları korur', () => {
    expect(
      names(
        parseRows([
          ['1', '12', 'NAZLI YILMAZ'],
          ['2', '13', 'ASLI AYDIN'],
          ['3', '14', 'SIDIKA KIRMIZI'],
          ['4', '15', 'EMRE ÇALIŞKAN'],
        ]),
      ),
    ).toEqual(['Nazlı Yılmaz', 'Aslı Aydın', 'Sıdıka Kırmızı', 'Emre Çalışkan']);
  });

  it('listede olmayan adlarda İ varsayımını sürdürür, aynı satırda ikisini ayırır', () => {
    expect(names(parseRows([['1', '12', 'ARIF SARI'], ['2', '13', 'MELIS ALTINTAŞ']]))).toEqual([
      'Arif Sarı',
      'Melis Altıntaş',
    ]);
  });

  it('tireli adlarda her parçayı ayrı değerlendirir', () => {
    expect(names(parseRows([['1', '12', 'AYŞE-NAZLI BAYINDIR'], ['2', '13', 'ALI-RIZA KAYA']]))).toEqual([
      'Ayşe-Nazlı Bayındır',
      'Ali-Rıza Kaya',
    ]);
  });
});

describe('trNames', () => {
  it('yalnızca ı içeren, küçük harfli ~150 kelime tutar', () => {
    expect(KNOWN_DOTLESS_COUNT).toBeGreaterThanOrEqual(140);
    expect(isKnownDotlessName('yılmaz')).toBe(true);
    expect(isKnownDotlessName('Yılmaz')).toBe(false);
    expect(isKnownDotlessName('yilmaz')).toBe(false);
  });

  it('noktalı yazımı yaygın olan adları içermez', () => {
    for (const name of ['ılayda', 'ılgın', 'ılkım', 'ıraz', 'ırmak', 'ılkay', 'ılhan']) {
      expect(isKnownDotlessName(name)).toBe(false);
    }
  });

  it('listede olmayan BÜYÜK HARF adlarda İ varsayımına döner', () => {
    expect(names(parseRows([['1', '12', 'ILAYDA KAYA'], ['2', '13', 'IRMAK EREN']]))).toEqual([
      'İlayda Kaya',
      'İrmak Eren',
    ]);
  });
});

describe('regresyon — numara ve başlık kuralları', () => {
  it('numaralı satırı başlık kelimesi yüzünden atmaz', () => {
    expect(parseRows([['1', '245', 'MEHMET ALİ SIRA']])).toEqual([
      { number: '245', fullName: 'Mehmet Ali Sıra', warnings: [] },
    ]);
  });

  it('1 ile başlamayan ardışık tek sayıları sıra numarası sayar', () => {
    const result = parseRows([['33', 'KAAN ER'], ['34', 'LALE SU'], ['35', 'MİNA AY']]);
    expect(result.map((s) => s.number)).toEqual([null, null, null]);
  });

  it('çoğu satırı iki sayılı tabloda tek sayılı satırın numarası sıra numarasıdır', () => {
    const result = parseRows([
      ['1', '112', 'SELİN AK'],
      ['2', '245', 'CAN ER'],
      ['3', 'DENİZ UÇAR'],
      ['4', '389', 'EMRE TAŞ'],
    ]);
    expect(result.map((s) => s.number)).toEqual(['112', '245', null, '389']);
  });

  it('iki sayılı tabloda sıra numarası okunmamış satırın okul numarasını korur', () => {
    const result = parseRows([
      ['112', 'SELİN AK'],
      ['2', '245', 'CAN ER'],
      ['3', '318', 'DENİZ UÇAR'],
      ['402', 'EMRE TAŞ'],
      ['5', '517', 'ECE SU'],
    ]);
    expect(result.map((s) => s.number)).toEqual(['112', '245', '318', '402', '517']);
  });

  it('"S.No | Adı Soyadı | Okul No" düzeninde okul numarasını sağdan alır', () => {
    const result = parseRows([
      ['S.No', 'Adı Soyadı', 'Okul No'],
      ['1', 'SELİN AK', '712'],
      ['2', 'CAN ER', '688'],
      ['3', 'DENİZ UÇAR', '701'],
    ]);
    expect(result.map((s) => [s.number, s.fullName])).toEqual([
      ['712', 'Selin Ak'],
      ['688', 'Can Er'],
      ['701', 'Deniz Uçar'],
    ]);
  });

  it('sondaki cinsiyet sütunundan en fazla bir kelime atar', () => {
    expect(names(parseRows([['1', '12', 'AYŞE NUR E', 'Kız']]))).toEqual(['Ayşe Nur E']);
  });
});

// ---------------------------------------------------------------------------
// Satır gruplama
// ---------------------------------------------------------------------------

describe('groupIntoRows', () => {
  it('konum bilgisi yoksa ML Kit sırasını korur', () => {
    const result: OcrResult = { blocks: [{ lines: [{ text: 'Ali Veli' }, { text: '  ' }, { text: 'Can Su' }] }] };
    expect(groupIntoRows(result)).toEqual([['Ali Veli'], ['Can Su']]);
  });

  it('aynı satırdaki hücreleri soldan sağa sıralar', () => {
    const result: OcrResult = {
      blocks: [{ lines: [line('VELİ', 100, 300), line('ALİ', 102, 150), line('7', 98, 20), line('CAN', 140, 150)] }],
    };
    expect(groupIntoRows(result)).toEqual([['7', 'ALİ', 'VELİ'], ['CAN']]);
  });

  it('boş sonuçta boş liste döner', () => {
    expect(parseOcrResult({ blocks: [] })).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Eğik fotoğraf (deskew)
// ---------------------------------------------------------------------------

/** Eğimi `slope` (dy/dx) olan tabloyu taklit eder: her hücre x konumuna göre kayar. */
function skewedTable(slope: number, rows: string[][], columns = [60, 200, 480, 1200]): OcrResult {
  const lines = rows.flatMap((cells, r) =>
    cells.map((text, c) => {
      const left = columns[c];
      const width = 14 * text.length;
      const centerY = 200 + r * 40 + slope * (left + width / 2);
      // Eğik satırın eksene hizalı kutusu genişlik × eğim kadar yüksektir.
      const height = LINE_HEIGHT + width * Math.abs(slope);
      return { text, frame: { left, top: centerY - height / 2, width, height } };
    }),
  );
  return { blocks: lines.map((l) => ({ lines: [l] })) };
}

const SKEW_ROWS = [
  ['1', '112', 'SELİN AK', 'Kız'],
  ['2', '245', 'CAN ER', 'Erkek'],
  ['3', '318', 'DENİZ UÇAR', 'Kız'],
  ['4', '402', 'EMRE TAŞ', 'Erkek'],
  ['5', '517', 'ECE SU', 'Kız'],
  ['6', '623', 'AYŞE NUR', 'Kız'],
];

describe('eğik fotoğraf', () => {
  it.each([0.07, -0.0875, 0.035])('eğim %p: satırları doğru birleştirir', (slope) => {
    const result = skewedTable(slope, SKEW_ROWS);
    expect(groupIntoRows(result)).toEqual(SKEW_ROWS);
    expect(parseOcrResult(result).map((s) => s.number)).toEqual(['112', '245', '318', '402', '517', '623']);
  });

  it('eğimi bulur; dik tabloda 0 döner', () => {
    const lines = (slope: number) =>
      skewedTable(slope, SKEW_ROWS).blocks.map((b) => {
        const f = b.lines[0].frame!;
        return { centerX: f.left + f.width / 2, centerY: f.top + f.height / 2, width: f.width, height: f.height };
      });
    expect(estimateSkew(lines(0))).toBe(0);
    expect(estimateSkew(lines(0.07))).toBeCloseTo(0.07, 2);
    expect(estimateSkew(lines(-0.06))).toBeCloseTo(-0.06, 2);
  });
});

// ---------------------------------------------------------------------------
// Türkçe harf geri getirme (sözlük)
// ---------------------------------------------------------------------------

describe('noktası yer yer düşen OCR', () => {
  it('aynı satırdaki sözlük adı noktasız okunduysa sözlükte olmayan ad da "İ" alır', () => {
    // Simülatördeki Vision: "ÖZDEMİR" noktalı, "SELIN BAYEZIT" noktasız.
    expect(names(parseRows([['1', '1101', 'SELIN BAYEZIT'], ['2', '1104', 'BURAK ÖZDEMİR']]))).toEqual([
      'Selin Bayezit',
      'Burak Özdemir',
    ]);
  });

  it('satırda noktası düşen sözlük adı yoksa noktasız "I" "ı" kalır', () => {
    expect(names(parseRows([['1', '12', 'SELİN KAYA'], ['2', '13', 'MERT BAYEZIT']]))).toEqual([
      'Selin Kaya',
      'Mert Bayezıt',
    ]);
  });
});

describe('restoreTurkishLetters', () => {
  it.each([
    ['Irem', 'İrem'],
    ['Ibrahim', 'İbrahim'],
    ['Dogan', 'Doğan'],
    ['DOGAN', 'DOĞAN'],
    ['Ozturk', 'Öztürk'],
    ['Sahin', 'Şahin'],
    ['CAGRI', 'ÇAĞRI'],
    ['SELIN', 'SELİN'],
    ['YILMAZ', 'YILMAZ'],
    ['gunes', 'güneş'],
  ])('%s → %s', (read, expected) => {
    expect(restoreTurkishLetters(read)).toBe(expected);
  });

  it.each([
    ['Smaıl', 'İsmail'],
    ['Brahim', 'İbrahim'],
    ['Rem', 'İrem'],
  ])('düşmüş baş İ yalnızca istenince: %s → %s', (read, expected) => {
    expect(restoreTurkishLetters(read)).toBeNull();
    expect(restoreTurkishLetters(read, false, true)).toBe(expected);
  });

  it('OCR satırında düşmüş baş İ: düşük güvende ya da adaylar destekleyince', () => {
    // Güven yüksek, aday yok: okunduğu gibi kalır.
    expect(names(parseCellRows([[{ text: '12' }, { text: 'Brahim Kaya', confidence: 1 }]]))).toEqual(['Brahim Kaya']);
    // Düşük güven: geri getirilir.
    expect(names(parseCellRows([[{ text: '12' }, { text: 'Brahim Kaya', confidence: 0.3 }]]))).toEqual(['İbrahim Kaya']);
    // Adaylardan biri "İbrahim" okumuş.
    expect(
      names(parseCellRows([[{ text: '12' }, { text: 'Brahim Kaya', confidence: 1, alternates: ['İbrahim Kaya'] }]])),
    ).toEqual(['İbrahim Kaya']);
  });

  it('groupIntoCells aday okumaları hücreye taşır', () => {
    const cells = groupIntoCells({
      blocks: [
        {
          lines: [
            {
              text: 'Ali Kaya',
              confidence: 1,
              candidates: [
                { text: 'Ali Kaya', confidence: 1 },
                { text: 'Ali Kaja', confidence: 0.5 },
              ],
            },
          ],
        },
      ],
    });
    expect(cells[0][0]).toEqual({ text: 'Ali Kaya', confidence: 1, alternates: ['Ali Kaja'] });
  });

  it('sözlükte olmayan kelimeye dokunmaz', () => {
    expect(restoreTurkishLetters('Dagdelenoglu')).toBeNull();
    expect(restoreTurkishLetters('Xyz')).toBeNull();
  });

  it('okunan Türkçe harfle çelişen yazımı seçmez', () => {
    // "Şen" sözlükte; "Sen" okunsa da "Şen" seçilir, ama "Çen" okunduysa değil.
    expect(restoreTurkishLetters('Sen')).toBe('Şen');
    expect(restoreTurkishLetters('Çen')).toBeNull();
  });

  it('iki yazımı da yaygın kelimede belirsiz kalır; fotoğrafta İ okunduysa ı seçilir', () => {
    expect(restoreTurkishLetters('IRMAK')).toBeNull();
    expect(restoreTurkishLetters('IRMAK', true)).toBe('IRMAK');
    expect(restoreTurkishLetters('İRMAK')).toBe('İRMAK');
  });

  it('parser adları sözlükle düzeltir, bilinmeyenleri okunduğu gibi bırakır', () => {
    expect(names(parseRows([['1', '12', 'IREM OZTURK'], ['2', '13', 'Mert Dagdelen'], ['3', '14', 'Cagri Sahin']]))).toEqual([
      'İrem Öztürk',
      'Mert Dagdelen',
      'Çağrı Şahin',
    ]);
  });

  it('sözlük ~900 kelime; belirsiz aksansız biçimler bilinçli olarak az', () => {
    expect(TR_NAME_WORDS.length).toBeGreaterThanOrEqual(800);
    expect(new Set(TR_NAME_WORDS).size).toBe(TR_NAME_WORDS.length);
    expect(dictionarySpellings('irmak')).toEqual(expect.arrayContaining(['irmak', 'ırmak']));
    for (const word of TR_NAME_WORDS) expect(word).toBe(word.toLocaleLowerCase('tr-TR'));
  });
});

// ---------------------------------------------------------------------------
// OCR aday okumaları ve güven
// ---------------------------------------------------------------------------

describe('pickCandidate', () => {
  it('sözlüğe daha çok uyan adayı seçer', () => {
    const picked = pickCandidate({
      text: 'Ozkanù',
      candidates: [
        { text: 'Ozkanù', confidence: 0.5 },
        { text: 'Özkan', confidence: 0.3 },
      ],
    });
    expect(picked).toBe('Özkan');
  });

  it('rakamları farklı adayı asla seçmez', () => {
    expect(
      pickCandidate({
        text: '313 SELIN',
        candidates: [
          { text: '313 SELIN', confidence: 1 },
          { text: '31 SELİN', confidence: 0.3 },
        ],
      }),
    ).toBe('313 SELIN');
  });

  it('aday yoksa metni döndürür', () => {
    expect(pickCandidate({ text: 'Ali Veli' })).toBe('Ali Veli');
  });
});

describe('satır güveni', () => {
  it('ad ve okul no hücrelerinin en düşük güvenini taşır; sıra no hücresini saymaz', () => {
    const students = parseCellRows([
      [{ text: '1', confidence: 0.3 }, { text: '112', confidence: 1 }, { text: 'SELİN AK', confidence: 1 }],
      [{ text: '2', confidence: 1 }, { text: '245', confidence: 0.5 }, { text: 'CAN ER', confidence: 1 }],
      [{ text: '3', confidence: 1 }, { text: '318', confidence: 1 }, { text: 'DENİZ UÇAR', confidence: 0.3 }],
    ]);
    expect(students.map((s) => s.confidence)).toEqual([1, 0.5, 0.3]);
  });

  it('güven bilinmiyorsa alan yoktur (ML Kit)', () => {
    expect(parseRows([['1', '112', 'SELİN AK']])[0]).not.toHaveProperty('confidence');
  });

  it('groupIntoCells güveni hücreye taşır', () => {
    const cells = groupIntoCells({
      blocks: [{ lines: [{ ...line('112', 100, 20), confidence: 0.5 }, line('SELİN AK', 100, 120)] }],
    });
    expect(cells).toEqual([[{ text: '112', confidence: 0.5 }, { text: 'SELİN AK' }]]);
  });
});

// ---------------------------------------------------------------------------
// Kaçırılmış sıra numarası
// ---------------------------------------------------------------------------

describe('kaçırılmış sıra numarası', () => {
  it('arka arkaya birkaç satırda S.No okunmasa da okul numaraları korunur', () => {
    const result = parseRows([
      ['107', 'GÖKHAN AK'],
      ['174', 'CAN ER'],
      ['325', 'DENİZ UÇAR'],
      ['4', '434', 'EMRE TAŞ'],
      ['5', '441', 'ECE SU'],
      ['6', '460', 'ALİ KAYA'],
    ]);
    expect(result.map((s) => s.number)).toEqual(['107', '174', '325', '434', '441', '460']);
  });

  it('aradan satır kaçınca gelen tek kısa sıra numarasını okul no sanmaz', () => {
    // 6. satır hiç okunmadı; "7" sıra numarasıdır, okul no "71" ile aynı uzunlukta olsa bile.
    const result = parseRows([
      ['4', '45', 'EMRE TAŞ'],
      ['5', '52', 'ECE SU'],
      ['7', 'ALİ KAYA'],
      ['8', '71', 'CAN ER'],
      ['9', '84', 'DENİZ UÇAR'],
    ]);
    expect(result.map((s) => s.number)).toEqual(['45', '52', null, '71', '84']);
  });

  it('tek komşulu kısa sayı okul no sayılmaz', () => {
    const result = parseRows([
      ['3', 'ALİ KAYA'],
      ['2', '45', 'EMRE TAŞ'],
      ['3', '52', 'ECE SU'],
    ]);
    expect(result[0].number).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Yapıştırılan düz liste
// ---------------------------------------------------------------------------

describe('parsePlainNameList', () => {
  it('satır başına bir ad; sıra numaralarını atar', () => {
    expect(parsePlainNameList('1. Ali Veli\n2 - Ayşe Kaya\n3) Can Su\n\n4 Deniz Ak')).toEqual([
      { number: null, fullName: 'Ali Veli', warnings: [] },
      { number: null, fullName: 'Ayşe Kaya', warnings: [] },
      { number: null, fullName: 'Can Su', warnings: [] },
      { number: null, fullName: 'Deniz Ak', warnings: [] },
    ]);
  });

  it('virgül ve noktalı virgül ayraçtır', () => {
    expect(names(parsePlainNameList('ali veli, AYŞE KAYA; Can Su'))).toEqual(['Ali Veli', 'Ayşe Kaya', 'Can Su']);
  });

  it('sıralı olmayan baştaki numaralar okul numarasıdır', () => {
    expect(parsePlainNameList('512 Ali Veli\r\n318 Ayşe Kaya\r\n1043 Can Su').map((s) => s.number)).toEqual([
      '512',
      '318',
      '1043',
    ]);
  });

  it('ayraçtan sonra gelen tek sayı önceki adın okul numarasıdır', () => {
    expect(parsePlainNameList('Ali Veli, 512\nAyşe Kaya, 318')).toEqual([
      { number: '512', fullName: 'Ali Veli', warnings: [] },
      { number: '318', fullName: 'Ayşe Kaya', warnings: [] },
    ]);
  });

  it('başlık satırlarını, boş satırları ve yinelemeleri atar', () => {
    expect(names(parsePlainNameList('Adı Soyadı\n\nİrem Öztürk\n\nirem öztürk\n'))).toEqual(['İrem Öztürk']);
  });

  it('yazılan adları sözlükle "düzeltmez" (sözlükte olmayan adlar dahil)', () => {
    expect(names(parsePlainNameList('Pek Ayşe\nRem Kaya\nSila Er\nIrem Ozturk\nBrahim Doğan'))).toEqual([
      'Pek Ayşe',
      'Rem Kaya',
      'Sila Er',
      'Irem Ozturk',
      'Brahim Doğan',
    ]);
  });

  it('Türkçe harfsiz BÜYÜK HARF metinde I = i; Türkçe metinde I = ı', () => {
    expect(names(parsePlainNameList('MICHAEL SMITH\nALI VELI'))).toEqual(['Michael Smith', 'Ali Veli']);
    expect(names(parsePlainNameList('AYŞE YILMAZ\nKADIR KILIÇ'))).toEqual(['Ayşe Yılmaz', 'Kadır Kılıç']);
  });

  it('ocr: true ile OCR düzeltmeleri yapılır', () => {
    expect(names(parsePlainNameList('Irem Ozturk', { ocr: true }))).toEqual(['İrem Öztürk']);
  });

  it('yazılan addaki rakamlar atılır ve uyarı verilir', () => {
    expect(parsePlainNameList('Ali V3li')).toEqual([{ number: null, fullName: 'Ali Vli', warnings: ['digits'] }]);
  });

  it('sekmeyle ayrılmış (tablodan kopyalanan) satırları okur', () => {
    expect(parsePlainNameList('512\tAli Veli\n318\tAyşe Kaya').map((s) => [s.number, s.fullName])).toEqual([
      ['512', 'Ali Veli'],
      ['318', 'Ayşe Kaya'],
    ]);
  });
});

describe('parsePlainNameList — numara biçimleri (yapıştırılan liste)', () => {
  const pairs = (text: string) => parsePlainNameList(text).map((s) => [s.number, s.fullName]);

  it('"1 Ali Yılmaz": çıplak sayı okul numarasıdır (1, 2, 3 … ardışık olsa da)', () => {
    expect(pairs('1 Ali Yılmaz')).toEqual([['1', 'Ali Yılmaz']]);
    expect(pairs('1 Ali Yılmaz\n2 Ayşe Kaya\n3 Can Su')).toEqual([
      ['1', 'Ali Yılmaz'],
      ['2', 'Ayşe Kaya'],
      ['3', 'Can Su'],
    ]);
  });

  it('ardışık okul numaraları sıra numarası sayılmaz ("123 Ali", "124 Ayşe")', () => {
    expect(pairs('123 Ali Yılmaz\n124 Ayşe Kaya\n125 Can Su')).toEqual([
      ['123', 'Ali Yılmaz'],
      ['124', 'Ayşe Kaya'],
      ['125', 'Can Su'],
    ]);
  });

  it('sekmeyle ayrılmış e-Okul satırları (ardışık dahil)', () => {
    expect(pairs('123\tAli Yılmaz\n124\tAyşe Kaya')).toEqual([
      ['123', 'Ali Yılmaz'],
      ['124', 'Ayşe Kaya'],
    ]);
  });

  it('"S.No<TAB>Okul No<TAB>Ad" satırında son sayı okul numarasıdır', () => {
    expect(pairs('1\t123\tAli Yılmaz\n2\t124\tAyşe Kaya')).toEqual([
      ['123', 'Ali Yılmaz'],
      ['124', 'Ayşe Kaya'],
    ]);
  });

  it('addan sonra gelen numara ("Ali Yılmaz 123", "Ali Yılmaz<TAB>123")', () => {
    expect(pairs('Ali Yılmaz 123\nAyşe Kaya 124')).toEqual([
      ['123', 'Ali Yılmaz'],
      ['124', 'Ayşe Kaya'],
    ]);
    expect(pairs('Ali Yılmaz\t123\nAyşe Kaya\t124')).toEqual([
      ['123', 'Ali Yılmaz'],
      ['124', 'Ayşe Kaya'],
    ]);
  });

  it('noktalı / parantezli / tireli numaralandırma liste sırasıdır, numara kaydedilmez', () => {
    const expected = [
      [null, 'Ali Yılmaz'],
      [null, 'Ayşe Kaya'],
      [null, 'Can Su'],
    ];
    expect(pairs('1. Ali Yılmaz\n2. Ayşe Kaya\n3. Can Su')).toEqual(expected);
    expect(pairs('1) Ali Yılmaz\n2) Ayşe Kaya\n3) Can Su')).toEqual(expected);
    expect(pairs('1 - Ali Yılmaz\n2 - Ayşe Kaya\n3 - Can Su')).toEqual(expected);
    expect(pairs('1.Ali Yılmaz\n2.Ayşe Kaya\n3.Can Su')).toEqual(expected);
  });

  it('numaralı listede noktalaması unutulan satır da liste sırası sayılır', () => {
    expect(pairs('1. Ali Yılmaz\n2) Ayşe Kaya\n3 Can Su').map(([n]) => n)).toEqual([null, null, null]);
  });

  it('sıra numarası + addan sonra okul numarası: "1. Ali Yılmaz 123"', () => {
    expect(pairs('1. Ali Yılmaz 123\n2. Ayşe Kaya 124')).toEqual([
      ['123', 'Ali Yılmaz'],
      ['124', 'Ayşe Kaya'],
    ]);
  });

  it('3+ basamaklı noktalı sayılar okul numarasıdır ("123. Ali", "124. Ayşe")', () => {
    expect(pairs('123. Ali Yılmaz\n124. Ayşe Kaya')).toEqual([
      ['123', 'Ali Yılmaz'],
      ['124', 'Ayşe Kaya'],
    ]);
  });

  it('ardışık olmayan noktalı sayılar okul numarasıdır', () => {
    expect(pairs('5. Ali Yılmaz\n9. Ayşe Kaya\n14. Can Su').map(([n]) => n)).toEqual(['5', '9', '14']);
  });

  it('fazla boşluk, CRLF ve baştaki boşluk', () => {
    expect(pairs('  12   ali   yılmaz  \r\n13 AYŞE KAYA')).toEqual([
      ['12', 'Ali Yılmaz'],
      ['13', 'Ayşe Kaya'],
    ]);
  });

  it('numarasız ve numaralı satırlar karışık olabilir', () => {
    expect(pairs('12 Ali Yılmaz\nAyşe Kaya\n14 Can Su')).toEqual([
      ['12', 'Ali Yılmaz'],
      [null, 'Ayşe Kaya'],
      ['14', 'Can Su'],
    ]);
  });
});
