import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppFrame, Banner, Text, ToastProvider } from '@/components/ui';
import { AuthProvider, useAuth, WebAppBar } from '@/features/auth';
import { installWebAlert } from '@/lib/platformAlert';
import { supabaseConfigError } from '@/lib/supabase';
import { colors, fontAssets, layout, spacing } from '@/theme';

SplashScreen.preventAutoHideAsync().catch(() => undefined);
// Web'de Alert.alert boştur; onaylar tarayıcı iletişim kutusuyla sorulur (mobilde etkisiz).
installWebAlert();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(fontAssets);
  // Font yüklenemezse sistem fontuyla devam edilir; uygulama kilitlenmez.
  const fontsReady = fontsLoaded || Boolean(fontError);

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <AppFrame header={fontsReady ? <WebAppBar /> : null}>
          <ToastProvider>
            <RootNavigator fontsReady={fontsReady} />
          </ToastProvider>
        </AppFrame>
      </AuthProvider>
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
