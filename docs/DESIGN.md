# Sınıf Defteri — tasarım dili v3: "Pano ve Damga"

Bu belge uygulamanın tek tasarım kaynağıdır (v1 "çizgili defter" ve v2 "Kalem kutusu" dillerinin
yerini aldı). Yeni ekran yazan ya da mevcut ekranı yeniden düzenleyen her görev buna uyar.
Kod karşılığı: `src/theme/` (token'lar) ve `@/components/ui` (bileşenler). Tema dışında hex renk,
font adı ya da rastgele boşluk sayısı yazılmaz.

**Görsel referans:** `docs/design/pano-ve-damga.html` (onaylı mockup: telefon, laptop ve Sınıf modu).
Tarayıcıda açıp bu belgeyle birlikte okuyun; belge ile mockup çelişirse mockup kazanır, belge
düzeltilir. Bileşenleri tek sayfada görmek için bkz. §12 ("Galeri").

**Geçiş durumu:** aşama 1 (token'lar + `@/components/ui`) tamam. **Aşama 2'de öğretmen ekranları mockup'a
getirildi** (giriş, Sınıflarım, Sınıf + `HeroBlock`, Artı/eksi tek satır sayaç, Geçmiş toplam kartı, öğrenci
listesi, hesap, laptop uygulama çubuğu — bkz. §13); **Sınıf modu** ekranı ayrı iştir ve henüz bu belgedeki
"Sınıf modu" bölümünün eski (v2 yerleşimli) tarifindedir.

## 0. Neden yeniden? v1 denetimi (tarihsel; en çok kalabalık yaratan 7 sorun)

| # | Sorun (mevcut ekran) | v2 kararı |
|---|---|---|
| 1 | **Sınıf ekranı 6 eylemi aynı anda gösteriyor:** iki büyük giriş kartı (Formlar, Fotoğraftan öğrenci ekle), "Öğrenciler" başlığı + "Seç", arama, liste, altta "Öğrenci ekle". Öğrenci eklemek, her gün yapılmayan bir iş olduğu hâlde birincil eylem gibi duruyor. | Sınıf ekranında formlar üstte, öğrenciler altta, ikisi de sade liste satırı. Öğrenci ekleme/seçip silme/sınıfı düzenleme "⋯" menüsünde. |
| 2 | **Yeni sınıf yalnızca ad formu.** Öğretmen boş bir sınıfa düşüyor, öğrencileri ayrı bir ekrandan, ayrı akışla ekliyor. | Yeni sınıf = 3 adımlı sihirbaz; ana adım **öğrencileri eklemek** (fotoğraf / listeyi yapıştır / elle yaz). |
| 3 | **Form eklemek sayfanın yarısını kaplıyor:** ayrı Formlar ekranı, uzun boş durum metni, "Başka sınıftan form ekle" kartı, 4–5 şablon satırı ve altta "Yeni form oluştur". | Tek küçük **"+ Form"** düğmesi → şablon paneli. Sayfada kart ya da şablon listesi yok. |
| 4 | **Doldurma ekranı çok uzun:** başlık kartı (ders, açıklama, rozet, tarih, Yayınla), simgeli "Tümü" kartı, her öğrenci satırında numara + kırmızı çizgi + avatar + ad + her satırda aynı "5/B" + not düğmesi + 2 satır × 3 sütun büyük çip. 40 öğrencide sonsuz kaydırma. | Satır = numara + ad + kompakt çipler (tek satıra sığar). Tarih tek çip, yayın/silme "⋯" içinde, "Tümü" tek ince satır. |
| 5 | **Dekoratif dil bilgi taşımıyor:** kırmızı kenar çizgisi, çizgili kâğıt zemini, satır başına tekrarlanan meta. Mavi her yerde (birincil buton, seçim, nötr ton, bağlantı) — ana eylem ayırt edilmiyor. | Dekoratif çizgi yok. **Ana eylem tek renkte (sarı kalem)** ve ekranda yalnızca bir kez. |
| 6 | **Metin fazlası:** boş durumlarda 2–3 cümle, açıklamalı kartlar, uzun banner'lar. | Boş durum = başlık + tek cümle + tek buton. Açıklama yalnızca belirsizlik varsa. |
| 7 | **Onaylar ekranın üstünde** (sistem Alert'i) ve menü sheet'lerinde iri butonlar + açıklama metni. | Seçenekler `OverflowMenu` satırlarıyla, geri alınamaz eylemler başparmak yakınında `ConfirmSheet` ile. |


> v2 bu yedi sorunu çözdü ve **v3'te de geçerlidir**; v3 yalnızca görsel dili (renk, çerçeve, gölge,
> başlık ölçeği) değiştirir. Ekran yapısı, akışlar ve navigasyon aynıdır.

## 1. Konu, kullanıcı, ana iş

- **Konu:** Türkiye'de bir öğretmenin ders içi kayıtları: yoklama, ödev kontrolü, sözlü,
  derse katılım.
- **Kullanıcı:** Teneffüste ya da derse girerken, ayakta, **tek elle** telefon kullanan
  öğretmen. Sınıfta 30–45 öğrenci. Ekrana 2 saniye bakıp "kim yok, kim getirmedi" görmek ister.
- **Ana iş:** Bir listeyi hızlıca işaretleyip kaydetmek. Her karar buna hizmet eder.


## 2. Yön: "Pano ve Damga"

Sınıfın mantar panosu ve öğretmenin mor mürekkepli "Aferin" damgası. **Kalın kurşun çerçeveler, düz ve
canlı el işi kâğıdı renkleri, sert (ofsetli, bulanıksız) gölgeler, posterden fırlamış iri başlıklar.**
Degrade, bulanıklık, cam efekti yok; her şey net çizgiyle ayrılır.

- **Kurşun** (`#141414`) yalnız metin değil, **her çerçevenin ve gölgenin** rengidir. Ekran beyaz kâğıt
  üstünde kurşun çizgilerle çizilmiş gibi okunur.
- **Sarı** (`#FFD23F`) yine **ekrandaki tek ana eylemi** boyar. v2'nin en iyi kararı korunur.
- **Pano mavisi** (`#2D3A8C`) iki iş yapar: Sınıf modunun zemini (`Board`) ve etkileşim rengi
  (bağlantı, odak, ghost buton). Pano üstünde kâğıt kartlar, kartların gölgesi koyu mavidir (`boardDeep`).
- **Damga moru** (`#6B2FD6`) yalnızca ödül anıdır: "Aferin +1" damgası. Başka hiçbir yerde mor kullanılmaz.
- **El işi kâğıdı renkleri** (nane, gök, lila, turuncu, pembe) sınıf/form kimliği, ikon kutusu, rozet,
  bant ve avatar zeminidir; üstlerinde hep kurşun yazı. **Seçenek tonları** (artı, mercan, gök,
  turuncu) da bu canlı renklerdir ve v3'te üstlerinde **beyaz değil kurşun** yazı taşır.
- Başlıklar Bricolage **800**, ad/buton/etiket Atkinson **800**: ağırlık v2'den bir kademe yukarıdadır.

### Kalem kutusu'ndan (v2) korunanlar

| Karar | v3'te |
|---|---|
| Sarı yalnızca ana eylem; ekranda en fazla bir sarı öğe | **Aynen.** Sarı yazı/ikon rengi olarak da kullanılmaz (beyaz üstünde 1.5:1). Tek istisna: kurşun zeminde (toast eylemi, "Aferin" şeridi) sarı yazı ≥ 12:1. |
| Saf beyaz kâğıt zemin, krem/serif yok | **Aynen** (sayfa `#FFFFFF`). Noktalı "defter masası" yalnız geniş web ekranında çerçevenin arkasında. |
| Ekran başına tek ana eylem, başparmak bölgesi altta | **Aynen** (FAB / `BottomActionBar`). |
| Bölümleri kartlara bölmemek; liste satırı + boşluk | **Aynen.** Kart yalnızca giriş noktası (`ListRow variant="card"`), vurgu (`PaperCard`) ve Sınıf modu karoları için. |
| Büyük harf etiket, eyebrow, emoji yok; cümle düzeni başlık | **Aynen.** "İri başlık" büyük **harf** değil büyük **punto**dur. |
| Durum yalnızca renkle verilmez (✓, +/−, sayı, çıkartma her zaman var) | **Aynen** ve mockup'ta da vurgulu. |
| Dokunma ≥ 48 pt, tüm eylemlerin `testID`'si | **Aynen** (bileşen API'leri kırılmadı). |
| Tek yazı çifti: Bricolage Grotesque + Atkinson Hyperlegible Next | **Aynen**; yalnız ağırlıklar 800'e çıktı (600/700 başlık ağırlıkları paketten çıktı). |
| Hareket yalnızca kullanıcı eylemine cevap; "hareketi azalt" saygısı | **Aynen**; damga animasyonu da buna uyar. |
| Boş durum = başlık + tek cümle + tek buton; hata dili; onaylar `ConfirmSheet` | **Aynen.** |

**Anlamı değişenler:** "kalem kutusu" metaforu ve `tukenmez` (mavi tükenmez) → artık pano mavisi;
`sira` (soluk gri yüzey) artık yalnızca devre dışı/pasif/ikon kutusu zemini (alanlar beyaz + çerçeveli);
"yüzey = gölgesiz" kuralı kalktı: kart/buton/FAB/alan kalın çerçeve + sert gölge taşır; "hap" biçimi
(FAB, arama, çip, avatar) kaldırıldı — yalnız sayaç/damga/puan dairesi yuvarlak; `elevation` yumuşak gölge
değil sert gölge/üst çizgi.

### Jenerik varsayılanlara karşı kontrol

| İlk refleks | Neden reddedildi | Yerine |
|---|---|---|
| Yumuşak gölge, cam, degrade, pastel "SaaS" görünüm | Tahtada/projeksiyonda soluyor; jenerik | Düz renk, kalın kurşun çizgi, bulanıksız ofset gölge |
| Her bileşene aynı kalın çerçeve + gölge | Yorucu, hiyerarşi kaybolur | Üç seviye: gölgesiz 2 px (satır içi çip/avatar), 2.5 px + küçük gölge (alan, ikincil), 2.5 px + büyük gölge (ana eylem, hero) |
| Her yere renk | Anlam kaybolur | Renk yalnız anlam (ton) ve kimlik (kâğıt rengi) taşır; ana eylem tek sarı |
| Mor aksan her yerde | "AI moru" klişesi | Mor yalnızca damga |
| Sadece ikonlu FAB | Anlamı tahmin ettirir | Her zaman etiketli: "+ Yeni sınıf" |

## 3. Renk

Ana palet (`palette`):

| Token | Hex | Rol |
|---|---|---|
| `kagit` | `#FFFFFF` | Sayfa ve yüzey zemini |
| `kursun` | `#141414` | Ana metin **ve tüm çerçeve/gölgeler** (`colors.outline`, `colors.shadow`) |
| `sariKalem` | `#FFD23F` | Ekrandaki tek ana eylemin dolgusu (üstünde kurşun, 12.8:1) |
| `pano` | `#2D3A8C` | Etkileşim (bağlantı, odak, ghost) + Sınıf modu zemini; beyaz üstünde 10.0:1 |
| `panoDerin` | `#121848` | Pano üstündeki kartların sert gölgesi |
| `damga` | `#6B2FD6` | Yalnızca "Aferin" damgası (beyaz üstünde 6.99:1) |
| `yesil` / `yesilKoyu` | `#39D98A` / `#0E6B3E` | "+" dolgusu (üstünde kurşun 10.1:1) / yeşil metin (beyaz üstünde 6.58:1) |
| `mercan` | `#FF6B5B` | Olumsuz/yıkıcı **dolgu** (üstünde kurşun 6.6:1); yazı rengi olarak değil |
| `kirmiziKalem` | `#B91E0D` | Hata **yazısı/ikonu** (beyaz üstünde 6.45:1) |
| `mavi` | `#7B9BFF` | Nötr seçim dolgusu (üstünde kurşun 7.0:1) |
| `nane` `gok` `lila` `turuncu` `pembe` | `#B8F0D4` `#A9C1FF` `#CDB8FF` `#FFB067` `#FF9BC8` | El işi kâğıtları (`PaperName`, `paper` haritası); üstünde kurşun ≥ 9:1 |
| `sira` | `#F2F2EF` | Pasif yüzey, devre dışı buton, ikon kutusu (v3: hafif sıcak gri) |
| `defter` / `defterNokta` | `#F6F5F2` / `#CFCCC4` | Yalnız `AppFrame.web` noktalı masa |

Kod adları (`colors`): `background/surface` = kâğıt, `surfaceMuted` = sıra, `text` = kurşun,
`textMuted #4A4A4A` (beyaz 8.9:1, sıra 7.9:1), `rule #E2E2E2` (2 px ayraç), `border #8A8A8A`
(soluk/pasif çizgi — **yazı için değil**, 3.45:1), **`outline` = kurşun** (kalın çerçeve),
`accent/accentPressed/onAccent` (sarı), `primary` = pano (adı geriye uyum için korunur; **birincil
buton rengi değildir**), `primaryMuted #DCE5FF`, `danger` (kırmızı kalem yazı), `dangerMuted #FFD6D0`,
`dangerSolid #FF6B5B` + `onDangerSolid` (yıkıcı buton dolgusu), `board`, `boardDeep`, `stamp`,
`plus`/`plusText`, `scrim` (%55 kurşun), `pressedOverlay`.

### Seçenek tonları (`FormOption.tone`) — canlı kâğıt renkleri

v3'te dolgu üstünde **kurşun** yazı (v2'de beyazdı); `onSoft` koyu ton rengidir ve hem `soft` hem
beyaz üstünde okunur. Seçili çip = ton dolgusu + 2.5 px kurşun çerçeve + küçük sert gölge + ✓.

