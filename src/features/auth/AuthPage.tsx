import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button, Icon, Screen, Text } from '@/components/ui';
import { colors, iconSize, layout, radii, spacing } from '@/theme';

export interface AuthPageProps {
  title: string;
  description: string;
  /** `display`: giriş ekranı (uygulama işareti + büyük ad); `title`: diğer adımlar. */
  size?: 'display' | 'title';
  back?: boolean;
  /** Sayfanın altında tek satır geçiş bağlantısı ("Hesabınız yok mu? Hesap oluşturun"). */
  switchPrompt?: { text: string; actionLabel: string; onPress: () => void; testID?: string };
  testID?: string;
  children: ReactNode;
}

/**
 * Giriş/kayıt ekranlarının ortak sayfası: beyaz kâğıt, sola hizalı kısa başlık,
 * altında alanlar ve tek sarı buton. Giriş ekranında üstte uygulama işareti.
 */
export function AuthPage({ title, description, size = 'title', back, switchPrompt, testID, children }: AuthPageProps) {
  const isHome = size === 'display';
  return (
    <Screen back={back ?? (isHome ? false : undefined)} testID={testID} contentStyle={[styles.content, isHome && styles.contentHome]}>
      <View style={styles.heading}>
        {isHome ? <AppMark /> : null}
        <Text variant={size} accessibilityRole="header">
          {title}
        </Text>
        <Text variant="body" tone="muted">
          {description}
        </Text>
      </View>
      <View style={styles.body}>{children}</View>
      {switchPrompt ? (
        <View style={styles.switch}>
          <Text variant="bodySmall" tone="muted">
            {switchPrompt.text}
          </Text>
          <Button
            label={switchPrompt.actionLabel}
            variant="ghost"
            size="sm"
            fullWidth={false}
            onPress={switchPrompt.onPress}
            testID={switchPrompt.testID}
            style={styles.switchButton}
          />
        </View>
      ) : null}
    </Screen>
  );
}

/** Uygulama işareti: kurşun kare içinde sarı defter — markanın tek görsel imzası. */
function AppMark() {
  return (
    <View style={styles.mark} accessible={false} importantForAccessibility="no-hide-descendants">
      <Icon name="book" size={iconSize.xxl + spacing.xs} color={colors.accent} />
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: spacing.lg },
  contentHome: { paddingTop: spacing.huge + spacing.xl },
  heading: { gap: spacing.sm, marginBottom: spacing.xxxl, maxWidth: layout.readableWidth },
  mark: {
    width: layout.iconBox,
    height: layout.iconBox,
    borderRadius: radii.md + spacing.xs,
    backgroundColor: colors.text,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  body: { gap: spacing.lg, maxWidth: layout.readableWidth },
  switch: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 'auto',
    paddingTop: spacing.xxxl,
  },
  switchButton: { marginLeft: -spacing.xs },
});
