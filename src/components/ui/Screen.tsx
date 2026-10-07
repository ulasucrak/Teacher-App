import { useRouter, type Href } from 'expo-router';
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
import { currentWebPathname, screenParentHref } from './ScreenBack';
import { backIconSize, desktopBarInset, useDesktopWeb } from './ScreenChrome';
import { StickyFooter } from './StickyFooter';
import { Text } from './Text';

export interface ScreenProps {
  /**
   * Başlık. `largeTitle` ise içerikte büyük ve sola hizalı çizilir (kök ekranlar: Sınıflarım,
   * Sınıf); değilse üst çubukta ortalı (alt ekranlar).
   */
  title?: string;
  largeTitle?: boolean;
  /** Büyük başlığın altında tek satır soluk bilgi ("28 öğrenci"). Yalnızca `largeTitle` ile. */
  subtitle?: string;
  /**
   * Geri düğmesi. `true` → router.back(); fonksiyon → özel davranış; `false` → yok.
   * Varsayılan: geri gidilebiliyorsa göster. Web'de geçmiş yoksa (yenileme, doğrudan bağlantı)
   * düğme yine görünür ve `fallbackHref` adresine gider.
   */
  back?: boolean | (() => void);
  /**
   * Web: geri gidilecek geçmiş yoksa gidilecek üst ekran. Verilmezse adresten çıkarılır
   * (`/class/1/students` → `/class/1`, `/class/1` → `/`).
   */
  fallbackHref?: Href;
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
  subtitle,
  back,
  fallbackHref,
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
  const desktopWeb = useDesktopWeb();

  const canGoBack = router.canGoBack();
  // Web'de sayfa yenilenince/bağlantıyla açılınca geçmiş yoktur; geri, mantıksal üst ekrana gider.
  const parentHref: Href | null = isWeb && !canGoBack ? (fallbackHref ?? screenParentHref(currentWebPathname())) : null;
  const showBack = back === undefined ? canGoBack || parentHref !== null : Boolean(back);
  const onBack =
    typeof back === 'function'
      ? back
      : () => {
          if (router.canGoBack()) router.back();
          else if (parentHref !== null) router.replace(parentHref);
        };
  const showBar = showBack || Boolean(headerRight) || (Boolean(title) && !largeTitle);

  const bar = showBar ? (
    <View style={[styles.bar, desktopWeb && styles.barDesktop, headerDivider && styles.barDivider]}>
      <View style={styles.side}>
        {showBack ? (
          <IconButton
            icon="back"
            accessibilityLabel="Geri"
            onPress={onBack}
            size={backIconSize}
            testID="screen-back"
          />
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
  ) : null;

  const big =
    title && largeTitle ? (
      <View style={[styles.largeTitle, !showBar && styles.largeTitleTop, !padded && styles.padded]}>
        <Text variant="title" accessibilityRole="header">
          {title}
        </Text>
        {subtitle ? (
          <Text variant="bodySmall" tone="muted">
            {subtitle}
          </Text>
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

const isWeb = Platform.OS === 'web';

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  bar: {
    minHeight: layout.headerHeight,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xs,
  },
  barDesktop: { paddingTop: desktopBarInset },
  barDivider: { borderBottomWidth: layout.hairline, borderBottomColor: colors.rule },
  side: { minWidth: layout.minTouch * 2, flexDirection: 'row', alignItems: 'center' },
  sideRight: { justifyContent: 'flex-end' },
  barTitle: { flex: 1, paddingHorizontal: spacing.xs },
  largeTitle: { marginTop: spacing.xs, marginBottom: spacing.xl, gap: spacing.xxs },
  largeTitleTop: { marginTop: spacing.xxl },
  scrollContent: { flexGrow: 1 },
  padded: { paddingHorizontal: layout.pageX },
  fabHost: { position: 'absolute', right: layout.pageX, left: layout.pageX, alignItems: 'flex-end' },
});