| Ton | Dolgu (`solid`, kurşun yazı) | `soft` / `onSoft` | Örnek |
|---|---|---|---|
| `positive` | `#39D98A` — 10.1:1 | `#B8F0D4` / `#0E6B3E` — 5.2:1 | Geldi, Artı, Tamamlandı |
| `neutral` | `#7B9BFF` — 7.0:1 | `#C9D8FF` / `#2D3A8C` | İzinli, Orta |
| `warning` | `#FFB067` — 10.2:1 | `#FFD9B0` / `#7A3E00` | Eksik, Geç geldi |
| `negative` | `#FF6B5B` — 6.6:1 | `#FFD0CA` / `#9F1A0B` | Gelmedi, Getirmedi, Eksi |

Bu kontrastlar `src/theme/theme.test.ts` içinde **otomatik doğrulanır** (metin ≥ 4.5:1, kâğıt/avatar ≥ 9:1).
Yeni renk eklerken teste de ekleyin.

Kurallar:
- Sarı beyaz zemin üstünde metin ya da ikon rengi olarak **kullanılmaz** (1.6:1). Yalnızca dolgu (ve kurşun zeminde yazı).
- Mercan ve diğer pastel dolgular beyaz üstünde **yazı** değildir; hata yazısı `danger`.
- Ton tek başına anlam taşımaz: seçili çipte ✓ ve `accessibilityState.selected/checked`; sayılar ve +/− işareti her zaman var.
- Bir ekranda sarı dolgulu öğe en fazla **bir** tanedir (FAB, alt buton ya da boş durum eylemi). İstisna: Sınıf modunda toplam kutusu ve kutlama şeridi (mockup).
- Damga moru yalnız `Stamp` ve kutlamada.

## 4. Tipografi

İki aile korunur: **Bricolage Grotesque 800** (tüm başlıklar, büyük sayılar) ve **Atkinson Hyperlegible
Next 400/700/800** (metin, buton, etiket, okul numarası `tabular-nums`). Yalnızca `fonts.ts` içindeki
dört ağırlık paketlenir.

| Varyant | Font | Boyut / satır | Aralık | Kullanım |
|---|---|---|---|---|
| `hero` *(yeni)* | Bricolage 800 | 80 / 72 | −4 | Sınıf adı bloğu (`HeroBlock`): "5/B" |
| `poster` *(yeni)* | Bricolage 800 | 44 / 46 | −1.5 | Kök ekran büyük başlığı (`Screen largeTitle`): "Sınıflarım" |
| `display` | Bricolage 800 | 40 / 44 *(v2: 34/40)* | −1.2 | Giriş ekranı "Sınıf Defteri"; Sınıf modu puanı |
| `title` | Bricolage 800 | 32 / 36 *(28/34)* | −0.9 | Sihirbaz sorusu, ikincil büyük başlık |
| `headline` *(yeni)* | Bricolage 800 | 26 / 30 | −0.5 | Bölüm başlığı (`SectionHeader`), boş durum başlığı |
| `heading` | Bricolage 800 | 20 / 25 *(19/24)* | −0.3 | Üst çubuk, sheet başlığı, satır sonu sayı |
| `bodyStrong` | Atkinson 800 *(700)* | 17 / 24 | — | Ad, satır başlığı, buton |
| `body` | Atkinson 400 | 17 / 24 | — | Paragraf, alan değeri |
| `bodySmall` | Atkinson 400 | 15 / 21 | — | Kısa açıklama |
| `label` | Atkinson 700 *(600)* | 15 / 20 | — | Alan etiketi, çip, küçük buton |
| `caption` | Atkinson 400 | 14 / 19 *(13/18)* | — | Alt bilgi, yardım metni |
| `number` | Atkinson 700 tabular | 15 / 20 | — | Okul numarası |

