import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Banner, BottomActionBar, Button, LoadingState, Screen, TextField, useToast } from '@/components/ui';
import { spacing } from '@/theme';

import { getClass, updateClass } from '../api';
import { toUserMessage } from '../errors';
import { CLASS_NAME_MAX, validateClassDraft, type ClassDraft, type ClassDraftErrors, type ClassSummary } from '../model';
import { useRemoteData } from '../useRemoteData';
import { NewClassWizard } from '../wizard/NewClassWizard';

const TITLE = 'Sınıfı düzenle';

/** `/class/new` — yeni sınıf sihirbazı; `?classId=` verilirse sınıfın adını düzenleme. */
export function ClassFormScreen() {
  const { classId } = useLocalSearchParams<{ classId?: string }>();
  if (classId) return <EditClass classId={classId} />;
  return <NewClassWizard />;
}

function EditClass({ classId }: { classId: string }) {
  const load = useCallback(() => getClass(classId), [classId]);
  const cls = useRemoteData(load, 'Sınıf bilgileri yüklenemedi. Bağlantınızı kontrol edip tekrar deneyin.');

  if (cls.status === 'loading' || (cls.status === 'ready' && !cls.data)) {
    return (
      <Screen title={TITLE} scroll={false} testID="class-edit-screen">
        <LoadingState label="Sınıf bilgileri yükleniyor" />
      </Screen>
    );
  }
  if (cls.status === 'error' || !cls.data) {
    return (
      <Screen title={TITLE} contentStyle={styles.errorBox} testID="class-edit-screen">
        <Banner kind="error" title="Sınıf açılamadı" message={cls.error ?? ''} />
        <Button label="Tekrar dene" variant="secondary" onPress={cls.retry} testID="class-edit-retry" />
      </Screen>
    );
  }
  return <EditClassForm classId={classId} initial={draftFrom(cls.data)} />;
}

function draftFrom(c: ClassSummary): ClassDraft {
  return { name: c.name, grade: c.grade ?? '', section: c.section ?? '' };
}

function EditClassForm({ classId, initial }: { classId: string; initial: ClassDraft }) {
  const router = useRouter();
  const toast = useToast();
  const [draft, setDraft] = useState<ClassDraft>(initial);
  const [details, setDetails] = useState(Boolean(initial.grade || initial.section));
  const [errors, setErrors] = useState<ClassDraftErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const inFlight = useRef(false);

  const set = (key: keyof ClassDraft) => (value: string) => {
    setDraft((d) => ({ ...d, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: null }));
  };

  const submit = async () => {
    if (inFlight.current) return;
    const result = validateClassDraft(draft);
    setFormError(null);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    inFlight.current = true;
    setSaving(true);
    try {
      await updateClass(classId, result.value);
      toast.show('Kaydedildi');
      if (router.canGoBack()) router.back();
      else router.replace(`/class/${classId}`);
    } catch (err) {
      setFormError(toUserMessage(err, 'Değişiklikler kaydedilemedi. Bağlantınızı kontrol edip tekrar deneyin.'));
    } finally {
      inFlight.current = false;
      setSaving(false);
    }
  };

  return (
    <Screen
      title={TITLE}
      testID="class-edit-screen"
      footer={
        <BottomActionBar primary={{ label: 'Kaydet', onPress: () => void submit(), loading: saving, testID: 'class-edit-save' }} />
      }
    >
      <View style={styles.form}>
        {formError ? <Banner kind="error" message={formError} testID="class-edit-error" /> : null}
        <TextField
          label="Sınıf adı"
          value={draft.name}
          onChangeText={set('name')}
          error={errors.name}
          placeholder="5/B"
          maxLength={CLASS_NAME_MAX}
          autoCapitalize="characters"
          autoCorrect={false}
          returnKeyType="done"
          onSubmitEditing={() => void submit()}
          testID="class-edit-name"
        />
        {details ? (
          <View style={styles.pair}>
            <TextField
              label="Düzey"
              value={draft.grade}
              onChangeText={set('grade')}
              error={errors.grade}
              placeholder="5"
              keyboardType="number-pad"
              containerStyle={styles.pairItem}
              testID="class-edit-grade"
            />
            <TextField
              label="Şube"
              value={draft.section}
              onChangeText={set('section')}
              error={errors.section}
              placeholder="B"
              autoCapitalize="characters"
              autoCorrect={false}
              containerStyle={styles.pairItem}
              testID="class-edit-section"
            />
          </View>
        ) : (
          <Button
            label="Ayrıntı ekle"
            icon="plus"
            variant="ghost"
            size="sm"
            fullWidth={false}
            onPress={() => setDetails(true)}
            style={styles.ghost}
            testID="class-edit-details"
          />
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: { gap: spacing.lg, paddingTop: spacing.sm },
  pair: { flexDirection: 'row', gap: spacing.md },
  pairItem: { flex: 1 },
  ghost: { alignSelf: 'flex-start', marginLeft: -spacing.md },
  errorBox: { gap: spacing.lg, paddingTop: spacing.lg },
});
