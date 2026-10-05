import { useMemo, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { Banner, Button, Chip, Screen, Text, TextField } from '@/components/ui';
import { spacing } from '@/theme';
import type { FormOption } from '@/types/database';

import type { FormInput } from '../api';
import { errorMessage } from '../errors';
import {
  MAX_OPTIONS,
  MIN_OPTIONS,
  createDraftOption,
  finalizeOptions,
  removedOptions,
  toDraftOptions,
  validateForm,
  type DraftOption,
  type FormValidation,
} from '../options';
import { PRESETS, getPreset, type PresetId } from '../presets';
import { OptionsEditor } from './OptionsEditor';
import { OptionsPreview } from './OptionsPreview';

export type TemplateChoice = PresetId | 'blank';

export interface FormBuilderValues {
  title: string;
  subject: string;
  description: string;
  options: DraftOption[];
}

export interface FormBuilderProps {
  initial: FormBuilderValues;
  /** Düzenleme: kayıtlı seçenekler (kaldırılan seçenek uyarısı için). */
  originalOptions?: readonly FormOption[];
  /** Yeni form: şablon seçici gösterilir. */
  initialTemplate?: TemplateChoice | null;
  showTemplates?: boolean;
  /** Üst çubuk başlığı ("Yeni form", "Formu düzenle"). */
  screenTitle: string;
  submitLabel: string;
  onSubmit: (input: FormInput) => Promise<void>;
}

export function blankOptions(): DraftOption[] {
  return [createDraftOption('positive'), createDraftOption('negative')];
}

/** Şablon (ya da boş form) için başlangıç değerleri. */
export function valuesForTemplate(choice: TemplateChoice | null | undefined): FormBuilderValues {
  const preset = getPreset(choice);
  return {
    title: preset?.title ?? '',
    subject: '',
    description: '',
    options: preset ? toDraftOptions(preset.options) : blankOptions(),
  };
}

function quoteList(labels: string[]): string {
  return labels.map((l) => `"${l}"`).join(', ');
}

/** Yeni form ve düzenleme ekranlarının ortak gövdesi (alanlar, seçenekler, önizleme). */
export function FormBuilder({
  initial,
  originalOptions,
  initialTemplate = null,
  showTemplates = false,
  screenTitle,
  submitLabel,
  onSubmit,
}: FormBuilderProps) {
  const [values, setValues] = useState<FormBuilderValues>(initial);
  const [template, setTemplate] = useState<TemplateChoice | null>(initialTemplate);
  const [dirty, setDirty] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const validation = useMemo(() => validateForm(values), [values]);
  const removed = useMemo(
    () => (originalOptions ? removedOptions(originalOptions, values.options) : []),
    [originalOptions, values.options],
  );

  const patch = (next: Partial<FormBuilderValues>) => {
    setValues((v) => ({ ...v, ...next }));
    setDirty(true);
  };

  const applyTemplate = (choice: TemplateChoice) => {
    const next = valuesForTemplate(choice);
    setValues((v) => {
      const prevPresetTitle = getPreset(template)?.title;
      const keepTitle = v.title.trim() !== '' && v.title !== prevPresetTitle;
      return {
        ...v,
        title: keepTitle ? v.title : next.title,
        options: next.options,
      };
    });
    setTemplate(choice);
    setDirty(false);
    setAttempted(false);
  };

  const chooseTemplate = (choice: TemplateChoice) => {
    if (choice === template) return;
    if (!dirty) {
      applyTemplate(choice);
      return;
    }
    Alert.alert('Şablon uygulansın mı?', 'Yazdığınız seçenekler şablondakilerle değişir.', [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Şablonu uygula', onPress: () => applyTemplate(choice) },
    ]);
  };

  const save = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      await onSubmit({
        title: values.title.trim().replace(/\s+/g, ' '),
        subject: values.subject.trim() || null,
        description: values.description.trim() || null,
        options: finalizeOptions(values.options, originalOptions?.map((o) => o.key)),
      });
    } catch (error) {
      setSaveError(errorMessage(error, 'save'));
      setSaving(false);
      return;
    }
    setSaving(false);
  };

  const submit = () => {
    setAttempted(true);
    if (!validation.valid || saving) return;
    if (removed.length > 0) {
      Alert.alert(
        removed.length === 1 ? 'Seçenek kaldırılsın mı?' : 'Seçenekler kaldırılsın mı?',
        `${quoteList(removed.map((o) => o.label))} ile yapılmış eski işaretlemeler etiketsiz görünür.`,
        [
          { text: 'Vazgeç', style: 'cancel' },
          { text: 'Kaldır ve kaydet', style: 'destructive', onPress: () => void save() },
        ],
      );
      return;
    }
    void save();
  };

  const show: Omit<FormValidation, 'valid'> = attempted ? validation : { optionErrors: {} };

  const footer = (
    <>
      {attempted && !validation.valid ? (
        <Text variant="caption" tone="danger" accessibilityLiveRegion="polite">
          Kaydetmeden önce kırmızı işaretli alanları düzeltin.
        </Text>
      ) : null}
      <Button label={submitLabel} onPress={submit} loading={saving} />
    </>
  );

  return (
    <Screen title={screenTitle} headerDivider footer={footer}>
      <View style={styles.body}>
        {saveError ? <Banner kind="error" message={saveError} /> : null}

        {showTemplates ? (
          <View style={styles.section}>
            <Text variant="label">Şablonla başlayın</Text>
            <View style={styles.templates} accessibilityRole="radiogroup" accessibilityLabel="Şablon">
              {PRESETS.map((p) => (
                <Chip
                  key={p.id}
                  label={p.title}
                  selected={template === p.id}
                  onPress={() => chooseTemplate(p.id)}
                  accessibilityLabel={`${p.title} şablonu: ${p.summary}`}
                />
              ))}
              <Chip
                label="Boş form"
                selected={template === 'blank'}
                onPress={() => chooseTemplate('blank')}
                accessibilityLabel="Boş form: seçenekleri kendiniz yazın"
              />
            </View>
          </View>
        ) : null}

        <View style={styles.fields}>
          <TextField
            label="Form adı"
            value={values.title}
            onChangeText={(title) => patch({ title })}
            placeholder="Örneğin Yoklama"
            error={show.title}
            autoCapitalize="sentences"
            returnKeyType="next"
          />
          <TextField
            label="Ders (isteğe bağlı)"
            value={values.subject}
            onChangeText={(subject) => patch({ subject })}
            placeholder="Örneğin Matematik"
            autoCapitalize="words"
            returnKeyType="next"
          />
          <TextField
            label="Açıklama (isteğe bağlı)"
            value={values.description}
            onChangeText={(description) => patch({ description })}
            placeholder="Örneğin 5. sınıf MEB kitabı"
            hint="İşaretleme ekranında form adının altında görünür."
          />
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <Text variant="heading" accessibilityRole="header">
              Seçenekler
            </Text>
            <Text variant="caption" tone="muted">
              {MIN_OPTIONS}–{MAX_OPTIONS} seçenek. Renk, listede kimin sorunlu olduğunu bir bakışta
              gösterir.
            </Text>
          </View>
          {removed.length > 0 ? (
            <Banner
              kind="warning"
              message={`${quoteList(removed.map((o) => o.label))} kaldırıldı. Bu seçenekle yapılmış eski işaretlemeler etiketsiz görünür.`}
            />
          ) : null}
          {show.options ? <Banner kind="error" message={show.options} /> : null}
          <OptionsEditor
            options={values.options}
            onChange={(options) => patch({ options })}
            errors={show.optionErrors}
          />
        </View>

        <View style={styles.section}>
          <Text variant="heading" accessibilityRole="header">
            Önizleme
          </Text>
          <OptionsPreview options={values.options} title={values.title} />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { gap: spacing.xxl, paddingTop: spacing.lg, paddingBottom: spacing.xxl },
  section: { gap: spacing.md },
  sectionHead: { gap: spacing.xs },
  templates: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  fields: { gap: spacing.lg },
});
