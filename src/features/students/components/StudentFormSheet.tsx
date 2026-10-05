import { useRef, useState } from 'react';
import { StyleSheet, View, type TextInput } from 'react-native';

import { Banner, Button, TextField } from '@/components/ui';
import { spacing } from '@/theme';

import { validateStudentDraft, type StudentDraftErrors, type StudentListItem, type ValidStudent } from '../model';
import { KeyboardSheet } from './KeyboardSheet';

export type StudentSubmitResult = { ok: true } | { ok: false; message: string };

export interface StudentFormSheetProps {
  visible: boolean;
  onClose: () => void;
  /** Verilirse düzenleme; yoksa yeni öğrenci. */
  student?: StudentListItem | null;
  /** Sınıftaki tüm öğrenciler (numara çakışması denetimi). */
  classmates: readonly StudentListItem[];
  onSubmit: (value: ValidStudent) => Promise<StudentSubmitResult>;
  /** Düzenlemede "Öğrenciyi sil" (onay ekranı çağıran tarafta). */
  onDelete?: () => void;
}

/**
 * Öğrenci ekleme/düzenleme paneli. Ad kaydedilirken Türkçe baş harf düzenine getirilir.
 * Eklemede "Ekle ve yenisini gir" ile panel kapanmadan art arda giriş yapılabilir.
 * Panel her açılışta yeniden bağlanmalı (çağıran `key` verir).
 */
export function StudentFormSheet({ visible, onClose, student, classmates, onSubmit, onDelete }: StudentFormSheetProps) {
  const editing = Boolean(student);
  const nameRef = useRef<TextInput>(null);
  const numberRef = useRef<TextInput>(null);
  const [fullName, setFullName] = useState(student?.full_name ?? '');
  const [number, setNumber] = useState(student?.number ?? '');
  const [errors, setErrors] = useState<StudentDraftErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState<'close' | 'next' | null>(null);
  const inFlight = useRef(false);

  const others = student ? classmates.filter((s) => s.id !== student.id) : classmates;

  const submit = async (then: 'close' | 'next') => {
    if (inFlight.current) return;
    const result = validateStudentDraft({ fullName, number }, others);
    setFormError(null);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    setErrors({});
    inFlight.current = true;
    setSaving(then);
    const saved = await onSubmit(result.value);
    inFlight.current = false;
    setSaving(null);
    if (!saved.ok) {
      setFormError(saved.message);
      return;
    }
    if (then === 'close') {
      onClose();
      return;
    }
    setFullName('');
    // Numaralar genelde ardışıktır; bir sonrakini önerir.
    setNumber(result.value.number && /^\d+$/.test(result.value.number) ? String(Number(result.value.number) + 1) : '');
    nameRef.current?.focus();
  };

  return (
    <KeyboardSheet
      visible={visible}
      onClose={onClose}
      title={editing ? 'Öğrenciyi düzenle' : 'Öğrenci ekle'}
      footer={
        <>
          <Button
            label={editing ? 'Değişiklikleri kaydet' : 'Öğrenciyi ekle'}
            onPress={() => submit('close')}
            loading={saving === 'close'}
            disabled={saving === 'next'}
          />
          {editing ? (
            onDelete ? (
              <Button label="Öğrenciyi sil" variant="ghost" icon="trash" onPress={onDelete} disabled={Boolean(saving)} />
            ) : null
          ) : (
            <Button
              label="Ekle ve yenisini gir"
              variant="secondary"
              onPress={() => submit('next')}
              loading={saving === 'next'}
              disabled={saving === 'close'}
            />
          )}
        </>
      }
    >
      {formError ? <Banner kind="error" message={formError} /> : null}
      <View style={styles.fields}>
        <TextField
          ref={nameRef}
          label="Ad soyad"
          value={fullName}
          onChangeText={(t) => {
            setFullName(t);
            if (errors.fullName) setErrors((e) => ({ ...e, fullName: null }));
          }}
          error={errors.fullName}
          hint="Büyük/küçük harf otomatik düzeltilir."
          autoFocus={!editing}
          autoCapitalize="words"
          autoComplete="off"
          textContentType="name"
          returnKeyType="next"
          submitBehavior="submit"
          onSubmitEditing={() => numberRef.current?.focus()}
        />
        <TextField
          ref={numberRef}
          label="Okul numarası (isteğe bağlı)"
          value={number}
          onChangeText={(t) => {
            setNumber(t);
            if (errors.number) setErrors((e) => ({ ...e, number: null }));
          }}
          error={errors.number}
          keyboardType="number-pad"
          returnKeyType="done"
          onSubmitEditing={() => submit('close')}
        />
      </View>
    </KeyboardSheet>
  );
}

const styles = StyleSheet.create({
  fields: { gap: spacing.lg },
});
