import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { IconButton, IconTile, ListRow } from '@/components/ui';
import { formatCompactDate } from '@/features/sessions/date';
import { colors, iconSize, layout } from '@/theme';

import type { FormListItem } from '../api';
import { presetIcon } from '../presets';

interface FormListRowProps {
  form: FormListItem;
  /** Listedeki sıra (testID: `form-row-<index>`). */
  index: number;
  onOpen: () => void;
  onMore: () => void;
  /** Satıra dokunulduktan sonra açılış sürüyor. */
  busy?: boolean;
  /** Erişilebilirlik ipucu: satıra dokunmak ne yapar. */
  openHint?: string;
}

/** Son kayıt tarihinin kısa metni: "Son kayıt: Bugün" ya da "Henüz kayıt yok". */
export function lastSessionLabel(date: string | null): string {
  const compact = date ? formatCompactDate(date) : null;
  return compact ? `Son kayıt: ${compact}` : 'Henüz kayıt yok';
}

/** Kompakt form satırı: ikon, ad, son kayıt; sağda "⋯". Uzun basış da menüyü açar. */
export function FormListRow({ form, index, onOpen, onMore, busy = false, openHint }: FormListRowProps) {
  const subtitle = lastSessionLabel(form.lastSessionDate);
  const testID = `form-row-${index}`;
  return (
    <ListRow
      title={form.title}
      subtitle={subtitle}
      leading={<IconTile icon={presetIcon(form.title)} />}
      showChevron={false}
      onPress={busy ? undefined : onOpen}
      onLongPress={onMore}
      accessibilityLabel={`${form.title}, ${subtitle}`}
      accessibilityHint={openHint}
      testID={testID}
      trailing={
        <View style={styles.trailing}>
          {busy ? (
            <ActivityIndicator color={colors.primary} testID={`${testID}-busy`} />
          ) : (
            <IconButton
              icon="more"
              size={iconSize.lg}
              color={colors.textMuted}
              accessibilityLabel={`${form.title} için diğer seçenekler`}
              onPress={onMore}
              testID={`${testID}-more`}
            />
          )}
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  trailing: { width: layout.minTouch, alignItems: 'center', justifyContent: 'center', marginRight: -layout.pageX / 2 },
});
