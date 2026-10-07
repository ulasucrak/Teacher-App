import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, iconSize, layout, spacing } from '@/theme';

import { Icon } from './Icon';
import { Text } from './Text';

export interface ListRowProps {
  title: string;
  subtitle?: string;
  /** `subtitle` yerine özel alt satır (ör. renkli noktalı sayılar); en fazla bir satır yüksekliği beklenir. */
  subtitleContent?: ReactNode;
  /** Okul numarası: solda dar, soluk ve hizalı bir sütunda gösterilir. */
  number?: string | number | null;
  /** Numara olmasa da numara sütununu ayır (aynı listede hizalama için). */
  ruled?: boolean;
  leading?: ReactNode;
  trailing?: ReactNode;
  /**
   * Satırın sağında, satırın DIŞINDA (kardeş olarak) çizilen etkileşimli öğe (ör. "⋯" düğmesi).
   * Basılabilir satırın içine düğme koymak web'de iç içe <button> üretir; bunun yerine buraya koyun.
   * `minTouch` genişliğinde bir kutuya yerleşir; `trailing` içinde aynı genişlikte boşluk (`ListRowActionSpacer`) ayırın.
   */
  action?: ReactNode;
  /** Başlık satırının altına gelen içerik (örn. seçenek çipleri). */
  children?: ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
  showChevron?: boolean;
  /** Ayırıcı çizgi (varsayılan true). Listenin son satırında kapatabilirsiniz. */
  divider?: boolean;
  /** Başlık metninin rengi (ör. yıkıcı menü satırı). */
  titleColor?: string;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/** Seviye 0 liste satırı: kart değil; içeriğin başlangıcından itibaren ince ayraçla ayrılır. */
export function ListRow({
  title,
  subtitle,
  subtitleContent,
  number,
  ruled,
  leading,
  trailing,
  action,
  children,
  onPress,
  onLongPress,
  showChevron = Boolean(onPress),
  divider = true,
  titleColor,
  accessibilityLabel,
  accessibilityHint,
  style,
  testID,
}: ListRowProps) {
  const hasNumber = number !== undefined && number !== null && String(number).length > 0;
  const showNumberCol = ruled || hasNumber;

  const body = (
    <View style={styles.inner}>
      {showNumberCol ? (
        <View style={styles.numberCol}>
          {hasNumber ? (
            <Text variant="number" tone="muted" align="right" maxFontSizeMultiplier={1.2} numberOfLines={1}>
              {String(number)}
            </Text>
          ) : null}
        </View>
      ) : null}
      <View style={[styles.content, divider && styles.divider]}>
        <View style={styles.header}>
          {leading}
          <View style={styles.titles}>
            <Text variant="bodyStrong" numberOfLines={2} color={titleColor}>
              {title}
            </Text>
            {subtitleContent ?? null}
            {!subtitleContent && subtitle ? (
              <Text variant="caption" tone="muted" numberOfLines={1}>
                {subtitle}
              </Text>
            ) : null}
          </View>
          {trailing}
          {showChevron ? <Icon name="chevronRight" size={iconSize.sm} color={colors.textMuted} /> : null}
        </View>
        {children ? <View style={styles.children}>{children}</View> : null}
      </View>
    </View>
  );

  if (onPress || onLongPress) {
    const pressable = (
      <Pressable
        testID={testID}
        onPress={onPress}
        onLongPress={onLongPress}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? [title, subtitle].filter(Boolean).join(', ')}
        accessibilityHint={accessibilityHint}
        style={({ pressed }) => [styles.row, pressed && styles.pressed, style]}
      >
        {body}
      </Pressable>
    );
    if (!action) return pressable;
    return (
      <View style={styles.actionHost}>
        {pressable}
        <View style={[styles.action, divider && styles.actionAboveDivider]}>
          {action}
        </View>
      </View>
    );
  }
  return (
    <View style={[styles.row, style]} testID={testID}>
      {body}
    </View>
  );
}

/** `action` düğmesinin kapladığı yeri `trailing` içinde ayırır (satır düzeni değişmez). */
export function ListRowActionSpacer() {
  return <View style={styles.actionSpacer} />;
}

const styles = StyleSheet.create({
  actionHost: { position: 'relative' },
  action: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    // "⋯" mürekkebi (kutunun ortası) sayfa içerik kenarına hizalanır: Öğrenciler satırının chevron'u,
    // "+ Form" ve sağdaki sayılarla aynı sağ çizgi.
    right: spacing.xs,
    width: layout.minTouch,
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'box-none',
  },
  actionAboveDivider: { bottom: layout.hairline },
  actionSpacer: { width: layout.minTouch, marginRight: -(layout.pageX - spacing.xs) },
  row: { backgroundColor: colors.surface, minHeight: layout.rowHeight },
  pressed: { backgroundColor: colors.surfaceMuted },
  inner: { flexDirection: 'row', paddingLeft: layout.pageX },
  numberCol: {
    width: layout.numberColumn,
    marginRight: spacing.md,
    marginTop: spacing.md,
    height: layout.rowHeight - spacing.md * 2,
    justifyContent: 'center',
  },
  content: { flex: 1, paddingVertical: spacing.md, paddingRight: layout.pageX },
  divider: { borderBottomWidth: layout.hairline, borderBottomColor: colors.rule },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: layout.rowHeight - spacing.md * 2 },
  titles: { flex: 1, gap: spacing.xxs },
  children: { marginTop: spacing.md },
});
