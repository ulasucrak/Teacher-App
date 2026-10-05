import { Redirect, Stack } from 'expo-router';

import { useAuth } from '@/features/auth';
import { colors } from '@/theme';

/** Oturum yoksa giriş ekranına yönlendirir. Ekranlar başlığı `Screen` ile kendileri çizer. */
export default function AppLayout() {
  const { session, loading } = useAuth();
  if (loading) return null;
  if (!session) return <Redirect href="/login" />;
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }} />;
}
