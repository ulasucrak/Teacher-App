import { StyleSheet } from 'react-native';

import { ListRow, Text } from '@/components/ui';

import type { ClassSummary } from '../model';

export interface ClassListRowProps {
  item: ClassSummary;
  onPress: () => void;
  testID?: string;
}

/** "Sınıflarım" satırı: sınıf adı, altında form sayısı; sağda öğrenci sayısı. */
export function ClassListRow({ item, onPress, testID }: ClassListRowProps) {
  const students = `${item.studentCount} öğrenci`;
  const forms = item.formCount > 0 ? `${item.formCount} form` : 'Henüz form yok';
  return (
    <ListRow
      title={item.name}
      subtitle={forms}
      onPress={onPress}
      trailing={
        <Text variant="label" tone="muted" style={styles.count}>
          {students}
        </Text>
      }
      accessibilityLabel={`${item.name}, ${students}, ${forms}`}
      accessibilityHint="Sınıfı açar"
      testID={testID}
    />
  );
}

const styles = StyleSheet.create({
  count: { fontVariant: ['tabular-nums'] },
});
