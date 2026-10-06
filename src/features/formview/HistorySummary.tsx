import { useMemo, useState } from 'react';
import { FlatList, StyleSheet, View, type ListRenderItem } from 'react-native';

import { Banner, Button, Chip, EmptyState, ListRow, LoadingState, SectionHeader, Text } from '@/components/ui';
import {
  formatCounts,
  formatNet,
  isAllTime,
  type DateRange,
  type FormSummary,
  type StudentSummary,
} from '@/features/history';
import { colors, layout, spacing } from '@/theme';
import type { FormMode, FormOption } from '@/types/database';

import { sortSummaryStudents, type SummarySort } from './board';
import { ToneCounts } from './ToneCounts';

interface HistorySummaryProps {
  mode: FormMode;
  options: readonly FormOption[];
  range: DateRange;
  summary: FormSummary | null;
  error: string | null;
  onRetry: () => void;
  onResetRange: () => void;
  /** Öğrenciye dokununca: o öğrencinin zaman çizelgesi. */
  onOpenStudent: (student: StudentSummary) => void;
}

/**
 * Dönem özeti: sınıf toplamı ve öğrenci başına sayılar (puanlı formda net). Günlük formda
 * sayılar, ör. "18 Geldi, 2 Gelmedi"; net yalnızca puanlı seçenek varsa görünür.
 */
export function HistorySummary({
  mode,
  options,
  range,
  summary,
  error,
  onRetry,
  onResetRange,
  onOpenStudent,
}: HistorySummaryProps) {
  const [sort, setSort] = useState<SummarySort>('name');
  const students = useMemo(() => (summary ? sortSummaryStudents(summary.students, sort) : []), [summary, sort]);

  if (!summary) {
    if (error) {
      return (
        <View style={styles.state}>
          <Banner kind="error" message={error} />
          <Button label="Tekrar dene" variant="secondary" onPress={onRetry} testID="summary-retry" />
        </View>
      );
    }
    return <LoadingState label="Özet yükleniyor" />;
  }

  const sortable = mode === 'repeatable' || summary.scored;
  const allTime = isAllTime(range);

  const renderItem: ListRenderItem<StudentSummary> = ({ item, index }) => {
    const counts = formatCounts(item.counts, options, 'Kayıt yok');
    const net = item.net;
    return (
      <ListRow
        title={item.fullName}
        subtitleContent={<ToneCounts items={item.items} empty="Kayıt yok" testID={`summary-row-${index}-counts`} />}
        number={item.number}
        onPress={() => onOpenStudent(item)}
        accessibilityLabel={`${item.fullName}: ${counts}${net !== null ? `, net ${formatNet(net)}` : ''}`}
        accessibilityHint="Bu öğrencinin geçmişini açar"
        testID={`summary-row-${index}`}
        trailing={
          net !== null ? (
            <Text variant="heading" testID={`summary-row-${index}-net`}>
              {formatNet(net)}
            </Text>
          ) : undefined
        }
      />
    );
  };

  const header = (
    <View style={styles.header}>
      {error ? <Banner kind="error" message={error} /> : null}
      <View style={styles.totals} testID="summary-totals">
        <View style={styles.totalsText}>
          <Text variant="label" tone="muted">
            Sınıf toplamı
          </Text>
          <ToneCounts items={summary.items} empty="İşaret yok" variant="body" testID="summary-totals-counts" />
        </View>
        {summary.net !== null ? (
          <View accessible accessibilityLabel={`Sınıf neti ${formatNet(summary.net)}`}>
            <Text variant="title" align="right" testID="summary-totals-net">
              {formatNet(summary.net)}
            </Text>
            <Text variant="caption" tone="muted" align="right">
              net
            </Text>
          </View>
        ) : null}
      </View>
      <SectionHeader title="Öğrenciler" count={students.length} />
      {sortable ? (
        <View style={styles.sort} accessibilityRole="radiogroup" accessibilityLabel="Sıralama">
          <Chip label="Ada göre" selected={sort === 'name'} onPress={() => setSort('name')} testID="summary-sort-name" />
          <Chip
            label={summary.scored ? 'Nete göre' : 'İşarete göre'}
            selected={sort === 'score'}
            onPress={() => setSort('score')}
            testID="summary-sort-score"
          />
        </View>
      ) : null}
    </View>
  );

  if (summary.total === 0) {
    return (
      <View style={styles.padded}>
        <EmptyState
          icon="list"
          title={allTime ? 'Henüz işaret yok' : 'Bu dönemde işaret yok'}
          description={
            allTime
              ? mode === 'repeatable'
                ? 'İşaret verdikçe burada özetlenir.'
                : 'Kayıt doldurdukça burada özetlenir.'
              : 'Başka bir dönem seçin ya da tüm zamanlara bakın.'
          }
          actionLabel={allTime ? undefined : 'Tüm zamanlar'}
          actionIcon="calendar"
          onAction={allTime ? undefined : onResetRange}
          actionTestID="summary-reset-range"
          testID="summary-empty"
        />
      </View>
    );
  }

  return (
    <FlatList
      data={students}
      keyExtractor={(s) => s.studentId}
      renderItem={renderItem}
      ListHeaderComponent={header}
      ListEmptyComponent={
        <View style={styles.padded}>
          <Text variant="body" tone="muted">
            Bu sınıfta öğrenci yok.
          </Text>
        </View>
      }
      contentContainerStyle={styles.listContent}
      testID="summary-list"
    />
  );
}


const styles = StyleSheet.create({
  state: { gap: spacing.md, paddingHorizontal: layout.pageX, paddingTop: spacing.sm },
  padded: { paddingHorizontal: layout.pageX },
  header: { gap: spacing.sm, paddingHorizontal: layout.pageX, paddingBottom: spacing.sm },
  totals: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: layout.hairline,
    borderBottomColor: colors.rule,
  },
  totalsText: { flex: 1, gap: spacing.xxs },
  sort: { flexDirection: 'row', gap: spacing.sm },
  listContent: { paddingBottom: spacing.huge },
});
