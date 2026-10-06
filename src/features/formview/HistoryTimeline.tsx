import { memo, useMemo } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, View, type ListRenderItem } from 'react-native';

import { Badge, Banner, Button, Chip, EmptyState, LoadingState, Text } from '@/components/ui';
import {
  describeEvent,
  formatEventClock,
  groupEventsByDay,
  isAllTime,
  type DateRange,
  type HistoryEvent,
} from '@/features/history';
import { formatDayLabel } from '@/features/sessions/date';
import { colors, layout, radii, spacing, tones } from '@/theme';
import type { FormOption } from '@/types/database';

import type { Timeline } from './useHistoryData';

type Item =
  | { type: 'day'; key: string; day: string }
  | { type: 'event'; key: string; event: HistoryEvent };

/** Günlere göre gruplanmış olayları gün başlığı + olay satırı listesine düzleştirir. */
export function flattenTimeline(events: readonly HistoryEvent[]): Item[] {
  const items: Item[] = [];
  for (const group of groupEventsByDay(events)) {
    items.push({ type: 'day', key: `d-${group.day}-${group.events[0]?.id ?? ''}`, day: group.day });
    for (const event of group.events) items.push({ type: 'event', key: `e-${event.id}`, event });
  }
  return items;
}

interface HistoryTimelineProps {
  options: readonly FormOption[];
  range: DateRange;
  timeline: Timeline | null;
  error: string | null;
  loadingMore: boolean;
  loadMoreError: string | null;
  /** Süzgeçteki öğrencinin adı (varsa); çipe dokunmak süzgeci kaldırır. */
  studentName: string | null;
  onClearStudent: () => void;
  onLoadMore: () => void;
  onRetry: () => void;
  onResetRange: () => void;
}

/** Zaman çizelgesi: güne göre gruplu, yeniden eskiye; "Daha fazla göster" ile sayfalı. */
export function HistoryTimeline({
  options,
  range,
  timeline,
  error,
  loadingMore,
  loadMoreError,
  studentName,
  onClearStudent,
  onLoadMore,
  onRetry,
  onResetRange,
}: HistoryTimelineProps) {
  const items = useMemo(() => flattenTimeline(timeline?.events ?? []), [timeline]);

  const renderItem: ListRenderItem<Item> = ({ item }) =>
    item.type === 'day' ? (
      <View style={styles.dayHeader} testID={`timeline-day-${item.day}`}>
        <Text variant="label" tone="muted" accessibilityRole="header">
          {formatDayLabel(item.day)}
        </Text>
      </View>
    ) : (
      <EventRow event={item.event} options={options} />
    );

  const filter = studentName ? (
    <View style={styles.filter}>
      <Chip
        label={studentName}
        icon="close"
        selected
        onPress={onClearStudent}
        accessibilityLabel={`${studentName} süzgeci açık. Kaldırmak için dokunun`}
        testID="timeline-clear-student"
      />
    </View>
  ) : null;

  if (!timeline) {
    if (error) {
      return (
        <View style={styles.state}>
          {filter}
          <Banner kind="error" message={error} />
          <Button label="Tekrar dene" variant="secondary" onPress={onRetry} testID="timeline-retry" />
        </View>
      );
    }
    return <LoadingState label="Geçmiş yükleniyor" />;
  }

  const allTime = isAllTime(range);
  const empty = (
    <View style={styles.padded}>
      <EmptyState
        icon="list"
        title={allTime ? 'Henüz kayıt yok' : 'Bu dönemde kayıt yok'}
        description={
          studentName
            ? 'Bu öğrenciye ait kayıt yok. Süzgeci kaldırıp tüm sınıfa bakın.'
            : allTime
              ? 'Yapılan her işlem burada listelenir.'
              : 'Başka bir dönem seçin ya da tüm zamanlara bakın.'
        }
        actionLabel={studentName ? 'Süzgeci kaldır' : allTime ? undefined : 'Tüm zamanlar'}
        actionIcon={studentName ? 'close' : 'calendar'}
        onAction={studentName ? onClearStudent : allTime ? undefined : onResetRange}
        actionTestID="timeline-empty-action"
        testID="timeline-empty"
      />
    </View>
  );

  const footer = timeline.nextCursor ? (
    <View style={styles.more}>
      {loadMoreError ? <Banner kind="error" message={loadMoreError} /> : null}
      {loadingMore ? (
        <ActivityIndicator color={colors.primary} accessibilityLabel="Daha fazlası yükleniyor" />
      ) : (
        <Button
          label={loadMoreError ? 'Tekrar dene' : 'Daha fazla göster'}
          variant="secondary"
          onPress={onLoadMore}
          testID="timeline-more"
        />
      )}
    </View>
  ) : items.length > 0 ? (
    <Text variant="caption" tone="muted" align="center" style={styles.end} testID="timeline-end">
      Hepsi bu kadar
    </Text>
  ) : null;

  return (
    <FlatList
      data={items}
      keyExtractor={(i) => i.key}
      renderItem={renderItem}
      ListHeaderComponent={
        <View>
          {filter}
          {error ? (
            <View style={styles.padded}>
              <Banner kind="error" message={error} />
            </View>
          ) : null}
        </View>
      }
      ListEmptyComponent={empty}
      ListFooterComponent={footer}
      initialNumToRender={14}
      windowSize={7}
      contentContainerStyle={styles.listContent}
      testID="timeline-list"
    />
  );
}

