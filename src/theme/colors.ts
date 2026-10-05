/**
 * Renk token'ları — bkz. docs/DESIGN_V2.md §3 ("Kalem kutusu").
 * Uygulamanın geri kalanında hex renk yazılmaz; buradan içe aktarılır.
 */

/** Ana palet: öğretmenin kalem kutusu. */
export const palette = {
  /** Kâğıt: sayfa ve yüzey zemini. */
  kagit: '#FFFFFF',
  /** Sıra: okul sırasının soluk grisi — pasif yüzey, çip zemini, arama alanı. */
  sira: '#F2F3F5',
  /** Kurşun: kurşun kalem grafiti — ana metin. */
  kursun: '#1D2129',
  /** Sarı kalem: ekrandaki TEK birincil eylemin dolgusu (üstünde kurşun metin). */
  sariKalem: '#FFC62E',
  /** Mavi tükenmez: etkileşim rengi — bağlantı, seçim, odak, ikincil buton. */
  tukenmez: '#2446B0',
  /** Kırmızı kalem: hata ve yıkıcı eylem. */
  kirmiziKalem: '#B3261E',

  // Eski (v1) adlar — yeni kodda kullanmayın.
  /** @deprecated v1 adı; `sira` kullanın. */
  satir: '#F2F3F5',
  /** @deprecated v1 adı; `kursun` kullanın. */
  murekkep: '#1D2129',
  /** @deprecated v1 kenar çizgisi; v2'de dekoratif çizgi yok. */
  kenarCizgisi: '#E3E5EA',
} as const;

export const colors = {
  // Yüzeyler
  background: palette.kagit,
  surface: palette.kagit,
  surfaceMuted: palette.sira,
  // Metin
  text: palette.kursun,
  textMuted: '#5A6170',
  textInverse: palette.kagit,
  // Çizgiler
  /** Ayraç / ince çizgi (yalnızca yapı; metin için değil). */
  rule: '#E3E5EA',
  /** Giriş alanı kenarı (beyaz üstünde ≥3:1). */
  border: '#868C98',
  /** @deprecated v1 kırmızı kenar çizgisi; v2'de sessiz ayraç rengine eşlenir. */
  marginRule: '#E3E5EA',
  // Birincil eylem (sarı kalem) — ekranda yalnızca bir kez
  accent: palette.sariKalem,
  accentPressed: '#EDB300',
  onAccent: palette.kursun,
  // Etkileşim (mavi tükenmez)
  primary: palette.tukenmez,
  primaryPressed: '#1B3690',
  primaryMuted: '#E7ECFA',
  primaryMutedText: '#4A5C9C',
  // Yıkıcı
  danger: palette.kirmiziKalem,
  dangerPressed: '#911E17',
  dangerMuted: '#FCE8E6',
  // Diğer
  scrim: 'rgba(29, 33, 41, 0.42)',
  shadow: palette.kursun,
  pressedOverlay: 'rgba(29, 33, 41, 0.06)',
} as const;

export type ToneName = 'positive' | 'neutral' | 'warning' | 'negative';

export interface ToneColors {
  /** Seçili dolgu; üstünde `onSolid` metin (≥4.5:1). */
  solid: string;
  solidPressed: string;
  onSolid: string;
  /** Açık zemin + ton metni (rozet, nokta, banner) (≥4.5:1). */
  soft: string;
  onSoft: string;
}

/** Seçenek tonları: boya kalemleri. Kontrastlar docs/DESIGN_V2.md §3'te. */
export const tones: Record<ToneName, ToneColors> = {
  positive: {
    solid: '#17744A',
    solidPressed: '#115A39',
    onSolid: palette.kagit,
    soft: '#E1F2E8',
    onSoft: '#17744A',
  },
  neutral: {
    solid: palette.tukenmez,
    solidPressed: '#1B3690',
    onSolid: palette.kagit,
    soft: '#E7ECFA',
    onSoft: palette.tukenmez,
  },
  warning: {
    solid: '#9C5700',
    solidPressed: '#7A4400',
    onSolid: palette.kagit,
    soft: '#FCEFD5',
    onSoft: '#9C5700',
  },
  negative: {
    solid: palette.kirmiziKalem,
    solidPressed: '#911E17',
    onSolid: palette.kagit,
    soft: '#FCE8E6',
    onSoft: palette.kirmiziKalem,
  },
};

/**
 * Avatar arka planları: soluk, kurşun metinle ≥ 9:1.
 * Sıra değişirse öğrenci renkleri değişir — sona ekleyin.
 */
export const avatarColors = [
  '#DDE7F7', // mavi tükenmez soluk
  '#F6E3C4', // kraft kâğıt
  '#DDEFE4', // yeşil boya kalemi soluk
  '#F4DCDC', // pembe silgi
  '#E6E0F3', // mor boya kalemi soluk
  '#E2ECEE', // kurşun kalem grisi
] as const;
