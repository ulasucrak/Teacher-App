# Sınıf Defteri — tasarım dili v2: "Kalem kutusu"

Bu belge uygulamanın tek tasarım kaynağıdır (v1 "çizgili defter" dilinin yerini aldı). Yeni ekran yazan ya da
mevcut ekranı yeniden düzenleyen her görev buna uyar. Kod karşılığı: `src/theme/`
(token'lar) ve `@/components/ui` (bileşenler). Tema dışında hex renk, font adı ya da
rastgele boşluk sayısı yazılmaz.

## 0. Neden yeniden? v1 denetimi (en çok kalabalık yaratan 7 sorun)

| # | Sorun (mevcut ekran) | v2 kararı |
|---|---|---|
| 1 | **Sınıf ekranı 6 eylemi aynı anda gösteriyor:** iki büyük giriş kartı (Formlar, Fotoğraftan öğrenci ekle), "Öğrenciler" başlığı + "Seç", arama, liste, altta "Öğrenci ekle". Öğrenci eklemek, her gün yapılmayan bir iş olduğu hâlde birincil eylem gibi duruyor. | Sınıf ekranında formlar üstte, öğrenciler altta, ikisi de sade liste satırı. Öğrenci ekleme/seçip silme/sınıfı düzenleme "⋯" menüsünde. |
| 2 | **Yeni sınıf yalnızca ad formu.** Öğretmen boş bir sınıfa düşüyor, öğrencileri ayrı bir ekrandan, ayrı akışla ekliyor. | Yeni sınıf = 3 adımlı sihirbaz; ana adım **öğrencileri eklemek** (fotoğraf / listeyi yapıştır / elle yaz). |
| 3 | **Form eklemek sayfanın yarısını kaplıyor:** ayrı Formlar ekranı, uzun boş durum metni, "Başka sınıftan form ekle" kartı, 4–5 şablon satırı ve altta "Yeni form oluştur". | Tek küçük **"+ Form"** düğmesi → şablon paneli. Sayfada kart ya da şablon listesi yok. |
| 4 | **Doldurma ekranı çok uzun:** başlık kartı (ders, açıklama, rozet, tarih, Yayınla), simgeli "Tümü" kartı, her öğrenci satırında numara + kırmızı çizgi + avatar + ad + her satırda aynı "5/B" + not düğmesi + 2 satır × 3 sütun büyük çip. 40 öğrencide sonsuz kaydırma. | Satır = numara + ad + kompakt çipler (tek satıra sığar). Tarih tek çip, yayın/silme "⋯" içinde, "Tümü" tek ince satır. |
| 5 | **Dekoratif dil bilgi taşımıyor:** kırmızı kenar çizgisi, çizgili kâğıt zemini, satır başına tekrarlanan meta. Mavi her yerde (birincil buton, seçim, nötr ton, bağlantı) — ana eylem ayırt edilmiyor. | Dekoratif çizgi yok. **Ana eylem tek renkte (sarı kalem)** ve ekranda yalnızca bir kez. |
| 6 | **Metin fazlası:** boş durumlarda 2–3 cümle, açıklamalı kartlar, uzun banner'lar. | Boş durum = başlık + tek cümle + tek buton. Açıklama yalnızca belirsizlik varsa. |
| 7 | **Onaylar ekranın üstünde** (sistem Alert'i) ve menü sheet'lerinde iri butonlar + açıklama metni. | Seçenekler `OverflowMenu` satırlarıyla, geri alınamaz eylemler başparmak yakınında `ConfirmSheet` ile. |

## 1. Konu, kullanıcı, ana iş

- **Konu:** Türkiye'de bir öğretmenin ders içi kayıtları: yoklama, ödev kontrolü, sözlü,
  derse katılım.
- **Kullanıcı:** Teneffüste ya da derse girerken, ayakta, **tek elle** telefon kullanan
  öğretmen. Sınıfta 30–45 öğrenci. Ekrana 2 saniye bakıp "kim yok, kim getirmedi" görmek ister.
- **Ana iş:** Bir listeyi hızlıca işaretleyip kaydetmek. Her karar buna hizmet eder.

## 2. Yön: "Kalem kutusu"

Öğretmenin kalem kutusunda her kalemin bir işi vardır; arayüzdeki her renk de öyle:

- **Kurşun kalem** (grafit) metni yazar. Ekranın %90'ı kurşun ve beyaz kâğıttır.
- **Sarı kalem** (kalemin gövdesi; fosforlu kalem gibi "önemli olan bu") yalnızca
  **ekrandaki tek ana eylemi** boyar: "Kaydet", "Devam", "Yeni sınıf". Kullanıcı ekrana
  baktığında başparmağının nereye gideceğini sarıdan anlar.
- **Mavi tükenmez** etkileşimi gösterir: bağlantı, seçim, odak, hafif butonlar.
- **Boya kalemleri** (yeşil, mavi, hardal, kırmızı) yalnızca form seçeneklerinin anlamını
  taşır: Geldi / İzinli / Eksik / Gelmedi.
- **Kırmızı kalem** hata ve silme içindir.

**Cesaretimizi tek yere harcıyoruz: sarı ana eylem.** Geri kalan her şey sessiz: beyaz
kâğıt, kurşun metin, ince ayraç, bol boşluk. Uygulama işareti (girişte) kurşun bir kare
içinde sarı bir defterdir — markanın tek imzası.

### Jenerik varsayılanlara karşı kontrol

| İlk refleks | Neden reddedildi | Yerine |
|---|---|---|
| v1'i koruyup sadeleştirmek (mavi birincil) | Mavi; seçim, nötr ton ve bağlantıyla çakışıyor, ana eylem kayboluyor | Sarı ana eylem + kurşun metin; mavi yalnızca etkileşim |
| Krem zemin + serif başlık + kiremit vurgu | Üretilmiş tasarımın en yaygın işareti | Saf beyaz kâğıt, grotesk başlık |
| Her bölümü aynı radiuslu, gölgeli karta koymak | "SaaS kart kiti"; ekranı bölüp kalabalık gösterir | Liste satırı + boşlukla gruplama; kart yalnızca gerçekten birlikte okunan içerik için |
| Büyük harf bölüm etiketi ("ÖĞRENCİLER") | Jenerik; Türkçede `i/İ` büyütmesi riskli | Cümle düzeni başlık + soluk sayı: "Öğrenciler 28" |
| Mor/indigo degrade, cam efekti | Konudan kopuk | Düz renk, okul malzemesinden alınmış |
| Sadece ikonlu FAB | Anlamı tahmin ettirir | Her zaman etiketli hap: "+ Yeni sınıf" |

## 3. Renk

Ana palet (6 isim, `palette`):

| Token | Hex | Rol |
|---|---|---|
| `kagit` | `#FFFFFF` | Sayfa ve yüzey zemini |
| `sira` | `#F2F3F5` | Okul sırasının grisi: pasif çip, giriş alanı, arama, ikincil buton |
| `kursun` | `#1D2129` | Ana metin, seçili filtre çipi, tamamlanan adım |
| `sariKalem` | `#FFC62E` | **Yalnızca** ekrandaki tek ana eylemin dolgusu (üstünde kurşun metin) |
| `tukenmez` | `#2446B0` | Etkileşim: bağlantı, hafif buton, odak kenarı, nötr ton |
| `kirmiziKalem` | `#B3261E` | Hata metni, yıkıcı buton, olumsuz ton |

Kod adları (`colors`): `background/surface` = kâğıt, `surfaceMuted` = sıra, `text` = kurşun,
`textMuted #5A6170`, `rule #E3E5EA` (ayraç), `border #868C98`, `accent/accentPressed #EDB300/onAccent`
(sarı kalem), `primary` = tükenmez (adı geriye uyum için korunur; **birincil buton rengi değildir**),
`danger`, `dangerMuted`, `scrim`, `pressedOverlay`.

### Seçenek tonları (`FormOption.tone`) — boya kalemleri

| Ton | Dolgu (seçili, beyaz metin) | Açık zemin / metin | Örnek |
|---|---|---|---|
| `positive` | `#17744A` — 5.78:1 | `#E1F2E8` / `#17744A` — 4.97:1 | Geldi, Tamamlandı |
| `neutral` | `#2446B0` — 8.15:1 | `#E7ECFA` / `#2446B0` — 6.90:1 | İzinli, Orta |
| `warning` | `#9C5700` — 5.56:1 | `#FCEFD5` / `#9C5700` — 4.88:1 | Eksik, Geç geldi |
| `negative` | `#B3261E` — 6.54:1 | `#FCE8E6` / `#B3261E` — 5.55:1 | Gelmedi, Getirmedi |

Diğer ölçülen kontrastlar: kurşun/beyaz 16.13:1, kurşun/sıra 14.53:1, `textMuted`/beyaz
6.22:1, `textMuted`/sıra 5.60:1, kurşun/sarı 10.27:1, kurşun/sarı basılı 8.49:1,
tükenmez/beyaz 8.15:1, `border`/beyaz 3.38:1, kurşun/avatar zeminleri ≥ 9:1.

Kurallar:
- Sarı beyaz zemin üstünde metin ya da ikon rengi olarak **kullanılmaz** (1.57:1). Yalnızca dolgu.
- Ton tek başına anlam taşımaz: seçili çipte ✓ ve `accessibilityState.selected/checked` var.
- Bir ekranda sarı dolgulu öğe en fazla **bir** tanedir (FAB, alt buton ya da boş durum eylemi).

## 4. Tipografi

v1'in iki ailesi korunur (paketler kurulu, Türkçe glifler `ı İ ş ğ ç ö ü` tam):

- **Bricolage Grotesque** — başlıklar: ekran başlığı, sınıf adı, sihirbaz sorusu. Hafif
  "el yapımı" grotesk; okul panosundaki kesme harfler.
- **Atkinson Hyperlegible Next** — tüm metin, buton, çip, okul numarası (`tabular-nums`).
  `I/l/1`, `O/0` ayrımı net; isim listesini hızlı taramak için.

| Varyant | Font | Boyut / satır | Kullanım |
|---|---|---|---|
| `display` | Bricolage 700 | 34 / 40 | Yalnızca giriş ekranı: "Sınıf Defteri" |
| `title` | Bricolage 700 | 28 / 34 | Kök ekran büyük başlığı, sihirbaz sorusu |
| `heading` | Bricolage 600 | 19 / 24 | Üst çubuk başlığı, bölüm başlığı, sheet başlığı |
| `bodyStrong` | Atkinson 700 | 17 / 24 | Öğrenci adı, liste satırı başlığı, buton |
| `body` | Atkinson 400 | 17 / 24 | Paragraf, alan değeri |
| `bodySmall` | Atkinson 400 | 15 / 21 | Kısa açıklama, banner |
| `label` | Atkinson 600 | 15 / 20 | Alan etiketi, çip, küçük buton |
| `caption` | Atkinson 400 | 13 / 18 | Yardım metni, sayaç |
| `number` | Atkinson 600 tabular | 15 / 20 | Okul numarası |

Kurallar: büyük harf etiket yok; başlık üstünde "eyebrow" yok; tek kelime vurgusu yok;
satır < 80 karakter. Dinamik yazı açık, en fazla 1.4× (çiplerde 1.2×).

## 5. Boşluk, yerleşim, dokunma

- 4 tabanlı ölçek: `xxs 2 · xs 4 · sm 8 · md 12 · lg 16 · xl 20 · xxl 24 · xxxl 32 · huge 48`
  (bu belge içinde ara nokta yalnızca ölçeği listelemek için).
- Sayfa yatay boşluğu **20** (`layout.pageX`). Bölümler arası `xxl`. İçerik sola hizalı;
  ortalı olan yalnızca üst çubuk başlığı ve boş durum.
- **Başparmak bölgesi:** ana eylem her zaman altta (alt çubuk ya da FAB). Üstte yalnızca geri
  ve "⋯".
- Dokunma alanı ≥ 48 pt (`layout.minTouch`). Buton 56, FAB 56, liste satırı ≥ 64,
  ızgara çipi 44, kompakt çip 40 + 4 pt hitSlop.

## 6. Radius ve yükselti (hiyerarşiye göre)

| Seviye | Ne | Radius | Gölge / kenar |
|---|---|---|---|
| 0 — sayfa | Liste satırı | 0 | İçerik başından itibaren 1 px `rule` ayraç |
| 1 — gömülü | Giriş alanı, seçenek çipi, banner, segment | `sm` 12 | Gölge yok; giriş alanı sıra dolgulu, odakta beyaz + 2 px mavi kenar |
| 1 — hap | Filtre çipi, arama, rozet, avatar, FAB | `full` | — |
| 2 — kart / buton | Buton, (nadir) kart, toast | `md` 16 | Kartta 1 px `rule`, gölge yok |
| 3 — yüzen | Alt eylem çubuğu, FAB | çubuk 0 / FAB `full` | `elevation.raised` / `elevation.floating` |
| 4 — üstte | Sheet, menü, onay | üst köşeler `lg` 28 | `elevation.overlay` + %42 kurşun perde |

## 7. Hareket

- Süreler: `fast 120` (basma), `base 200` (durum, toast), `slow 280` (sheet).
  Eğri: ease-out.
- Yalnızca kullanıcı eylemine cevap: çip basınca 0.96 ölçek + seçim titreşimi, sheet aşağıdan
  kayar, toast belirir. Giriş animasyonu, sıralı kart girişleri, kendiliğinden hareket yok.
- "Hareketi azalt" açıksa ölçek/kayma kapanır, yalnızca opaklık (`useReducedMotion`).

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

- **Kök ekranlar** (Sınıflarım, Sınıf): `Screen title largeTitle subtitle` — solda büyük
  başlık, altında tek satır soluk bilgi ("28 öğrenci"). Sağ üstte "⋯".
- **Alt ekranlar** (Form doldurma, düzenleme): üst çubukta geri + ortalı `heading` başlık + "⋯".
- **Sihirbaz:** `Screen header={<WizardHeader …/>}` — geri/kapat, adım çubuğu, soru başlığı.
- Başlık kartı, üstte açıklama paragrafı, eyebrow yok.

### 9.2 Tek ana eylem

- **Liste ekranı** (Sınıflarım): `Screen fab={<Fab label="Yeni sınıf" />}`. FlatList'e
  `contentContainerStyle={{ paddingBottom: layout.fabClearance }}` ekleyin.
- **Görev ekranı** (sihirbaz, doldurma, düzenleme): `Screen footer={<BottomActionBar primary=… />}`.
  İsteğe bağlı `secondary` ("Geri") solda, `hint` üstte ("3 değişiklik kaydedilmedi").
- Boş durum kendi sarı butonunu gösteriyorsa ekran FAB/alt buton göstermez.
- Hiçbir ekranda iki sarı öğe olmaz; ikinci eylem `secondary` ya da `ghost`.

### 9.3 Liste satırı (`ListRow`)

- Kart değil; satırlar arası ince ayraç. Başlık `bodyStrong`, en fazla bir satır soluk alt
  bilgi, sağda en fazla bir öğe (sayı, rozet ya da chevron).
- Okul numarası `number` prop'u ile solda dar, soluk, sağa hizalı sütun.
- Her satırda aynı olan bilgi (sınıf adı vb.) satıra yazılmaz; başlıkta bir kez yazılır.
- Giriş noktası satırı: `leading={<IconTile icon=… />}` + başlık + tek satır açıklama.

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

### 9.8 Boş durumlar

`EmptyState`: ortalı ikon karesi, başlık, tek cümle, tek sarı buton (isteğe bağlı bir
`ghost` ikinci yol). Arama sonucu boşsa EmptyState değil, tek satır soluk metin:
"“ay” ile eşleşen öğrenci yok."

### 9.9 Onaylar

- Geri alınamaz her eylem `ConfirmSheet`: başlık soru, mesaj sonuç, `confirmLabel` eylem adı,
  "Vazgeç". İşlem sürerken `loading` (panel açık kalır).
- Geri alınabilir toplu işlemler (ör. "Tümü") onay sormaz; toast + "Geri al".
- Sistem `Alert` yalnızca gezinme korumasında (kaydedilmemiş değişiklik).

### 9.10 Tel kafes çizimleri

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

| Bileşen | Ne zaman | Notlar |
|---|---|---|
| `Screen` | Her ekranın kökü | `title`, `largeTitle`, `subtitle`, `back`, `headerRight` (tek öğe), `header` (özel), `footer`, `fab`, `scroll` |
| `WizardHeader` / `Stepper` | Sihirbaz adımları | Gerçek sıra olduğu için numaralı ("Adım 2 / 3") |
| `BottomActionBar` | Görev ekranının alt eylemi | `primary` (sarı), `secondary` (sol), `hint` |
| `Fab` | Liste ekranının ana eylemi | Her zaman etiketli; `footer` ile birlikte kullanılmaz |
| `Button` | Eylemler | `primary` sarı (ekranda bir kez), `secondary` sıra grisi, `ghost` mavi metin, `destructive` kırmızı (yalnızca onayda); `danger` ghost/secondary'nin metnini kırmızı yapar (onaya götüren giriş eylemi: "Hesabımı sil") |
| `IconButton` | Geri, "⋯", satır içi | 48 pt, zorunlu `accessibilityLabel`, `variant="tonal"` |
| `OverflowMenu` | İkincil eylemler | Eylem panel kapanınca çalışır |
| `ConfirmSheet` | Geri alınamaz eylem onayı | `confirmLabel` eylem adı, `loading` |
| `Sheet` | Seçici / panel | `description`, `onDismissed`, kapat `${testID}-close` |
| `ListRow` | Liste satırı | `number`, `leading`, `trailing`, `action` ("⋯", satırın kardeşi; mürekkebi içerik sağ kenarına hizalı), `children`, `divider`, `onLongPress` |
| `IconTile` | Satır başı / boş durum ikonu | `tone` isteğe bağlı |
| `SectionHeader` | Bölüm başlığı | Başlık + sayı + tek hafif eylem |
| `SearchField` | Liste araması | Etiketsiz hap; odakta beyaz + 2 px mavi kenar (TextField ile aynı); `${testID}-clear` |
| `TextField` | Form alanı | Sıra dolgu; odakta beyaz + mavi kenar; `multiline` ≥ 3 satır |
| `SelectField` | Seçici alan | Sheet açar |
| `ChipGroup` | Satır içi seçenekler | Kompakt, sarar; tek ya da `multiple` seçim; ton isteğe bağlı |
| `SegmentedChoice` | 2–4 seçenekli değer | radiogroup, tonlu dolgu; geniş alanda eşit sütun (satırlar alt alta hizalı), dar alanda içeriğe göre genişler ve sığmazsa sarar — etiket asla "Gelm…" diye kesilmez |
| `OptionChip` / `OptionGrid` | Eşit sütunlu seçenek ızgarası | Düzenleme önizlemesi; doldurmada `ChipGroup` tercih edin |
| `SegmentedTabs` | Görünüm değiştirme | tablist |
| `Chip` | Filtre / tarih çipi | Hap; seçili = kurşun dolgu |
| `Badge` | Olağan dışı durum | Hap; satırda en fazla bir ("Taslak") |
| `Banner` | Satır içi bilgi/hata | İsteğe bağlı tek eylem ("Tekrar dene") |
| `EmptyState` | Boş liste | Ortalı; tek sarı eylem + isteğe bağlı ikinci yol |
| `LoadingState`, `ToastProvider`/`useToast`, `Avatar`, `Text`, `Icon`, `Card`, `StickyFooter` | v1'deki gibi | `Card` nadiren; `StickyFooter` doğrudan değil `Screen footer` ile |

Geriye uyum: v1'in adları ve prop'ları çalışır (`RuledPaper` kaldırıldı). `ListRow ruled` artık yalnızca numara
sütununu ayırır (kırmızı çizgi yok). `colors.marginRule`, `layout.marginRuleWidth`,
`palette.satir/murekkep/kenarCizgisi` kullanımdan kalktı (sessiz ayraç rengine eşlendi).

## 11. Erişilebilirlik

- Her dokunulabilir öğede `accessibilityRole` + `accessibilityLabel`; çiplerde
  `selected/checked`; butonda `disabled/busy`. Satır içi çiplerin etiketi bağlamlı:
  "Ayşe Yılmaz: Geldi".
- Hata metinleri `accessibilityLiveRegion="polite"`; toast duyurulur.
- `Stepper` `progressbar` rolüyle "Adım 2 / 3: Öğrenciler" okur.
- Giriş alanları dolgulu olsa da görünür etiketlidir; odak ve hata 2 px kenarla gösterilir.

### Web / laptop notları

- Masaüstünde uygulama 720 px'lik ortalı çerçevededir (`AppFrame`); çerçeve içindeki dar sütunlar
  (giriş, kayıt) çerçevenin ortasında durur, sola yaslı kalmaz.
- Klavye odağı: tüm etkileşimli öğelerde içeri alınmış 2 px `tukenmez` halka (`public/index.html`);
  metin alanları halka yerine kendi 2 px kenarıyla odağı gösterir, tarayıcının iç çerçevesi kapalıdır.
- Panel (sheet / menü) satırlarında ayraç düz kalır; yuvarlak vurgu yalnızca basılıyken görünür.
- Numarası olmayan sınıf listesinde boş numara sütunu ayrılmaz.
- Telefon tarayıcısında dokunma gecikmesi (`touch-action: manipulation`) ve gri vurgu kapalıdır.

## 12. Yapılmayacaklar

- Ekranda birden fazla sarı öğe; sarıyı metin ya da ikon rengi yapmak.
- Bölümleri kartlara koymak; aynı radius/gölgeyi her şeye vermek; dekoratif çizgi ve degrade.
- Büyük harf etiket, eyebrow, tek kelime vurgusu, "A · B · C" meta dizisi, buton sonunda "→".
- Sağ üstte birden fazla ikon; ikincil eylemleri sayfaya buton olarak dizmek.
- Her satırda aynı bilgiyi tekrarlamak (sınıf adı, tarih).
- 2 cümleden uzun açıklama; özür dileyen ya da belirsiz hata; "Tamam/Gönder" butonu.
- 48 pt'den küçük dokunma alanı; yalnızca ikonlu FAB.
- Durumu yalnızca renkle anlatmak.
- Tema dışında hex, font adı, sihirli sayı.

## Sınıf modu

Öğretmen laptop ekranını projeksiyona ya da etkileşimli tahtaya yansıtıp işaretlemeyi sınıfın
önünde yapar. Kalem kutusu dili aynen geçerlidir (beyaz kâğıt, kurşun metin, Bricolage başlık,
Atkinson metin, boya kalemleri yalnız seçenek anlamı, tek sarı eylem); yalnız ölçek ve yoğunluk
projeksiyona göre ayarlanır. Kod: `src/features/classroom/`.

**Giriş.** Form ekranında "İşaretle | Geçmiş" sekmelerinin sağında `ghost` "Sınıf modu" (`people`
ikonu, küçük boy). Ayrı satır tutmaz. Web'de destek varsa tam ekran açılır; "Sınıf modundan çık"
(dar ekranda "Çık") ve Esc normal forma döner. Aynı hook örneği kullanılır: seçili gün,
kaydedilmemiş taslak ve geri alma ortaktır.

```
┌──────────────────────────────────────────────────────────────────────────┐
│ Artı / eksi  ‹ Bugün ›  40 öğrenci  + 7 Artı  − 2 Eksi  (⌕ Ad…)  [✕ Çık] │
├──────────────────────────────────────────────────────────────────────────┤
│ ┌────────────────────────────┐ ┌────────────────────────────┐ ┌──────── │
│ │ Ayşe Yılmaz            +3  │ │ Mehmet Kaya       (+1)  +1 │ │ …       │
│ │ No 1101  Bugün: 3 Artı net │ │ No 1102  Bugün: 1 Artı net │ │         │
│ │ [+ Artı ❸] [− Eksi ⓪]  (↶) │ │ [+ Artı ❶] [− Eksi ⓪]  (↶) │ │         │
│ └────────────────────────────┘ └────────────────────────────┘ └──────── │
├──────────────────────────────────────────────────────────────────────────┤
│ [ (+) Mehmet Kaya, bir adım daha                ]  [↶ Geri al] [Kaydet]  │
└──────────────────────────────────────────────────────────────────────────┘
```

**Okunabilirlik (arka sıra).** Öğrenci adı 28 pt Atkinson Bold (en fazla 2 satır, kesilmez), net
puan `display` 34 pt Bricolage, seçenek etiketi 19 pt, kutlama şeridi `title` 28 pt. Numara ve
günün sayıları 15 pt soluk: öğretmen içindir. Kurşun/beyaz 16:1, ton metinleri beyaz üstünde
≥ 5.5:1. Projektörün soldurduğu açık zeminlere anlam yüklenmez: kart kenarı `border` (3.38:1),
düğme kenarı 2 px ton rengi.

**Kart.** Satır 1: ad + sağda net ("net" alt yazısı; puansız birikimli formda "toplam"). Satır 2:
"No 1101" + yalnız o gün işaret varsa "Bugün: 2 Artı, 1 Eksi" ("işaret yok" kartlarda tekrar
etmez). Satır 3: seçenek düğmeleri (48 pt, eşit genişlikte büyür) + birikimlide öğrencinin o
günkü son işaretini geri alan `tonal` ↶. Kaldırılmış seçenek sayısı varsa satır 2'de yazılır.

**Seçenek düğmesi = [ton işareti] Etiket [yuva].** Düğmeler çerçevelidir (beyaz zemin, 2 px ton
kenarı, ton renginde metin); 40 kartta 80 dolgulu kırmızı/yeşil düğme hem kalabalık hem
cezalandırıcı görünüyordu. Dolgu yalnız **durumu** gösterir:
- Birikimli: yuvada toplam sayı rozeti; sayı varsa dolgulu ton + beyaz rakam, sıfırsa halka.
- Günlük (radio): seçili düğme dolgulu ve ton işaretinin yerinde ✓; genişlik değişmez.

**Ton işaretleri** (`ToneMark`, çizgiyle çizilir): olumlu `+`, olumsuz `−`, uyarı `!`, nötr `○`.
Ton renk görülmeden de ayrılır (renk körlüğü, soluk projektör). Başlıktaki sınıf özeti de aynı
işaretleri kullanır. Sıralama, sıralı liste ya da "en iyiler" yok.

**Yoğunluk.** Sütun sayısı seçenek düğmelerinin tek satıra sığdığı en dar karttan hesaplanır
(`layout.ts`; kart 280–420 pt, en fazla 6 sütun). 40 öğrencili artı/eksi: 1920×1080'de 5 sütun,
30 öğrenci kaydırmadan görünür; 1280×720'de 3 sütun, 12 öğrenci; telefonda tek sütun. Kalanlar
kaydırma ve her zaman açık arama ile. Başlık tek satır, alt çubuk sabit yükseklikte; bildirim
ızgarayı itmez.

**Geri bildirim ve hareket** (yalnız işaretlenen kart hareket eder):
- Her işarette kart kısa süre vurgulanır (opaklık; olumluda yeşil zemin + kenar, diğerlerinde
  kurşun kenar — eksi kırmızı yanıp sönmez).
- Olumlu işarette netin solunda "+1" / "+0,5" çipi belirir, yavaşça yükselip söner (~1,2 sn) ve
  net sayısı bir kez yaylanır (spring). Hızlı ardışık dokunuş önceki hareketi keser; sayılar her
  zaman veriden gelir, animasyon sonucu beklenmez.
- Hareketi azalt açıksa yükselme ve yaylanma yok; yalnız vurgu (opaklık) ve şerit.

**Alt şerit: tek canlı bölge.** Öncelik: hata (kırmızı dolgu, kapatılana kadar kalır) › kutlama
(yeşil dolgu, `+` işareti, 28 pt "Ayşe Yılmaz, bir adım daha" / "…, emeğine sağlık" / "…, böyle
devam"; çocuğa "sen" diye, ünlemsiz) › bildirim (kurşun dolgu: "Ali: Eksi eklendi",
"Kaydedildi") › boşta "Her adım ilerlemedir". Olumlu işaretin ayrıca "eklendi" bildirimi
gösterilmez. Sağda "Geri al" (son işaret / son seçim) ve günlük formda kaydedilmemiş sayısı +
sarı "Kaydet" (ekrandaki tek sarı öğe). Birikimli işaretler anında kaydedilir.

**Yapılmayacaklar.** Dolgulu düğme duvarı; anlamı yalnız renkle vermek; birden fazla kartı ya da
sürekli hareket ettirmek; ızgarayı iten üst bildirim; "işaret yok" gibi her kartta aynı metin;
öğrencileri puana göre sıralamak.
