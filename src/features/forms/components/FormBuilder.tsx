import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Banner, BottomActionBar, Button, ConfirmSheet, Screen, SectionHeader, TextField } from '@/components/ui';
import { spacing } from '@/theme';
import type { FormOption } from '@/types/database';

import type { FormInput } from '../api';
import { errorMessage } from '../errors';
import {
  createDraftOption,
  finalizeOptions,
  removedOptions,
  toDraftOptions,
  validateForm,
  type DraftOption,
  type FormValidation,
} from '../options';
import { getPreset, type PresetId } from '../presets';
import { OptionsEditor } from './OptionsEditor';

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

/**
 * Yeni form ve düzenleme ekranlarının ortak gövdesi: ad + seçenekler (renkli).
 * Ders/açıklama "Ayrıntı ekle" ile, sıralama/kaldırma "Düzenle" ile açılır.
 */
export function FormBuilder({ initial, originalOptions, screenTitle, submitLabel, onSubmit }: FormBuilderProps) {
  const [values, setValues] = useState<FormBuilderValues>(initial);
  const [showDetails, setShowDetails] = useState(Boolean(initial.subject || initial.description));
  const [editingOptions, setEditingOptions] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState(false);

  const validation = useMemo(() => validateForm(values), [values]);
  const removed = useMemo(
    () => (originalOptions ? removedOptions(originalOptions, values.options) : []),
    [originalOptions, values.options],
  );

  const patch = (next: Partial<FormBuilderValues>) => setValues((v) => ({ ...v, ...next }));

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
    } finally {
      setSaving(false);
      setConfirmRemove(false);
    }
  };

  const submit = () => {
    setAttempted(true);
    if (!validation.valid || saving) return;
    if (removed.length > 0) {
      setConfirmRemove(true);
      return;
    }
    void save();
  };

  const show: Omit<FormValidation, 'valid'> = attempted ? validation : { optionErrors: {} };

  return (
    <Screen
      title={screenTitle}
      headerDivider
      testID="form-builder"
      footer={
        <BottomActionBar
          hint={attempted && !validation.valid ? 'Kırmızı işaretli alanları düzeltin.' : undefined}
          primary={{ label: submitLabel, onPress: submit, loading: saving, testID: 'form-save' }}
        />
      }
    >
      <View style={styles.body}>
        {saveError ? <Banner kind="error" message={saveError} /> : null}

        <View style={styles.fields}>
          <TextField
            label="Form adı"
            value={values.title}
            onChangeText={(title) => patch({ title })}
            placeholder="Örneğin Yoklama"
            error={show.title}
            autoCapitalize="sentences"
            returnKeyType="next"
            testID="form-title-input"
          />
          {showDetails ? (
            <>
              <TextField
                label="Ders (isteğe bağlı)"
                value={values.subject}
                onChangeText={(subject) => patch({ subject })}
                placeholder="Örneğin Matematik"
                autoCapitalize="words"
                returnKeyType="next"
                testID="form-subject-input"
              />
              <TextField
                label="Açıklama (isteğe bağlı)"
                value={values.description}
                onChangeText={(description) => patch({ description })}
                placeholder="Örneğin 5. sınıf MEB kitabı"
                testID="form-description-input"
              />
            </>
          ) : (
            <Button
              label="Ayrıntı ekle"
              icon="plus"
              variant="ghost"
              size="sm"
              fullWidth={false}
              onPress={() => setShowDetails(true)}
              testID="form-details-toggle"
              style={styles.ghostStart}
            />
          )}
        </View>

        <View style={styles.section}>
          <SectionHeader
            title="Seçenekler"
            count={values.options.length}
            actionLabel={editingOptions ? 'Bitti' : 'Düzenle'}
            actionIcon={editingOptions ? 'check' : 'edit'}
            actionAccessibilityLabel={editingOptions ? 'Düzenlemeyi bitir' : 'Seçenekleri sırala ya da kaldır'}
            onAction={() => setEditingOptions((v) => !v)}
            actionTestID="form-options-edit"
          />
          {removed.length > 0 ? (
            <Banner
              kind="warning"
              message={`${quoteList(removed.map((o) => o.label))} kaldırıldı; eski işaretlemeler etiketsiz görünür.`}
            />
          ) : null}
          {show.options ? <Banner kind="error" message={show.options} /> : null}
          <OptionsEditor
            options={values.options}
            onChange={(options) => patch({ options })}
            errors={show.optionErrors}
            editing={editingOptions}
          />
        </View>
      </View>

      <ConfirmSheet
        visible={confirmRemove}
        title={removed.length === 1 ? 'Seçenek kaldırılsın mı?' : 'Seçenekler kaldırılsın mı?'}
        message={`${quoteList(removed.map((o) => o.label))} ile yapılmış eski işaretlemeler etiketsiz görünür.`}
        confirmLabel="Kaldır ve kaydet"
        loading={saving}
        onConfirm={() => void save()}
        onCancel={() => setConfirmRemove(false)}
        testID="form-remove-confirm"
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { gap: spacing.xxl, paddingTop: spacing.lg, paddingBottom: spacing.xxl },
  section: { gap: spacing.sm },
  fields: { gap: spacing.md },
  ghostStart: { alignSelf: 'flex-start', marginLeft: -spacing.md },
});
