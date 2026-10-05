import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';

import { useToast } from '@/components/ui';

import { createForm, type FormInput } from '../api';
import { FormBuilder, valuesForTemplate, type TemplateChoice } from '../components/FormBuilder';
import { firstParam, formsRoutes } from '../params';
import { getPreset } from '../presets';

/** /class/[classId]/form/new — şablondan ya da boş form oluşturma. `?preset=yoklama` desteklenir. */
export default function NewFormScreen() {
  const params = useLocalSearchParams<{ classId: string; preset?: string }>();
  const classId = firstParam(params.classId) ?? '';
  const presetParam = firstParam(params.preset);
  const router = useRouter();
  const toast = useToast();

  const [template] = useState<TemplateChoice>(() => getPreset(presetParam)?.id ?? 'blank');
  const [initial] = useState(() => valuesForTemplate(template));

  const onSubmit = async (input: FormInput) => {
    await createForm(classId, input);
    toast.show('Form oluşturuldu');
    if (router.canGoBack()) router.back();
    else router.replace(formsRoutes.list(classId));
  };

  return (
    <FormBuilder
      screenTitle="Yeni form"
      initial={initial}
      initialTemplate={template}
      showTemplates
      submitLabel="Formu oluştur"
      onSubmit={onSubmit}
    />
  );
}
