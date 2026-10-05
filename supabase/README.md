# Supabase Kurulumu

Bu klasör, öğretmen uygulamasının veritabanı şemasını içerir:

- `migrations/20261005000000_init.sql` — tablolar (`classes`, `students`, `forms`, `form_sessions`, `form_entries`), RLS politikaları, `updated_at` tetikleyicileri ve `copy_form_to_classes` fonksiyonu.
- `config.toml` — yerel geliştirme için Supabase CLI ayarları (`supabase start`).

Her öğretmen yalnızca kendi verisini görebilir ve değiştirebilir (Row Level Security). Giriş yapmamış (anon) kullanıcıların tablolara erişimi yoktur.

## 1. Supabase projesi oluşturma

1. <https://supabase.com> adresinden giriş yapın ve **New project** ile yeni bir proje oluşturun.
2. Proje adı, veritabanı şifresi ve bölge (ör. `eu-central-1` / Frankfurt) seçin. Veritabanı şifresini güvenli bir yere kaydedin.
3. Projenin hazırlanmasını bekleyin (1–2 dakika).

## 2. Migration'ı çalıştırma

İki yoldan birini seçin.

### Yol A — Supabase CLI (önerilen)

```bash
# CLI kurulu değilse (macOS):
brew install supabase/tap/supabase

# Proje kök dizininde:
supabase login
supabase link --project-ref <PROJE_REF>   # Project Settings > General > Reference ID
supabase db push                          # migrations/ içindeki SQL'i uzak veritabanına uygular
```

`supabase link` sırasında veritabanı şifresi sorulur.

### Yol B — SQL Editor

1. Supabase panelinde **SQL Editor** > **New query** açın.
2. `supabase/migrations/20261005000000_init.sql` dosyasının tüm içeriğini yapıştırın.
3. **Run** ile çalıştırın. "Success. No rows returned" mesajını görmelisiniz.

> Not: Yol B ile kurduysanız daha sonra CLI'ya geçerken bu migration'ı
> `supabase migration repair --status applied 20261005000000` ile "uygulandı" olarak işaretleyin.

## 3. E-posta ile girişi açma

1. **Authentication** > **Sign In / Providers** (eski panellerde **Providers**) bölümüne gidin.
2. **Email** sağlayıcısının açık olduğundan emin olun.
3. Geliştirme sırasında hızlı test için **Confirm email** seçeneğini kapatabilirsiniz; canlıya çıkmadan önce tekrar açmanız önerilir.

## 4. URL ve anon anahtarını uygulamaya ekleme

1. **Project Settings** > **API** (veya **Data API** / **API Keys**) bölümünü açın.
2. **Project URL** ve **anon / public** (publishable) anahtarını kopyalayın.
3. Uygulamanın kök dizininde `.env` dosyası oluşturun:

```env
EXPO_PUBLIC_SUPABASE_URL=https://<PROJE_REF>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon-anahtarınız>
```

> **Önemli:** `service_role` (secret) anahtarını asla uygulamaya veya `.env` dosyasına koymayın;
> bu anahtar RLS'yi atlar. `.env` dosyasını git'e eklemeyin.

Değişkenleri değiştirdikten sonra Expo'yu yeniden başlatın (`npx expo start -c`).

## 5. (İsteğe bağlı) Yerel geliştirme

Docker kuruluysa:

```bash
supabase start      # yerel Supabase'i başlatır ve migration'ları uygular
supabase db reset   # yerel veritabanını sıfırlayıp migration'ları yeniden uygular
supabase stop
```

`supabase start` çıktısındaki `API URL` ve `anon key` değerlerini yerel test için `.env` dosyasında kullanabilirsiniz.

## TypeScript tipleri

`src/types/database.ts` bu şemaya göre elle yazılmıştır. Şema değişirse şu komutla yeniden üretebilirsiniz
(ardından dosyanın sonundaki kolaylık tiplerini — `ClassRow`, `FormOption` vb. — tekrar ekleyin):

```bash
supabase gen types typescript --linked > src/types/database.ts
```

## Şema özeti

| Tablo | Açıklama |
| --- | --- |
| `classes` | Sınıflar (ad, seviye, şube) |
| `students` | Öğrenciler (ad soyad, okul no, fotoğraf) — bir sınıfa bağlı |
| `forms` | Değerlendirme formları; `options` = `[{ key, label, tone }]`, `tone`: `positive` \| `neutral` \| `warning` \| `negative` |
| `form_sessions` | Bir formun belirli bir tarihte doldurulması (`draft` / `published`) |
| `form_entries` | Oturumdaki her öğrenci için seçilen seçenek ve not (oturum + öğrenci başına tek kayıt) |

`copy_form_to_classes(p_form_id, p_class_ids)` fonksiyonu bir formu (başlık, ders, açıklama, seçenekler) seçilen diğer sınıflara kopyalar; öğretmene ait olmayan sınıflar atlanır.
