// Test verisini temizlemek için doğrudan Supabase çağrıları (Node tarafında, test hesabıyla).
// Uygulama akışları arayüzden denenir; bu yardımcılar yalnızca kalıntıları siler.
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { supabaseConfig, testAccount } from './env';

/** Web E2E'nin oluşturduğu tüm sınıfların ad öneki. */
export const CLASS_PREFIX = 'E2E Web';

let cached: Promise<SupabaseClient> | null = null;

async function client(): Promise<SupabaseClient> {
  if (!cached) {
    cached = (async () => {
      const { url, anonKey } = supabaseConfig();
      const sb = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
      const { email, password } = testAccount();
      const { error } = await sb.auth.signInWithPassword({ email, password });
      if (error) throw new Error(`Test hesabıyla giriş yapılamadı: ${error.message}`);
      return sb;
    })();
    cached.catch(() => {
      cached = null;
    });
  }
  return cached;
}

/** Adı `prefix` ile başlayan sınıfları (öğrenci, form ve kayıtlarıyla birlikte) siler. */
export async function deleteClassesByPrefix(prefix: string = CLASS_PREFIX): Promise<number> {
  const sb = await client();
  const escaped = prefix.replace(/[\\%_]/g, (c) => `\\${c}`);
  const { data, error } = await sb.from('classes').delete().like('name', `${escaped}%`).select('id');
  if (error) throw new Error(`E2E sınıfları silinemedi: ${error.message}`);
  return data?.length ?? 0;
}
