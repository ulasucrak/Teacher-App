import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Animated, FlatList, Modal, Platform, Pressable, StyleSheet, View, useWindowDimensions, type LayoutChangeEvent } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Banner, Button, Icon, LoadingState, SearchField, Text } from '@/components/ui';
import type { ToastKind } from '@/components/ui/Toast';
import { DayBar } from '@/features/formview/DayBar';
import type { MarkBoard } from '@/features/formview/useMarkBoard';
import { countItems, countText, formatCounts, formatNet, sumCounts } from '@/features/history';
import { formatShortDate, todayIso } from '@/features/sessions/date';
import { getEntry } from '@/features/sessions/draft';
import type { SessionFill } from '@/features/sessions/hooks/useSessionFill';
import { filterStudents } from '@/features/sessions/students';
import { colors, iconSize, layout, motion, radii, spacing, tones, typography, useReducedMotion } from '@/theme';
import type { FormOption, FormRow } from '@/types/database';

import { ClassroomTile, type ClassroomStudent, type TilePulse } from './ClassroomTile';
import { COMPACT_WIDTH, GRID_GAP, columnsFor, tileMinWidth, tileWidth } from './layout';
import { releasePresentationFullscreen, subscribeMotionPreference, subscribePresentationExit } from './presentation';
import { ToneMark } from './ToneMark';
import { useClassroomNotifications } from './useClassroomNotifications';

type Props = {
  form: FormRow;
  day: string;
  onDay: (day: string) => void;
  onExit: () => void;
} & ({ board: MarkBoard; fill?: never } | { fill: SessionFill; board?: never });

interface Celebration {
  studentId: string;
  name: string;
  key: number;
  day: string;
}

/** Olumlu işarette alt şeritte dönen sıcak ama ünlemsiz sözler (çocuğa "sen" diye seslenir). */
export const CELEBRATION_PHRASES = ['bir adım daha', 'emeğine sağlık', 'böyle devam'] as const;
const IDLE_MESSAGE = 'Her adım ilerlemedir';
const useNativeDriver = Platform.OS !== 'web';

export function celebrationText(name: string, key: number): string {
  return `${name}, ${CELEBRATION_PHRASES[(key - 1) % CELEBRATION_PHRASES.length]}`;
}

/**
 * Sınıf modu: formun kendi hook örneğini (seçili gün, kaydedilmemiş taslak) paylaşan tam ekran
 * ızgara. Üstte tek satır başlık (form, gün, sınıfın günlük özeti, arama, çıkış), ortada
 * öğrenci kartları, altta tek durum şeridi (hata › kutlama › bildirim) ve eylemler.
 */
