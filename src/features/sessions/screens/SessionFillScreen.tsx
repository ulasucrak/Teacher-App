import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import {
  Banner,
  Button,
  ConfirmSheet,
  IconButton,
  LoadingState,
  OverflowMenu,
  Screen,
  Text,
  type OverflowAction,
} from '@/components/ui';
import { layout, spacing } from '@/theme';

import { SessionFillBody, sessionFillFooter } from '../components/SessionFillBody';
import { formatDayLabel } from '../date';
import { useSessionFill } from '../hooks/useSessionFill';

type Params = { classId: string; formId: string; sessionId: string; date?: string };

/**
 * Tek bir kaydın tam ekran hâli (`/class/[classId]/form/[formId]/session/[sessionId]`).
 * Günlük doldurma artık form ekranının "İşaretle" sekmesinde; bu ekran var olan bir kayda
 * doğrudan bağlantı içindir.
 */
export function SessionFillScreen() {
  const { classId, formId, sessionId, date: dateParam } = useLocalSearchParams<Params>();
  const router = useRouter();
  const fill = useSessionFill({ classId, formId, sessionId, date: dateParam });
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (fill.loadError) {
    return (
      <Screen title="Kayıt" testID="fill-screen">
        <View style={styles.stateWrap}>
          <Banner kind="error" message={fill.loadError} />
          <Button label="Tekrar dene" variant="secondary" testID="fill-retry" onPress={fill.retry} />
        </View>
      </Screen>
    );
  }

  const { data } = fill;
  if (!data) {
    return (
      <Screen title="Kayıt" scroll={false} testID="fill-screen">
        <LoadingState label="Öğrenciler yükleniyor" />
      </Screen>
    );
  }

  const { form, session } = data;
  const dateLabel = formatDayLabel(data.date);
  const filled = fill.students.length - fill.summary.empty;
  const canFill = fill.options.length > 0 && fill.students.length > 0;

  const menuActions: OverflowAction[] = [
    {
      key: 'edit',
      label: 'Formu düzenle',
      icon: 'edit',
      onPress: () => router.push(`/class/${classId}/form/${formId}/edit`),
    },
  ];
  if (session) {
    menuActions.push({
      key: 'delete',
      label: 'Kaydı sil',
      icon: 'trash',
      destructive: true,
      onPress: () => setConfirmDelete(true),
    });
  }

  return (
    <Screen
      title={form.title}
      scroll={false}
      padded={false}
      testID="fill-screen"
      headerRight={
        <IconButton
          icon="more"
          accessibilityLabel="Diğer seçenekler"
          onPress={() => setMenuOpen(true)}
          testID="fill-more"
        />
      }
      footer={sessionFillFooter(fill)}
    >
      <View style={styles.metaRow}>
        <Text variant="label" tone="muted" accessibilityLabel={`Tarih: ${dateLabel}`} testID="fill-date">
          {dateLabel}
        </Text>
        {canFill ? (
          <Text
            variant="number"
            tone="muted"
            accessibilityLabel={`${fill.students.length} öğrenciden ${filled} işaretli`}
            testID="fill-progress"
          >
            {`${filled}/${fill.students.length}`}
          </Text>
        ) : null}
      </View>
      <SessionFillBody fill={fill} classId={classId} formId={formId} />
      <OverflowMenu
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        title={form.title}
        actions={menuActions}
        testID="fill-menu"
      />
      <ConfirmSheet
        visible={confirmDelete}
        title="Bu kayıt silinsin mi?"
        message={`${dateLabel} kaydındaki tüm işaretlemeler silinir.`}
        confirmLabel="Kaydı sil"
        loading={fill.deleting}
        onConfirm={() =>
          void fill.deleteCurrent(() => {
            setConfirmDelete(false);
            router.back();
          }, true)
        }
        onCancel={() => setConfirmDelete(false)}
        testID="fill-delete-confirm"
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingHorizontal: layout.pageX,
    paddingBottom: spacing.sm,
  },
  stateWrap: { gap: spacing.md, paddingTop: spacing.sm },
});
