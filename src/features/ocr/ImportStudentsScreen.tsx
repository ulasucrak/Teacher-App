import { useNavigation, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { Banner, BottomActionBar, Button, LoadingState, Screen, useToast } from '@/components/ui';
import { spacing } from '@/theme';
import type { StudentRow } from '@/types/database';

import { fetchImportContext, insertStudents } from './api';
import { StudentCollectorView } from './ui/StudentCollectorView';
import { useStudentCollector, type CollectMethod } from './ui/useStudentCollector';

const TITLE = 'Öğrenci ekle';

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; className: string; students: StudentRow[] };

export interface ImportStudentsScreenProps {
  classId: string;
  /** Açılışta seçili yol (sınıf ekranındaki seçimden gelir). */
  initialMethod?: CollectMethod;
}

/**
 * `/class/[classId]/import` — var olan sınıfa öğrenci ekleme: sihirbazın "Öğrenciler" adımının
 * aynısı (fotoğraf / liste / elle), tek eylem "Öğrencileri ekle".
 */
export function ImportStudentsScreen({ classId, initialMethod }: ImportStudentsScreenProps) {
  const [load, setLoad] = useState<LoadState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    fetchImportContext(classId).then(
      (ctx) => {
        if (active) setLoad({ status: 'ready', className: ctx.classRow.name, students: ctx.students });
      },
      (error: unknown) => {
        if (active) setLoad({ status: 'error', message: error instanceof Error ? error.message : String(error) });
      },
    );
    return () => {
      active = false;
    };
  }, [classId, attempt]);

  if (load.status === 'loading') {
    return (
      <Screen title={TITLE} scroll={false} testID="import-screen">
        <LoadingState label="Sınıf bilgileri yükleniyor" />
      </Screen>
    );
  }

  if (load.status === 'error') {
    return (
      <Screen title={TITLE} testID="import-screen">
        <View style={styles.error}>
          <Banner kind="error" title="Sınıf yüklenemedi" message={load.message} />
          <Button
            label="Tekrar dene"
            variant="secondary"
            onPress={() => {
              setLoad({ status: 'loading' });
              setAttempt((n) => n + 1);
            }}
            testID="import-retry"
          />
        </View>
      </Screen>
    );
  }

  return (
    <AddStudents
      classId={classId}
      className={load.className}
      existing={load.students}
      initialMethod={initialMethod}
    />
  );
}

interface AddStudentsProps {
  classId: string;
  className: string;
  existing: StudentRow[];
  initialMethod?: CollectMethod;
}

function AddStudents({ classId, className, existing, initialMethod }: AddStudentsProps) {
  const router = useRouter();
  const navigation = useNavigation();
  const toast = useToast();
  const collector = useStudentCollector(existing, initialMethod);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const allowLeave = useRef(false);
  const { dirty } = collector;

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (event) => {
      if (allowLeave.current || !dirty) return;
      event.preventDefault();
      Alert.alert('Liste silinsin mi?', 'Eklemediğiniz öğrenciler kaybolur.', [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Listeyi sil',
          style: 'destructive',
          onPress: () => {
            allowLeave.current = true;
            navigation.dispatch(event.data.action);
          },
        },
      ]);
    });
    return unsubscribe;
  }, [navigation, dirty]);

  // iOS'ta kaydırarak geri dönüş beforeRemove ile durdurulamaz: liste varken kapalı.
  useEffect(() => {
    navigation.setOptions({ gestureEnabled: !dirty });
  }, [navigation, dirty]);

  const { flush } = collector;
  const save = useCallback(async () => {
    if (saving) return;
    const drafts = flush();
    if (drafts.length === 0) return;
    setSaving(true);
    setError(null);
    try {
      const count = await insertStudents(classId, drafts);
      allowLeave.current = true;
      toast.show(`${count} öğrenci eklendi`);
      if (router.canGoBack()) router.back();
      else router.replace(`/class/${classId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setSaving(false);
    }
  }, [classId, flush, router, saving, toast]);

  const count = collector.drafts.length;
  const canSave = count > 0 || collector.hasPending;

  return (
    <Screen
      title={TITLE}
      testID="import-screen"
      footer={
        <BottomActionBar
          hint={count > 0 ? `${className} sınıfına ${count} öğrenci eklenecek` : undefined}
          primary={{
            label: 'Öğrencileri ekle',
            onPress: () => void save(),
            loading: saving,
            disabled: !canSave || collector.reading !== null,
            testID: 'import-save',
          }}
        />
      }
    >
      <View style={styles.body}>
        {error ? <Banner kind="error" message={error} testID="import-error" /> : null}
        <StudentCollectorView collector={collector} disabled={saving} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { gap: spacing.lg, paddingTop: spacing.sm },
  error: { gap: spacing.lg, paddingTop: spacing.lg },
});