`heading` mockup'ta 21 px'tir ama 20'de tutulur: Sınıf modu seçenek genişliği hesabı
(`features/classroom/layout.ts`) `typography.heading` boyutundan türetildiği için 21'de 1920 px'te sütun
sayısı düşer; aşama 2'de bu bağımlılık kaldırılınca 21'e çıkarılabilir.

Eski ad `fontFamilies.displayBold/displaySemiBold/textSemiBold` kullanımdan kalktı (aynı yeni fonta eşlenir).
Kurallar: büyük **harf** etiket yok; başlık üstünde "eyebrow" yok; satır < 80 karakter. Dinamik yazı
açık, en fazla 1.4× (çiplerde 1.2×). `hero` ve sayaçlarda `adjustsFontSizeToFit` ya da tek satır sınırı kullanılır.

## 5. Boşluk, yerleşim, dokunma

- 4 tabanlı ölçek: `xxs 2 · xs 4 · sm 8 · md 12 · lg 16 · xl 20 · xxl 24 · xxxl 32 · huge 48`.
- Sayfa yatay boşluğu **20** (`layout.pageX`). Bölümler arası `xxl`. İçerik sola hizalı;
  ortalı olan yalnızca üst çubuk başlığı ve boş durum.
- **Sert gölge yer ister:** sağ/alt 3–5 px taşar. Yan yana düğmeler arası ≥ 12–16 (`BottomActionBar` 16,
  `ConfirmSheet` 16); kapsayıcıya `overflow: hidden` verilirse gölge kırpılır.
- **Başparmak bölgesi:** ana eylem her zaman altta (alt çubuk ya da FAB). Üstte yalnızca geri
  ve "⋯" (46 pt kare "pul": `layout.squareButton`).
- Dokunma alanı ≥ 48 pt (`layout.minTouch`; görünür kutu 44–46 + `hitSlop`). Buton 56, küçük buton 44
  (+4 hitSlop), FAB 58, liste satırı ≥ 72 *(v2: 64)*, ızgara çipi 44, kompakt çip 40 + 4 hitSlop,
  üst çubuk 62 *(52)*.
