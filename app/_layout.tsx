import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppFrame, Banner, Text, ToastProvider } from '@/components/ui';
import { AlertDialogHost } from '@/components/ui/AlertDialog';
import { AuthProvider, useAuth } from '@/features/auth';
import { installWebAlert } from '@/lib/platformAlert';
import { supabaseConfigError } from '@/lib/supabase';
import { colors, fontAssets, layout, spacing } from '@/theme';

SplashScreen.preventAutoHideAsync().catch(() => undefined);
// Web'de Alert.alert boştur; onaylar uygulama içi iletişim kutusuyla sorulur (AlertDialogHost; mobilde etkisiz).
installWebAlert();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(fontAssets);
  // Font yüklenemezse sistem fontuyla devam edilir; uygulama kilitlenmez.
  const fontsReady = fontsLoaded || Boolean(fontError);

  return (
    <SafeAreaProvider>
      <AppFrame>
        <AuthProvider>
          <ToastProvider>
            <RootNavigator fontsReady={fontsReady} />
          </ToastProvider>
        </AuthProvider>
      </AppFrame>
      <AlertDialogHost />
    </SafeAreaProvider>
  );
}

function RootNavigator({ fontsReady }: { fontsReady: boolean }) {
  const { loading } = useAuth();
  const ready = fontsReady && !loading;

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => undefined);
  }, [ready]);

  if (!ready) return null;
  if (supabaseConfigError) return <ConfigError message={supabaseConfigError} />;

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    />
  );
}

function ConfigError({ message }: { message: string }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.config, { paddingTop: insets.top + spacing.huge }]}>
      <Text variant="title" accessibilityRole="header">
        Uygulama yapılandırılmamış
      </Text>
      <Banner kind="error" message={message} />
    </View>
  );
}

const styles = StyleSheet.create({
  config: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: layout.pageX,
    gap: spacing.lg,
  },
});
