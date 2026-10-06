import { useRouter } from 'expo-router';
import { useCallback, useRef, useState, type ReactNode } from 'react';

import { useToast } from '@/components/ui';
import type { FormRow } from '@/types/database';

import { copyFormToClasses, createForm, listOtherClassesForms } from '../api';
import { AddFormSheet } from '../components/AddFormSheet';
import { FormSourceSheet } from '../components/FormSourceSheet';
import { errorMessage } from '../errors';
import type { ClassFormsGroup } from '../format';
import { formsRoutes } from '../params';
import { getPreset, type PresetId } from '../presets';

export interface UseAddFormOptions {
  classId: string;
  /** Bu sınıftaki form adları (aynı adlı form notu için). */
  existingTitles: readonly string[];
  /** Form eklendi: listeyi yenileyin. */
  onChanged: () => void;
}

export interface UseAddForm {
  /** "+ Form" panelini açar. */
  open: () => void;
  /** Ekrana bir kez yerleştirin (paneller). */
  sheets: ReactNode;
}

type AfterClose = 'copy' | 'blank' | null;

/**
 * "+ Form" akışı: şablon tek dokunuşla eklenir (toast "Yoklama eklendi"), "Başka sınıftan
 * kopyala" ikinci paneli açar, "Boş form" form oluşturucuya gider.
 */
export function useAddForm({ classId, existingTitles, onChanged }: UseAddFormOptions): UseAddForm {
  const router = useRouter();
  const toast = useToast();

  const [visible, setVisible] = useState(false);
  const [busyPreset, setBusyPreset] = useState<PresetId | null>(null);
  const [error, setError] = useState<string | null>(null);
  const afterClose = useRef<AfterClose>(null);

  const [sourceOpen, setSourceOpen] = useState(false);
  const [groups, setGroups] = useState<ClassFormsGroup[] | null>(null);
  const [groupsError, setGroupsError] = useState<string | null>(null);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [addError, setAddError] = useState<string | null>(null);

  const open = useCallback(() => {
    afterClose.current = null;
    setError(null);
    setVisible(true);
  }, []);

  const loadGroups = useCallback(async () => {
    setGroupsError(null);
    try {
      setGroups(await listOtherClassesForms(classId));
    } catch (e) {
      setGroupsError(errorMessage(e, 'load'));
    }
  }, [classId]);

  const addPreset = async (id: PresetId) => {
    const preset = getPreset(id);
    if (!preset || busyPreset) return;
    setBusyPreset(id);
    setError(null);
    try {
      await createForm(classId, {
        title: preset.title,
        subject: null,
        description: null,
        options: preset.options.map((o) => ({ ...o })),
        mode: preset.mode,
      });
      setVisible(false);
      toast.show(`${preset.title} eklendi`);
      onChanged();
    } catch (e) {
      setError(errorMessage(e, 'save'));
    } finally {
      setBusyPreset(null);
    }
  };

  const onDismissed = () => {
    const next = afterClose.current;
    afterClose.current = null;
    if (next === 'copy') {
      setAddError(null);
      setGroups(null);
      setSourceOpen(true);
      void loadGroups();
    } else if (next === 'blank') {
      router.push(formsRoutes.create(classId));
    }
  };

  const closeThen = (next: AfterClose) => {
    afterClose.current = next;
    setVisible(false);
  };

  const addFromOther = async (form: FormRow) => {
    setAddingId(form.id);
    setAddError(null);
    try {
      const n = await copyFormToClasses(form.id, [classId]);
      if (n === 0) {
        setAddError('Form bu sınıfa eklenmedi. Listeyi yenileyip tekrar deneyin.');
        return;
      }
      setSourceOpen(false);
      toast.show(`${form.title} eklendi`);
      onChanged();
    } catch (e) {
      setAddError(errorMessage(e, 'copy'));
    } finally {
      setAddingId(null);
    }
  };

  const sheets = (
    <>
      <AddFormSheet
        visible={visible}
        onClose={() => (busyPreset ? undefined : closeThen(null))}
        onDismissed={onDismissed}
        existingTitles={existingTitles}
        busyPreset={busyPreset}
        error={error}
        onPreset={(id) => void addPreset(id)}
        onCopyFromOther={() => closeThen('copy')}
        onBlank={() => closeThen('blank')}
      />
      <FormSourceSheet
        visible={sourceOpen}
        onClose={() => setSourceOpen(false)}
        groups={groups}
        loadError={groupsError}
        onRetry={() => void loadGroups()}
        existingTitles={existingTitles}
        busyFormId={addingId}
        pickError={addError}
        onPick={(form) => void addFromOther(form)}
      />
    </>
  );

  return { open, sheets };
}
