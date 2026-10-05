import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Banner, Button, LoadingState, Screen, useToast } from '@/components/ui';
import { spacing } from '@/theme';
import type { FormRow } from '@/types/database';

import { getForm, updateForm, type FormInput } from '../api';
import { FormBuilder } from '../components/FormBuilder';
import { errorMessage } from '../errors';
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

  const load = useCallback(async () => {
    setState({ kind: 'loading' });
    try {
      setState({ kind: 'ready', form: await getForm(formId) });
    } catch (error) {
      setState({ kind: 'error', message: errorMessage(error, 'load') });
    }
  }, [formId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (state.kind !== 'ready') {
    return (
      <Screen title="Formu düzenle" headerDivider scroll={state.kind === 'error'}>
        {state.kind === 'loading' ? (
          <LoadingState label="Form yükleniyor" />
        ) : (
          <View style={styles.error}>
            <Banner kind="error" title="Form açılamadı" message={state.message} />
            <Button label="Tekrar dene" variant="secondary" fullWidth={false} onPress={() => void load()} />
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
