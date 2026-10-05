# Sınıf Defteri

Öğretmenler için ders içi kayıt uygulaması. Sınıflarınızı oluşturur, öğrenci listesini
bir fotoğraftan (cihaz üzerinde metin tanıma ile) içeri aktarır ve her sınıf için
yoklama, ödev kontrolü, sözlü, derse katılım gibi formları hızlıca doldurursunuz.

- Expo (SDK 57) + React Native + TypeScript, dosya tabanlı yönlendirme: `expo-router`
- Veri ve oturum: Supabase (`@supabase/supabase-js`)
- Fotoğraftan öğrenci listesi: `@react-native-ml-kit/text-recognition` (ücretsiz, cihaz üzerinde)
- Tasarım kuralları: [`docs/DESIGN.md`](docs/DESIGN.md)

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

3. Veritabanı şeması ve yerel Supabase kurulumu için `supabase/README.md` dosyasına bakın.

4. Şifre sıfırlama bağlantısının uygulamayı açabilmesi için Supabase panelinde
   **Authentication → URL Configuration → Redirect URLs** listesine şu adresi ekleyin:

   ```
   teacherapp://reset-password
   ```

   Geliştirme derlemesi farklı bir adres üretirse (örneğin `exp+teacher-app://…`), onu da
   ekleyin; uygulama adresi `Linking.createURL('/reset-password')` ile oluşturur. Liste
   dışındaki adresler Supabase tarafından reddedilir ve bağlantı "Site URL"e gider.

## Çalıştırma

ML Kit metin tanıma yerel (native) kod içerdiği için uygulama **Expo Go'da çalışmaz**.
Bir geliştirme derlemesi (development build) kullanın:

```bash
npx expo run:ios       # iOS simülatör / cihaz (Xcode gerekir)
npx expo run:android   # Android emülatör / cihaz (Android Studio gerekir)
```

İlk derlemeden sonra yalnızca JS değişikliklerinde Metro'yu başlatmanız yeterlidir:

```bash
npm start
```

Bulutta derlemek isterseniz: `npx eas-cli@latest build --profile development`.

`ios/` ve `android/` klasörleri `expo prebuild` ile üretilir; elle düzenlenmez ve git'e
eklenmez. Yerel ayarlar `app.json` ve eklenti yapılandırmalarıyla yapılır.

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
app/                 Ekranlar (expo-router)
  (auth)/            Giriş, kayıt, şifre sıfırlama (bağlantı: /reset-password)
  (app)/             Oturum gerektiren ekranlar
src/
  components/ui/     Tasarım sistemi bileşenleri (Screen, Button, OptionChip, …)
  features/auth/     Oturum sağlayıcısı, useAuth, Türkçe hata metinleri
  lib/supabase.ts    Supabase istemcisi
  theme/             Renk, yazı, boşluk, radius, gölge ve hareket token'ları
docs/DESIGN.md       Tasarım sistemi ve yazı dili kuralları
```

`@/` yolu `src/` klasörünü gösterir (`import { Button } from '@/components/ui'`).
