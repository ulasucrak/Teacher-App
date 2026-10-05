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
- **Sınıflar:** sınıf ekleme, düzenleme, silme; listede öğrenci ve form sayıları.
- **Öğrenciler:** elle ekleme ve düzenleme (ad Türkçe kurallarla düzenlenir, okul numarası
  isteğe bağlı), Türkçe karakterleri yok sayan arama, toplu seçip silme.
- **Fotoğraftan öğrenci ekleme:** e-Okul sınıf listesinin ya da el yazısı bir listenin
  fotoğrafı cihaz üzerinde okunur (iOS'ta Apple Vision, Android'de ML Kit; internet gerekmez). Numara ve ad ayrıştırılır,
  sınıfta zaten olan ya da şüpheli satırlar işaretlenir; öğretmen listeyi gözden geçirip
  onaylar. Büyük harfli listelerde noktası okunmayan "İ" için yaygın "ı"lı ad/soyad listesi
  kullanılır (`src/features/ocr/trNames.ts`).
- **Formlar:** yoklama, ödev kontrolü, sözlü, derse katılım şablonları ya da boş form;
  seçenekler ve renk tonları (olumlu, nötr, uyarı, olumsuz) düzenlenebilir. Form arşivleme,
  silme, diğer sınıflara kopyalama ve başka sınıftan form ekleme.
- **Kayıtlar (oturumlar):** bir form için tarih seçip kayıt açma, öğrencileri tek dokunuşla
  işaretleme, toplu uygulama ve geri alma, öğrenciye not ekleme, taslak/yayında durumu;
  kayıt listesinde doluluk ve seçenek sayımları.

### Ekranlar (yönlendirme)

| Adres | Ekran |
|---|---|
| `/login`, `/register`, `/forgot-password`, `/reset-password` | Hesap ekranları |
| `/` | Sınıflarım |
| `/class/new` (`?classId=` ile düzenleme) | Sınıf ekle / düzenle |
| `/class/[classId]` | Sınıf ayrıntısı ve öğrenci listesi |
| `/class/[classId]/import` | Fotoğraftan öğrenci ekleme |
| `/class/[classId]/forms` | Sınıfın formları |
| `/class/[classId]/form/new` (`?preset=` şablon) | Yeni form |
| `/class/[classId]/form/[formId]` | Formun kayıtları |
| `/class/[classId]/form/[formId]/edit` | Formu düzenle |
| `/class/[classId]/form/[formId]/session/[sessionId]` | Kaydı doldur |

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

## Komutlar

| Komut | Ne yapar |
|---|---|
| `npm start` | Metro'yu geliştirme derlemesi için başlatır |
| `npm run ios` | iOS için derler ve çalıştırır (`expo run:ios`) |
| `npm run android` | Android için derler ve çalıştırır (`expo run:android`) |
| `npm run typecheck` | TypeScript kontrolü (`tsc --noEmit`) |
| `npm run lint` | ESLint (`expo lint`) |
| `npm test` | Jest testleri (`jest-expo`) |

## Klasör yapısı

```
app/                     Yönlendirme (expo-router); ekranlar features/ içinden gelir
  (auth)/                Giriş, kayıt, şifre sıfırlama (bağlantı: /reset-password)
  (app)/                 Oturum gerektiren ekranlar
src/
  components/ui/         Tasarım sistemi bileşenleri (Screen, Button, OptionChip, Sheet, …)
  features/auth/         Oturum sağlayıcısı, useAuth, Türkçe hata metinleri
  features/classes/      Sınıf listesi, sınıf ekle/düzenle, sınıf ayrıntısı
  features/students/     Öğrenci API'si, ad düzenleme, öğrenci formu
  features/ocr/          Fotoğraftan öğrenci ekleme (Vision/ML Kit, ayrıştırıcı, gözden geçirme)
  features/forms/        Form listesi, form oluşturucu, kopyalama
  features/sessions/     Kayıt listesi ve kayıt doldurma ekranı, tarih yardımcıları
  lib/supabase.ts        Tipli Supabase istemcisi (createClient<Database>)
  types/database.ts      Veritabanı tipleri
  theme/                 Renk, yazı, boşluk, ikon boyutu, radius, gölge ve hareket token'ları
modules/                 Yerel Expo modülleri (vision-text-recognition: iOS Apple Vision OCR)
docs/DESIGN.md           Tasarım sistemi ve yazı dili kuralları
supabase/                Göçler ve yerel Supabase yapılandırması
react-native.config.js   ML Kit'i iOS'ta bağlamaz (iOS'ta OCR Apple Vision ile yapılır)
```

`@/` yolu `src/` klasörünü gösterir (`import { Button } from '@/components/ui'`).
