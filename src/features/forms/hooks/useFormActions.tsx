import { useRouter } from 'expo-router';
import { useCallback, useState, type ReactNode } from 'react';

import { ConfirmSheet, OverflowMenu, useToast, type OverflowAction } from '@/components/ui';
import type { FormRow } from '@/types/database';

import { archiveForm, copyFormToClasses, deleteForm, listClasses } from '../api';
import { ClassPickerSheet } from '../components/ClassPickerSheet';
import { errorMessage } from '../errors';
import type { ClassSummary } from '../format';
import { formsRoutes } from '../params';

export interface UseFormActionsOptions {
  classId: string;
  /** Form arşivlendi / silindi: listeyi yenileyin. */
  onChanged: () => void;
}

export interface UseFormActions {
  /** Formun "⋯" menüsünü açar. */
  open: (form: FormRow) => void;
  /** Ekrana bir kez yerleştirin (menü, kopyalama paneli, silme onayı). */
  sheets: ReactNode;
}

/**
 * Form satırının ikincil eylemleri: Geçmiş kayıtlar, Düzenle, Diğer sınıflara kopyala,
 * Arşivle (geri alınabilir, onay yok), Sil (ConfirmSheet).
 */
export function useFormActions({ classId, onChanged }: UseFormActionsOptions): UseFormActions {
  const router = useRouter();
  const toast = useToast();

  const [menuForm, setMenuForm] = useState<FormRow | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const [copyForm, setCopyForm] = useState<FormRow | null>(null);
  const [classes, setClasses] = useState<ClassSummary[] | null>(null);
  const [classesError, setClassesError] = useState<string | null>(null);
  const [copying, setCopying] = useState(false);
  const [copyError, setCopyError] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<FormRow | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const open = useCallback((form: FormRow) => {
    setMenuForm(form);
    setMenuOpen(true);
  }, []);

  const loadClasses = useCallback(async () => {
    setClassesError(null);
    try {
      const all = await listClasses();
      setClasses(all.filter((c) => c.id !== classId));
    } catch (e) {
      setClassesError(errorMessage(e, 'load'));
    }
  }, [classId]);

  const openCopy = (form: FormRow) => {
    setCopyError(null);
    setClasses(null);
    setCopyForm(form);
    void loadClasses();
  };

  const confirmCopy = async (ids: string[]) => {
    if (!copyForm) return;
    setCopying(true);
    setCopyError(null);
    try {
      const n = await copyFormToClasses(copyForm.id, ids);
      if (n === 0) {
        setCopyError('Form hiçbir sınıfa eklenmedi. Listeyi yenileyip tekrar deneyin.');
        void loadClasses();
        return;
      }
      setCopyForm(null);
      toast.show(`Form ${n} sınıfa kopyalandı`);
    } catch (e) {
      setCopyError(errorMessage(e, 'copy'));
    } finally {
      setCopying(false);
    }
  };

  const toggleArchive = async (form: FormRow) => {
    try {
      await archiveForm(form.id, !form.archived);
      toast.show(form.archived ? `${form.title} arşivden çıkarıldı` : `${form.title} arşivlendi`);
      onChanged();
    } catch (e) {
      toast.show(errorMessage(e, 'archive'), 'error');
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteForm(deleteTarget.id);
      toast.show(`${deleteTarget.title} silindi`);
      setDeleteOpen(false);
      onChanged();
    } catch (e) {
      toast.show(errorMessage(e, 'delete'), 'error');
    } finally {
      setDeleting(false);
    }
  };

  const actions: OverflowAction[] = menuForm
    ? [
        {
          key: 'history',
          label: 'Geçmiş kayıtlar',
          icon: 'calendar',
          onPress: () => router.push(formsRoutes.sessions(classId, menuForm.id)),
        },
        {
          key: 'edit',
          label: 'Düzenle',
          icon: 'edit',
          onPress: () => router.push(formsRoutes.edit(classId, menuForm.id)),
        },
        {
          key: 'copy',
          label: 'Diğer sınıflara kopyala',
          icon: 'copy',
          onPress: () => openCopy(menuForm),
        },
        {
          key: 'archive',
          label: menuForm.archived ? 'Arşivden çıkar' : 'Arşivle',
          icon: 'archive',
          onPress: () => void toggleArchive(menuForm),
        },
        {
          key: 'delete',
          label: 'Sil',
          icon: 'trash',
          destructive: true,
          onPress: () => {
            setDeleteTarget(menuForm);
            setDeleteOpen(true);
          },
        },
      ]
    : [];

  const sheets = (
    <>
      <OverflowMenu
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        title={menuForm?.title ?? ''}
        actions={actions}
        testID="form-menu"
      />
      <ClassPickerSheet
        visible={copyForm !== null}
        onClose={() => setCopyForm(null)}
        formTitle={copyForm?.title ?? ''}
        classes={classes}
        loadError={classesError}
        onRetry={() => void loadClasses()}
        busy={copying}
        submitError={copyError}
        onConfirm={(ids) => void confirmCopy(ids)}
      />
      <ConfirmSheet
        visible={deleteOpen}
        title={`${deleteTarget?.title ?? 'Form'} silinsin mi?`}
        message="Formun tüm kayıtları ve işaretlemeleri de silinir."
        confirmLabel="Formu sil"
        loading={deleting}
        onConfirm={() => void confirmDelete()}
        onCancel={() => setDeleteOpen(false)}
        testID="form-delete-confirm"
      />
    </>
  );

  return { open, sheets };
}
