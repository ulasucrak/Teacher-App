# Sınıf Defteri

Öğretmenler için ders içi kayıt uygulaması. Sınıflarınızı oluşturur, öğrenci listesini
bir fotoğraftan (cihaz üzerinde metin tanıma ile) içeri aktarır ve her sınıf için
yoklama, ödev kontrolü, sözlü, derse katılım gibi formları hızlıca doldurursunuz.

- Expo (SDK 57) + React Native + TypeScript, dosya tabanlı yönlendirme: `expo-router`
- Veri ve oturum: Supabase (`@supabase/supabase-js`)
- Fotoğraftan öğrenci listesi: `@react-native-ml-kit/text-recognition` (ücretsiz, cihaz üzerinde)
- Tasarım kuralları: [`docs/DESIGN.md`](docs/DESIGN.md)

## Özellikler

- **Hesap:** e-posta ve şifreyle kayıt, giriş, çıkış; e-postayla şifre sıfırlama
  (bağlantı uygulamadaki "Yeni şifre belirleyin" ekranını açar). Oturum cihazda saklanır.
- **Sınıflarım:** sınıf listesi (öğrenci ve form sayısıyla), tek ana eylem "+ Yeni sınıf".
- **Yeni sınıf sihirbazı (3 adım):** Ad → Öğrenciler → Formlar. Öğrenciler fotoğraftan,
  yapıştırılan listeden (satır başına ya da virgülle ayrılmış adlar, baştaki numara okul no) ya da
  tek tek yazılarak eklenir ve tek listede gözden geçirilir; son adımda hazır formlar (Yoklama,
  Ödev kontrolü, Sözlü, Derse katılım) seçilir. Sınıf son adımda tek seferde oluşturulur.
- **Sınıf ekranı:** formlar üstte (satıra dokununca bugünün kaydı açılır), küçük "+ Form"
  (hazır form, başka sınıftan kopyalama ya da boş form), altta "Öğrenciler" satırı. Sınıfı
  düzenleme/silme ve arşivdeki formlar "⋯" menüsünde.
- **Öğrenciler:** Türkçe karakterleri yok sayan arama, düzenleme ve silme (düzenleme panelinden),
  toplu seçip silme ve "Öğrenci ekle" (fotoğraf / liste / elle) "⋯" menüsünde.
- **Fotoğraftan öğrenci ekleme:** e-Okul sınıf listesinin ya da el yazısı bir listenin
  fotoğrafı cihaz üzerinde okunur (iOS'ta Apple Vision, Android'de ML Kit; internet gerekmez).
  Numara ve ad ayrıştırılır, sınıfta zaten olan ya da şüpheli satırlar işaretlenir; öğretmen
  listeyi gözden geçirip onaylar. Büyük harfli listelerde noktası okunmayan "İ" için yaygın
  "ı"lı ad/soyad listesi kullanılır (`src/features/ocr/trNames.ts`). Yazılan/yapıştırılan adlar
  ise olduğu gibi alınır (sözlükle "düzeltilmez").
- **Formlar:** seçenekler ve renk tonları (olumlu, nötr, uyarı, olumsuz) düzenlenebilir; form
  arşivleme, silme, diğer sınıflara kopyalama.
- **Kayıt doldurma:** günün kaydı tek ekranda: tarih, ilerleme ("21/28"), ince "Tümü" satırı,
  öğrenci başına kompakt seçenekler (≤ 4 seçenekte tek satır), not, geri alınabilir toplu
  işaretleme ve altta "Kaydet". Kaydedilmemiş değişiklikle çıkış (geri tuşu ya da kaydırma) onay
  ister. Kayıt ilk "Kaydet"te oluşturulur; boş kayıt birikmez.

Tasarım dili ("Kalem kutusu": ekranda tek sarı ana eylem, kurşun metin, sade liste satırları)
ve yazı kuralları [`docs/DESIGN.md`](docs/DESIGN.md) içindedir.

