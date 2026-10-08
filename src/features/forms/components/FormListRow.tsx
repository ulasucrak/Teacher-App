import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Badge, IconButton, IconTile, ListRow, ListRowActionSpacer } from '@/components/ui';
import { formatCompactDate } from '@/features/sessions/date';
import { colors, iconSize, spacing } from '@/theme';
import type { FormMode } from '@/types/database';

import type { FormListItem } from '../api';
import { formModeLabels } from '../mode';
import { formPaper, presetIcon } from '../presets';

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

/**
 * Son kayıt tarihinin kısa metni: "Son kayıt: Bugün" ya da "Henüz kayıt yok".
 * Birikimli formda kayıt değil işaret verilir: "Son işaret: Dün" / "Henüz işaret yok".
 */
export function lastSessionLabel(date: string | null, mode: FormMode = 'daily'): string {
  const compact = date ? formatCompactDate(date) : null;
  const noun = mode === 'repeatable' ? 'işaret' : 'kayıt';
  return compact ? `Son ${noun}: ${compact}` : `Henüz ${noun} yok`;
}

/**
 * Form kartı (mockup `.fcard`): kâğıt renkli ikon kutusu, ad, son kayıt; sağda "⋯". Birikimli formda "Birikimli" rozeti
 * (günde bir kez olan olağan türdür, rozetsiz). Uzun basış da menüyü açar.
 */
export function FormListRow({ form, index, onOpen, onMore, busy = false, openHint }: FormListRowProps) {
  const subtitle = lastSessionLabel(form.lastSessionDate, form.mode);
  const repeatable = form.mode === 'repeatable';
  const testID = `form-row-${index}`;
  return (
    <ListRow
      title={form.title}
      subtitle={subtitle}
      variant="card"
      leading={<IconTile icon={presetIcon(form.title)} paper={formPaper(form.title, index)} />}
      showChevron={false}
      onPress={busy ? undefined : onOpen}
      onLongPress={onMore}
      accessibilityLabel={`${form.title}, ${repeatable ? `${formModeLabels.repeatable}, ` : ''}${subtitle}`}
      accessibilityHint={openHint}
      testID={testID}
      trailing={
        <View style={styles.trailingRow}>
          {repeatable ? (
            <View style={styles.badge}>
              <Badge label={formModeLabels.repeatable} testID={`${testID}-mode`} />
            </View>
          ) : null}
          <ListRowActionSpacer />
        </View>
      }
      // "⋯" düğmesi basılabilir satırın içine konmaz (web'de iç içe <button> olur); kardeş olarak çizilir.
      action={
        busy ? (
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
        )
      }
    />
  );
}

const styles = StyleSheet.create({
  badge: { alignSelf: 'center' },
  trailingRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
});
