import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { FlatList, StyleSheet, View, type ListRenderItem } from 'react-native';

import {
  Banner,
  BottomActionBar,
  Button,
  EmptyState,
  IconButton,
  ListRow,
  LoadingState,
  OverflowMenu,
  Screen,
  Text,
} from '@/components/ui';
import { layout, spacing } from '@/theme';
import type { FormRow } from '@/types/database';

import { countStudents, getForm, listSessions, toUserMessage, type SessionSummary } from '../api';
import { DaySheet } from '../components/DaySheet';
import { formatDayLabel, todayIso } from '../date';
import { sessionsRoutes } from '../routes';

interface Loaded {
  form: FormRow;
  sessions: SessionSummary[];
  studentCount: number;
}

type Params = { classId: string; formId: string };

/** Bir formun geçmiş kayıtları: tarih + doluluk listesi; tek ana eylem "Bugünün kaydını başlat". */
export function FormSessionsScreen() {
  const { classId, formId } = useLocalSearchParams<Params>();
  const router = useRouter();

  const [data, setData] = useState<Loaded | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [dayOpen, setDayOpen] = useState(false);
  const pendingDay = useRef<string | null>(null);
  const requestRef = useRef(0);

  const load = useCallback(() => {
    const request = ++requestRef.current;
    setLoadError(null);
    Promise.all([getForm(formId), listSessions(formId), countStudents(classId)])
      .then(([form, sessions, studentCount]) => {
        if (request === requestRef.current) setData({ form, sessions, studentCount });
      })
      .catch((error: unknown) => {
        if (request === requestRef.current) setLoadError(toUserMessage(error, 'Kayıtlar yüklenemedi. Tekrar deneyin.'));
      });
  }, [classId, formId]);

  // Doldurma ekranından dönünce ilerleme güncel görünsün.
  useFocusEffect(load);

  const today = todayIso();
  const studentCount = data?.studentCount ?? 0;

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

  if (loadError && !data) {
    return (
      <Screen title="Kayıtlar" testID="history-screen">
        <View style={styles.stateWrap}>
          <Banner kind="error" message={loadError} />
          <Button label="Tekrar dene" variant="secondary" onPress={load} testID="history-retry" />
        </View>
      </Screen>
    );
  }

  if (!data) {
    return (
      <Screen title="Kayıtlar" scroll={false} testID="history-screen">
        <LoadingState label="Kayıtlar yükleniyor" />
      </Screen>
    );
  }

  const { form, sessions } = data;
  const hasToday = sessions.some((s) => s.session.session_date === today);

  return (
    <Screen
      title={form.title}
      scroll={false}
      padded={false}
      headerDivider
      testID="history-screen"
      headerRight={
        <IconButton
          icon="more"
          accessibilityLabel="Diğer seçenekler"
          onPress={() => setMenuOpen(true)}
          testID="history-more"
        />
      }
      footer={
        <BottomActionBar
          secondary={{ label: 'Başka gün', onPress: () => setDayOpen(true), testID: 'history-other-day' }}
          primary={{
            label: hasToday ? 'Bugünün kaydını aç' : 'Bugünün kaydını başlat',
            onPress: () => router.push(sessionsRoutes.day(classId, formId, today)),
            testID: 'history-today',
          }}
        />
      }
    >
      <FlatList
        data={sessions}
        keyExtractor={(s) => s.session.id}
        renderItem={renderItem}
        ListHeaderComponent={loadError ? <View style={styles.banner}><Banner kind="error" message={loadError} /></View> : null}
        ListEmptyComponent={
          <View style={styles.padded}>
            <EmptyState
              icon="calendar"
              title="Henüz kayıt yok"
              description="İlk kaydı aşağıdan başlatın."
              testID="history-empty"
            />
          </View>
        }
        contentContainerStyle={styles.listContent}
        testID="history-list"
      />
      <OverflowMenu
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        title={form.title}
        testID="history-menu"
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
    </Screen>
  );
}

const styles = StyleSheet.create({
  stateWrap: { gap: spacing.md, paddingTop: spacing.sm },
  banner: { paddingHorizontal: layout.pageX, paddingVertical: spacing.sm },
  padded: { paddingHorizontal: layout.pageX },
  listContent: { flexGrow: 1, paddingBottom: spacing.xxl },
});