### Ekranlar (yönlendirme)

| Adres | Ekran |
|---|---|
| `/login`, `/register`, `/forgot-password`, `/reset-password` | Hesap ekranları |
| `/` | Sınıflarım |
| `/class/new` (`?classId=` ile düzenleme) | Yeni sınıf sihirbazı / sınıfı düzenle |
| `/class/[classId]` | Sınıf ekranı (formlar + öğrenciler satırı) |
| `/class/[classId]/students` | Öğrenciler |
| `/class/[classId]/import` (`?method=photo\|paste\|type`) | Öğrenci ekle |
| `/class/[classId]/forms` | Arşivdeki formlar |
| `/class/[classId]/form/new` (`?preset=` şablon) | Yeni form |
| `/class/[classId]/form/[formId]` | Formun kayıtları |
| `/class/[classId]/form/[formId]/edit` | Formu düzenle |
| `/class/[classId]/form/[formId]/session/[sessionId]` (`new?date=`) | Kaydı doldur |
| bilinmeyen adres | Sınıflarım'a yönlendirilir (`app/+not-found.tsx`) |

## Kurulum

1. Bağımlılıkları yükleyin:

   ```bash
   npm install
   ```

2. Ortam değişkenlerini ayarlayın:

   ```bash
   cp .env.example .env
   ```

   `.env` içine Supabase projenizin adresini ve anon anahtarını yazın
   (Supabase panelinde Settings > API). `.env` dosyası git'e eklenmez.

3. Veritabanı şeması (tablolar, RLS kuralları, `copy_form_to_classes` fonksiyonu) ve yerel
   Supabase kurulumu için [`supabase/README.md`](supabase/README.md) dosyasına bakın.
   Göçler `supabase/migrations/` altındadır; TypeScript tipleri `src/types/database.ts`.

4. Şifre sıfırlama bağlantısının uygulamayı açabilmesi için Supabase panelinde
   **Authentication → URL Configuration → Redirect URLs** listesine şu adresi ekleyin:

   ```
   teacherapp://reset-password
   ```

   Geliştirme derlemesi farklı bir adres üretirse (örneğin `exp+teacher-app://…`), onu da
   ekleyin; uygulama adresi `Linking.createURL('/reset-password')` ile oluşturur. Liste
   dışındaki adresler Supabase tarafından reddedilir ve bağlantı "Site URL"e gider.

## Çalıştırma

Metin tanıma yerel (native) kod içerdiği için uygulama **Expo Go'da çalışmaz**;
fotoğraftan öğrenci ekleme yalnızca geliştirme derlemesinde (development build) ya da
mağaza/dağıtım derlemesinde çalışır. Bir geliştirme derlemesi kullanın:

```bash
npx expo run:ios       # iOS cihaz ya da simülatör (Xcode gerekir)
npx expo run:android   # Android emülatör / cihaz (Android Studio gerekir)
```

**OCR motoru:** iOS'ta Apple Vision (`modules/vision-text-recognition`, yerel Expo modülü,
Swift; ek kütüphane yok), Android'de Google ML Kit (`@react-native-ml-kit/text-recognition`).
ML Kit iOS'ta kalıcı olarak derlemeden çıkarılmıştır (`react-native.config.js`): iOS
pod'larında Apple Silicon simülatörü için arm64 dilimi olmadığından simülatör hedefi
derlenemiyordu; Vision sistem çerçevesi olduğu için simülatörde ve gerçek cihazda aynı
şekilde çalışır. Yerel modülü ya da bu ayarı değiştirdikten sonra `ios/` klasörünü
`npx expo prebuild --clean -p ios` ile yeniden üretin (ya da `cd ios && pod install`). Vision ayarları (`src/features/ocr/vision.ts`): `.accurate`
seviye, `tr-TR`, dil düzeltmesi açık. Vision, büyük harfle başlayan "İ", "Ö", "Ü" gibi
harflerin işaretini kaçırabildiği için okunan adlar gözden geçirme ekranında kontrol edilir.

