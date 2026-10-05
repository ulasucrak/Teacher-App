import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Avatar, ListRow, OptionGrid, Text } from '@/components/ui';
import { colors, layout, radii, spacing } from '@/theme';

import type { DraftOption } from '../options';

const SAMPLE_NAME = 'Ayşe Yılmaz';

/**
 * İşaretleme ekranındaki öğrenci satırının birebir örneği: okul numarası, kırmızı
 * kenar çizgisi, seçenek ızgarası. Çiplere dokunup seçili renkleri deneyebilirsiniz.
 */
export function OptionsPreview({ options, title }: { options: readonly DraftOption[]; title: string }) {
  const [selected, setSelected] = useState<string | null>(null);
  const items = options
    .filter((o) => o.label.trim())
    .map((o) => ({ key: o.id, label: o.label.trim(), tone: o.tone }));

  return (
    <View style={styles.frame}>
      <View style={styles.caption}>
        <Text variant="label">{title.trim() || 'Adsız form'}</Text>
        <Text variant="caption" tone="muted">
          Çiplere dokunarak seçili hallerini deneyin.
        </Text>
      </View>
      <ListRow
        number={12}
        title={SAMPLE_NAME}
        leading={<Avatar name={SAMPLE_NAME} size="sm" />}
        style={styles.row}
      >
        {items.length > 0 ? (
          <OptionGrid
            options={items}
            value={selected}
            onChange={(key) => setSelected((cur) => (cur === key ? null : key))}
            contextLabel={`Önizleme, ${SAMPLE_NAME}`}
          />
        ) : (
          <Text variant="bodySmall" tone="muted">
            Seçeneklere ad yazdıkça çipler burada görünür.
          </Text>
        )}
      </ListRow>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    borderRadius: radii.md,
    borderWidth: layout.hairline,
    borderColor: colors.rule,
    overflow: 'hidden',
  },
  caption: {
    gap: spacing.xxs,
    paddingHorizontal: layout.pageX,
    paddingVertical: spacing.md,
    backgroundColor: colors.surfaceMuted,
  },
  row: { borderBottomWidth: 0 },
});
