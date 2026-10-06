import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Chip } from '@/components/ui';
import { ALL_TIME, type DateRange } from '@/features/history';
import { todayIso } from '@/features/sessions/date';
import { layout, spacing } from '@/theme';
import type { FormRow } from '@/types/database';

import { DayBar } from './DayBar';
import { HistoryDay } from './HistoryDay';
import { HistorySummary } from './HistorySummary';
import { HistoryTimeline } from './HistoryTimeline';
import { RangeBar } from './RangeBar';
import { useDayReview } from './useDayReview';
import { useHistoryData, type HistoryView } from './useHistoryData';

const VIEWS: readonly { key: HistoryView; label: string; accessibilityLabel: string }[] = [
  { key: 'summary', label: 'Özet', accessibilityLabel: 'Özet: öğrenci başına toplamlar' },
  { key: 'day', label: 'Gün', accessibilityLabel: 'Günlük inceleme: seçilen günün kayıtları' },
  { key: 'list', label: 'Liste', accessibilityLabel: 'Liste: yapılan her işlem, zaman sırasıyla' },
];

interface HistoryPaneProps {
  form: FormRow;
  /** Sekme görünürken true; durum (dönem, gün, süzgeç) sekmeler arası geçişte korunur. */
  active: boolean;
  /** Günlük formda "Bu günü düzenle": günü İşaretle sekmesinde açar. */
  onEditDay?: (day: string) => void;
}

/**
 * "Geçmiş" sekmesi. Üstte üç görünüm: "Özet" (öğrenci başına toplamlar ve net), "Gün" (seçilen
 * günün her öğrenci için değeri; önceki/sonraki gün ve takvim) ve "Liste" (yapılan her işlem).
 * Dönem süzgeci yalnızca Özet ve Liste'de görünür; "Gün" tek güne bakar.
 */
export function HistoryPane({ form, active, onEditDay }: HistoryPaneProps) {
  const [range, setRange] = useState<DateRange>(ALL_TIME);
  const [view, setView] = useState<HistoryView>('summary');
  const [day, setDay] = useState(() => todayIso());
  const [student, setStudent] = useState<{ id: string; name: string } | null>(null);
  const data = useHistoryData(form, { active, view, range, studentId: student?.id ?? null });
  const dayReview = useDayReview(form, day, active && view === 'day');

  if (!active) return null;

  const openList = (nextRange: DateRange, who: { id: string; name: string } | null) => {
    setRange(nextRange);
    setStudent(who);
    setView('list');
  };

  return (
    <View style={styles.pane} testID="history-pane">
      <View style={styles.views}>
        {VIEWS.map(({ key, label, accessibilityLabel }) => (
          <Chip
            key={key}
            label={label}
            selected={view === key}
            onPress={() => setView(key)}
            accessibilityLabel={accessibilityLabel}
            testID={`history-view-${key}`}
          />
        ))}
      </View>
      {view === 'day' ? (
        <DayBar value={day} onChange={setDay} testIDPrefix="review-day" />
      ) : (
        <RangeBar range={range} onChange={setRange} />
      )}
      {view === 'summary' ? (
        <HistorySummary
          mode={form.mode}
          options={form.options}
          range={range}
          summary={data.summary}
          error={data.summaryError}
          onRetry={data.retry}
          onResetRange={() => setRange(ALL_TIME)}
          onOpenStudent={(s) => openList(range, { id: s.studentId, name: s.fullName })}
        />
      ) : view === 'day' ? (
        <HistoryDay
          mode={form.mode}
          options={form.options}
          day={day}
          review={dayReview.review}
          error={dayReview.error}
          onRetry={dayReview.retry}
          onOpenList={(who) => openList({ from: day, to: day }, who ?? null)}
          onEditDay={() => onEditDay?.(day)}
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
  views: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: layout.pageX, paddingBottom: spacing.sm },
});
