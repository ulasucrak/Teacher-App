/**
 * Renk token'ları — bkz. docs/DESIGN.md §3 (v3 "Pano ve Damga").
 * Uygulamanın geri kalanında hex renk yazılmaz; buradan içe aktarılır.
 * Referans mockup: docs/design/pano-ve-damga.html (`.p` kapsamındaki :root değişkenleri).
 */

/** Ana palet: sınıfın mantar panosu + öğretmenin mor "Aferin" damgası. */
export const palette = {
  /** Kâğıt: sayfa ve yüzey zemini. */
  kagit: '#FFFFFF',
  /** Sıra: pasif yüzey, devre dışı buton, çip zemini (v3: hafif sıcak gri). */
  sira: '#F2F2EF',
  /** Kurşun: ana metin VE her çerçeve/gölge çizgisi (v3: daha koyu, #141414). */
  kursun: '#141414',
  /** Sarı: ekrandaki TEK birincil eylemin dolgusu (üstünde kurşun metin). Adı v2'den kalma. */
  sariKalem: '#FFD23F',
  /** Pano mavisi: etkileşim rengi (bağlantı, odak, ghost buton) ve Sınıf modu zemini. */
  pano: '#2D3A8C',
  /** Pano gölgesi: mavi panodaki kartların sert gölgesi. */
  panoDerin: '#121848',
  /** Damga moru: yalnızca "Aferin" damgası ve kutlama. Başka yerde kullanılmaz. */
  damga: '#6B2FD6',
  /** Artı yeşili: "+" düğmesi, olumlu seçili dolgu. Üstünde kurşun. */
  yesil: '#39D98A',
  /** Koyu yeşil: yeşil bir zemin üstünde ya da beyaz üstünde YAZI rengi (6.58:1). */
  yesilKoyu: '#0E6B3E',
  /** Mercan: olumsuz/yıkıcı DOLGU (üstünde kurşun, 6.58:1). Yazı rengi olarak değil. */
  mercan: '#FF6B5B',
  /** Mavi: nötr seçim dolgusu (üstünde kurşun, 7.0:1). */
  mavi: '#7B9BFF',
  /** Kırmızı kalem: hata YAZISI ve ikonu (beyaz üstünde 6.45:1, `dangerMuted` üstünde 4.85:1). */
  kirmiziKalem: '#B91E0D',

  /** Defter masası: geniş web ekranında kâğıdın arkasındaki noktalı zemin (yalnızca `AppFrame.web`). */
  defter: '#F6F5F2',
  defterNokta: '#CFCCC4',

  // El işi kâğıdı renkleri (düz, canlı). Üstünde hep kurşun metin (≥ 9:1).
  nane: '#B8F0D4',
  gok: '#A9C1FF',
  lila: '#CDB8FF',
  turuncu: '#FFB067',
  pembe: '#FF9BC8',

  // Eski adlar — yeni kodda kullanmayın.
  /** @deprecated v1 adı; `sira` kullanın. */
  satir: '#F2F2EF',
  /** @deprecated v1 adı; `kursun` kullanın. */
  murekkep: '#141414',
  /** @deprecated v1 kenar çizgisi; `colors.rule` kullanın. */
  kenarCizgisi: '#E2E2E2',
  /** @deprecated v2 adı (mavi tükenmez); anlamı v3'te pano mavisi — `pano` kullanın. */
  tukenmez: '#2D3A8C',
} as const;

/** El işi kâğıdı renk adları (kart, ikon kutusu, bant, sınıf etiketi zemini). */
export type PaperName = 'nane' | 'gok' | 'lila' | 'turuncu' | 'pembe' | 'sari';

/** `PaperName` → hex. Üstüne hep `colors.text` (kurşun) yazılır. */
export const paper: Record<PaperName, string> = {
  nane: palette.nane,
  gok: palette.gok,
  lila: palette.lila,
  turuncu: palette.turuncu,
  pembe: palette.pembe,
  sari: palette.sariKalem,
};

/** Bant ve sınıf etiketi için sıralı döngü (mockup `TAPES`). */
export const paperCycle: readonly PaperName[] = ['sari', 'pembe', 'nane', 'gok', 'turuncu', 'lila'];

