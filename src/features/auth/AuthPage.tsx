import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { RULED_MARGIN_X, RuledPaper, Screen, Text } from '@/components/ui';
import { layout, spacing } from '@/theme';

export interface AuthPageProps {
  title: string;
  description: string;
  /** Başlığın büyüklüğü: giriş ekranında uygulama adı (display), diğerlerinde title. */
  size?: 'display' | 'title';
  back?: boolean;
  children: ReactNode;
}

/**
 * Giriş/kayıt ekranlarının ortak sayfası: çizgili defter zemini, içerik kırmızı kenar
 * çizgisinin sağında başlar.
 */
export function AuthPage({ title, description, size = 'title', back, children }: AuthPageProps) {
  return (
    <Screen back={back} padded={false} background={<RuledPaper />} contentStyle={styles.content}>
      <View style={styles.heading}>
        <Text variant={size} accessibilityRole="header">
          {title}
        </Text>
        <Text variant="body" tone="muted">
          {description}
        </Text>
      </View>
      <View style={styles.body}>{children}</View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingLeft: RULED_MARGIN_X,
    paddingRight: layout.pageX + spacing.xs,
    paddingTop: spacing.huge,
  },
  heading: { gap: spacing.sm, marginBottom: spacing.xxxl, maxWidth: layout.readableWidth },
  body: { gap: spacing.xl, maxWidth: layout.readableWidth },
});
