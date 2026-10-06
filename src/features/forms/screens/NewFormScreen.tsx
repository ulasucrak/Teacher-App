import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';

import { useToast } from '@/components/ui';

import { createForm, type FormInput } from '../api';
import { FormBuilder, valuesForTemplate } from '../components/FormBuilder';
import { firstParam } from '../params';
import { getPreset } from '../presets';

/**
 * /class/[classId]/form/new — boş form oluşturucu ("+ Form" → "Boş form").
 * `?preset=yoklama` ile şablon değerleriyle açılır.
 */
export default function NewFormScreen() {
  const params = useLocalSearchParams<{ classId: string; preset?: string }>();
  const classId = firstParam(params.classId) ?? '';
  const presetParam = firstParam(params.preset);
  const router = useRouter();
  const toast = useToast();

  const [initial] = useState(() => valuesForTemplate(getPreset(presetParam)?.id ?? 'blank'));

  const onSubmit = async (input: FormInput) => {
    await createForm(classId, input);
    toast.show('Form oluşturuldu');
    if (router.canGoBack()) router.back();
    else router.replace(`/class/${classId}`);
  };

  return (
    <FormBuilder
      screenTitle="Yeni form"
      initial={initial}
      submitLabel="Formu oluştur"
      onSubmit={onSubmit}
    />
  );
}