- Çizgi kalınlıkları (`strokes`): `fine 1.5` (rozet) · `thin 2` (ayraç, ikon kutusu, avatar, pasif çip) ·
  `base 2.5` (buton, kart, alan, segment, üst çubuk çizgisi) · `heavy 3` (vurgu). `layout.hairline` artık **2** px
  (adı v1'den kalma), `layout.inputBorder/inputBorderFocus` 2.5, `layout.stroke` 2.5.

## 6. Radius, çerçeve ve sert gölge

`radii`: `xs 8` (rozet, küçük onay kutusu) · `sm 12` (alan, çip, ikon kutusu, kare düğme, banner, segment) ·
`md 16` (buton, kart, FAB, toast) · `lg 22` (sheet üst köşeleri, hero) · `full` (yalnız daire: sayaç, nokta,
damga). Avatar yuvarlatılmış karedir (≈ %26 radius).

**Sert gölge** (`hardShadow(size, color?)`, `shadowOffset`: `xs 2 · sm 3 · md 4 · lg 5`): `boxShadow: 'Npx Npx 0px renk'`.
RN 0.76+ `boxShadow` iOS, Android (API 28+) ve web'de aynı çizilir; eski Android'de gölge görünmez, çerçeve
kalır (kayıp yok). **Doğrudan `boxShadow` yazmayın.** Basılabilir her gölgeli öğe **gömülür**:
`pressed ? pressedIn(size) : hardShadow(size)` (gölge kapanır, öğe gölge ofseti kadar kayar).

| Seviye | Ne | Çerçeve | Gölge |
|---|---|---|---|
| 0 — sayfa | `ListRow` (düz) | yok | 2 px `rule` ayraç |
| 1 — satır içi | Seçilmemiş çip, avatar, ikon kutusu (`md`) | 2 px kurşun | yok |
| 1 — seçili | `OptionChip`, `SegmentedChoice` | 2.5 px kurşun | `xs` (çip) / yok (segment) |
| 2 — alan / ikincil | `TextField`, `SearchField`, `SelectField`, `Button secondary`, `IconButton square`, `Card`, `ListRow card` | 2.5 px kurşun | `xs`–`sm` (alanlarda yalnız odakta/hatada, mavi/kırmızı) |
| 2 — ana | `Button primary/destructive`, `Fab`, `IconTile lg`, `Toast` | 2.5 px kurşun | `md` (toast: **sarı** gölge) |
| 3 — vurgu | `HeroBlock`, `Card paper`, `PaperCard` | 2.5 px kurşun | `lg` (panoda `boardDeep`) |
| 4 — üstte | `Sheet`/menü/onay | 2.5 px kurşun (alt kenar yok) | gölge yok; %55 kurşun perde |
| Sabit çubuk | `StickyFooter` (`elevation.raised`) | üstte 2.5 px kurşun çizgi | yok |

`elevation` adları (`flat/raised/floating/overlay`) korunur ama anlamı değişti: yumuşak gölge değil, çizgi/sert gölge.

## 7. Hareket

- Süreler: `fast 120` (basma), `base 200` (durum, toast), `slow 280` (sheet), `stampMs 380` (damga).
  Eğri: ease-out (damgada hafif yay).
- Yalnızca kullanıcı eylemine cevap: düğme basınca gömülür, çip 0.96 ölçek + seçim titreşimi, sheet
  aşağıdan kayar, toast belirir, **damga iner**. Giriş animasyonu, sıralı kart girişleri, kendiliğinden hareket yok.
- **Damga** (`<Stamp animate />`): 380 ms'de büyükten (2.6×, −34°) yerine (1×, −14°) basılır; aynı karta
  yeniden basmak için `key` değiştirilir. Basılan kart "küt" diye 3 px çöker (aşama 2), puan yaylanır, yeni çıkartma yapışır.
- "Hareketi azalt" açıksa ölçek/kayma/damga düşüşü kapanır, yalnızca opaklık; damga son hâliyle belirir
  (`useReducedMotion`).

## 8. Yazı dili (Türkçe)

- **Hitap "siz", kısa.** Bir ekranda en fazla bir açıklama cümlesi.
- **Buton = fiil (+ nesne):** "Devam", "Sınıfı oluştur", "Kaydet", "Form ekle". "Tamam",
  "Gönder", "Evet" yok. Buton metnine "→" eklenmez.
- **Aynı eylem aynı ad:** "Kaydet" → toast "Kaydedildi"; "Sınıfı sil" → "5/B silindi".
- **Boş durum:** başlık (ne yok) + tek cümle (nasıl başlanır) + tek buton.
  "Henüz sınıfınız yok" / "İlk sınıfınızı ekleyin; öğrencileri fotoğraftan alabilirsiniz." / "Yeni sınıf".
- **Hata:** ne oldu + nasıl düzelir, özürsüz: "İnternet bağlantısı yok. Bağlanıp tekrar deneyin."
- **Onay:** soru başlık + sonuç + eylem adlı buton: "5/B silinsin mi?" / "24 öğrenci ve
  tüm kayıtlar da silinir." / "Sınıfı sil" + "Vazgeç".
- Sayıdan sonra tekil: "24 öğrenci", "3 form". Ünlem, emoji, "Harika!" yok. Meta bilgiyi
  "A · B · C" diye bağlamayın; ayrı öğe kullanın. Büyütmede `toLocaleUpperCase('tr-TR')`.

## 9. Ekran kalıpları

Ekran görevleri bu kalıplara uyar. Her ekranda **tek ana eylem**, en fazla **bir** sağ üst
öğe ("⋯"), ikincil eylemler `OverflowMenu`'de.

### 9.1 Ekran başlığı

- **Kök ekranlar** (Sınıflarım, Sınıf): Sınıflarım `Screen title largeTitle subtitle largeTitleAccessory` —
  solda `poster` (44) başlık, altında tek satır soluk selam ("Günaydın, Selin Hanım": sabah Günaydın, gündüz
  İyi günler, akşam İyi akşamlar), sağda süs `StarSticker` (64, 14°). Sınıf ekranında başlık yerine `HeroBlock`
  (sınıf adı 80 pt nane kâğıtta, bant, çıkartma, avatar yığını + `Pill "28 öğrenci"`). Sağ üstte "⋯".
- **Alt ekranlar** (Form doldurma, düzenleme): üst çubukta geri + ortalı `heading` başlık + "⋯"; çubuğun
  altında `headerDivider` ile 2.5 px kurşun çizgi (mockup `.bar.ruled`).
- **Üst çubuk düğmeleri** (`Screen` bar'ı ve `WizardHeader`) otomatik olarak 46 pt kare "pul" olur
  (`IconButtonVariantContext`); ekranlar `IconButton`'u eskisi gibi verir, bir şey değiştirmez.
- **Sihirbaz:** `Screen header={<WizardHeader …/>}` — geri/kapat, adım çubuğu, soru başlığı.
- Başlık kartı, üstte açıklama paragrafı, eyebrow yok.

### 9.2 Tek ana eylem

- **Liste ekranı** (Sınıflarım): `Screen fab={<Fab label="Yeni sınıf" />}`. FlatList'e
  `contentContainerStyle={{ paddingBottom: layout.fabClearance }}` ekleyin.
- **Görev ekranı** (sihirbaz, doldurma, düzenleme): `Screen footer={<BottomActionBar primary=… />}`.
  İsteğe bağlı `secondary` ("Geri") solda, `hint` üstte ("3 değişiklik kaydedilmedi").
- Boş durum kendi sarı butonunu gösteriyorsa ekran FAB/alt buton göstermez.
- Hiçbir ekranda iki sarı öğe olmaz; ikinci eylem `secondary` (beyaz, çerçeveli) ya da `ghost` (çerçevesiz bağlantı).

### 9.3 Liste satırı (`ListRow`)

- **`plain` (varsayılan):** kart değil; satırlar arası 2 px ayraç (öğrenci listesi, işaretleme).
  Başlık `bodyStrong` (800), en fazla bir satır soluk alt bilgi (`caption` 14), sağda en fazla bir öğe
  (sayı, rozet ya da chevron).
- **`variant="card"` (yeni):** sayfa kenarlarından 20 pt içeride, 2.5 px kurşun çerçeveli, `sm` sert gölgeli
  kâğıt kart; basınca gömülür; kartlar arası 12 pt boşluğu satır kendisi bırakır, ayraç çizmez. Giriş
  noktaları için (formlar, sınıflar; mockup `.fcard` / `.cls`).
- Okul numarası `number` prop'u ile solda dar, soluk, sağa hizalı sütun.
- Her satırda aynı olan bilgi (sınıf adı vb.) satıra yazılmaz; başlıkta bir kez yazılır.
- Giriş noktası satırı: `variant="card"` + `leading={<IconTile icon=… paper="nane" />}` + başlık + tek satır açıklama.
  Form kartı (`FormListRow`) ikon kutusunu `formPaper(başlık)` ile boyar (yoklama nane, artı/eksi gök, sözlü lila,
  ödev kontrolü turuncu, derse katılım pembe; özel formlar sıraya göre, sarı hariç); "Öğrenciler" kartı pembe.
- **Sınıf kartı** (`ClassListRow`, mockup `.cls`): solda 90 pt kâğıt renkli etiket bloğunda sınıf adı
  (`paperCycle` sırası: nane, gök, lila, turuncu, pembe — sarı ana eyleme ayrıldığı için atlanır; uzun ad küçülür),
  ortada "N form" / "Henüz form yok", sağda `heading` 24 öğrenci sayısı + "öğrenci" ve chevron; kalın çerçeve +
  `md` gölge, basınca gömülür. Erişilebilir ad değişmedi: "5/B, 28 öğrenci, 4 form".

### 9.4 İkincil eylemler (`OverflowMenu`)

- Sağ üst `IconButton icon="more" accessibilityLabel="Diğer seçenekler"` → `OverflowMenu`.
- Satır = ikon + fiil ("Öğrenci ekle", "Sınıfı düzenle"); yıkıcı olan en sonda, kırmızı.
- Seçilen eylem panel kapandıktan sonra çalışır; ardından `ConfirmSheet` ya da gezinme güvenli.

### 9.5 Yeni sınıf sihirbazı (3 adım)

Adımlar: **Ad → Öğrenciler → Formlar**. Sınıf son adımda tek seferde oluşturulur;
"✕" yarıda çıkarsa onay sorulur (girilen veri varsa).

1. **Ad:** tek alan "Sınıf adı" (örn. 5/B). Ders/düzey alanları `ghost` "Ayrıntı ekle" ile açılır.
2. **Öğrenciler (ana adım):** üç yol `SegmentedChoice` ("Fotoğraf", "Liste", "Elle") ile:
   *Fotoğraftan* (sınıf listesinin fotoğrafı → OCR inceleme), *Listeyi yapıştır* (çok satırlı
   `TextField`, her satır bir öğrenci, baştaki numara okul no olarak alınır), *Elle yaz*
   (tek alan + "Ekle"). Altta önizleme listesi "24 öğrenci" (satırdan kaldırılabilir).
   Alt çubuk: `secondary` "Geri", `primary` "Devam". "Sonra ekleyeceğim" küçük `ghost`.
3. **Formlar:** hazır formlar (`ChipGroup multiple`): Yoklama (önceden seçili), Ödev kontrolü,
   Sözlü, Derse katılım. Alt çubuk: "Sınıfı oluştur". Bitince sınıf ekranına gidilir, toast
   "5/B oluşturuldu".

Var olan sınıfa sonradan öğrenci eklemek: Sınıf ekranı → "Öğrenciler" → "⋯" → "Öğrenci ekle"
→ yol (Fotoğraftan / Listeyi yapıştır / Tek tek yaz) → sihirbazın 2. adımının aynısı (tek adım,
alt çubukta "Öğrencileri ekle").

### 9.6 "+ Form" (kompakt form ekleme)

- Sınıf ekranında `SectionHeader title="Formlar" actionLabel="Form" actionIcon="plus"`.
- Dokununca `Sheet title="Form ekle"`: hazır formlar satır olarak (tek dokunuşla eklenir,
  toast "Yoklama eklendi"), ardından "Başka sınıftan kopyala" ve "Boş form oluştur".
- Sayfada şablon kartı, "Başka sınıftan" kartı, uzun açıklama yok. Formu olmayan sınıfta
  Formlar bölümünde tek satır: "Henüz form yok" + başlıktaki "+ Form".

### 9.7 Form doldurma

- Üst çubuk: geri, form adı ("Yoklama"), "⋯" (Ara, Yayınla/Taslağa al, Formu düzenle, Kaydı sil).
- Altında tek satır: tarih çipi ("Bugün, 6 Ekim" → tarih seçici) ve sağda ilerleme
  ("21/28").
- "Tümü" tek ince satır: `Text label "Tümü"` + `ChipGroup` (kompakt). Kart, ikon kutusu yok.
- Öğrenci satırı: numara + ad (avatar ve sınıf adı yok), not düğmesi sağda yalnızca soluk
  ikon; seçenekler altında `ChipGroup` (kompakt, içerik genişliğinde, çoğu formda tek satır).
  2–3 kısa seçenekli formlarda `SegmentedChoice` da kullanılabilir. Not varsa adın altında
  tek satır soluk metin.
- Alt çubuk: `BottomActionBar primary="Kaydet"`, `hint` kaydedilmemiş sayısı. Kaydedince toast
  "Kaydedildi". Kaydedilmemiş değişiklikle çıkışta sistem Alert'i kalır (gezinme koruması).

**Artı / eksi (birikimli) satırı** (`MarkRow`, mockup `.mrow`): solda okul no, ortada ad (800) ve altında bugünün
artıları kadar `StarSticker` (en çok 3) + yeşil "Bugün +N" (yalnız eksi varsa soluk "Bugün −N"; geçmiş günde
"6 Eki +N"), yanında küçük ↶ ("son işareti geri al", yalnız o günde işaret varsa). Sağda tek satır sayaç: kare
beyaz **−** · net (Bricolage 22; 0 soluk) · yeşil **+** (`tones.positive.solid`, `xs` gölge). Formun ilk olumlu
seçeneği "+", ilk olumsuz seçeneği "−" olur; başka seçenekler ("Yarım artı") adın altında küçük ton çipleri olarak
kalır (bugünün sayısıyla). `testID`'ler aynı: `mark-row-N`, `-name`, `-net`, `-day`, `-undo`, `-<seçenekAnahtarı>`.
"Toplam: …" satırı kalktı (toplam sayılar net'in erişilebilir metninde); işareti olmayan satırda ek metin yok.
Geri alma bandı (`UndoBar`) `Toast` ile aynı görünümdedir (kurşun + sarı gölge, sarı "Geri al").
Gün çubuğu (`DayBar`): ok + takvim + tarih, sağda kurşun `Pill` ("17 işaret" / "21/28").

**Geçmiş:** "Sınıf toplamı" `TotalsCard` (nane kâğıt, `md` gölge, net `display`); sayım noktaları (`ToneDot`) ton
dolgusu + 1.5 px kurşun çerçeve; gün başlıkları kalın (800), kayıt ayraçları 2 px.

### 9.8 Boş durumlar

`EmptyState`: ortalı, hafif eğik ikon kutusu (`IconTile lg`), `headline` başlık, tek cümle, tek sarı buton
(isteğe bağlı bir `ghost` ikinci yol). Arama sonucu boşsa EmptyState değil, tek satır soluk metin:
"“ay” ile eşleşen öğrenci yok."

### 9.9 Onaylar

- Geri alınamaz her eylem `ConfirmSheet`: başlık soru, mesaj sonuç, `confirmLabel` eylem adı,
  "Vazgeç". İşlem sürerken `loading` (panel açık kalır).
- Geri alınabilir toplu işlemler (ör. "Tümü") onay sormaz; toast + "Geri al".
- Sistem `Alert` yalnızca gezinme korumasında (kaydedilmemiş değişiklik).

### 9.10 Tel kafes çizimleri

Yerleşimin kaba şemasıdır (v2'den); **görsel biçim için mockup'a bakın** — renkli kâğıt bloklar, kalın
çerçeve ve gölge bu çizimlerde gösterilmez.

**Sınıflarım** (kök, FAB)

```
┌──────────────────────────────────────┐
│                                  ⋯   │  ⋯ = Hesap / Çıkış yap
│ Sınıflarım                           │  title
│ Merhaba, Ayşe Hanım                  │  subtitle (soluk)
│                                      │
│ 5/B                          28   ›  │  ListRow: ad + sağda öğrenci sayısı
│ Matematik                            │  tek satır alt bilgi (varsa)
│ ──────────────────────────────────── │
│ 6/A                          31   ›  │
│ ──────────────────────────────────── │
│ 7/C                          27   ›  │
│                                      │
│                    ┌───────────────┐ │
│                    │ +  Yeni sınıf │ │  Fab (sarı, tek ana eylem)
│                    └───────────────┘ │
└──────────────────────────────────────┘
```

**Yeni sınıf — adım 1 / 3: Ad**

```
┌──────────────────────────────────────┐
│     ▬▬▬▬▬▬▬▬  ▭▭▭▭▭▭▭▭  ▭▭▭▭▭▭▭▭   ✕  │  WizardHeader: adım çubuğu
│     Adım 1 / 3               Ad      │
│ Sınıfın adı ne?                      │  title
│                                      │
│ Sınıf adı                            │
│ ┌──────────────────────────────────┐ │
│ │ 5/B                              │ │  TextField (sıra dolgu)
│ └──────────────────────────────────┘ │
│ + Ayrıntı ekle                       │  ghost: ders, düzey
│                                      │
├──────────────────────────────────────┤
│ ┌──────────────────────────────────┐ │
│ │              Devam               │ │  BottomActionBar (sarı)
│ └──────────────────────────────────┘ │
└──────────────────────────────────────┘
```

**Yeni sınıf — adım 2 / 3: Öğrenciler (ana adım)**

```
┌──────────────────────────────────────┐
│ ‹   ▬▬▬▬▬▬▬▬  ▬▬▬▬▬▬▬▬  ▭▭▭▭▭▭▭▭   ✕  │
│     Adım 2 / 3         Öğrenciler    │
│ Öğrencileri ekleyin                  │
│ ┌────────────┬────────────┬────────┐ │
│ │ Fotoğraf   │   Liste    │  Elle  │ │  SegmentedChoice
│ └────────────┴────────────┴────────┘ │
│ ┌──────────────────────────────────┐ │
│ │ 12 Ayşe Yılmaz                   │ │  Listeyi yapıştır: çok satırlı alan
│ │ 15 Mehmet Kaya …                 │ │
│ └──────────────────────────────────┘ │
│ Öğrenciler 24                        │  SectionHeader
│  12  Ayşe Yılmaz                 ✕   │  önizleme satırı
│  15  Mehmet Kaya                 ✕   │
├──────────────────────────────────────┤
│ ┌───────┐ ┌────────────────────────┐ │
│ │ Geri  │ │         Devam          │ │  secondary + primary
│ └───────┘ └────────────────────────┘ │
└──────────────────────────────────────┘
```

**Yeni sınıf — adım 3 / 3: Formlar**

```
┌──────────────────────────────────────┐
│ ‹   ▬▬▬▬▬▬▬▬  ▬▬▬▬▬▬▬▬  ▬▬▬▬▬▬▬▬   ✕  │
│     Adım 3 / 3            Formlar    │
│ Hangi formları kullanacaksınız?      │
│ Sonradan da ekleyebilirsiniz.        │
│                                      │
│ [✓ Yoklama] [• Ödev kontrolü]        │  ChipGroup multiple
│ [• Sözlü] [• Derse katılım]          │
│                                      │
├──────────────────────────────────────┤
│ ┌──────────────────────────────────┐ │
│ │          Sınıfı oluştur          │ │
│ └──────────────────────────────────┘ │
└──────────────────────────────────────┘
```

**Sınıf** (formlar + öğrenciler satırı; burada sarı yok — ana hedefler form satırları)

```
┌──────────────────────────────────────┐
│ ‹                                ⋯   │  ⋯ = Sınıfı düzenle, Arşivdeki formlar,
│ 5/B                                  │      Sınıfı sil
│                                      │
│ Formlar 3                  + Form    │  SectionHeader + ghost eylem
│ [✓] Yoklama                    ⋯     │  FormListRow + IconTile; → bugünün kaydı
│     Bugün                            │
│ ──────────────────────────────────── │
│ [✓] Ödev kontrolü              ⋯     │
│ ──────────────────────────────────── │
│                                      │
│ [◎] Öğrenciler                28  ›  │  → Öğrenciler ekranı
└──────────────────────────────────────┘
```

**Öğrenciler** (alt ekran; ⋯ = Öğrenci ekle, Öğrenci seç)

```
┌──────────────────────────────────────┐
│ ‹            Öğrenciler          ⋯   │
│ ( ⌕  Ad ya da numara              )  │  SearchField
│ 28 öğrenci                           │
│ 1101  Ayşe Yılmaz                    │  ListRow number + ad → düzenleme paneli
│ ──────────────────────────────────── │  (panelde "Öğrenciyi sil")
│ 1102  Mehmet Kaya                    │
└──────────────────────────────────────┘
```

**Form doldurma**

```
┌──────────────────────────────────────┐
│ ‹             Yoklama            ⋯   │  ⋯ = Ara, Yayınla, Düzenle, Sil
│ ( Bugün, 6 Ekim ▾ )          21/28   │  tarih çipi + ilerleme
│ Tümü  [• Geldi] [• Gelmedi] [• İzin] │  ince "Tümü" satırı
│ ──────────────────────────────────── │
│  12  Ayşe Yılmaz                  ✎  │
│      [✓ Geldi] [• Gelmedi] [• İzinli]│  ChipGroup kompakt
│ ──────────────────────────────────── │
│  15  Mehmet Kaya                  ✎  │
│      [• Geldi] [✓ Gelmedi] [• İzinli]│
│      Hastaneye gitti                 │  not (varsa)
├──────────────────────────────────────┤
│   3 öğrencide kaydedilmemiş değişiklik│  hint
│ ┌──────────────────────────────────┐ │
│ │              Kaydet              │ │  BottomActionBar
│ └──────────────────────────────────┘ │
└──────────────────────────────────────┘
```

## 10. Bileşen envanteri (`@/components/ui`)

Tüm dokunulabilir bileşenler `testID` alır (liste içerenler `testIDPrefix` → `${prefix}-${key}`).
**Bileşen API'leri v2 ile uyumludur**; v3'te yalnızca eklemeler yapıldı (yeni prop/bileşen).

| Bileşen | Ne zaman | Notlar (v3) |
|---|---|---|
| `Screen` | Her ekranın kökü | `title`, `largeTitle` (`poster` 44), `largeTitleAccessory` (başlık sağında süs), `subtitle`, `back`, `headerRight` (tek öğe), `header` (özel), `footer`, `fab`, `scroll`, `headerDivider` (2.5 px kurşun çizgi). Bar düğmeleri kare "pul". |
| `WizardHeader` / `Stepper` | Sihirbaz adımları | Adım çubuğu: 10 pt, kurşun çerçeveli; tamamlanan kurşun, kalan beyaz. |
| `BottomActionBar` | Görev ekranının alt eylemi | `primary` (sarı), `secondary` (sol), `hint`. Düğmeler arası 16. |
| `Fab` | Liste ekranının ana eylemi | Sarı, yuvarlatılmış dikdörtgen (hap değil), 2.5 px çerçeve + `md` gölge, basınca gömülür. |
| `Button` | Eylemler | `primary` sarı + gölge (ekranda bir kez), `secondary` beyaz + çerçeve + küçük gölge, `ghost` çerçevesiz pano-mavisi **altı çizili** metin, `destructive` mercan dolgu + kurşun metin (yalnızca onayda); `danger` ghost/secondary metnini kırmızı yapar. Devre dışı: düz sıra grisi, gölgesiz. |
| `IconButton` | Geri, "⋯", satır içi | 48 pt dokunma; zorunlu `accessibilityLabel`. `variant`: `plain` (varsayılan), `tonal` (sıra dolgulu küçük kare), **`square`** (46 pt beyaz kare + gölge; üst çubukta bağlamdan otomatik). |
| `IconButtonVariantContext` | Özel üst çubuk | `Provider value="square"` içindeki `IconButton`'lar kare olur. |
| `OverflowMenu` | İkincil eylemler | Eylem panel kapanınca çalışır; ikon kutuları çerçeveli. |
| `ConfirmSheet` | Geri alınamaz eylem onayı | `confirmLabel` eylem adı, `loading`; mercan "sil" düğmesi. |
| `Sheet` | Seçici / panel | Kurşun çerçeveli kâğıt, `lg` üst köşe, kalın tutamaç; `description`, `onDismissed`, kapat `${testID}-close`. |
| `ListRow` | Liste satırı | `plain` / **`card`** (bkz. §9.3); `number`, `leading`, `trailing`, `action`, `children`, `divider`, `onLongPress`. |
| `IconTile` | Satır başı / boş durum ikonu | Kurşun çerçeveli kâğıt kare (46; `lg` 64 eğik + gölgeli). `tone` → tonun `soft` kâğıdı, **`paper`** → doğrudan kâğıt rengi. |
| `SectionHeader` | Bölüm başlığı | `headline` + **`CountBubble`** + tek çerçeveli küçük eylem (`secondary sm`). |
| `SearchField` | Liste araması | Beyaz, 2.5 px kurşun çerçeve, `sm` radius; odakta mavi sert gölge; `${testID}-clear`. |
| `TextField` | Form alanı | Beyaz, 2.5 px kurşun çerçeve; odakta mavi, hatada kırmızı sert gölge + kırmızı kenar + ikonlu mesaj; `multiline` ≥ 3 satır. |
| `SelectField` | Seçici alan | Beyaz + çerçeve; Sheet açar. |
| `ChipGroup` | Satır içi seçenekler | Kompakt, sarar; tek ya da `multiple`; ton isteğe bağlı. |
| `SegmentedChoice` | 2–4 seçenekli değer | radiogroup; kalın kurşun çerçeveli şerit, ayırıcılar kurşun; seçili = ton dolgusu + kurşun yazı + ✓ (tonsuzsa kurşun dolgu + beyaz yazı). Genişlik/sarma mantığı v2 ile aynı: etiket asla "Gelm…" diye kesilmez. |
| `OptionChip` / `OptionGrid` | Eşit sütunlu seçenek ızgarası | Seçili: ton dolgusu + 2.5 px çerçeve + `xs` gölge + ✓; seçilmemiş: beyaz + 2 px çerçeve + çerçeveli ton noktası. |
| `SegmentedTabs` | Görünüm değiştirme | tablist; seçili = kurşun dolgu + beyaz yazı (mockup `.tabs`). |
| `Chip` | Filtre / tarih çipi | `sm` radius (hap değil), 2.5 px çerçeve; seçili = kurşun dolgu. |
| `Badge` | Olağan dışı durum | Ton `soft` kâğıdı + 1.5 px çerçeve + 800 yazı; satırda en fazla bir. |
| `Banner` | Satır içi bilgi/hata | Ton `soft` kâğıdı + 2.5 px çerçeve, kurşun yazı; eylem `secondary sm`. |
| `Toast` (`ToastProvider`/`useToast`) | Kısa onay | Kurşun kâğıt + **sarı** sert gölge, beyaz 800 yazı, ton renginde ikon. |
| `EmptyState` | Boş liste | Eğik ikon kutusu + `headline`; tek sarı eylem + isteğe bağlı ikinci yol. |
| `Avatar` | Öğrenci | Yuvarlatılmış kare, 2 px çerçeve, kâğıt rengi zemin. |
| `Card` | Gerçekten birlikte okunan içerik | `variant`: `outlined` (beyaz + çerçeve + `sm` gölge), `muted`, **`paper`** (`paper` rengi + `lg` gölge); `tape`, `tapeRotate`, `shadowSize`, `shadowOn="board"`. |
| `LoadingState`, `Text`, `Icon`, `StickyFooter` | v2'deki gibi | `StickyFooter` doğrudan değil `Screen footer` ile; üstte 2.5 px kurşun çizgi. |

### Yeni ortak bileşenler (v3)

| Bileşen | API (özet) | Ne için |
|---|---|---|
| `Stamp` | `word="AFERİN"`, `value="+1"`, `size=108`, `rotate=-14`, `animate`, `accessibilityLabel?`, `style` | Mor "Aferin" damgası. Mutlak konumlandırın; dokunmayı engellemez. `animate` → 380 ms'de iner (reduced motion'da yok). Tekrar basmak için `key`. Etiket yoksa dekoratif. |
| `StarSticker` | `size=18`, `rotate`, `color`, `outlined=true` | Kurşun çerçeveli sarı yıldız çıkartması (bugünün artıları, hero süsü). Dekoratif; sayı ayrıca yazılır. |
| `Tape` | `paper="sari"`, `rotate=-4`, `offsetX`, `style`; `tapeRotation(i)` | Kartı panoya tutturan eğri bant (mutlak, üst kenarda). |
| `PaperCard` | `paper?`, `tape?: boolean \| PaperName`, `tapeIndex`, `onBoard`, `onPress` | Bantlı kâğıt kart (kalın çerçeve + `lg` gölge); bant rengi/eğimi `tapeIndex`'ten kararlı türer. `onBoard` → gölge `boardDeep`. Sınıf modu karoları için. |
| `Board` | `children`, `style` | Mavi pano zemini (`colors.board`, `flex: 1`). Web'de odak halkasını sarıya çevirir. |
| `HeroBlock` | `title`, `subtitle?`, `paper="nane"`, `tape="sari" \| false`, `sticker`, `children` | Sınıf kimlik bloğu: 80 pt sınıf adı kâğıt üstünde (5 harften uzun ad ≈ 560/harf sayısı pt'ye küçülür, en az 30); alt satıra avatar yığını + `Pill` konur. Yatay boşluğu çağıran verir (bant/gölge taşar). |
| `Pill` | `label`, `tone="ink" \| "paper"`, `accessibilityLabel?` | "28 öğrenci" / "11 işaret" hapı. |
| `CountBubble` | `value`, `size=30` | Kurşun daire içinde beyaz sayı (bölüm başlığı yanında). |

Geriye uyum: v1/v2 adları ve prop'ları çalışır. `colors.marginRule`, `layout.marginRuleWidth`,
`palette.satir/murekkep/kenarCizgisi/tukenmez`, `fontFamilies.displayBold/displaySemiBold/textSemiBold`
**@deprecated**'dır (yeni değerlere eşlenir). Anlamı değişen token'lar: `palette.sira`, `colors.border`
(artık soluk çizgi; alan kenarı `outline`), `colors.primary` (pano mavisi), `tones.*.onSolid` (beyaz → kurşun),
`tones.*.soft/onSoft`, `radii.*`, `layout.hairline` (1 → 2), `layout.inputBorder*` (1.5/2 → 2.5),
`layout.rowHeight` (64 → 72), `layout.headerHeight` (52 → 62), `layout.buttonHeightSm` (40 → 44),
`layout.fabHeight` (56 → 58), `layout.stepBar` (4 → 10), `elevation.*`, `typography.*`.

## 11. Erişilebilirlik

- Her dokunulabilir öğede `accessibilityRole` + `accessibilityLabel`; çiplerde `selected/checked`; butonda
  `disabled/busy`. Satır içi çiplerin etiketi bağlamlı: "Ayşe Yılmaz: Geldi".
- **Kontrast ≥ 4.5:1 (metin), ≥ 3:1 (çerçeve/ikon).** Kalın kurşun çerçeve (18:1) tüm girişleri ve düğmeleri
  zeminden ayırır; renk dolguları (mercan, gök, turuncu) üstlerinde **kurşun** yazı taşıdığı için ≥ 6.5:1.
  Ölçümler `src/theme/theme.test.ts` içinde otomatik doğrulanır.
- **Durum asla yalnız renkle verilmez:** seçili çipte ✓, işaretlerde +/−, sayılar, yıldız çıkartması ve damga
  metni ("AFERİN +1") her zaman var.
- **Odak halkası (web):** tüm etkileşimli öğelerde 3 px pano mavisi halka, çerçevenin 2 px dışında
  (`public/index.html`); mavi panoda (`Board`) sarı. Metin alanları ayrıca mavi sert gölgeyle odağı gösterir
  (kenar kalınlığı değişmez, yerleşim kımıldamaz).
- **Hareketi azalt** (`useReducedMotion`): damga düşmez (son hâliyle belirir), çip ölçeği ve sheet kayması kapanır.
- **Dekoratif öğeler** (`Tape`, `StarSticker`, `Stamp` etiketsiz, hero çıkartması) ekran okuyucudan gizlidir;
  bilgi her zaman metindedir.
- Hata metinleri `accessibilityLiveRegion="polite"`; toast duyurulur. `Stepper` `progressbar` rolüyle okur.
- Giriş alanları görünür etiketlidir; hata kırmızı kenar + ikon + metinle (renk tek başına değil).
- Sert gölge `pointerEvents` ve dokunma alanını değiştirmez; basılı hâl (gömülme) 120 ms içinde geri bildirim verir.

### Web / laptop notları

- Masaüstünde uygulama 720 px'lik ortalı **kâğıt sütun**dadır (`AppFrame`): noktalı defter masası üstünde,
  2.5 px kurşun çerçeveli, üst köşeleri yuvarlak, sağa 6 px sert gölgeli (mockup `.sheet`). Çerçeve içindeki
  dar sütunlar (giriş, kayıt) çerçevenin ortasında durur.
- **Uygulama çubuğu** (mockup `.appbar`, 68 pt): yalnızca masaüstü genişliğinde ve oturum açıkken kâğıt sütunun üstünde —
  sarı logo + "Sınıf Defteri", sağda ad + avatar (`features/auth/WebAppBar`, `AppFrame` `header` prop'u). Bilgi amaçlıdır
  (dokunulabilir öğe yok), gezinmeyi etkilemez; Sınıf modu tam ekran `Modal` olduğu için çubuğu kaplar. `AuthProvider`
  `AppFrame`'in dışına alındı (çubuk kimliğe ihtiyaç duyar).
- Panel (sheet / menü) satırlarında ayraç düz kalır; yuvarlak vurgu yalnızca basılıyken görünür.
- Numarası olmayan sınıf listesinde boş numara sütunu ayrılmaz.
- Telefon tarayıcısında dokunma gecikmesi (`touch-action: manipulation`) ve gri vurgu kapalıdır.

## 12. Galeri ve önizleme

Tüm bileşenler tek sayfada: `docs/design/ui-gallery.tsx.txt` dosyasını `app/gallery.tsx` olarak kopyalayın,
web'i derleyin/çalıştırın (`npx expo start --web` ya da `expo export -p web` + `scripts/e2e/web-serve.mjs`),
`/gallery` adresini açın ve mockup ile yan yana karşılaştırın. **İşiniz bitince `app/gallery.tsx`'i silin**
(üretime gitmemeli). Playwright ile ekran görüntüsü alırken telefon için 390×844, laptop için 1440×900 kullanın.

## 13. Aşama 2: ekran ekran yapılacaklar (mockup'a göre)

Aşama 1 temel + ortak bileşenleri verdi. Ekranlar henüz mockup yerleşimine getirilmedi; her ekranda
yapı/akış/navigasyon **değişmeden** yalnızca görsel uyarlama yapılır.

| Ekran | Yapılacak |
|---|---|
| **Giriş / kayıt** (`AuthPage`) | **Yapıldı.** Uygulama işareti: sarı kare logo + kurşun çerçeve + `md` gölge, hafif eğik, yanında küçük yıldız (mockup `.logo`; marka imzası olduğundan "tek sarı" kuralının bilinçli istisnası); `display` başlık; alanlar zaten v3. |
| **Sınıflarım** (`ClassesScreen`) | **Yapıldı** (bkz. §9.1, §9.3). Sınıf satırı = `ListRow variant="card"` ya da özel kart: solda 90 pt renkli etiket bloğu (`paperCycle` sırasıyla, 30 pt Bricolage sınıf adı, 2.5 px sağ kenar), ortada ders + "N form", sağda büyük öğrenci sayısı (`heading` 24) + "öğrenci". Başlığın sağında büyük `StarSticker` (64, 14°). Başlık altı "Günaydın, …" 17 pt muted. FAB zaten yeni. |
| **Sınıf** (`ClassDetailScreen`) | **Yapıldı** (avatar yığını için `listStudentPreview`: ilk 4 öğrenci, hata sessiz). Büyük başlık yerine `HeroBlock` (sınıf adı 80 pt nane, ders, bant, çıkartma, avatar yığını 4 × 34 pt (−6 bindirme) + `Pill "28 öğrenci"`). `SectionHeader` zaten v3 ("Formlar" + `CountBubble` + "+ Form"). Form satırları = `ListRow variant="card"` + `IconTile paper=…` (form başına sabit kâğıt rengi: yoklama nane, artı/eksi gök, sözlü lila, ödev turuncu) ve 3 sn kuralı: `Badge` ("Birikimli"). "Öğrenciler" satırı pembe ikon kutulu kart + sağda sayı + chevron. |
| **Form doldurma / artı-eksi** (`formview/*`, `MarkRow`) | **Yapıldı, "Sınıf modu" düğmesi hariç** (o düğme Sınıf modu işinde; `FormShell`'in o bölgesine dokunulmadı) — bkz. §9.7. Sekme şeridi (`SegmentedTabs`) + **lila "Sınıf modu" butonu** (mockup `.cmb`: `secondary` benzeri, lila dolgu, `present` ikonu; şimdi ghost). Gün çubuğu: "Bugün, 8 Ekim" + sağda `Pill` ("N işaret"); geçmiş güne gidilemeyen ok soluk. Satır: okul no (`mno`) + ad (800) + altında yıldız çıkartmaları + yeşil "Bugün +N"; sağda tek satır sayaç: kare **−** (beyaz, çerçeveli) · net (`Bricolage 22`) · yeşil **+** (`tones.positive.solid`, `xs` gölge). Mevcut iki geniş "Artı/Eksi" düğmesi satırı (`tones.soft` dolgulu `Pressable`) mockup'taki sayaca çevrilir; geri al/toast `Toast` bileşenine (sarı gölge) taşınır. Yoklama gibi günlük formlar zaten `SegmentedChoice`/`ChipGroup` v3'te; satır ayraçları 2 px. |
| **Öğrenciler / düzenleme paneli** | **Yapıldı.** `ListRow plain` + solda `Avatar sm` (kâğıt rengi, kare); sayı `Pill paper` (seçim modunda `ink` "N seçili"); panel alanları v3. |
| **Geçmiş** (`HistorySummary/Day/Timeline`) | **Yapıldı** (`TotalsCard`, `ToneDot`; bkz. §9.7). `Chip` ve `SegmentedChoice` v3'te; toplam kutusu `Card muted`/`paper`, net sayılar `display`/`title`; nokta renkleri `tones.*.solid` (çerçeveli nokta için `strokes.fine`). |
| **Sihirbaz** (`CreateClass/Collect/Review`) | **Kontrol edildi.** Büyük oranda otomatik değişti; fotoğraf küçük resim/önizleme çerçeveleri `strokes.thin` kurşun yapıldı; form seçenek düzenleyicide alanlar beyaz + kurşun çerçeve, ton örnekleri çerçeveli. OCR satırları 2 px ayraçla zaten v3. |
| **Hesap** (`account`) | **Yapıldı.** Üstte kimlik kartı (`Card paper nane` + sarı bant, `Avatar lg`, ad, e-posta); bölümler 2 px ayraçla; "Hesabımı sil" `danger` ghost. Giriş noktası olmadığı için `ListRow card` kullanılmadı. |
| **Sınıf modu** (`classroom/*`) | **En büyük iş.** Zemin `Board`; üst çubuk: beyaz logo, 32 pt başlık (beyaz), mint sınıf çipi, beyaz gün seçici (çerçeveli), sağda **sarı toplam kutusu** (yıldız + 34 pt sayı + "artı bugün", gölge `boardDeep`), beyaz arama/çıkış düğmeleri (`boardDeep` gölge). Karolar = `PaperCard onBoard` (7×4 ızgara hedefi; ad `Bricolage 26`, soyad muted, sağ üstte kurşun **puan dairesi** 50 pt — 0/eksi'de beyaz + çerçeve, altında yıldız çıkartmaları (en çok 5), altta kare **−** + geniş beyaz "+ Artı" (yeşil daire içinde +, `xs` gölge)). Alt çubuk: "Her adım ilerlemedir" (beyaz 22 pt) / **kutlama şeridi** (sarı kâğıt, "Kerem, emeğine sağlık", mor mühür + siyah "+1" hapı). **Damga:** `Stamp animate` kartın sağ altına (108 pt), kart 3 px çöker (`pressedIn`), puan yaylanır, yeni `StarSticker` yapışır; aynı karta tekrar basınca yeni `key`. Eksi: damga/renk değişimi yok, kart gölgesi 1 sn kısalır. Seçenek genişliği hesabı `layout.ts` `typography.heading`'e bağlı — ayrıştırın (bkz. §4). Sütun sayısı sabit ızgara yerine mevcut dinamik hesap korunabilir; mockup 7×4'tür. Sözlü formunda "½" düğmesi "−"nin yanında. |
| **Web laptop çerçevesi** | **Yapıldı** (bkz. §11 "Web / laptop notları"): `WebAppBar`, `AppFrame` `header` prop'u üzerinden. |

Her ekran için kabul: (1) hex/font/sihirli sayı yok; (2) ekranda tek sarı öğe; (3) 390×844 ve 1440×900'de
mockup ile yan yana ekran görüntüsü; (4) `npm run typecheck && npm run lint && npm test` yeşil; (5) hareketi azalt açıkken
damga/animasyon kapalı.

## 14. Yapılmayacaklar

- Ekranda birden fazla sarı öğe; sarıyı metin ya da ikon rengi yapmak.
- Her şeyi kart + gölgeye koymak; aynı çerçeve/gölge seviyesini her öğeye vermek; **yumuşak gölge, degrade, bulanıklık**.
- Doğrudan `boxShadow`/hex/`2.5` gibi sihirli kalınlık yazmak (`hardShadow`, `pressedIn`, `strokes`, `colors.outline` kullanın).
- Mor rengi damga dışında kullanmak; mercan/pastel dolguyu metin rengi yapmak.
- Büyük harf etiket, eyebrow, tek kelime vurgusu, "A · B · C" meta dizisi, buton sonunda "→".
- Sağ üstte birden fazla ikon; ikincil eylemleri sayfaya buton olarak dizmek.
- Her satırda aynı bilgiyi tekrarlamak (sınıf adı, tarih).
- 2 cümleden uzun açıklama; özür dileyen ya da belirsiz hata; "Tamam/Gönder" butonu.
- 48 pt'den küçük dokunma alanı; yalnızca ikonlu FAB.
- Durumu yalnızca renkle (ya da yalnızca çıkartmayla) anlatmak.
- Gölge taşan öğeyi `overflow: hidden` kapsayıcıya koymak (gölge kırpılır).
- Tema dışında hex, font adı, sihirli sayı.

## Sınıf modu

Sınıf modu, onaylı `docs/design/pano-ve-damga.html` mockup'ının mavi **Pano ve Damga** dilini
kullanır. Öğretmen laptop ekranını projeksiyona ya da etkileşimli tahtaya yansıtır; aynı akış
telefonda tek sütunla çalışır. Kod: `src/features/classroom/`.

**Giriş ve durum paylaşımı.** Form ekranındaki “Sınıf modu” düğmesi tam ekran modal açar;
web'de destek varsa tarayıcı tam ekranına geçilir. Çıkış düğmesi ve Esc normal forma döner,
modal kapanınca sahip olunan tam ekran bırakılır. Form ekranının hook örneği paylaşılır:
seçili gün, kaydedilmemiş taslak, anında kaydedilen birikimli işaretler ve geri alma korunur.

**Üst çubuk.** `Board` üstünde beyaz kitap simgesi ve 32 pt Bricolage form başlığı vardır.
Mint kâğıt çipi, `className` verilirse sınıf adını, verilmezse öğrenci sayısını gösterir.
Mevcut `DayBar` beyaz, kurşun çerçeveli bir kapsayıcıdadır: önceki gün, takvim ve bugünden
öteye gitmeyen sonraki gün mantığı korunur. Sarı toplam kutusu 34 pt sayı ve yıldızla seçili
günün **olumlu işaret adedini** gösterir; yarım artı bir işarettir, puan toplamı değildir.
Artı/eksi ve sözlüde etiket “artı”, diğer formlarda “olumlu”dur. Arama ad veya okul
numarasıyla her zaman erişilebilir. Başlığın altında beyaz yazıyla tüm sıfır olmayan günlük
seçenek toplamları, eksiler ve varsa net görünür; arama bu sınıf toplamlarını değiştirmez.

**Kart.** `PaperCard onBoard`: beyaz kâğıt, kalın kurşun çerçeve, koyu pano gölgesi, kararlı
renk/eğimde bant. Ad 26/28 pt Bricolage; son sözcük soyad olarak ayrı, muted satırda gösterilir.
Uzun ad ve etiketler kesilmeden sarar. Sağ üstte en az 50 pt puan dairesi: pozitif net kurşun
zeminde beyaz; sıfır/eksi beyaz zeminde kurşun çerçeve. Kesirli net ve puansız birikimli
formların toplam sayısı korunur. Altında en fazla beş `StarSticker` ve “net”/“toplam” etiketi.
Yıldızlar dekoratiftir; gerçek sayılar ayrıca metinle gösterilir. Okul numarası, varsa seçili
günün işaretleri ve kaldırılmış seçenek sayısı görünür. Birikimli kartta o öğrencinin seçili
gündeki son işaretini geri alan düğme vardır; o gün işaret yoksa pasiftir.

**Az seçenek, az öğe.** Standart Artı (+1), Eksi (−1), varsa Yarım artı (+0,5) için tek eylem
satırı: beyaz çerçeveli kare **−**, sözlüde yanında **½**, sonra geniş beyaz **+ Artı**
(yeşil daire içinde +, küçük sert gölge). Birikimli sayılar düğmelere ayrı rozetler eklemek
yerine hemen altta “3 Artı · 1 Eksi” gibi metinlerle, sıfırlar dahil gösterilir.

**2–12 özel seçenek.** Kısaltmanın anlamı belirsiz olabilecek formlarda tam etiketli seçenekler
kart içinde iki sütun olarak sarar; menüye saklanmaz. Ton, `+ / − / ! / ○` şekliyle de anlaşılır.
Birikimlide düğmede sayı; günlükte seçili düğmede ton dolgusu ve ✓ vardır. Günlük seçenekler
radio grubudur; aynı seçeneğe tekrar basmak seçimi kaldırır. “Kaydet” ve kaydedilmemiş öğrenci
sayısı alt çubuktadır, kaydetme sırasında seçenekler pasiftir.

**Dinamik ızgara.** Sabit 7×4 yerine en fazla 9 sütun kullanılır. Artı/eksi kart tabanı 184 pt:
1440 px'te **7 sütun**, 1280'de 6, 1920'de 9; telefonda tek sütun. Üç puan seçeneği için 264 pt,
özel seçenekler için 284 pt taban kullanılır. Boşluk 16 pt; `layout.ts` ölçüleri ortak
`typography.heading` boyutundan bağımsızdır. 30–45 öğrenci için bütün sayıları, günlük bilgiyi,
geri almayı ve 48 pt dokunma alanlarını korumak adına satır yüksekliği içeriğe göre büyür;
**28 kartın dört satırının kaydırmasız sığması garanti edilmez**. Kalan kartlara dikey
kaydırma ve aramayla erişilir. Kartlar puana göre sıralanmaz; arama bandın rengini değiştirmez.

**Olumlu geri bildirim.** İşaretlenen karta mor `Stamp` (108 pt, “AFERİN +1” / “+0,5”) basılır.
150 ms'de kart 3 px çöker, 260 ms'de puan yaylanır, 420 ms'de son yıldız yapışır. Damga kısa
süre sonra kalkar; dokunmayı engellemez. Her dokunuşun ayrı sıra anahtarı vardır, aynı
milisaniyedeki hızlı tekrarlar bile yeni damga basar. Eksi/uyarı/nötr işaretlerde damga,
cezalandırıcı renk değişimi veya hareket yoktur. Hareketi azalt açıksa damga son hâliyle
statik belirir; kart, puan, yıldız ve alt şerit animasyonu çalışmaz. Geri alma, seçim kaldırma,
gün değişimi ve kayıt hatası ilgili geçici kutlamayı temizler.

**Alt şerit.** Tek canlı bölge, öncelik: kapatılana kadar kalan hata › kutlama › bildirim ›
boşta beyaz “Her adım ilerlemedir”. Kutlama sarı kâğıt, mor yıldızlı mühür ve kurşun “+1”
hapıdır; sıcak ifadeler sırayla “…, bir adım daha”, “…, emeğine sağlık”, “…, böyle devam”.
Olumlu işaret için ayrıca “eklendi” bildirimi tekrarlanmaz. `useClassroomNotifications` ve
Toast `routeTo` kayıt/geri alma sonuçlarını modal içinde gösterir; çıkışta normal Toast'a
geri döner. Sağda genel “Geri al”, günlükte sarı “Kaydet”. Sarı toplam ve kutlama kâğıdı,
Sınıf moduna ait vurgu istisnasıdır.