interface EventRowProps {
  event: HistoryEvent;
  options: readonly FormOption[];
}

/**
 * Tek olay: saat, öğrenci adı, ana metin ("Var → Yok", "Artı eklendi") ve varsa not / başka
 * günün kaydı satırı. Geri alınan işaret üstü çizili ve "Geri alındı" rozetiyle ayrışır.
 */
const EventRow = memo(function EventRow({ event, options }: EventRowProps) {
  const text = describeEvent(event, options);
  const optionKey = event.kind === 'mark_removed' ? null : event.newOptionKey;
  const tone = optionKey ? options.find((o) => o.key === optionKey)?.tone : undefined;
  const dim = event.undone || event.kind === 'mark_removed';
  return (
    <View style={styles.event} accessible accessibilityLabel={text.accessibilityLabel} testID={`event-${event.id}`}>
      <Text variant="number" tone="muted" style={styles.time} maxFontSizeMultiplier={1.2}>
        {formatEventClock(event.occurredAt)}
      </Text>
      <View style={styles.eventBody}>
        <View style={styles.eventHead}>
          <Text variant="bodyStrong" numberOfLines={1} style={styles.eventStudent}>
            {text.student}
          </Text>
          {event.undone ? <Badge label="Geri alındı" tone="warning" /> : null}
        </View>
        <View style={styles.change}>
          <View
            style={[styles.dot, { backgroundColor: tone && !dim ? tones[tone].solid : colors.border }]}
            testID={`event-${event.id}-dot`}
          />
          <Text
            variant="body"
            tone={dim ? 'muted' : 'default'}
            style={[styles.changeText, event.undone && styles.struck]}
            testID={`event-${event.id}-change`}
          >
            {text.change}
          </Text>
        </View>
        {text.detail ? (
          <Text variant="caption" tone="muted">
            {text.detail}
          </Text>
        ) : null}
        {text.dayNote ? (
          <Text variant="caption" tone="muted">
            {text.dayNote}
          </Text>
        ) : null}
      </View>
    </View>
  );
});

const DOT = spacing.sm;

const styles = StyleSheet.create({
  state: { gap: spacing.md, paddingTop: spacing.sm, paddingHorizontal: layout.pageX },
  padded: { paddingHorizontal: layout.pageX },
  filter: { flexDirection: 'row', paddingHorizontal: layout.pageX, paddingBottom: spacing.sm },
  dayHeader: {
    paddingHorizontal: layout.pageX,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xs,
    minHeight: layout.minTouch - spacing.sm,
    justifyContent: 'flex-end',
    borderBottomWidth: layout.hairline,
    borderBottomColor: colors.rule,
  },
  event: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingLeft: layout.pageX,
    paddingRight: layout.pageX,
    paddingVertical: spacing.md,
    borderBottomWidth: layout.hairline,
    borderBottomColor: colors.rule,
  },
  time: { width: layout.numberColumn, paddingTop: spacing.xxs },
  eventBody: { flex: 1, gap: spacing.xxs },
  eventHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  eventStudent: { flexShrink: 1 },
  change: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  dot: { width: DOT, height: DOT, borderRadius: radii.full },
  changeText: { flexShrink: 1 },
  struck: { textDecorationLine: 'line-through' },
  more: { gap: spacing.md, padding: layout.pageX },
  end: { padding: spacing.xl },
  listContent: { paddingBottom: spacing.huge },
});
