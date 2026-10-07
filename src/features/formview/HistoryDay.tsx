import { useMemo } from 'react';
import { FlatList, StyleSheet, View, type ListRenderItem } from 'react-native';

import { Banner, Button, EmptyState, ListRow, LoadingState, Text } from '@/components/ui';
import { formatCounts, formatNet, type StudentSummary } from '@/features/history';
import { colors, layout, radii, spacing, tones } from '@/theme';
import type { FormMode, FormOption } from '@/types/database';

import { sortSummaryStudents } from './board';
import type { DayReview } from './useDayReview';

interface HistoryDayProps {
  mode: FormMode;
  options: readonly FormOption[];
  day: string;
  review: DayReview | null;
  error: string | null;
  onRetry: () => void;
  /** O günün zaman çizelgesi (tüm sınıf ya da tek öğrenci). */
  onOpenList: (studentId?: { id: string; name: string }) => void;
  /** Günü İşaretle sekmesinde aç. */
  onEditDay?: () => void;
}

/** Günün öğrenci başına değeri (günlük) ya da sayıları ve neti (birikimli). */
export function HistoryDay({ mode, options, day, review, error, onRetry, onOpenList, onEditDay }: HistoryDayProps) {
  const students = useMemo(() => (review ? sortSummaryStudents(review.summary.students, 'name') : []), [review]);
  const daily = mode === 'daily';

  if (!review) {
    if (error) {
      return (
        <View style={styles.state}>
          <Banner kind="error" message={error} />
          <Button label="Tekrar dene" variant="secondary" onPress={onRetry} testID="day-retry" />
        </View>
      );
    }
    return <LoadingState label="Gün yükleniyor" />;
  }

  const { summary, changes } = review;

  if (summary.total === 0) {
    return (
      <View style={styles.padded}>
        <EmptyState
          icon="calendar"
          title="Bu günde kayıt yok"
          description={daily ? 'O gün yoklama alınmamış ya da form doldurulmamış.' : 'O gün kimseye işaret verilmemiş.'}
          actionLabel={onEditDay ? 'Bu günü işaretle' : undefined}
          actionIcon="edit"
          onAction={onEditDay}
          actionTestID="day-edit-empty"
          testID="day-empty"
        />
      </View>
    );
  }

  const renderItem: ListRenderItem<StudentSummary> = ({ item, index }) => {
    const value = item.items[0];
    const count = changes.byStudent[item.studentId] ?? 0;
    const counts = formatCounts(item.counts, options, 'Kayıt yok');
    const changeText = count > 1 ? `${count} değişiklik` : undefined;
    const label = daily
      ? `${item.fullName}: ${value ? value.label : 'Kayıt yok'}${changeText ? `, ${changeText}` : ''}`
      : `${item.fullName}: ${counts}${item.net !== null ? `, net ${formatNet(item.net)}` : ''}`;
    return (
      <ListRow
        title={item.fullName}
        subtitle={daily ? changeText : counts}
        number={item.number}
        onPress={() => onOpenList({ id: item.studentId, name: item.fullName })}
        accessibilityLabel={label}
        accessibilityHint="Bu öğrencinin o günkü kayıtlarını açar"
        testID={`day-row-${index}`}
        trailing={
          daily ? (
            value ? (
              <View style={styles.value}>
                <View style={[styles.dot, { backgroundColor: value.tone ? tones[value.tone].solid : colors.border }]} />
                <Text variant="bodyStrong" testID={`day-row-${index}-value`}>
                  {value.label}
                </Text>
              </View>
            ) : (
              <Text variant="bodySmall" tone="muted" testID={`day-row-${index}-value`}>
                Kayıt yok
              </Text>
            )
          ) : item.net !== null ? (
            <Text variant="heading" testID={`day-row-${index}-net`}>
              {formatNet(item.net)}
            </Text>
          ) : undefined
        }
      />
    );
  };

  const header = (
    <View style={styles.header}>
      {error ? <Banner kind="error" message={error} /> : null}
      <View style={styles.totals} testID="day-totals">
        <View style={styles.totalsText}>
          <Text variant="label" tone="muted">
            Sınıf toplamı
          </Text>
          <Text variant="body" testID="day-totals-counts">
            {formatCounts(summary.totals, options, 'İşaret yok')}
          </Text>
          {daily ? (
            <Text variant="caption" tone="muted" testID="day-changes">
              {changes.total === 0
                ? 'Bu gün değişiklik yok'
                : `${changes.capped ? 'En az ' : ''}${changes.total} değişiklik`}
            </Text>
          ) : null}
        </View>
        {summary.net !== null ? (
          <View accessible accessibilityLabel={`Günün neti ${formatNet(summary.net)}`}>
            <Text variant="title" align="right" testID="day-totals-net">
              {formatNet(summary.net)}
            </Text>
            <Text variant="caption" tone="muted" align="right">
              net
            </Text>
          </View>
        ) : null}
      </View>
      <View style={styles.actions}>
        <Button
          label="Bu günün listesi"
          icon="list"
          variant="secondary"
          size="sm"
          fullWidth={false}
          onPress={() => onOpenList()}
          testID="day-open-list"
        />
        {onEditDay ? (
          <Button
            label="Bu günü düzenle"
            icon="edit"
            variant="secondary"
            size="sm"
            fullWidth={false}
            onPress={onEditDay}
            testID="day-edit"
          />
        ) : null}
      </View>
    </View>
  );

  return (
    <FlatList
      data={students}
      keyExtractor={(s) => s.studentId}
      renderItem={renderItem}
      ListHeaderComponent={header}
      contentContainerStyle={styles.listContent}
      testID={`day-list-${day}`}
    />
  );
}

const styles = StyleSheet.create({
  state: { gap: spacing.md, paddingHorizontal: layout.pageX, paddingTop: spacing.sm },
  padded: { paddingHorizontal: layout.pageX },
  header: { gap: spacing.md, paddingHorizontal: layout.pageX, paddingBottom: spacing.sm },
  totals: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  totalsText: { flex: 1, gap: spacing.xxs },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, paddingBottom: spacing.sm },
  value: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  dot: { width: spacing.sm, height: spacing.sm, borderRadius: radii.full },
  listContent: { paddingBottom: spacing.huge },
});
