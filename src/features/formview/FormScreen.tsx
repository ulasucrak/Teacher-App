import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Banner, Button, LoadingState, Screen } from '@/components/ui';
import { getForm, toUserMessage } from '@/features/sessions/api';
import { spacing } from '@/theme';
import type { FormRow } from '@/types/database';

import { DailyFormView } from './DailyFormView';
import { parseFormTab } from './FormShell';
import { RepeatableFormView } from './RepeatableFormView';

type Params = { classId: string; formId: string; tab?: string };

/**
 * `/class/[classId]/form/[formId]`: formun ekranı. "İşaretle" ve "Geçmiş" sekmeleri; İşaretle
 * günlük formda günlük kayıtlar, birikimli formda öğrenci başına işaret düğmeleridir.
 */
export function FormScreen() {
  const { classId, formId, tab } = useLocalSearchParams<Params>();
  const [form, setForm] = useState<FormRow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let alive = true;
    getForm(formId).then(
      (loaded) => {
        if (!alive) return;
        if (classId && loaded.class_id !== classId) {
          setError('Form bulunamadı. Silinmiş olabilir; form listesine dönün.');
        } else {
          setForm(loaded);
        }
      },
      (e: unknown) => {
        if (alive) setError(toUserMessage(e, 'Form yüklenemedi. Tekrar deneyin.'));
      },
    );
    return () => {
      alive = false;
    };
  }, [classId, formId, attempt]);

  if (error && !form) {
    return (
      <Screen title="Form" testID="form-screen">
        <View style={styles.stateWrap}>
          <Banner kind="error" message={error} />
          <Button
            label="Tekrar dene"
            variant="secondary"
            testID="form-retry"
            onPress={() => {
              setError(null);
              setAttempt((n) => n + 1);
            }}
          />
        </View>
      </Screen>
    );
  }

  if (!form) {
    return (
      <Screen title="Form" scroll={false} testID="form-screen">
        <LoadingState label="Form yükleniyor" />
      </Screen>
    );
  }

  const initialTab = parseFormTab(tab);
  return form.mode === 'repeatable' ? (
    <RepeatableFormView key={form.id} classId={classId} form={form} initialTab={initialTab} />
  ) : (
    <DailyFormView key={form.id} classId={classId} form={form} initialTab={initialTab} />
  );
}

const styles = StyleSheet.create({
  stateWrap: { gap: spacing.md, paddingTop: spacing.sm },
});
