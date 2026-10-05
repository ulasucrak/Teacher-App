import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import type { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, layout, spacing } from '@/theme';

import { IconButton } from './IconButton';
import { StickyFooter } from './StickyFooter';
import { Text } from './Text';

export interface ScreenProps {
  /** Üst çubuk başlığı. `largeTitle` ise başlık içerikte büyük ve sola hizalı çizilir. */
  title?: string;
  largeTitle?: boolean;
  /**
   * Geri düğmesi. `true` → router.back(); fonksiyon → özel davranış; `false` → yok.
   * Varsayılan: geri gidilebiliyorsa göster.
   */
  back?: boolean | (() => void);
  /** Sağ üst eylem(ler), genellikle `IconButton`. */
  headerRight?: ReactNode;
  /** İçerik kaydırılsın mı (varsayılan true). Liste ekranlarında false verip FlatList kullanın. */
  scroll?: boolean;
  /** Altta sabit eylem alanı (StickyFooter içine konur). */
  footer?: ReactNode;
  /** Yatay sayfa boşluğu uygulansın mı (varsayılan true). */
  padded?: boolean;
  /** Başlık çubuğunun altındaki ince çizgi. */
  headerDivider?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
  /** Tam ekran arka plan (örn. `RuledPaper`). */
  background?: ReactNode;
  children: ReactNode;
}

/** Her ekranın kökü: güvenli alan, üst çubuk, kaydırma, klavye ve alt eylem alanı. */
export function Screen({
  title,
  largeTitle = false,
  back,
  headerRight,
  scroll = true,
  footer,
  padded = true,
  headerDivider = false,
  contentStyle,
  background,
  children,
}: ScreenProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const canGoBack = router.canGoBack();
  const showBack = back === undefined ? canGoBack : Boolean(back);
  const onBack = typeof back === 'function' ? back : () => router.back();
  const showBar = showBack || Boolean(headerRight) || (Boolean(title) && !largeTitle);

  const header = showBar ? (
    <View style={[styles.bar, headerDivider && styles.barDivider]}>
      <View style={styles.side}>
        {showBack ? <IconButton icon="back" accessibilityLabel="Geri" onPress={onBack} /> : null}
      </View>
      <View style={styles.barTitle}>
        {title && !largeTitle ? (
          <Text variant="heading" align="center" numberOfLines={1} accessibilityRole="header">
            {title}
          </Text>
        ) : null}
      </View>
      <View style={[styles.side, styles.sideRight]}>{headerRight}</View>
    </View>
  ) : null;

  const big =
    title && largeTitle ? (
      <Text variant="title" accessibilityRole="header" style={styles.largeTitle}>
        {title}
      </Text>
    ) : null;

  const contentPadding = [
    padded && styles.padded,
    !footer && { paddingBottom: insets.bottom + spacing.xxl },
    contentStyle,
  ];

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar style="dark" />
      {background ? <View style={StyleSheet.absoluteFill}>{background}</View> : null}
      {header}
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {scroll ? (
          <ScrollView
            style={styles.flex}
            contentContainerStyle={[styles.scrollContent, contentPadding]}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
          >
            {big}
            {children}
          </ScrollView>
        ) : (
          <View style={[styles.flex, contentPadding]}>
            {big}
            {children}
          </View>
        )}
        {footer ? <StickyFooter>{footer}</StickyFooter> : null}
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  bar: {
    minHeight: layout.headerHeight,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xs,
  },
  barDivider: { borderBottomWidth: layout.hairline, borderBottomColor: colors.rule },
  side: { minWidth: layout.minTouch * 2, flexDirection: 'row', alignItems: 'center' },
  sideRight: { justifyContent: 'flex-end' },
  barTitle: { flex: 1, paddingHorizontal: spacing.xs },
  largeTitle: { marginTop: spacing.sm, marginBottom: spacing.lg },
  scrollContent: { flexGrow: 1 },
  padded: { paddingHorizontal: layout.pageX },
});
