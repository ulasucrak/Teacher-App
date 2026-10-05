import { Redirect, Stack } from 'expo-router';

import { useAuth } from '@/features/auth';
import { colors } from '@/theme';

/** Giriş yapmış kullanıcı giriş ekranlarını görmez; uygulamaya yönlendirilir. */
export default function AuthLayout() {
  const { session, loading } = useAuth();
  if (loading) return null;
  if (session) return <Redirect href="/" />;
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }} />;
}
