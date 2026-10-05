import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

import type { Database } from '@/types/database';

// EXPO_PUBLIC_* değişkenleri derleme anında gömülür; bu yüzden doğrudan okunur.
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Ortam değişkenleri eksikse kullanıcıya gösterilecek açıklama; tamamsa null.
 * Kök layout bu değeri kontrol edip uygulamayı başlatmadan önce hatayı gösterir.
 */
export const supabaseConfigError: string | null =
  supabaseUrl && supabaseAnonKey
    ? null
    : 'Supabase bağlantı bilgileri eksik. Proje kökündeki .env dosyasına EXPO_PUBLIC_SUPABASE_URL ve EXPO_PUBLIC_SUPABASE_ANON_KEY değerlerini ekleyin (örnek: .env.example), sonra uygulamayı yeniden başlatın.';

export const supabase = createClient<Database>(
  // Eksik yapılandırmada istemci yine oluşturulur ama kök layout ağ çağrısı yapılmadan durur.
  supabaseUrl ?? 'http://localhost:54321',
  supabaseAnonKey ?? 'missing-anon-key',
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  },
);

// Uygulama ön plandayken oturum yenilemesini çalıştır, arka planda durdur.
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      supabase.auth.startAutoRefresh();
    } else {
      supabase.auth.stopAutoRefresh();
    }
  });
}
