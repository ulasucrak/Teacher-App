import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { IconButton, Screen, SegmentedTabs, type SegmentedTab } from '@/components/ui';
import { layout, spacing } from '@/theme';

export type FormTab = 'mark' | 'history';

export const FORM_TABS: readonly SegmentedTab<FormTab>[] = [
  { key: 'mark', label: 'İşaretle' },
  { key: 'history', label: 'Geçmiş' },
];

/** `?tab=` parametresini sekmeye çevirir; bilinmeyen değer "İşaretle" sayılır. */
export function parseFormTab(value: string | string[] | undefined): FormTab {
  const first = Array.isArray(value) ? value[0] : value;
  return first === 'history' ? 'history' : 'mark';
}

interface FormShellProps {
  title: string;
  tab: FormTab;
  onTab: (tab: FormTab) => void;
  onMore: () => void;
  /** Alt eylem çubuğu (yalnızca "İşaretle" sekmesinde anlamlıysa verin). */
  footer?: ReactNode;
  testID: string;
  children: ReactNode;
}

/**
 * Form ekranının çerçevesi: üst çubukta form adı ve "⋯", altında "İşaretle | Geçmiş" sekmeleri.
 * Günlük ve birikimli görünümler aynı çerçeveyi kullanır.
 */
export function FormShell({ title, tab, onTab, onMore, footer, testID, children }: FormShellProps) {
  return (
    <Screen
      title={title}
      scroll={false}
      padded={false}
      headerDivider
      footer={footer}
      testID={testID}
      headerRight={
        <IconButton icon="more" accessibilityLabel="Diğer seçenekler" onPress={onMore} testID="form-more" />
      }
    >
      <View style={styles.tabs}>
        <SegmentedTabs
          tabs={FORM_TABS}
          value={tab}
          onChange={onTab}
          accessibilityLabel="Form bölümleri"
          testIDPrefix="form-tab"
        />
      </View>
      {children}
    </Screen>
  );
}

const styles = StyleSheet.create({
  tabs: { paddingHorizontal: layout.pageX, paddingVertical: spacing.md },
});
