import { Redirect, Stack, usePathname } from 'expo-router';

import { RESET_PASSWORD_PATH, useAuth } from '@/features/auth';
import { colors } from '@/theme';

/**
 * Giriş yapmış kullanıcı giriş ekranlarını görmez; uygulamaya yönlendirilir.
 * İstisna: şifre sıfırlama ekranı, bağlantıdan oturum kurulduktan sonra da açık kalır.
 */
export default function AuthLayout() {
  const { session, loading } = useAuth();
  const pathname = usePathname();
  if (loading) return null;
  if (session && pathname !== RESET_PASSWORD_PATH) return <Redirect href="/" />;
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }} />;
}