export const colors = {
  // Yüzeyler
  background: palette.kagit,
  surface: palette.kagit,
  surfaceMuted: palette.sira,
  // Metin
  text: palette.kursun,
  textMuted: '#4A4A4A',
  textInverse: palette.kagit,
  // Çizgiler
  /** Ayraç / ince çizgi (yalnızca yapı; metin için değil). v3: 2 px ayraç (`layout.hairline`). */
  rule: '#E2E2E2',
  /**
   * Soluk/pasif çizgi ve ikon (devre dışı gün, "ton yok" noktası). v2'de giriş alanı kenarıydı;
   * v3'te giriş alanı kenarı `outline` (kurşun). Beyaz üstünde 3.45:1 — YAZI için kullanmayın.
   */
  border: '#8A8A8A',
  /** Kalın kurşun çerçeve: kart, buton, alan, çip, ikon kutusu (v3'ün imzası). */
  outline: palette.kursun,
  /** @deprecated v1 kırmızı kenar çizgisi; sessiz ayraç rengine eşlenir. */
  marginRule: '#E2E2E2',
  // Birincil eylem (sarı) — ekranda yalnızca bir kez
  accent: palette.sariKalem,
  accentPressed: '#F5BC12',
  onAccent: palette.kursun,
  // Etkileşim (pano mavisi)
  primary: palette.pano,
  primaryPressed: '#1F2A6B',
  primaryMuted: '#DCE5FF',
  primaryMutedText: '#3D4A9C',
  // Yıkıcı
  /** Hata yazısı/ikonu ve `danger` buton metni (kırmızı kalem). */
  danger: palette.kirmiziKalem,
  dangerPressed: '#971808',
  dangerMuted: '#FFD6D0',
  /** Yıkıcı buton DOLGUSU (üstünde `onDangerSolid` = kurşun). */
  dangerSolid: palette.mercan,
  dangerSolidPressed: '#F2503F',
  onDangerSolid: palette.kursun,
  // Pano ve damga
  /** Sınıf modu zemini (mavi pano); üstünde beyaz ya da kâğıt kartlar. */
  board: palette.pano,
  /** Pano üstündeki kartların sert gölge rengi. */
  boardDeep: palette.panoDerin,
  /** "Aferin" damgası mürekkebi (beyaz üstünde 6.99:1). */
  stamp: palette.damga,
  /** Artı yeşili (+ düğmesi dolgusu, üstünde kurşun) ve koyu karşılığı (yazı). */
  plus: palette.yesil,
  plusText: palette.yesilKoyu,
  // Diğer
  scrim: 'rgba(20, 20, 20, 0.55)',
  shadow: palette.kursun,
  pressedOverlay: 'rgba(20, 20, 20, 0.06)',
} as const;

export type ToneName = 'positive' | 'neutral' | 'warning' | 'negative';

export interface ToneColors {
  /** Seçili dolgu; üstünde `onSolid` (v3: hep kurşun, ≥ 6.5:1). Kenarı `colors.outline`. */
  solid: string;
  solidPressed: string;
  onSolid: string;
  /** Açık kâğıt zemin (rozet, ikon kutusu, banner) — üstünde `onSoft` (≥ 4.5:1). */
  soft: string;
  onSoft: string;
}

/**
 * Seçenek tonları. v3: dolgular canlı kâğıt renkleri, üstlerinde BEYAZ DEĞİL kurşun metin;
 * `onSoft` koyu ton rengidir (hem `soft` hem beyaz üstünde ≥ 4.5:1). Kontrastlar docs/DESIGN.md §3'te.
 */
export const tones: Record<ToneName, ToneColors> = {
  positive: {
    solid: palette.yesil,
    solidPressed: '#2BC277',
    onSolid: palette.kursun,
    soft: palette.nane,
    onSoft: palette.yesilKoyu,
  },
  neutral: {
    solid: palette.mavi,
    solidPressed: '#6286F5',
    onSolid: palette.kursun,
    soft: '#C9D8FF',
    onSoft: palette.pano,
  },
  warning: {
    solid: palette.turuncu,
    solidPressed: '#F09A45',
    onSolid: palette.kursun,
    soft: '#FFD9B0',
    onSoft: '#7A3E00',
  },
  negative: {
    solid: palette.mercan,
    solidPressed: '#F2503F',
    onSolid: palette.kursun,
    soft: '#FFD0CA',
    onSoft: '#9F1A0B',
  },
};

/**
 * Avatar arka planları: düz kâğıt renkleri, kurşun metinle ≥ 9:1 (mockup `AVC`).
 * Sıra değişirse öğrenci renkleri değişir — sona ekleyin.
 */
export const avatarColors = [
  palette.gok,
  palette.turuncu,
  palette.nane,
  palette.pembe,
  palette.lila,
  palette.sariKalem,
] as const;
