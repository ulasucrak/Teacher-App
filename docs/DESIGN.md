# Sınıf Defteri — tasarım sistemi

Bu belge uygulamanın görsel ve yazı dili kurallarıdır. Yeni ekran yazan her görev buna uyar.
Kod karşılığı: `src/theme/` (token'lar) ve `src/components/ui/` (bileşenler). Tema dışında
hex renk, sabit font adı ya da rastgele boşluk değeri yazılmaz.

## 1. Konu, kullanıcı, ana iş

- **Konu:** Türkiye'de bir öğretmenin ders içi kayıtları — yoklama, ödev kontrolü, sözlü,
  derse katılım. Kâğıttaki karşılığı sınıf defteri, yoklama çizelgesi ve öğretmenin
  kendi "not defteri".
- **Kullanıcı:** Ders arasında, ayakta, tek elle telefon kullanan öğretmen. Bir sınıfta
  30–45 öğrenci. Zamanı yok; ekrana bakıp 2 saniyede "kim eksik?" görmek istiyor.
- **Ana iş:** Bir listeyi hızlıca işaretlemek ve kaydetmek. Her karar buna hizmet eder:
  yoğunluk, büyük dokunma alanları, tek bakışta okunan durum renkleri.

## 2. Yön: "çizgili defter, tükenmez kalem"

Kullanıcının beğendiği Ödev Kontrolü ekranının netliğini ve yoğunluğunu koruyoruz
(beyaz zemin, ortalanmış kalın başlık, öğrenci kartları, 3 sütunlu seçenek ızgarası,
altta sabit "Kaydet"). Onu jenerik bir form ekranından ayıran şey, malzemesini Türk okul
defterinden almasıdır:

- **Mavi tükenmez** (her öğretmenin cebindeki kalem) birincil renk ve seçim rengi.
- **Kırmızı kalem** hem "olumsuz" durum hem de defterin **kırmızı kenar çizgisi**.
- **Satır mavisi** — çizgili defterin soluk mavi satırları; pasif yüzeyler ve ayraçlar.
- **Öğrenci numarası sütunu:** okul numarası, sınıf defterindeki gibi kenar çizgisinin
  solunda durur. Bu numara gerçek bir kimliktir (sıra değil süs değil), bu yüzden sayı
  olarak gösterilmesi bilgi taşır.

**Cesaretimizi tek yere harcıyoruz: kırmızı kenar çizgisi.** Öğrenci satırlarında
numarayı isimden ayıran ince kırmızı dikey çizgi ve giriş ekranındaki çizgili sayfa.
Bunun dışında her şey sakin: beyaz, mürekkep, bol nefes.

### Jenerik varsayılanlara karşı kontrol (ilk plandan neyi değiştirdik)

| İlk refleks | Neden reddedildi | Yerine |
|---|---|---|
| Krem zemin + serif başlık + kiremit vurgu | Üretilmiş tasarımın en yaygın işareti; kullanıcı da beyaz zemini seviyor | Saf beyaz kâğıt, mavi tükenmez |
| Her şey aynı radiuslu, aynı gölgeli kart | "SaaS kart kiti" | Radius ve yükselti hiyerarşiye göre (bkz. §6); liste satırları kart değil, defter satırı |
| Ders adı "MATEMATİK" büyük harfle | Büyük harf etiket jenerik; Türkçede `i/İ` büyütmesi de hatalı çıkabiliyor | Cümle düzeni: "Matematik" |
| Seçili seçenek hep aynı mavi | Ekran taranırken "kim sorunlu" görünmüyor | Seçili çip kendi tonunun dolgusunu alır (yeşil/mavi/hardal/kırmızı) — defterdeki kırmızı işaret gibi |
| Inter / sistem fontu | Her projede aynı | Bricolage Grotesque + Atkinson Hyperlegible Next |

## 3. Renk

Ana palet (6 isim):

| Token | Hex | Rol |
|---|---|---|
| `kagit` (paper) | `#FFFFFF` | Sayfa zemini, kart zemini |
| `satir` (rule) | `#EEF1F6` | Pasif çip, ikincil yüzey, giriş alanı zemini |
| `murekkep` (ink) | `#1A2033` | Ana metin (mavi-siyah tükenmez mürekkebi; nötr siyah değil) |
| `tukenmez` (ballpoint) | `#2343B5` | Birincil buton, seçim, bağlantı, odak |
| `kirmiziKalem` (red pen) | `#B8292F` | Olumsuz durum, yıkıcı eylem, hata metni |
| `kenarCizgisi` (margin) | `#E5A3A3` | Yalnızca dekoratif kırmızı kenar çizgisi (metin için kullanılmaz) |

Destek renkleri: `murekkepSoluk #5A6478` (ikincil metin), `cizgi #DCE4F2` (defter satırı /
ayraç), `kenarlik #7C869A` (giriş alanı kenarı, 3:1 üstü), `tukenmezSoluk #DCE3F7` +
`tukenmezPasifMetin #4A5A9A` (pasif birincil buton).

### Seçenek tonları (FormOption.tone)

| Ton | Dolgu (seçili, beyaz metin) | Açık zemin + metin (rozet, nokta) | Örnek seçenekler |
|---|---|---|---|
| `positive` | `#1A7046` (6.09:1) | `#E3F2EA` / `#1A7046` (5.26:1) | Geldi, Tamamlandı, Katıldı |
| `neutral` | `#2343B5` (8.26:1) | `#E8EDFB` / `#2343B5` (7.06:1) | İzinli, Geç Getirdi, Orta |
| `warning` | `#9A5B00` (5.43:1) | `#FBF0DA` / `#9A5B00` (4.80:1) | Eksik, Geç geldi |
| `negative` | `#B8292F` (6.18:1) | `#FBE7E7` / `#B8292F` (5.21:1) | Gelmedi, Getirmedi, Yapmadı |

Diğer ölçülen kontrastlar: `murekkep` / beyaz 16.17:1, `murekkep` / `satir` 14.29:1,
`murekkepSoluk` / beyaz 5.95:1, `murekkepSoluk` / `satir` 5.26:1, beyaz / `tukenmez` 8.26:1,
`kenarlik` / beyaz 3.66:1 (bileşen sınırı ≥3:1).

Kural: ton tek başına anlam taşımaz — seçili çipte ✓ işareti ve erişilebilirlik durumu
(`selected`) da bulunur (renk körlüğü).

## 4. Tipografi

- **Bricolage Grotesque** (başlık): Karakterli, hafif "el yapımı" bir grotesk; okul
  panosundaki kesme harfleri hatırlatır. Sadece ekran başlıkları, sınıf adları, büyük
  sayılar. Türkçe glifler (latin-ext) tam.
- **Atkinson Hyperlegible Next** (metin): Az gören okurlar için tasarlanmış; `I/l/1`,
  `O/0` ayrımı net. Ders arasında hızlı göz gezdirilen isim listeleri için doğru araç.
  Türkçe glifler (latin-ext) tam.

Ölçek (pt, satır yüksekliği ~1.25 başlık / ~1.4 metin, 1.2 oranlı):

| Varyant | Font | Boyut / satır | Kullanım |
|---|---|---|---|
| `display` | Bricolage 700 | 34 / 40 | Giriş ekranı uygulama adı |
| `title` | Bricolage 700 | 26 / 32 | Büyük ekran başlığı (Sınıflarım) |
| `heading` | Bricolage 600 | 20 / 26 | Kart başlığı, sınıf adı, sayfa üstü başlık |
| `bodyStrong` | Atkinson 700 | 17 / 24 | Öğrenci adı |
| `body` | Atkinson 400 | 17 / 24 | Paragraf, alan değeri |
| `bodySmall` | Atkinson 400 | 15 / 21 | Banner metni, yoğun açıklama |
| `label` | Atkinson 600 | 15 / 20 | Buton, çip, alan etiketi |
| `caption` | Atkinson 400 | 13 / 18 | Yardım metni, sınıf "5/B", sayaçlar |
| `number` | Bricolage 600 | 15 / 20 | Okul numarası (tabular görünüm) |

Kurallar: büyük harf etiket yok; tek kelime vurgusu (renkli/italik) yok; başlık üstünde
"eyebrow" etiket yok. Satır uzunluğu < 80 karakter. Dinamik yazı boyutu açık
(`allowFontScaling`), en fazla 1.4× (`maxFontSizeMultiplier`), yoğun ızgarada çip etiketi 1.2×.

## 5. Boşluk ve yerleşim

4 tabanlı ölçek: `xxs 2 · xs 4 · sm 8 · md 12 · lg 16 · xl 20 · xxl 24 · xxxl 32 · huge 48`.

- Sayfa yatay iç boşluğu `lg` (16). Kartlar arası `md` (12). Kart içi `lg`.
- İçerik sola hizalı. Yalnızca üst çubuk başlığı ortalı (iOS alışkanlığı, referans ekran).
- Dokunma alanı en az 44×44 pt (Android 48 dp): `layout.minTouch = 48`.
- Seçenek ızgarası: 3 sütun, `sm` aralık, çip yüksekliği 44.

```
┌──────────────────────────────────────┐
│ ‹         Ödev kontrolü           ⌕  │  ← Screen header (geri / başlık / sağ eylem)
├──────────────────────────────────────┤
│ ┌ Matematik ─────────────── Yayında ┐ │  ← Card (seviye 1)
│ └ 5. sınıf MEB kitabı ──────────────┘ │
│ [ Bugün ][ Geçmiş ]                  │  ← SegmentedTabs
│ Tümü (44 öğrenci)  [✓ Tamam][Eksik]..│
│ 12 ┃ (AY) Ayşe Yılmaz     5/B   ✎    │  ← ListRow + kırmızı kenar çizgisi
│    ┃ [Tamamlandı][Eksik][Getirmedi]  │
│    ┃ [Geç getirdi][Yapmadı][Gelmedi] │
├──────────────────────────────────────┤
│ [            Kaydet               ]  │  ← StickyFooter (seviye 2)
└──────────────────────────────────────┘
```

## 6. Radius ve yükselti (hiyerarşiye göre)

| Seviye | Ne | Radius | Gölge / kenar |
|---|---|---|---|
| 0 — sayfa | Liste satırı, defter satırı | 0 | Alt `cizgi` ayracı |
| 1 — gömülü | Giriş alanı, çip, rozet | `sm` 10 / rozet `xs` 6 | Gölge yok; giriş alanında 1.5 `kenarlik` |
| 2 — kart | Başlık kartı, "Tümü" kartı | `md` 14 | 1 px `cizgi` kenar, gölge yok |
| 3 — sabit | StickyFooter, Toast | `md` 14 (toast) | Mürekkep tonlu yumuşak gölge (`elevation.raised`) |
| 4 — üstte | Sheet / seçici | üst köşeler `lg` 24 | `elevation.overlay` + `%40` mürekkep perde |

Avatar tam yuvarlak (`full`). Butonlar `sm` 10 — çiplerle aynı aile, kartlardan küçük.

## 7. Hareket

- Süreler: `fast 120ms` (basma geri bildirimi), `base 200ms` (durum değişimi, sekme),
  `slow 280ms` (sheet açılış/kapanış). Eğri: standart ease-out.
- Sadece kullanıcı eylemine cevap veren hareket: çip basınca 0.96 ölçek + seçim titreşimi
  (`Haptics.selectionAsync`), sheet aşağıdan kayar, toast kısa süre görünür.
- Giriş animasyonu, kayan kartlar, sürekli dönen dekor yok. Yükleniyor durumu tek bir
  `ActivityIndicator`.
- "Hareketi azalt" açıksa ölçek ve kayma kapatılır, yalnızca opaklık değişir
  (`useReducedMotion`).

## 8. Yazı dili (Türkçe)

- **Hitap: "siz".** Öğretmen yetişkin bir profesyonel. "Giriş yapın", "Sınıf ekleyin".
- **Cümle düzeni:** "Yeni sınıf", "Ödev kontrolü" — her kelime büyük değil.
- **Buton = fiil + nesne:** "Giriş yap", "Hesap oluştur", "Yoklamayı kaydet",
  "Fotoğraftan öğrenci ekle". "Tamam", "Gönder" yok.
- **Aynı eylem aynı adı taşır:** Buton "Kaydet" ise bildirim "Kaydedildi".
- **Boş durum = ne + neden boş + nasıl başlanır:** "Henüz sınıfınız yok. Sınıf
  eklediğinizde yoklama ve ödev formları burada listelenir. İlk sınıfınızı ekleyin."
- **Hata = ne oldu + nasıl düzelir, özür yok:** "E-posta ya da şifre hatalı. Bilgileri
  kontrol edip tekrar deneyin." "İnternet bağlantısı yok. Bağlantınızı kontrol edip
  tekrar deneyin."
- **Onay diyaloğu:** "5/B sınıfı silinsin mi?" + sonuç ("Bu işlem geri alınamaz.") +
  eylem adlı butonlar ("Sınıfı sil" / "Vazgeç").
- Ünlem yok, emoji yok, "Harika!" yok. Ara nokta (`·`) ile meta bağlama yok; ayrı öğe kullan.
- Türkçe büyük/küçük harf için her zaman `toLocaleUpperCase('tr-TR')`.

## 9. Bileşen envanteri (`@/components/ui`)

| Bileşen | Ne zaman | Notlar |
|---|---|---|
| `Screen` | Her ekranın kökü | Güvenli alan, üst çubuk (geri / başlık / sağ eylem), `scroll` ve `footer` |
| `Text` | Tüm metin | `variant`, `tone`; ham `<Text>` kullanma |
| `Button` | Eylemler | `primary / secondary / ghost / destructive`, `loading`, `disabled`, `icon` |
| `IconButton` | Üst çubuk, satır içi ikon eylemleri | 48 pt alan, zorunlu `accessibilityLabel` |
| `Icon` | İkon | SF Symbols (iOS) / Material Symbols (Android), adlar `IconName` ile; boyut `iconSize` token'ı (`xs 14 · sm 16 · md 18 · lg 20 · xl 22 · xxl 24`), sabit sayı yok |
| `TextField` | Form alanı | Etiket, yardım, hata metni; hata `kirmiziKalem` + ikon |
| `OptionChip` | Form seçeneği | `tone`, `selected`, seçimde titreşim; ızgara için `OptionGrid` |
| `Chip` | Filtre / etiket | Seçilebilir nötr çip |
| `Badge` | Durum ("Yayında") | Ton renkli küçük rozet |
| `Card` | Gruplanmış içerik | `marginRule` ile kırmızı kenar çizgisi |
| `Avatar` | Öğrenci | Baş harfler (Türkçe büyütme), isimden sabit renk |
| `ListRow` | Liste satırı | `number` (okul no) + kenar çizgisi, başlık, alt başlık, sağ öğe |
| `EmptyState` | Boş liste | Başlık + açıklama + eylem |
| `LoadingState` | Tam ekran yükleme | Gösterge + isteğe bağlı açıklama |
| `StickyFooter` | Alttaki birincil eylem | Güvenli alan altı, üst ayraç |
| `SegmentedTabs` | 2–4 görünüm arası geçiş | `tablist` rolü |
| `Sheet` / `SelectField` | Seçici ("Sınıf seçin") | RN `Modal`, perdeye dokununca kapanır; ardından Alert/başka Sheet açmak için `onDismissed` (kapanış animasyonu bitince), zamanlayıcı yok |
| `Banner` | Satır içi bilgi/hata | `info / success / warning / error` |
| `ToastProvider` / `useToast` | Kısa onay ("Kaydedildi") | 2.4 sn, `polite` duyuru |
| `RuledPaper` | Giriş ekranı zemini | Defter satırları + kenar çizgisi (yalnızca auth) |

Erişilebilirlik: her dokunulabilir öğede `accessibilityRole` + `accessibilityLabel`
(gerekirse `accessibilityHint`), çiplerde `accessibilityState.selected`, butonda
`disabled`/`busy`. Hata metinleri `accessibilityLiveRegion="polite"`.

## 10. Yapılmayacaklar

- Tema dışında hex, font adı, sihirli boşluk sayısı yazmak.
- Büyük harf etiketler, başlık üstü "eyebrow" etiketleri, tek kelimeyi renklendirmek.
- Her şeye aynı radius ve aynı gri gölge; dekoratif gradyan.
- Krem zemin + kiremit vurgu; siyah zemin + neon vurgu; gazete düzeni.
- Anlamsız numaralandırma (01/02/03). Numara yalnızca okul numarasıdır.
- Buton metnine "→" eklemek; meta bilgileri "A · B · C" diye bağlamak.
- Kendiliğinden oynayan animasyonlar, her kartta giriş animasyonu.
- Durumu yalnızca renkle anlatmak (✓ ve erişilebilirlik durumu şart).
- 44 pt'den küçük dokunma alanı.
- "Bir hata oluştu" gibi belirsiz hata; özür dileyen hata; "Gönder/Tamam" butonu.
- Expo Go'ya güvenmek: yerel metin tanıma (Vision/ML Kit) için geliştirme derlemesi gerekir.
