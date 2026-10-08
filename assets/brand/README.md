# Sınıf Defteri — Simge Kılavuzu (kısa)

## 1. Simge
- **Fikir**: kurşun sırtlı bir defterin sayfasında her öğrenci bir nokta. Çoğu yeşil (geldi),
  birkaçı kırmızı (gelmedi) ya da mavi (izinli): sayfada işaretlenmiş bir sınıf, bir bakışta yoklama.
  Noktalar uygulamanın kendi ton noktalarıdır (Geçmiş > Özet ve Gün görünümü).
- **Yapı**: sarı kalem karosu + kurşun sırt + beyaz sayfa + 2x3 nokta. Sağ alt köşe kesiktir; bu hem
  "sayfa" ipucudur hem ızgarayı ilaç blisteri ya da zar gibi kusursuz bir dikdörtgen olmaktan çıkarır.
  Kesik küçük boy kesimde yoktur.
- **Karo**: sarı zemin; Anımsatıcılar gibi liste uygulamalarının beyaz zeminiyle karışmaz.

## 2. Dosyalar
| Dosya | Ne için |
|---|---|
| `sinif-defteri-tile.svg` | Renkli karo (1024, tam kare). `assets/icon.png` kaynağı |
| `sinif-defteri-tile-onecolor.svg` | Tek renk: kurşun karo, defter negatif (noktalar delik) |
| `sinif-defteri-tile-greyscale.svg` | Greyscale (baskı ve erişilebilirlik testi için) |
| `sinif-defteri-tile-small.svg` | Küçük boy kesimi, karo: kalın sırt, büyük noktalar, kesiksiz (16–32 px) |
| `sinif-defteri-symbol.svg` | Karosuz renkli sembol. Yalnız sarı ya da kurşun yüzey üstünde (sayfa beyaz) |
| `sinif-defteri-symbol-small.svg` | Karosuz küçük boy kesimi |
| `sinif-defteri-symbol-onecolor-lead.svg` | Tek renk kurşun sembol (beyaz/açık yüzey üstünde; noktalar şeffaf delik) |
| `sinif-defteri-symbol-onecolor-white.svg` | Tek renk beyaz sembol (koyu yüzey ya da fotoğraf üstünde) |
| `app/icon.svg` | `assets/icon.png` (iOS, tam kare; köşeleri sistem yuvarlar) |
| `app/android-foreground.svg`, `android-background.svg`, `android-monochrome.svg` | Android adaptive katmanları; ön plan ve tek renk 66 dp güvenli daire içinde (ölçek 0,706) |
| `app/splash-icon.svg` | Açılış: beyaz zemin üstünde yuvarlak sarı karo |
| `app/favicon.svg` | Web favicon: küçük boy kesimi, yuvarlak sarı karo |

PNG'ler bu SVG'lerden üretilir: `icon.png` 1024 saydamsız RGB; Android ön plan ve tek renk saydam RGBA;
`favicon.png` 256.

**Açılış neden karo?** Açılış zemini beyaz (giriş ekranıyla renk atlaması olmasın). Simgenin sayfası da beyaz
olduğundan karosuz glif beyaz üstünde kaybolur; bu yüzden açılışta karonun kendisi (yuvarlak köşeli) kullanılır.

## 3. Renk
| Ad | HEX | RGB | CMYK (yaklaşık) | Kullanım |
|---|---|---|---|---|
| Sarı kalem | `#FFC62E` | 255 198 46 | 0 22 82 0 | Karo, Android arka plan, sembolün zemini |
| Kurşun | `#1D2129` | 29 33 41 | 29 20 0 84 | Defter sırtı, tek renk sürüm |
| Kâğıt | `#FFFFFF` | 255 255 255 | 0 0 0 0 | Sayfa, açılış zemini |
| Ton: yeşil (`tones.positive.solid`) | `#17744A` | 23 116 74 | 80 0 36 55 | Çoğunluk noktaları (geldi) |
| Ton: kırmızı (`tones.negative.solid`) | `#B3261E` | 179 38 30 | 0 79 83 30 | İstisna nokta (gelmedi) |
| Ton: mavi (`tones.neutral.solid`) | `#2446B0` | 36 70 176 | 80 60 0 31 | İstisna nokta (izinli) |

Turuncu ton (`#9C5700`, geç geldi) simgede **yok**: sarı karo üstünde zayıf ve kromatik renk sayısını 4'ün
üstüne çıkarır. Noktaların renkleri `src/theme/colors.ts` ile birebir aynı tutulur; token değişirse simge de güncellenir.
CMYK değerleri yaklaşık; Pantone tanımlı değil, baskıdan önce kâğıtta doğrulayın.
Onaylı çiftler: beyaz sayfa üstünde üç ton noktası · sarı üstünde kurşun sırt · kurşun üstünde beyaz (tek renk).
Noktalar sarı üstüne doğrudan konmaz (sayfa beyaz kalır).

## 4. Boyut ve boşluk
- Minimum: karo **29 px** (iOS Ayarlar boyu; test edildi, noktalar ve sırt seçiliyor). 16–28 px için
  `*-small` kesimini kullanın; 16 px'te sırt + nokta ızgarası okunur, kesik köşe yoktur.
- Karosuz sembolün çevresinde sırt kalınlığı kadar boşluk bırakın.
- Uygulama ikonunda sistem tek 1024 px dosyadan ölçekler (29/40/60/180 test edildi).
- Android 13 temalı ikon: tek renk siluet; noktalar delik, sırt ayrı blok olarak kalır.

## 5. Yapılmaz
Gradyan, gölge, dış çizgi ekleme · noktaların sayısını ya da rengini değiştirme (3 ton, 6 nokta) ·
nokta rengi dışında renk ekleme · glifi eğme/döndürme · beyaz zeminde karosuz sembolü renkli kullanma
(beyaz sayfa kaybolur; tek renk kurşun sürümü kullanın) · uygulama ikonu için koyu karo kullanma (karar: sarı karo; kurşun karo yalnız tek renk sürümde).
