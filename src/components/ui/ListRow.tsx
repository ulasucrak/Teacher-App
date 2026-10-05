import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, layout, spacing } from '@/theme';

import { Icon } from './Icon';
import { Text } from './Text';

export interface ListRowProps {
  title: string;
  subtitle?: string;
  /**
   * Okul numarası. Verilirse satır, sınıf defterindeki gibi numara sütunu +
   * kırmızı kenar çizgisi ile çizilir.
   */
  number?: string | number | null;
  /** Numara olmasa da kenar çizgisini göster (hizalama için). */
  ruled?: boolean;
  leading?: ReactNode;
  trailing?: ReactNode;
  /** Başlık satırının altına gelen içerik (örn. seçenek ızgarası). */
  children?: ReactNode;
  onPress?: () => void;
  showChevron?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
}

/** Seviye 0 liste satırı: kart değil, defter satırı (alt çizgi ile ayrılır). */
export function ListRow({
  title,
  subtitle,
  number,
  ruled,
  leading,
  trailing,
  children,
  onPress,
  showChevron = Boolean(onPress),
  accessibilityLabel,
  accessibilityHint,
  style,
}: ListRowProps) {
  const hasMargin = ruled || (number !== undefined && number !== null);

  const header = (
    <View style={styles.header}>
      {leading}
      <View style={styles.titles}>
        <Text variant="bodyStrong" numberOfLines={2}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="caption" tone="muted" numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {trailing}
      {showChevron ? <Icon name="chevronRight" size={16} color={colors.textMuted} /> : null}
    </View>
  );

  const body = (
    <View style={styles.inner}>
      {hasMargin ? (
        <>
          <View style={styles.numberCol}>
            <View style={styles.numberBox}>
              {number !== undefined && number !== null ? (
                <Text variant="number" tone="muted" align="right" maxFontSizeMultiplier={1.2}>
                  {String(number)}
                </Text>
              ) : null}
            </View>
          </View>
          <View style={styles.marginRule} />
        </>
      ) : null}
      <View style={[styles.content, hasMargin && styles.contentRuled]}>
        {header}
        {children ? <View style={styles.children}>{children}</View> : null}
      </View>
    </View>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? [title, subtitle].filter(Boolean).join(', ')}
        accessibilityHint={accessibilityHint}
        style={({ pressed }) => [styles.row, pressed && styles.pressed, style]}
      >
        {body}
      </Pressable>
    );
  }
  return <View style={[styles.row, style]}>{body}</View>;
}

const styles = StyleSheet.create({
  row: {
    backgroundColor: colors.surface,
    borderBottomWidth: layout.hairline,
    borderBottomColor: colors.rule,
    minHeight: layout.minTouch + spacing.md,
  },
  pressed: { backgroundColor: colors.surfaceMuted },
  inner: { flexDirection: 'row', paddingRight: layout.pageX },
  numberCol: {
    width: layout.numberColumn + layout.pageX - spacing.sm,
    paddingTop: spacing.md,
    paddingRight: spacing.sm,
  },
  numberBox: { minHeight: layout.minTouch - spacing.sm, justifyContent: 'center' },
  marginRule: { width: layout.marginRuleWidth, backgroundColor: colors.marginRule },
  content: { flex: 1, paddingVertical: spacing.md, paddingLeft: layout.pageX },
  contentRuled: { paddingLeft: spacing.md },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: layout.minTouch - spacing.sm },
  titles: { flex: 1, gap: spacing.xxs },
  children: { marginTop: spacing.md },
});
