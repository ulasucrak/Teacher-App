import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { colors, spacing } from '@/theme';

import { Text } from './Text';

export interface LoadingStateProps {
  /** Beklentiyi söyleyin: "Öğrenciler yükleniyor". */
  label?: string;
}

export function LoadingState({ label }: LoadingStateProps) {
  return (
    <View
      style={styles.container}
      accessibilityRole="progressbar"
      accessibilityLabel={label ?? 'Yükleniyor'}
      accessibilityState={{ busy: true }}
    >
      <ActivityIndicator color={colors.primary} size="large" />
      {label ? (
        <Text variant="body" tone="muted" align="center">
          {label}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, padding: spacing.xxl },
});