export function ClassroomView({ form, day, onDay, onExit, board, fill }: Props) {
  const window = useWindowDimensions();
  const [gridWidth, setGridWidth] = useState<number | null>(null);
  const [query, setQuery] = useState('');
  const [celebration, setCelebration] = useState<Celebration | null>(null);
  const [pulses, setPulses] = useState<Readonly<Record<string, TilePulse>>>({});
  const [lastDaily, setLastDaily] = useState<{ id: string; previous: string | null; day: string } | null>(null);
  const [webReduced, setWebReduced] = useState(true);
  const nativeReduced = useReducedMotion();
  const reduced = nativeReduced || webReduced;
  const { notification, show, dismiss } = useClassroomNotifications();
  const celebratingRef = useRef<string | null>(null);
  const lastMark = board?.lastMark;
  const repeatable = !!board;

  useEffect(() => {
    // Olumlu işaret zaten kutlama şeridinde; aynı öğrencinin "eklendi" iletisi onu bölmesin.
    if (lastMark && celebratingRef.current !== lastMark.studentId) show(lastMark.message);
  }, [lastMark, show]);

  useEffect(() => {
    const unsubscribe = subscribePresentationExit(onExit);
    return () => { unsubscribe(); releasePresentationFullscreen(); };
  }, [onExit]);
  useEffect(() => subscribeMotionPreference(setWebReduced), []);
  useEffect(() => {
    if (!celebration) return;
    const timer = setTimeout(() => {
      celebratingRef.current = null;
      setCelebration(null);
    }, motion.toastVisibleMs);
    return () => clearTimeout(timer);
  }, [celebration]);

  const students = useMemo<ClassroomStudent[]>(() => board
    ? (board.rows ?? []).map((row) => ({ id: row.studentId, full_name: row.fullName, number: row.number, counts: row.counts, dayCounts: row.dayCounts }))
    : (fill?.students ?? []).map((student) => {
      const selected = getEntry(fill!.draft, student.id).optionKey;
      const counts = selected ? { [selected]: 1 } : {};
      return { id: student.id, full_name: student.full_name, number: student.number, selected, counts, dayCounts: counts };
    }), [board, fill]);
  const visible = useMemo(() => filterStudents(students, query), [students, query]);
  const totals = sumCounts(students.map((student) => student.dayCounts));
  const totalItems = countItems(totals, form.options);
  const loading = board ? board.rows === null : !fill?.data || fill.data.date !== day;
  const error = board?.loadError ?? fill?.loadError;
  const disabled = loading || !!fill?.saving;
  const today = board?.today ?? todayIso();
  const dayLabel = day === today ? 'Bugün' : formatShortDate(day);

  const compact = window.width < COMPACT_WIDTH;
  const width = gridWidth ?? window.width;
  const columns = columnsFor(width, tileMinWidth(form.options, repeatable));
  const cardWidth = tileWidth(width, columns);

  const clearCelebration = useCallback(() => {
    celebratingRef.current = null;
    setCelebration(null);
  }, []);

  const mark = (student: ClassroomStudent, option: FormOption) => {
    const selecting = board ? true : student.selected !== option.key;
    if (board) board.mark(student.id, option.key);
    else if (fill) {
      setLastDaily({ id: student.id, previous: student.selected ?? null, day });
      fill.onToggle(student.id, option.key);
    }
    if (!selecting) return;
    const positive = option.tone === 'positive';
    const delta = positive ? (typeof option.score === 'number' ? formatNet(option.score) : '+1') : null;
    setPulses((previous) => ({ ...previous, [student.id]: { tone: option.tone, delta, animate: !reduced, at: Date.now() } }));
    if (positive) {
      celebratingRef.current = student.id;
      setCelebration((previous) => ({ studentId: student.id, name: student.full_name, key: (previous?.key ?? 0) + 1, day }));
      if (notification && notification.kind !== 'error') dismiss();
    } else {
      clearCelebration();
    }
  };
  // Kartlar `memo`; dokunuş işlevi her çizimde değişmesin, en güncel durumu okusun.
  const markRef = useRef(mark);
  useLayoutEffect(() => { markRef.current = mark; });
  const onMark = useCallback((student: ClassroomStudent, option: FormOption) => markRef.current(student, option), []);
  const onUndoStudent = useCallback((studentId: string) => {
    clearCelebration();
    if (board) void board.undoStudent(studentId);
  }, [board, clearCelebration]);

  const undo = () => {
    clearCelebration();
    if (board) void board.undoLast();
    else if (fill && lastDaily && lastDaily.day === day) {
      if (lastDaily.previous === null) fill.dispatch({ type: 'clear', studentId: lastDaily.id });
      else if (getEntry(fill.draft, lastDaily.id).optionKey !== lastDaily.previous) fill.onToggle(lastDaily.id, lastDaily.previous);
      setLastDaily(null);
      show('Seçim geri alındı');
    }
  };
  const save = () => {
    clearCelebration();
    if (fill) void fill.onSave();
  };
  const changeDay = (next: string) => {
    clearCelebration();
    setPulses({});
    onDay(next);
  };
  const onGridLayout = (event: LayoutChangeEvent) => {
    const next = Math.round(event.nativeEvent.layout.width);
    setGridWidth((previous) => (previous === next ? previous : next));
  };

  const exitButton = (
    <Button
      label={compact ? 'Çık' : 'Sınıf modundan çık'}
      accessibilityLabel="Sınıf modundan çık"
      icon="close"
      variant="secondary"
      fullWidth={false}
      onPress={onExit}
      accessibilityHint="Normal form görünümüne döner"
      testID="classroom-exit"
    />
  );
  const activeCelebration = celebration?.day === day ? celebration : null;
  const status: StatusContent = notification?.kind === 'error'
    ? { kind: 'error', message: notification.message }
    : activeCelebration
      ? { kind: 'celebration', message: celebrationText(activeCelebration.name, activeCelebration.key) }
      : notification
        ? { kind: notification.kind, message: notification.message }
        : { kind: 'idle', message: IDLE_MESSAGE };
  const statusKey = status.kind === 'celebration' ? `c${activeCelebration?.key}` : `${status.kind}:${status.message}`;

  return (
    <Modal visible animationType="none" presentationStyle="fullScreen" onRequestClose={onExit}>
      <SafeAreaView style={styles.page} testID="classroom-screen">
        <View style={styles.header}>
          <View style={[styles.headerMain, compact && styles.headerMainCompact]}>
            <View style={styles.titleRow}>
              <View style={styles.titleBlock}>
                <Text variant="title" numberOfLines={1}>{form.title}</Text>
                <Text variant="label" tone="muted">Sınıf modu</Text>
              </View>
              {compact ? exitButton : null}
            </View>
            <DayBar value={day} onChange={changeDay} testIDPrefix="classroom-day" />
            <View
              style={styles.summary}
              testID="classroom-summary"
              accessible
              accessibilityLabel={`${students.length} öğrenci. ${dayLabel}: ${formatCounts(totals, form.options, 'işaret yok')}`}
            >
              <Text variant="bodyStrong">{`${students.length} öğrenci`}</Text>
              {totalItems.length ? totalItems.map((item) => (
                <View key={item.key} style={styles.summaryItem}>
                  {item.tone ? <ToneMark tone={item.tone} color={tones[item.tone].solid} size={iconSize.sm} /> : null}
                  <Text variant="bodyStrong" color={item.tone ? tones[item.tone].onSoft : colors.textMuted}>{countText(item)}</Text>
                </View>
              )) : <Text variant="bodyStrong" tone="muted">{`${dayLabel} işaret yok`}</Text>}
            </View>
          </View>
          <View style={[styles.headerTools, compact && styles.headerToolsCompact]}>
            <SearchField style={compact ? styles.searchCompact : styles.search} value={query} onChangeText={setQuery} placeholder="Ad ya da numara" accessibilityLabel="Öğrenci ara" testID="classroom-search" />
            {compact ? null : exitButton}
          </View>
        </View>
        {error || !form.options.length ? (
          <View style={styles.banners}>
            {error ? <Banner kind="error" message={error} /> : null}
            {error ? <Button label="Tekrar dene" variant="secondary" fullWidth={false} onPress={() => { if (board) board.reload(); else fill?.retry(); }} /> : null}
            {!form.options.length ? <Banner kind="warning" message="Bu formda seçenek yok. Formu düzenleyip seçenek ekleyin." /> : null}
          </View>
        ) : null}
        <View style={styles.grid} onLayout={onGridLayout}>
          {loading ? <LoadingState label="Öğrenciler yükleniyor" /> : (
            <FlatList
              key={columns}
              numColumns={columns}
              data={visible}
              keyExtractor={(student) => student.id}
              keyboardShouldPersistTaps="handled"
              initialNumToRender={visible.length}
              contentContainerStyle={styles.gridContent}
              columnWrapperStyle={columns > 1 ? styles.gridRow : undefined}
              ListEmptyComponent={
                <Text tone="muted" style={styles.empty}>
                  {students.length ? `“${query.trim()}” ile eşleşen öğrenci yok.` : 'Bu sınıfta öğrenci yok.'}
                </Text>
              }
              renderItem={({ item }) => (
                <ClassroomTile
                  student={item}
                  options={form.options}
                  repeatable={repeatable}
                  width={cardWidth}
                  dayLabel={dayLabel}
                  disabled={disabled}
                  undoing={!!board?.undoingIds.has(item.id)}
                  pulse={pulses[item.id] ?? null}
                  onMark={onMark}
                  onUndo={onUndoStudent}
                />
              )}
            />
          )}
        </View>
        <View style={styles.footer}>
          <StatusStrip key={statusKey} status={status} onDismiss={() => { dismiss(); clearCelebration(); }} />
          <View style={[styles.actions, compact && styles.actionsCompact]}>
            {fill?.dirtyCount ? (
              <Text variant="label" tone="muted" style={compact ? styles.hintCompact : undefined} testID="classroom-dirty">
                {`${fill.dirtyCount} öğrencide kaydedilmemiş değişiklik`}
              </Text>
            ) : null}
            <Button
              label="Geri al"
              icon="undo"
              variant="secondary"
              fullWidth={false}
              disabled={disabled || !(board?.lastMark || (lastDaily?.day === day && lastDaily))}
              accessibilityHint={board ? 'Son verilen işareti siler' : 'Son seçimi geri alır'}
              onPress={undo}
              testID="classroom-undo"
            />
            {fill ? <Button label="Kaydet" fullWidth={false} loading={fill.saving} disabled={loading || fill.dirtyCount === 0} onPress={save} testID="classroom-save" /> : null}
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

type StatusContent = { kind: ToastKind | 'celebration' | 'idle'; message: string };

/**
 * Alt şerit: tek canlı bölge, sabit yükseklik (ızgara kaymaz). Hata kapatılana kadar kalır;
 * kutlama ve bildirimler toast süresince görünür. İçerik değişince kısa bir opaklık geçişi.
 */
function StatusStrip({ status, onDismiss }: { status: StatusContent; onDismiss: () => void }) {
  const [opacity] = useState(() => new Animated.Value(status.kind === 'idle' ? 1 : 0));
  useEffect(() => {
    const animation = Animated.timing(opacity, { toValue: 1, duration: motion.duration.base, easing: motion.easing.standard, useNativeDriver });
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  if (status.kind === 'idle') {
    return (
      <View style={styles.status} accessibilityLiveRegion="polite">
        <Text variant="bodyStrong" tone="muted" testID="classroom-idle">{status.message}</Text>
      </View>
    );
  }
  if (status.kind === 'celebration') {
    return (
      <Animated.View style={[styles.status, styles.statusFilled, styles.celebration, { opacity }]} accessibilityLiveRegion="polite">
        <View style={styles.celebrationMark}>
          <ToneMark tone="positive" color={tones.positive.solid} size={iconSize.lg} />
        </View>
        <Text variant="title" color={tones.positive.onSolid} numberOfLines={2} style={styles.statusText} testID="classroom-celebration">
          {status.message}
        </Text>
      </Animated.View>
    );
  }
  const error = status.kind === 'error';
  return (
    <Animated.View
      style={[styles.status, styles.statusFilled, error ? styles.error : styles.notice, { opacity }]}
      testID="classroom-notification"
      accessibilityLiveRegion={error ? 'assertive' : 'polite'}
      accessibilityRole={error ? 'alert' : undefined}
    >
      <Icon name={error ? 'error' : status.kind === 'success' ? 'success' : 'info'} size={iconSize.xxl} color={colors.textInverse} />
      <Text variant="bodyStrong" tone="inverse" style={[styles.statusText, styles.noticeText]} testID="classroom-notification-message">
        {status.message}
      </Text>
      <Pressable
        onPress={onDismiss}
        accessibilityRole="button"
        accessibilityLabel="Bildirimi kapat"
        testID="classroom-notification-dismiss"
        style={({ pressed }) => [styles.dismiss, pressed && styles.dismissPressed]}
      >
        <Text variant="bodyStrong" tone="inverse">Kapat</Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    columnGap: spacing.xxl,
    rowGap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderBottomWidth: layout.hairline,
    borderBottomColor: colors.rule,
  },
  headerMain: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: spacing.xl, rowGap: spacing.xs, flexShrink: 1 },
  headerMainCompact: { flexBasis: '100%' },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md, flexGrow: 1 },
  titleBlock: { flexShrink: 1 },
  summary: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: spacing.lg, rowGap: spacing.xs, flexShrink: 1, maxWidth: '100%' },
  summaryItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  headerTools: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, flexGrow: 1, justifyContent: 'flex-end' },
  headerToolsCompact: { flexBasis: '100%' },
  search: { flexGrow: 1, flexShrink: 1, maxWidth: layout.readableWidth * 0.75, minWidth: layout.readableWidth / 3 },
  searchCompact: { flex: 1 },
  banners: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, gap: spacing.sm, alignItems: 'flex-start' },
  grid: { flex: 1 },
  gridContent: { padding: GRID_GAP, gap: GRID_GAP, flexGrow: 1 },
  gridRow: { gap: GRID_GAP },
  empty: { padding: spacing.lg },
  footer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: layout.hairline,
    borderTopColor: colors.rule,
  },
  status: {
    flexGrow: 1,
    flexBasis: layout.readableWidth,
    minHeight: layout.buttonHeight,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: radii.md,
  },
  statusFilled: { paddingHorizontal: spacing.lg, paddingVertical: spacing.xs },
  statusText: { flex: 1 },
  noticeText: { fontSize: typography.heading.fontSize, lineHeight: typography.heading.lineHeight },
  celebration: { backgroundColor: tones.positive.solid },
  celebrationMark: {
    width: spacing.xxxl + spacing.xs,
    height: spacing.xxxl + spacing.xs,
    borderRadius: radii.full,
    backgroundColor: tones.positive.onSolid,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notice: { backgroundColor: colors.text },
  error: { backgroundColor: colors.danger },
  dismiss: { minHeight: layout.minTouch, minWidth: layout.minTouch, paddingHorizontal: spacing.md, justifyContent: 'center', alignItems: 'center', borderRadius: radii.sm },
  dismissPressed: { opacity: 0.7 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'flex-end', gap: spacing.md, marginLeft: 'auto', flexShrink: 1 },
  actionsCompact: { flexBasis: '100%' },
  hintCompact: { flexBasis: '100%', textAlign: 'right' },
});
