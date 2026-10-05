import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, elevation, layout, spacing } from '@/theme';

export interface StickyFooterProps {
  children: ReactNode;
}

/** Ekranın altına sabit birincil eylem alanı (Seviye 3). `Screen`'in `footer` prop'u ile kullanın. */
export function StickyFooter({ children }: StickyFooterProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]}>{children}</View>
  );
}

const styles = StyleSheet.create({
  footer: {
    ...elevation.raised,
    backgroundColor: colors.surface,
    borderTopWidth: layout.hairline,
    borderTopColor: colors.rule,
    paddingHorizontal: layout.pageX,
    paddingTop: spacing.md,
    gap: spacing.sm,
  },
});
