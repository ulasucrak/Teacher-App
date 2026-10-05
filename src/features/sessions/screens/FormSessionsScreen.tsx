import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { FlatList, StyleSheet, View, type ListRenderItem } from 'react-native';

import {
  Badge,
  Banner,
  Button,
  Card,
  EmptyState,
  IconButton,
  ListRow,
  LoadingState,
  Screen,
  Text,
  useToast,
} from '@/components/ui';
import { colors, layout, spacing } from '@/theme';
import type { FormRow } from '@/types/database';

import { countStudents, createSession, getForm, listSessions, toUserMessage, type SessionSummary } from '../api';
import { DateStepper } from '../components/DateStepper';
import { FormHeaderCard, STATUS_LABEL } from '../components/FormHeaderCard';
import { OptionSummary } from '../components/OptionSummary';
import { formatSessionDate, relativeDayLabel, todayIso } from '../date';

interface Loaded {
  form: FormRow;
  sessions: SessionSummary[];
  studentCount: number;
}

type Params = { classId: string; formId: string };

/** Bir formun kayıtları: başlık, son kaydın özeti, kayıt listesi ve yeni kayıt. */
export function FormSessionsScreen() {
  const { classId, formId } = useLocalSearchParams<Params>();
  const router = useRouter();
  const toast = useToast();

  const [data, setData] = useState<Loaded | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [date, setDate] = useState(() => todayIso());
  const [creating, setCreating] = useState(false);
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

  const sessionHref = (sessionId: string) => `/class/${classId}/form/${formId}/session/${sessionId}` as const;

  const onCreate = async () => {
    setCreating(true);
    try {
      const session = await createSession({ formId, sessionDate: date });
      router.push(sessionHref(session.id));
    } catch (error) {
      toast.show(toUserMessage(error, 'Kayıt oluşturulamadı. Tekrar deneyin.'), 'error');
    } finally {
      setCreating(false);
    }
  };

  const today = todayIso();
  const studentCount = data?.studentCount ?? 0;

  const renderItem: ListRenderItem<SessionSummary> = ({ item }) => {
    const { session, filled } = item;
    const dateLabel = formatSessionDate(session.session_date);
    const relative = relativeDayLabel(session.session_date, today);
    const subtitle = [relative, session.title].filter(Boolean).join(', ') || undefined;
    const progress = `${filled}/${studentCount}`;
    return (
      <ListRow
        title={dateLabel}
        subtitle={subtitle}
        onPress={() => router.push(sessionHref(session.id))}
        accessibilityLabel={`${dateLabel}${subtitle ? `, ${subtitle}` : ''}, ${STATUS_LABEL[session.status]}, ${studentCount} öğrenciden ${filled} işaretli`}
        accessibilityHint="Kaydı açar"
        trailing={
          <View style={styles.trailing}>
            <Text variant="number" tone={filled < studentCount ? 'muted' : 'default'}>
              {progress}
            </Text>
            <Badge label={STATUS_LABEL[session.status]} tone={session.status === 'published' ? 'positive' : 'neutral'} />
          </View>
        }
      />
    );
  };

  if (loadError && !data) {
    return (
      <Screen title="Kayıtlar">
        <View style={styles.stateWrap}>
          <Banner kind="error" message={loadError} />
          <Button label="Tekrar dene" variant="secondary" onPress={load} />
        </View>
      </Screen>
    );
  }

  if (!data) {
    return (
      <Screen title="Kayıtlar" scroll={false}>
        <LoadingState label="Kayıtlar yükleniyor" />
      </Screen>
    );
  }

  const { form, sessions } = data;
  const latest = sessions[0];

  const header = (
    <View style={styles.header}>
      <FormHeaderCard subject={form.subject} description={form.description} fallbackTitle={form.title}>
        <Button
          label="Formları göster"
          variant="ghost"
          size="sm"
          fullWidth={false}
          onPress={() => router.push(`/class/${classId}/forms`)}
        />
      </FormHeaderCard>

      {loadError ? <Banner kind="error" message={loadError} /> : null}

      {latest && form.options.length > 0 ? (
        <Card variant="muted" style={styles.latest}>
          <Text variant="label">Son kayıt, {formatSessionDate(latest.session.session_date)}</Text>
          <OptionSummary
            options={form.options}
            counts={latest.counts}
            empty={Math.max(0, studentCount - latest.filled)}
          />
        </Card>
      ) : null}

      {sessions.length > 0 ? (
        <Text variant="heading" accessibilityRole="header" style={styles.sectionTitle}>
          Kayıtlar
        </Text>
      ) : null}
    </View>
  );

  return (
    <Screen
      title={form.title}
      scroll={false}
      padded={false}
      headerRight={
        <IconButton
          icon="edit"
          accessibilityLabel="Formu düzenle"
          onPress={() => router.push(`/class/${classId}/form/${formId}/edit`)}
        />
      }
      footer={
        <>
          <DateStepper value={date} onChange={setDate} today={today} />
          <Button label="Yeni kayıt başlat" icon="plus" onPress={onCreate} loading={creating} accessibilityHint="Seçili tarih için kayıt oluşturup açar" />
        </>
      }
    >
      <FlatList
        data={sessions}
        keyExtractor={(s) => s.session.id}
        renderItem={renderItem}
        ListHeaderComponent={header}
        ListEmptyComponent={
          <View style={styles.padded}>
            <EmptyState
              icon="book"
              title="Henüz kayıt yok"
              description="Her ders için bir kayıt oluşturup öğrencileri işaretlersiniz. Aşağıdan tarihi seçip ilk kaydı başlatın."
            />
          </View>
        }
        contentContainerStyle={styles.listContent}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: layout.pageX, paddingTop: spacing.sm, gap: spacing.md },
  latest: { gap: spacing.sm },
  sectionTitle: {
    marginTop: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: layout.hairline,
    borderBottomColor: colors.rule,
    marginHorizontal: -layout.pageX,
    paddingHorizontal: layout.pageX,
  },
  trailing: { alignItems: 'flex-end', gap: spacing.xs },
  stateWrap: { gap: spacing.md, paddingTop: spacing.sm },
  padded: { paddingHorizontal: layout.pageX },
  listContent: { paddingBottom: spacing.xxl },
});
