import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { SegmentedTabs, type SegmentedTab } from '@/components/ui';
import { ALL_TIME, type DateRange } from '@/features/history';
import { layout, spacing } from '@/theme';
import type { FormRow } from '@/types/database';

import { HistorySummary } from './HistorySummary';
import { HistoryTimeline } from './HistoryTimeline';
import { RangeBar } from './RangeBar';
import { useHistoryData, type HistoryView } from './useHistoryData';

const VIEWS: readonly SegmentedTab<HistoryView>[] = [
  { key: 'summary', label: 'Özet' },
  { key: 'timeline', label: 'Zaman çizelgesi' },
];

interface HistoryPaneProps {
  form: FormRow;
  /** Sekme görünürken true; durum (dönem, süzgeç) sekmeler arası geçişte korunur. */
  active: boolean;
}

/**
 * "Geçmiş" sekmesi: üstte dönem süzgeci (varsayılan tüm zamanlar), altında "Özet" (öğrenci
 * başına sayılar ve net) ya da "Zaman çizelgesi" (yapılan her şey). Özetteki bir öğrenciye
 * dokununca zaman çizelgesi o öğrenciye süzülür.
 */
export function HistoryPane({ form, active }: HistoryPaneProps) {
  const [range, setRange] = useState<DateRange>(ALL_TIME);
  const [view, setView] = useState<HistoryView>('summary');
  const [student, setStudent] = useState<{ id: string; name: string } | null>(null);
  const data = useHistoryData(form, { active, view, range, studentId: student?.id ?? null });

  if (!active) return null;

  return (
    <View style={styles.pane} testID="history-pane">
      <RangeBar range={range} onChange={setRange} />
      <View style={styles.views}>
        <SegmentedTabs
          tabs={VIEWS}
          value={view}
          onChange={setView}
          accessibilityLabel="Geçmiş görünümü"
          testIDPrefix="history-view"
        />
      </View>
      {view === 'summary' ? (
        <HistorySummary
          mode={form.mode}
          options={form.options}
          range={range}
          summary={data.summary}
          error={data.summaryError}
          onRetry={data.retry}
          onResetRange={() => setRange(ALL_TIME)}
          onOpenStudent={(s) => {
            setStudent({ id: s.studentId, name: s.fullName });
            setView('timeline');
          }}
        />
      ) : (
        <HistoryTimeline
          options={form.options}
          range={range}
          timeline={data.timeline}
          error={data.timelineError}
          loadingMore={data.loadingMore}
          loadMoreError={data.loadMoreError}
          studentName={student?.name ?? null}
          onClearStudent={() => setStudent(null)}
          onLoadMore={data.loadMore}
          onRetry={data.retry}
          onResetRange={() => setRange(ALL_TIME)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  pane: { flex: 1 },
  views: { paddingHorizontal: layout.pageX, paddingTop: spacing.sm, paddingBottom: spacing.md },
});
