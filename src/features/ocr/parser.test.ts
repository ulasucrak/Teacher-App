import {
  assessName,
  foldTurkish,
  groupIntoRows,
  parseOcrResult,
  parsePlainText,
  parseRows,
  toTurkishTitleCase,
  type OcrBlock,
  type OcrResult,
} from './parser';
import { isKnownDotlessName, KNOWN_DOTLESS_COUNT } from './trNames';

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
