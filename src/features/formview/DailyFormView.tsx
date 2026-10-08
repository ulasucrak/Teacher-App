import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Banner, Button, ConfirmSheet, LoadingState, OverflowMenu, type OverflowAction } from '@/components/ui';
import { SessionFillBody, sessionFillFooter } from '@/features/sessions/components/SessionFillBody';
import { formatDayLabel, todayIso } from '@/features/sessions/date';
import { useSessionFill } from '@/features/sessions/hooks/useSessionFill';
import { NEW_SESSION_ID } from '@/features/sessions/routes';
import { layout, spacing } from '@/theme';
import type { FormRow } from '@/types/database';

import { ClassroomView } from '@/features/classroom/ClassroomView';
import { requestPresentationFullscreen } from '@/features/classroom/presentation';

import { DayBar } from './DayBar';
import { FormShell, type FormTab } from './FormShell';
import { HistoryPane } from './HistoryPane';

export interface FormViewProps {
  classId: string;
  form: FormRow;
  initialTab: FormTab;
}

/**
 * Günlük form (günde bir kez): "İşaretle" seçilen günün kaydını doğrudan doldurur (bugün
 * varsayılan; gün çubuğuyla başka güne geçilir). Taslak sekmeler arasında korunur; gün
 * değiştirirken ya da ekrandan çıkarken kaydedilmemiş değişiklik sorulur. "Geçmiş" özet, gün
 * incelemesi ve zaman çizelgesidir.
 */
export function DailyFormView({ classId, form, initialTab }: FormViewProps) {
  const router = useRouter();
  const formId = form.id;

  const [tab, setTab] = useState<FormTab>(initialTab);
  const [day, setDay] = useState(() => todayIso());
  const [menuOpen, setMenuOpen] = useState(false);
  const [classroomOpen, setClassroomOpen] = useState(false);
  const closeClassroom = useCallback(() => setClassroomOpen(false), []);
  const openClassroom = () => {
    requestPresentationFullscreen();
    setClassroomOpen(true);
  };
  const [confirmDelete, setConfirmDelete] = useState(false);

  const fill = useSessionFill({ classId, formId, sessionId: NEW_SESSION_ID, date: day, form });
  const { data } = fill;

  const changeDay = (next: string) => {
    if (next === day) return;
    fill.confirmDiscard(() => setDay(next));
  };

  // Geçmiş'ten "Bu günü düzenle".
  const editDay = (next: string) => {
    if (next === day) {
      setTab('mark');
      return;
    }
    fill.confirmDiscard(() => {
      setDay(next);
      setTab('mark');
    });
  };

  const dateLabel = formatDayLabel(day);
  const filled = fill.students.length - fill.summary.empty;
  const canFill = fill.options.length > 0 && fill.students.length > 0;
  // Gün değişti, yeni gün henüz yüklenmedi.
  const loadingDay = !data || data.date !== day;

  let marking;
  if (fill.loadError && loadingDay) {
    marking = (
      <View style={styles.stateWrap}>
        <Banner kind="error" message={fill.loadError} />
        <Button label="Tekrar dene" variant="secondary" testID="fill-retry" onPress={fill.retry} />
      </View>
    );
  } else {
    marking = (
      <>
        <DayBar
          value={day}
          onChange={changeDay}
          testIDPrefix="fill-day"
          trailing={canFill && !loadingDay ? `${filled}/${fill.students.length}` : undefined}
          trailingLabel={`${fill.students.length} öğrenciden ${filled} işaretli`}
        />
        {loadingDay ? <LoadingState label="Öğrenciler yükleniyor" /> : <SessionFillBody fill={fill} classId={classId} formId={formId} />}
      </>
    );
  }

  const menuActions: OverflowAction[] = [
    {
      key: 'edit',
      label: 'Formu düzenle',
      icon: 'edit',
      onPress: () => router.push(`/class/${classId}/form/${formId}/edit`),
    },
  ];
  if (data?.session) {
    menuActions.push({
      key: 'delete',
      label: 'Kaydı sil',
      icon: 'trash',
      destructive: true,
      onPress: () => setConfirmDelete(true),
    });
  }

  return (
    <FormShell
      title={form.title}
      tab={tab}
      onTab={setTab}
      onMore={() => setMenuOpen(true)}
      onClassroom={openClassroom}
      footer={tab === 'mark' && !loadingDay ? sessionFillFooter(fill) : undefined}
      testID="form-screen"
    >
      {tab === 'mark' ? marking : null}
      <HistoryPane form={form} active={tab === 'history'} onEditDay={editDay} />
      {classroomOpen ? <ClassroomView form={form} fill={fill} day={day} onDay={changeDay} onExit={closeClassroom} /> : null}
      <OverflowMenu
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        title={form.title}
        testID="form-menu"
        actions={menuActions}
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
            fill.retry();
          })
        }
        onCancel={() => setConfirmDelete(false)}
        testID="fill-delete-confirm"
      />
    </FormShell>
  );
}

const styles = StyleSheet.create({
  stateWrap: { gap: spacing.md, paddingTop: spacing.sm, paddingHorizontal: layout.pageX },
});
