import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Banner, Button, LoadingState, Screen, useToast } from '@/components/ui';
import { spacing } from '@/theme';
import type { FormRow } from '@/types/database';

import { getForm, updateForm, type FormInput } from '../api';
import { FormBuilder } from '../components/FormBuilder';
import { errorMessage, getFormsErrorMessage } from '../errors';
import { toDraftOptions } from '../options';
import { firstParam, formsRoutes } from '../params';

type LoadState = { kind: 'loading' } | { kind: 'error'; message: string } | { kind: 'ready'; form: FormRow };

/** /class/[classId]/form/[formId]/edit — formun adını, açıklamasını ve seçeneklerini düzenleme. */
export default function EditFormScreen() {
  const params = useLocalSearchParams<{ classId: string; formId: string }>();
  const classId = firstParam(params.classId) ?? '';
  const formId = firstParam(params.formId) ?? '';
  const router = useRouter();
  const toast = useToast();
  const [state, setState] = useState<LoadState>({ kind: 'loading' });

  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let alive = true;
    getForm(formId).then(
      (form) => {
        if (!alive) return;
        // Adres başka bir sınıfı gösteriyorsa form bu sınıfta yok sayılır.
        if (classId && form.class_id !== classId) {
          setState({ kind: 'error', message: getFormsErrorMessage({ code: 'PGRST116' }, 'load') });
        } else {
          setState({ kind: 'ready', form });
        }
      },
      (error: unknown) => {
        if (alive) setState({ kind: 'error', message: errorMessage(error, 'load') });
      },
    );
    return () => {
      alive = false;
    };
  }, [formId, classId, attempt]);

  const retry = () => {
    setState({ kind: 'loading' });
    setAttempt((n) => n + 1);
  };

  if (state.kind !== 'ready') {
    return (
      <Screen title="Formu düzenle" headerDivider scroll={state.kind === 'error'}>
        {state.kind === 'loading' ? (
          <LoadingState label="Form yükleniyor" />
        ) : (
          <View style={styles.error}>
            <Banner kind="error" title="Form açılamadı" message={state.message} />
            <Button label="Tekrar dene" variant="secondary" fullWidth={false} onPress={retry} />
          </View>
        )}
      </Screen>
    );
  }

  const { form } = state;

  const onSubmit = async (input: FormInput) => {
    await updateForm(form.id, input);
    toast.show('Değişiklikler kaydedildi');
    if (router.canGoBack()) router.back();
    else router.replace(formsRoutes.list(classId || form.class_id));
  };

  return (
    <FormBuilder
      key={form.id}
      screenTitle="Formu düzenle"
      initial={{
        title: form.title,
        subject: form.subject ?? '',
        description: form.description ?? '',
        options: toDraftOptions(form.options),
      }}
      originalOptions={form.options}
      submitLabel="Değişiklikleri kaydet"
      onSubmit={onSubmit}
    />
  );
}

const styles = StyleSheet.create({
  error: { gap: spacing.lg, paddingTop: spacing.lg },
});