İlk derlemeden sonra yalnızca JS değişikliklerinde Metro'yu başlatmanız yeterlidir:

```bash
npm start
```

Bulutta derlemek isterseniz (EAS geliştirme derlemesi, `eas.json` içindeki `development`
profili): `npx eas-cli@latest build --profile development --platform ios` (ya da `android`).

`ios/` ve `android/` klasörleri `expo prebuild` ile üretilir; elle düzenlenmez ve git'e
eklenmez. Yerel ayarlar `app.json` ve eklenti yapılandırmalarıyla yapılır.

### Simülatörde çalıştırma

iOS'ta ML Kit bağlanmadığı için Apple Silicon Mac'lerde simülatör derlemesi için ek ayar
gerekmez: `npx expo run:ios` (ya da `npm run ios`) simülatörde de çalışır ve fotoğraftan okuma
simülatörde de Vision ile yapılır. Daha önce ML Kit'li üretilmiş bir `ios/` klasörü varsa
önce `npx expo prebuild --clean -p ios` ile yeniden üretin.

### iOS 27 SDK ve UIScene

Xcode 27 / iOS 27 SDK ile derlenen uygulamalar UIScene yaşam döngüsünü benimsemezse açılışta
kapanır ("UIScene life cycle is required for apps built with this SDK"). Expo SDK 57'nin
`expo prebuild` şablonu bunu henüz yapmadığından `plugins/withUIScene.js` (app.json'da kayıtlı)
prebuild sırasında Info.plist'e `UIApplicationSceneManifest` ekler, sahne temsilcisi olarak
Expo'nun hazır `ExpoAppSceneDelegate`'ini kullanır ve `AppDelegate.swift`'ten pencere oluşturmayı
kaldırır. Pencere ve React Native sahnede başlatılır; `teacherapp://` bağlantıları sahne üzerinden
`RCTLinkingManager`'a iletilir. `ios/` klasörünü elle düzenlemeyin. Şablon değişirse eklenti
prebuild'i hatayla durdurur; Expo şablonu UIScene'i kendisi desteklediğinde eklenti kaldırılabilir.

## Web sürümü

Aynı kod tabanı tarayıcıda da çalışır (Expo web, `react-native-web`, Metro). Web'de ekranlar
masaüstünde ortada okunur genişlikte (en fazla 720 px), telefon tarayıcısında tam genişliktedir;
ikonlar Material Symbols ile çizilir, `Alert.alert` onayları tarayıcının `confirm`/`alert`
pencereleriyle sorulur. Aynı hesapla açık mobil uygulama ve tarayıcı birbirini canlı izler
(Supabase Realtime): bir yerde eklenen sınıf, öğrenci ya da işaret diğerinde yenilemeden görünür.

### Yerelde çalıştırma

```bash
npm run web          # expo start --web → http://localhost:8081
```

`.env` dosyası mobil sürümle aynıdır (aşağıdaki ortam değişkenleri).

### Derleme

```bash
npm run build:web    # expo export -p web → dist/ (tek sayfalık uygulama: dist/index.html + _expo/static)
```

`EXPO_PUBLIC_*` değişkenleri derleme anında pakete gömülür; değiştirdikten sonra yeniden derleyin.

### Yayınlama notları

- `dist/` klasörü herhangi bir statik barındırmaya (Netlify, Vercel, Cloudflare Pages, S3 +
  CloudFront, nginx…) olduğu gibi yüklenir.
- **SPA geri dönüşü gerekir:** bilinmeyen her yol `index.html`'e yönlendirilmelidir (`/class/…`,
  `/reset-password` gibi adresler yenilemede ya da e-postadaki bağlantıdan açılabilsin). Örnekler:
  Netlify `_redirects` içinde `/* /index.html 200`; nginx `try_files $uri /index.html;`;
  Vercel `rewrites` ile `/(.*)` → `/index.html`. Yerelde denemek için:
  `node scripts/e2e/web-serve.mjs 8099` (`dist/`'i SPA geri dönüşüyle sunar).
- **Gerekli ortam değişkenleri (derleme ortamında):** `EXPO_PUBLIC_SUPABASE_URL`,
  `EXPO_PUBLIC_SUPABASE_ANON_KEY`. Anon anahtarı herkese açıktır; yetki RLS kurallarıyla sağlanır.
  Servis (service_role) anahtarını asla bu değişkenlere koymayın.
- **Supabase Auth → URL Configuration → Redirect URLs** listesine şifre sıfırlama adreslerini
  ekleyin (web'de bağlantı sitenin kendi adresine döner):

  ```
  http://localhost:8081/reset-password
  https://<alan-adınız>/reset-password
  ```

  "Site URL"i de yayınlanan adres yapın. Liste dışındaki adresler Supabase tarafından reddedilir.

### Web'de olmayanlar

- **Fotoğraftan öğrenci ekleme (OCR):** cihaz üzerindeki metin tanıma yalnızca mobil uygulamada
  var. Web'de "Fotoğraf" yolu Türkçe bir uyarı gösterir ("…yalnızca mobil uygulamada var…") ve
  listeyi yapıştırmaya ya da adları elle yazmaya yönlendirir.
- **Titreşim (haptics):** tarayıcıda yoktur; dokunuşlar sessizce titreşimsiz çalışır.

## E2E testleri (Maestro)

`.maestro/` altındaki akışlar uygulamayı iOS simülatöründe uçtan uca dener
([Maestro](https://maestro.dev) 2.x, `~/.maestro/bin/maestro`). Uygulama **gerçek Supabase
projesine** bağlanır; adlar yapaydır.

| Akış | Ne dener |
|---|---|
| `auth.yaml` | Yeni hesap (`e2e+<zaman>@sinifdefteri.test`), çıkış, giriş; ardından test hesabıyla giriş |
| `wizard.yaml` | "E2E 6/A" sihirbazı: 5 ad yapıştır → gözden geçir → Yoklama + Ödev kontrolü → sınıf ekranı |
| `photo-import.yaml` | Öğrenciler → Öğrenci ekle → Fotoğraftan → Galeriden seç; 8 adlı yapay e-Okul listesinden en az 6'sı okunur, sayı artar |
| `forms.yaml` | "+ Form" → Sözlü; Yoklama: Tümü Geldi, bir öğrenci Gelmedi, Kaydet, yeniden açınca kayıtlı |
| `students.yaml` | Ara ("ayse" → Ayşe), adı düzenle, sil; sonunda E2E sınıfını siler |

Ortak adımlar `.maestro/subflows/` içinde (açılış, giriş, çıkış, sınıf açma/silme). Akışlar
sırayla çalışır (`.maestro/config.yaml`); `wizard` önceki çalıştırmadan kalan "E2E 6/A"
sınıflarını önce siler.

```bash
npx expo run:ios --device <UDID> --port 8087     # bir kez: derle ve kur
npx expo start --dev-client --port 8087          # Metro (ayrı terminal)
DEVICE=<UDID> scripts/e2e/run.sh                 # tüm akışlar
DEVICE=<UDID> FLOWS="forms students" scripts/e2e/run.sh
```

`scripts/e2e/run.sh` önce yapay sınıf listesini (`scripts/e2e/make-list-image.swift`)
simülatör galerisine ekler, geliştirme derlemesinin yüzen "Tools" düğmesini ve tanıtım
penceresini kapatır (uygulamanın `EXDevMenu*` ayarları), sonra akışları çalıştırır. Ekran
görüntüleri `OUT_DIR`'e (varsayılan `$TMPDIR/sinif-defteri-e2e`) yazılır. Test hesabı
`EMAIL`/`PASSWORD` ile değiştirilebilir (varsayılan `e2e+u02@sinifdefteri.test`). Bilinen
tuzaklar: iOS "Save Password?" penceresi akışlarda kapatılır; şifre alanına yazmadan önce
"Şifreyi göster"e dokunulur (güçlü şifre önerisi alanı örtmesin); panel açılırken dokunmadan
önce animasyon beklenir. `auth.yaml` her çalıştırmada yeni bir test hesabı bırakır.

## E2E (web)

`e2e-web/` altındaki [Playwright](https://playwright.dev) testleri web sürümünü gerçek bir
tarayıcıda (varsayılan: kurulu Google Chrome) uçtan uca dener. Uygulama `.env`'deki **gerçek
Supabase projesine** bağlanır; test hesabı Maestro akışlarıyla aynıdır.

| Test | Ne dener |
|---|---|
| `auth.spec.ts` | Yeni hesap (`e2e+web<zaman>@sinifdefteri.test`; doğrulama isteniyorsa test hesabı), yenilemede oturum korunur, çıkış; yeni hesap sonunda silinir; yanlış şifre Türkçe hata |
| `classes.spec.ts` | Sihirbaz: yapıştırılan 5 ad (İ/ş/ğ) → sınıf; Öğrenciler: arama ("ayse"), ad düzenleme, silme |
| `forms.spec.ts` | "+ Form" → Sözlü; Yoklama doldur, kaydet, yeniden açınca kayıtlı, Geçmiş özeti; Artı / eksi işaretle, geri al, özet ve liste |
| `account.spec.ts` | Hesap ekranı bölümleri; silme onayı açılır ve vazgeçilir |
| `live-sync.spec.ts` | İki ayrı tarayıcı bağlamı, aynı hesap: sınıf ekleme, öğrenci ekleme/silme, sınıf silme, işaretler (iki yön), geri alma, geçmiş özeti ve günlük kayıt diğer pencerede **yenilemeden** ≤ 8 sn içinde görünür |
| `photo-import.spec.ts` | Web'de "Fotoğraf" yolu "yalnızca mobil uygulamada" uyarısı verir, fotoğraf düğmeleri kapalı; uyarıdan yapıştırmaya geçilir ve çalışır |
| `responsive.spec.ts` | 390 px ve 1280 px: başlıca ekranlar yatay taşmasız, ana eylemler ekranın içinde, masaüstünde içerik ortada |

Her test tarayıcı konsolundaki hataları toplar ve hata varsa başarısız olur (bilinen zararsız
iletilerin izin listesi gerekçeleriyle `e2e-web/support/app.ts` içinde). `window.confirm`
pencereleri otomatik onaylanır. Testler aynı hesabı paylaştığı için sırayla çalışır (`workers: 1`).

```bash
npm run e2e:web                          # derler (dist/), sunar ve tüm testleri çalıştırır
npx playwright test live-sync            # tek dosya
E2E_SKIP_BUILD=1 npm run e2e:web         # dist/ zaten güncelse derlemeyi atla
npx playwright show-report               # HTML raporu (playwright-report/)
```

`playwright.config.ts`, `webServer` ile önce `scripts/e2e/web-build.mjs`'i (`expo export -p web`)
çalıştırır, sonra `dist/`'i `scripts/e2e/web-serve.mjs` ile (ek bağımlılık yok, SPA geri dönüşlü)
`http://localhost:8099`'da sunar. Ortam değişkenleri:

| Değişken | Ne işe yarar |
|---|---|
| `EMAIL` / `PASSWORD` | Test hesabı (varsayılan `e2e+u02@sinifdefteri.test` / `Test1234!`) |
| `E2E_ENV_FILE` | `.env` başka yerdeyse yolu (ör. git worktree'lerinde ana kopyadaki `.env`) |
| `E2E_WEB_PORT` | Yerel sunucu portu (varsayılan 8099; 8081 Metro'ya kalsın diye) |
| `E2E_BASE_URL` | Yerel sunucu yerine var olan bir adresi test et (ör. yayınlanmış site) |
| `E2E_SKIP_BUILD` | Derlemeyi atla, var olan `dist/`'i sun |
| `E2E_CHANNEL` | Tarayıcı: varsayılan `chrome`; `chromium` → `npx playwright install chromium` ile gelen |

Test verisi: her test oluşturduğu "E2E Web …" sınıfını arayüzden siler; yarıda kalırsa test
sonunda ve bir sonraki çalıştırmanın başında (`e2e-web/global-setup.ts`) Supabase üzerinden
silinir. Rapor ve izler (`playwright-report/`, `test-results/`) git'e eklenmez.

## Komutlar

| Komut | Ne yapar |
|---|---|
| `npm start` | Metro'yu geliştirme derlemesi için başlatır |
| `npm run ios` | iOS için derler ve çalıştırır (`expo run:ios`) |
| `npm run android` | Android için derler ve çalıştırır (`expo run:android`) |
| `npm run web` | Web sürümünü tarayıcıda açar (`expo start --web`) |
| `npm run build:web` | Web sürümünü `dist/`'e derler (`expo export -p web`) |
| `npm run typecheck` | TypeScript kontrolü (`tsc --noEmit`) |
| `npm run lint` | ESLint (`expo lint`) |
| `npm test` | Jest testleri (`jest-expo`) |
| `npm run e2e:web` | Web E2E testleri (Playwright, `e2e-web/`) |

## Klasör yapısı

```
app/                     Yönlendirme (expo-router); ekranlar features/ içinden gelir
  (auth)/                Giriş, kayıt, şifre sıfırlama (bağlantı: /reset-password)
  (app)/                 Oturum gerektiren ekranlar
src/
  components/ui/         Tasarım sistemi bileşenleri (Screen, Button, OptionChip, Sheet, …)
  features/auth/         Oturum sağlayıcısı, useAuth, Türkçe hata metinleri
  features/classes/      Sınıflarım, yeni sınıf sihirbazı (wizard/), sınıf ekranı, sınıfı düzenle
  features/students/     Öğrenciler ekranı, öğrenci API'si, ad düzenleme, öğrenci paneli
  features/ocr/          Fotoğraftan öğrenci ekleme (Vision/ML Kit, ayrıştırıcı, gözden geçirme)
  features/forms/        Form listesi, form oluşturucu, kopyalama
  features/sessions/     Kayıt listesi ve kayıt doldurma ekranı, tarih yardımcıları
  lib/supabase.ts        Tipli Supabase istemcisi (createClient<Database>)
  types/database.ts      Veritabanı tipleri
  theme/                 Renk, yazı, boşluk, ikon boyutu, radius, gölge ve hareket token'ları
modules/                 Yerel Expo modülleri (vision-text-recognition: iOS Apple Vision OCR)
docs/DESIGN.md           Tasarım dili ("Kalem kutusu"), ekran kalıpları, yazı kuralları
.maestro/                Maestro uçtan uca akışları (iOS simülatörü)
e2e-web/                 Playwright web uçtan uca testleri (playwright.config.ts)
scripts/e2e/             E2E çalıştırıcısı, yapay sınıf listesi üreticisi, web derleme/sunucu betikleri
scripts/ocr/             OCR doğruluk fikstürleri üreticisi (Apple Vision, macOS)
supabase/                Göçler ve yerel Supabase yapılandırması
react-native.config.js   ML Kit'i iOS'ta bağlamaz (iOS'ta OCR Apple Vision ile yapılır)
```

`@/` yolu `src/` klasörünü gösterir (`import { Button } from '@/components/ui'`).
