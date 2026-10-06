import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { FlatList, StyleSheet, View, type ListRenderItem } from 'react-native';

import { Banner, BottomActionBar, Button, EmptyState, ListRow, LoadingState, OverflowMenu, Text } from '@/components/ui';
import { countStudents, listSessions, toUserMessage, type SessionSummary } from '@/features/sessions/api';
import { DaySheet } from '@/features/sessions/components/DaySheet';
import { formatDayLabel, todayIso } from '@/features/sessions/date';
import { sessionsRoutes } from '@/features/sessions/routes';
import { layout, spacing } from '@/theme';
import type { FormRow } from '@/types/database';

import { FormShell, type FormTab } from './FormShell';
import { HistoryPane } from './HistoryPane';

interface Loaded {
  sessions: SessionSummary[];
  studentCount: number;
}

export interface FormViewProps {
  classId: string;
  form: FormRow;
  initialTab: FormTab;
}

/**
 * Günlük form (günde bir kez): "İşaretle" günlük kayıtların listesi (bugünün kaydını aç/başlat,
 * başka gün seç); kaydı doldurma ekranı ayrı sayfadır. "Geçmiş" tüm değişiklikleri gösterir.
 */
export function DailyFormView({ classId, form, initialTab }: FormViewProps) {
  const router = useRouter();
  const formId = form.id;

  const [tab, setTab] = useState<FormTab>(initialTab);
  const [data, setData] = useState<Loaded | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [dayOpen, setDayOpen] = useState(false);
  const pendingDay = useRef<string | null>(null);
  const requestRef = useRef(0);

  const load = useCallback(() => {
    const request = ++requestRef.current;
    setLoadError(null);
    Promise.all([listSessions(formId), countStudents(classId)])
      .then(([sessions, studentCount]) => {
        if (request === requestRef.current) setData({ sessions, studentCount });
      })
      .catch((error: unknown) => {
        if (request === requestRef.current) setLoadError(toUserMessage(error, 'Kayıtlar yüklenemedi. Tekrar deneyin.'));
      });
  }, [classId, formId]);

  // Doldurma ekranından dönünce ilerleme güncel görünsün.
  useFocusEffect(load);

  const today = todayIso();
  const studentCount = data?.studentCount ?? 0;
  const hasToday = data?.sessions.some((s) => s.session.session_date === today) ?? false;

  const renderItem: ListRenderItem<SessionSummary> = ({ item, index }) => {
    const { session, filled } = item;
    const dateLabel = formatDayLabel(session.session_date, today);
    return (
      <ListRow
        title={dateLabel}
        subtitle={session.title ?? undefined}
        onPress={() => router.push(sessionsRoutes.session(classId, formId, session.id))}
        accessibilityLabel={`${dateLabel}, ${studentCount} öğrenciden ${filled} işaretli`}
        accessibilityHint="Kaydı açar"
        testID={`session-row-${index}`}
        trailing={
          <Text variant="number" tone={filled < studentCount ? 'muted' : 'default'}>
            {`${filled}/${studentCount}`}
          </Text>
        }
      />
    );
  };

  let marking;
  if (loadError && !data) {
    marking = (
      <View style={styles.stateWrap}>
        <Banner kind="error" message={loadError} />
        <Button label="Tekrar dene" variant="secondary" onPress={load} testID="sessions-retry" />
      </View>
    );
  } else if (!data) {
    marking = <LoadingState label="Kayıtlar yükleniyor" />;
  } else {
    marking = (
      <FlatList
        data={data.sessions}
        keyExtractor={(s) => s.session.id}
        renderItem={renderItem}
        ListHeaderComponent={
          loadError ? (
            <View style={styles.banner}>
              <Banner kind="error" message={loadError} />
            </View>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.padded}>
            <EmptyState
              icon="calendar"
              title="Henüz kayıt yok"
              description="İlk kaydı aşağıdan başlatın."
              testID="sessions-empty"
            />
          </View>
        }
        contentContainerStyle={styles.listContent}
        testID="sessions-list"
      />
    );
  }

  const footer =
    tab === 'mark' && data ? (
      <BottomActionBar
        secondary={{ label: 'Başka gün', onPress: () => setDayOpen(true), testID: 'sessions-other-day' }}
        primary={{
          label: hasToday ? 'Bugünün kaydını aç' : 'Bugünün kaydını başlat',
          onPress: () => router.push(sessionsRoutes.day(classId, formId, today)),
          testID: 'sessions-today',
        }}
      />
    ) : undefined;

  return (
    <FormShell
      title={form.title}
      tab={tab}
      onTab={setTab}
      onMore={() => setMenuOpen(true)}
      footer={footer}
      testID="form-screen"
    >
      {tab === 'mark' ? marking : null}
      <HistoryPane form={form} active={tab === 'history'} />
      <OverflowMenu
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        title={form.title}
        testID="form-menu"
        actions={[
          {
            key: 'edit',
            label: 'Formu düzenle',
            icon: 'edit',
            onPress: () => router.push(`/class/${classId}/form/${formId}/edit`),
          },
        ]}
      />
      <DaySheet
        visible={dayOpen}
        onClose={() => setDayOpen(false)}
        onPick={(date) => {
          pendingDay.current = date;
          setDayOpen(false);
        }}
        onDismissed={() => {
          const date = pendingDay.current;
          pendingDay.current = null;
          if (date) router.push(sessionsRoutes.day(classId, formId, date));
        }}
      />
    </FormShell>
  );
}

const styles = StyleSheet.create({
  stateWrap: { gap: spacing.md, paddingTop: spacing.sm, paddingHorizontal: layout.pageX },
  banner: { paddingHorizontal: layout.pageX, paddingVertical: spacing.sm },
  padded: { paddingHorizontal: layout.pageX },
  listContent: { flexGrow: 1, paddingBottom: spacing.xxl },
});
