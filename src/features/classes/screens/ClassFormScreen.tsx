import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { StyleSheet, View, type TextInput } from 'react-native';

import { Banner, Button, LoadingState, Screen, Text, TextField, useToast } from '@/components/ui';
import { layout, spacing } from '@/theme';

import { createClass, getClass, updateClass } from '../api';
import { toUserMessage } from '../errors';
import { CLASS_NAME_MAX, validateClassDraft, type ClassDraft, type ClassDraftErrors, type ClassSummary } from '../model';
import { useRemoteData } from '../useRemoteData';

const emptyDraft: ClassDraft = { name: '', grade: '', section: '' };

/** `/class/new` — yeni sınıf; `?classId=` verilirse aynı form düzenleme için açılır. */
export function ClassFormScreen() {
  const { classId } = useLocalSearchParams<{ classId?: string }>();
  if (classId) return <EditClass classId={classId} />;
  return <ClassForm mode="create" initial={emptyDraft} />;
}

function EditClass({ classId }: { classId: string }) {
  const load = useCallback(() => getClass(classId), [classId]);
  const cls = useRemoteData(load, 'Sınıf bilgileri yüklenemedi. Bağlantınızı kontrol edip tekrar deneyin.');

  if (cls.status === 'loading' || (cls.status === 'ready' && !cls.data)) {
    return (
      <Screen title="Sınıfı düzenle" scroll={false}>
        <LoadingState label="Sınıf bilgileri yükleniyor" />
      </Screen>
    );
  }
  if (cls.status === 'error' || !cls.data) {
    return (
      <Screen title="Sınıfı düzenle" contentStyle={styles.errorBox}>
        <Banner kind="error" title="Sınıf açılamadı" message={cls.error ?? ''} />
        <Button label="Tekrar dene" variant="secondary" onPress={cls.retry} />
      </Screen>
    );
  }
  return <ClassForm mode="edit" initial={draftFrom(cls.data)} classId={classId} />;
}

function draftFrom(c: ClassSummary): ClassDraft {
  return { name: c.name, grade: c.grade ?? '', section: c.section ?? '' };
}

interface ClassFormProps {
  mode: 'create' | 'edit';
  initial: ClassDraft;
  classId?: string;
}

function ClassForm({ mode, initial, classId }: ClassFormProps) {
  const router = useRouter();
  const toast = useToast();
  const gradeRef = useRef<TextInput>(null);
  const sectionRef = useRef<TextInput>(null);
  const [draft, setDraft] = useState<ClassDraft>(initial);
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
      if (mode === 'edit' && classId) {
        await updateClass(classId, result.value);
        toast.show('Kaydedildi');
        if (router.canGoBack()) router.back();
        else router.replace(`/class/${classId}`);
      } else {
        const created = await createClass(result.value);
        toast.show(`${created.name} eklendi`);
        router.replace(`/class/${created.id}`);
      }
    } catch (err) {
      setFormError(
        toUserMessage(
          err,
          mode === 'edit'
            ? 'Değişiklikler kaydedilemedi. Bilgileri kontrol edip tekrar deneyin.'
            : 'Sınıf eklenemedi. Bilgileri kontrol edip tekrar deneyin.',
        ),
      );
    } finally {
      inFlight.current = false;
      setSaving(false);
    }
  };

  const editing = mode === 'edit';

  return (
    <Screen
      title={editing ? 'Sınıfı düzenle' : 'Yeni sınıf'}
      footer={
        <Button label={editing ? 'Değişiklikleri kaydet' : 'Sınıfı ekle'} onPress={submit} loading={saving} />
      }
    >
      <View style={styles.form}>
        {!editing ? (
          <Text variant="body" tone="muted" style={styles.intro}>
            Sınıfı ekledikten sonra öğrencileri sınıf listesinin fotoğrafından ya da tek tek ekleyebilirsiniz.
          </Text>
        ) : null}
        {formError ? <Banner kind="error" message={formError} /> : null}
        <TextField
          label="Sınıf adı"
          value={draft.name}
          onChangeText={set('name')}
          error={errors.name}
          placeholder="5/B"
          hint="Listede bu ad görünür. Örnek: 5/B, 7-A Matematik"
          maxLength={CLASS_NAME_MAX}
          autoFocus={!editing}
          autoCapitalize="characters"
          autoCorrect={false}
          returnKeyType="next"
          submitBehavior="submit"
          onSubmitEditing={() => gradeRef.current?.focus()}
        />
        <View style={styles.pair}>
          <TextField
            ref={gradeRef}
            label="Sınıf düzeyi"
            value={draft.grade}
            onChangeText={set('grade')}
            error={errors.grade}
            placeholder="5"
            hint="İsteğe bağlı"
            keyboardType="number-pad"
            returnKeyType="next"
            submitBehavior="submit"
            onSubmitEditing={() => sectionRef.current?.focus()}
            containerStyle={styles.pairItem}
          />
          <TextField
            ref={sectionRef}
            label="Şube"
            value={draft.section}
            onChangeText={set('section')}
            error={errors.section}
            placeholder="B"
            hint="İsteğe bağlı"
            autoCapitalize="characters"
            autoCorrect={false}
            returnKeyType="done"
            onSubmitEditing={submit}
            containerStyle={styles.pairItem}
          />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: { gap: spacing.xl, paddingTop: spacing.sm, maxWidth: layout.readableWidth },
  intro: { marginBottom: spacing.xs },
  pair: { flexDirection: 'row', gap: spacing.md },
  pairItem: { flex: 1 },
  errorBox: { gap: spacing.lg, paddingTop: spacing.lg },
});
