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

import { colors, layout, spacing, strokes } from '@/theme';

import { IconButton, IconButtonVariantContext } from './IconButton';
import { StickyFooter } from './StickyFooter';
import { Text } from './Text';

export interface ScreenProps {
  /**
   * Başlık. `largeTitle` ise içerikte büyük ve sola hizalı çizilir (kök ekranlar: Sınıflarım,
   * Sınıf); değilse üst çubukta ortalı (alt ekranlar).
   */
  title?: string;
  largeTitle?: boolean;
  /** Büyük başlığın sağında süs (ör. `StarSticker`); yalnızca `largeTitle` ile. Dekoratif olmalı (ekran okuyucudan gizli). */
  largeTitleAccessory?: ReactNode;
  /** Büyük başlığın altında tek satır soluk bilgi ("28 öğrenci"). Yalnızca `largeTitle` ile. */
  subtitle?: string;
  /**
   * Geri düğmesi. `true` → router.back(); fonksiyon → özel davranış; `false` → yok.
   * Varsayılan: geri gidilebiliyorsa göster.
   */
  back?: boolean | (() => void);
  /** Sağ üst: en fazla BİR öğe — genellikle "Diğer seçenekler" (⋯) `IconButton`. */
  headerRight?: ReactNode;
  /** Varsayılan üst çubuğun yerine özel başlık (ör. `WizardHeader`). */
  header?: ReactNode;
  /** İçerik kaydırılsın mı (varsayılan true). Liste ekranlarında false verip FlatList kullanın. */
  scroll?: boolean;
  /** Altta sabit eylem alanı (StickyFooter içine konur). FAB ile birlikte kullanmayın. */
  footer?: ReactNode;
  /** Sağ altta yüzen birincil eylem (`Fab`). Kaydırılan içeriğe otomatik alt boşluk eklenir. */
  fab?: ReactNode;
  /** Yatay sayfa boşluğu uygulansın mı (varsayılan true). */
  padded?: boolean;
  /** Başlık çubuğunun altındaki ince çizgi. */
  headerDivider?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
  /** Tam ekran arka plan. */
  background?: ReactNode;
  testID?: string;
  children: ReactNode;
}

/** Her ekranın kökü: güvenli alan, üst çubuk, kaydırma, klavye ve alt eylem alanı. */
export function Screen({
  title,
  largeTitle = false,
  largeTitleAccessory,
  subtitle,
  back,
  headerRight,
  header: customHeader,
  scroll = true,
  footer,
  fab,
  padded = true,
  headerDivider = false,
  contentStyle,
  background,
  testID,
  children,
}: ScreenProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const canGoBack = router.canGoBack();
  const showBack = back === undefined ? canGoBack : Boolean(back);
  const onBack = typeof back === 'function' ? back : () => router.back();
  const showBar = showBack || Boolean(headerRight) || (Boolean(title) && !largeTitle);

  const bar = showBar ? (
    <IconButtonVariantContext.Provider value="square">
    <View style={[styles.bar, headerDivider && styles.barDivider]}>
      <View style={styles.side}>
        {showBack ? (
          <IconButton icon="back" accessibilityLabel="Geri" onPress={onBack} testID="screen-back" />
        ) : null}
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
    </IconButtonVariantContext.Provider>
  ) : null;

  const big =
    title && largeTitle ? (
      <View style={[styles.largeTitle, !showBar && styles.largeTitleTop, !padded && styles.padded]}>
        <View style={styles.largeTitleText}>
          <Text variant="poster" accessibilityRole="header">
            {title}
          </Text>
          {subtitle ? (
            <Text variant="body" tone="muted">
              {subtitle}
            </Text>
          ) : null}
        </View>
        {largeTitleAccessory ? (
          <View style={styles.accessory} accessible={false} importantForAccessibility="no-hide-descendants">
            {largeTitleAccessory}
          </View>
        ) : null}
      </View>
    ) : null;

  const safeBottom = footer ? 0 : insets.bottom + spacing.xxl;
  // Kaydırılan içerik FAB'ın altında kalmasın; FlatList ekranları `layout.fabClearance` ekler.
  const scrollPadding = [padded && styles.padded, { paddingBottom: safeBottom + (fab ? layout.fabClearance : 0) }, contentStyle];
  const viewPadding = [padded && styles.padded, { paddingBottom: safeBottom }, contentStyle];

  return (
    <View style={[styles.root, { paddingTop: insets.top }]} testID={testID}>
      <StatusBar style="dark" />
      {background ? <View style={StyleSheet.absoluteFill}>{background}</View> : null}
      {customHeader ?? bar}
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {scroll ? (
          <ScrollView
            style={styles.flex}
            contentContainerStyle={[styles.scrollContent, scrollPadding]}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
          >
            {big}
            {children}
          </ScrollView>
        ) : (
          <View style={[styles.flex, viewPadding]}>
            {big}
            {children}
          </View>
        )}
        {footer ? <StickyFooter>{footer}</StickyFooter> : null}
      </KeyboardAvoidingView>
      {fab ? (
        <View
          pointerEvents="box-none"
          style={[styles.fabHost, { bottom: Math.max(insets.bottom, spacing.lg) + spacing.sm }]}
        >
          {fab}
        </View>
      ) : null}
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
    paddingHorizontal: spacing.lg,
  },
  barDivider: { borderBottomWidth: strokes.base, borderBottomColor: colors.outline },
  side: { minWidth: layout.squareButton + spacing.xl, flexDirection: 'row', alignItems: 'center' },
  sideRight: { justifyContent: 'flex-end' },
  barTitle: { flex: 1, paddingHorizontal: spacing.xs },
  largeTitle: { marginTop: spacing.sm, marginBottom: spacing.xl, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  largeTitleText: { flex: 1, gap: spacing.xs },
  accessory: { marginRight: spacing.xs, pointerEvents: 'none' },
  largeTitleTop: { marginTop: spacing.xxl },
  scrollContent: { flexGrow: 1 },
  padded: { paddingHorizontal: layout.pageX },
  fabHost: { position: 'absolute', right: layout.pageX, left: layout.pageX, alignItems: 'flex-end' },
});
