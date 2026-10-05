import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { Banner, Button, EmptyState, Icon, ListRow, LoadingState, Screen, Sheet, Text, useToast } from '@/components/ui';
import { colors, layout, motion, spacing } from '@/theme';
import type { FormRow } from '@/types/database';

import {
  archiveForm,
  copyFormToClasses,
  deleteForm,
  getClass,
  listClasses,
  listForms,
  listOtherClassesForms,
  type FormListItem,
} from '../api';
import { ActionRow } from '../components/ActionRow';
import { ClassPickerSheet } from '../components/ClassPickerSheet';
import { FormIcon } from '../components/FormIcon';
import { FormListRow } from '../components/FormListRow';
import { FormSourceSheet } from '../components/FormSourceSheet';
import { ToneDots } from '../components/ToneDots';
import { errorMessage } from '../errors';
import { classLabel, type ClassFormsGroup, type ClassSummary } from '../format';
import { firstParam, formsRoutes } from '../params';
import { PRESETS } from '../presets';

type ListState =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; forms: FormListItem[]; className: string | null };

/** Sheet kapanış animasyonu bitmeden ikinci bir Modal/Alert açılmasın (iOS). */
const AFTER_SHEET_MS = motion.duration.slow + 60;

/** /class/[classId]/forms — sınıfın formları, kopyalama ve başka sınıftan ekleme. */
export default function FormsScreen() {
  const params = useLocalSearchParams<{ classId: string }>();
  const classId = firstParam(params.classId) ?? '';
  const router = useRouter();
  const toast = useToast();

  const [state, setState] = useState<ListState>({ kind: 'loading' });
  const [showArchived, setShowArchived] = useState(false);
  const loadedOnce = useRef(false);

  // Eylem menüsü
  const [actionForm, setActionForm] = useState<FormListItem | null>(null);

  // Diğer sınıflara kopyala
  const [copyForm, setCopyForm] = useState<FormRow | null>(null);
  const [classes, setClasses] = useState<ClassSummary[] | null>(null);
  const [classesError, setClassesError] = useState<string | null>(null);
  const [copying, setCopying] = useState(false);
  const [copyError, setCopyError] = useState<string | null>(null);

  // Başka sınıftan form ekle
  const [sourceOpen, setSourceOpen] = useState(false);
  const [groups, setGroups] = useState<ClassFormsGroup[] | null>(null);
  const [groupsError, setGroupsError] = useState<string | null>(null);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [addError, setAddError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!loadedOnce.current) setState({ kind: 'loading' });
    const [formsResult, classResult] = await Promise.allSettled([listForms(classId), getClass(classId)]);
    if (formsResult.status === 'rejected') {
      // Önceden yüklenmiş liste varsa korunur; yalnızca ilk yüklemede hata ekranı.
      if (!loadedOnce.current) setState({ kind: 'error', message: errorMessage(formsResult.reason, 'load') });
      else toast.show(errorMessage(formsResult.reason, 'load'), 'error');
      return;
    }
    loadedOnce.current = true;
    setState({
      kind: 'ready',
      forms: formsResult.value,
      className: classResult.status === 'fulfilled' ? classLabel(classResult.value) : null,
    });
  }, [classId, toast]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const forms = useMemo(() => (state.kind === 'ready' ? state.forms : []), [state]);
  const active = useMemo(() => forms.filter((f) => !f.archived), [forms]);
  const archived = useMemo(() => forms.filter((f) => f.archived), [forms]);

  // ----- Eylemler -----------------------------------------------------------

  const afterSheet = (fn: () => void) => {
    setActionForm(null);
    setTimeout(fn, AFTER_SHEET_MS);
  };

  const loadClasses = useCallback(async () => {
    setClassesError(null);
    try {
      const all = await listClasses();
      setClasses(all.filter((c) => c.id !== classId));
    } catch (error) {
      setClassesError(errorMessage(error, 'load'));
    }
  }, [classId]);

  const openCopy = (form: FormRow) => {
    setCopyError(null);
    setCopyForm(form);
    if (classes === null) void loadClasses();
  };

  const confirmCopy = async (classIds: string[]) => {
    if (!copyForm) return;
    setCopying(true);
    setCopyError(null);
    try {
      const n = await copyFormToClasses(copyForm.id, classIds);
      setCopyForm(null);
      toast.show(`Form ${n} sınıfa eklendi`);
    } catch (error) {
      setCopyError(errorMessage(error, 'copy'));
    } finally {
      setCopying(false);
    }
  };

  const loadGroups = useCallback(async () => {
    setGroupsError(null);
    try {
      setGroups(await listOtherClassesForms(classId));
    } catch (error) {
      setGroupsError(errorMessage(error, 'load'));
    }
  }, [classId]);

  const openSource = () => {
    setAddError(null);
    setGroups(null);
    setSourceOpen(true);
    void loadGroups();
  };

  const addFromOther = async (form: FormRow) => {
    setAddingId(form.id);
    setAddError(null);
    try {
      await copyFormToClasses(form.id, [classId]);
      setSourceOpen(false);
      toast.show(`"${form.title}" bu sınıfa eklendi`);
      void load();
    } catch (error) {
      setAddError(errorMessage(error, 'copy'));
    } finally {
      setAddingId(null);
    }
  };

  const confirmArchive = (form: FormListItem) => {
    Alert.alert(
      `"${form.title}" arşivlensin mi?`,
      'Form listeden kalkar; geçmiş işaretlemeler silinmez. İstediğiniz zaman arşivden çıkarabilirsiniz.',
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Arşivle',
          onPress: async () => {
            try {
              await archiveForm(form.id, true);
              toast.show('Form arşivlendi');
              void load();
            } catch (error) {
              toast.show(errorMessage(error, 'archive'), 'error');
            }
          },
        },
      ],
    );
  };

  const unarchive = async (form: FormListItem) => {
    try {
      await archiveForm(form.id, false);
      toast.show('Form arşivden çıkarıldı');
      void load();
    } catch (error) {
      toast.show(errorMessage(error, 'archive'), 'error');
    }
  };

  const confirmDelete = (form: FormListItem) => {
    Alert.alert(
      `"${form.title}" formu silinsin mi?`,
      'Formun tüm oturumları ve işaretlemeleri de silinir. Bu işlem geri alınamaz.',
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Formu sil',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteForm(form.id);
              toast.show('Form silindi');
              void load();
            } catch (error) {
              toast.show(errorMessage(error, 'delete'), 'error');
            }
          },
        },
      ],
    );
  };

  // ----- Görünüm -------------------------------------------------------------

  const footer =
    state.kind === 'ready' ? (
      <Button label="Yeni form oluştur" icon="plus" onPress={() => router.push(formsRoutes.create(classId))} />
    ) : undefined;

  let content;
  if (state.kind === 'loading') {
    content = <LoadingState label="Formlar yükleniyor" />;
  } else if (state.kind === 'error') {
    content = (
      <View style={styles.errorBox}>
        <Banner kind="error" title="Formlar yüklenemedi" message={state.message} />
        <Button label="Tekrar dene" variant="secondary" fullWidth={false} onPress={() => void load()} />
      </View>
    );
  } else {
    content = (
      <>
        {state.className ? (
          <Text variant="body" tone="muted" style={styles.className}>
            {state.className} sınıfı
          </Text>
        ) : null}

        <Pressable
          onPress={openSource}
          accessibilityRole="button"
          accessibilityLabel="Başka sınıftan form ekle"
          accessibilityHint="Diğer sınıflarınızdaki bir formu bu sınıfa kopyalar"
          style={({ pressed }) => [styles.addOther, pressed && styles.addOtherPressed]}
        >
          <FormIcon name="addFromOther" size={22} color={colors.primary} />
          <View style={styles.addOtherTexts}>
            <Text variant="label" tone="primary">
              Başka sınıftan form ekle
            </Text>
            <Text variant="caption" tone="muted">
              Diğer sınıfınızdaki formu tek dokunuşla buraya ekleyin.
            </Text>
          </View>
          <Icon name="chevronRight" size={16} color={colors.textMuted} />
        </Pressable>

        {active.length === 0 ? (
          <View>
            <EmptyState
              icon="book"
              title="Bu sınıfta henüz form yok"
              description="Formlar yoklama, ödev kontrolü ya da sözlü gibi listeleri hızlıca işaretlemenizi sağlar. Bir şablonla başlayın ya da kendi formunuzu oluşturun."
            />
            <Text variant="label" style={styles.templatesTitle}>
              Şablonla başlayın
            </Text>
            {PRESETS.map((p) => (
              <ListRow
                key={p.id}
                title={p.title}
                subtitle={p.summary}
                trailing={<ToneDots options={p.options} />}
                onPress={() => router.push(formsRoutes.create(classId, p.id))}
                accessibilityLabel={`${p.title} şablonuyla form oluştur: ${p.summary}`}
                style={styles.templateRow}
              />
            ))}
          </View>
        ) : (
          <View>
            {active.map((form) => (
              <FormListRow
                key={form.id}
                form={form}
                onOpen={() => router.push(formsRoutes.sessions(classId, form.id))}
                onMore={() => setActionForm(form)}
              />
            ))}
          </View>
        )}

        {archived.length > 0 ? (
          <View style={styles.archive}>
            <Pressable
              onPress={() => setShowArchived((v) => !v)}
              accessibilityRole="button"
              accessibilityLabel={`Arşivdeki formlar, ${archived.length}`}
              accessibilityState={{ expanded: showArchived }}
              style={({ pressed }) => [styles.archiveToggle, pressed && styles.addOtherPressed]}
            >
              <FormIcon name="archive" size={18} color={colors.textMuted} />
              <Text variant="label" tone="muted" style={styles.flex}>
                Arşivdeki formlar ({archived.length})
              </Text>
              <Icon name={showArchived ? 'chevronDown' : 'chevronRight'} size={16} color={colors.textMuted} />
            </Pressable>
            {showArchived
              ? archived.map((form) => (
                  <FormListRow
                    key={form.id}
                    form={form}
                    muted
                    onOpen={() => router.push(formsRoutes.sessions(classId, form.id))}
                    onMore={() => setActionForm(form)}
                  />
                ))
              : null}
          </View>
        ) : null}
      </>
    );
  }

  return (
    <Screen title="Formlar" largeTitle scroll={state.kind !== 'loading'} footer={footer}>
      {content}

      <Sheet visible={actionForm !== null} onClose={() => setActionForm(null)} title={actionForm?.title ?? ''}>
        {actionForm ? (
          <View>
            <ActionRow
              icon="list"
              label="Oturumları aç"
              onPress={() => {
                const f = actionForm;
                setActionForm(null);
                router.push(formsRoutes.sessions(classId, f.id));
              }}
            />
            <ActionRow
              icon="edit"
              label="Formu düzenle"
              onPress={() => {
                const f = actionForm;
                setActionForm(null);
                router.push(formsRoutes.edit(classId, f.id));
              }}
            />
            <ActionRow
              icon="copy"
              label="Diğer sınıflara kopyala"
              hint="Seçtiğiniz sınıflara aynı formu ekler"
              onPress={() => {
                const f = actionForm;
                afterSheet(() => openCopy(f));
              }}
            />
            {actionForm.archived ? (
              <ActionRow
                icon="unarchive"
                label="Arşivden çıkar"
                onPress={() => {
                  const f = actionForm;
                  setActionForm(null);
                  void unarchive(f);
                }}
              />
            ) : (
              <ActionRow
                icon="archive"
                label="Arşivle"
                hint="Listeden kalkar, işaretlemeler korunur"
                onPress={() => {
                  const f = actionForm;
                  afterSheet(() => confirmArchive(f));
                }}
              />
            )}
            <ActionRow
              icon="trash"
              label="Formu sil"
              destructive
              onPress={() => {
                const f = actionForm;
                afterSheet(() => confirmDelete(f));
              }}
            />
          </View>
        ) : null}
      </Sheet>

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

      <FormSourceSheet
        visible={sourceOpen}
        onClose={() => setSourceOpen(false)}
        groups={groups}
        loadError={groupsError}
        onRetry={() => void loadGroups()}
        existingTitles={forms.map((f) => f.title)}
        busyFormId={addingId}
        pickError={addError}
        onPick={(form) => void addFromOther(form)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  className: { marginTop: -spacing.md, marginBottom: spacing.lg },
  errorBox: { gap: spacing.lg, paddingTop: spacing.lg },
  addOther: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: layout.minTouch + spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: layout.hairline,
    borderBottomWidth: layout.hairline,
    borderColor: colors.rule,
  },
  addOtherPressed: { backgroundColor: colors.pressedOverlay },
  addOtherTexts: { flex: 1, gap: spacing.xxs },
  templatesTitle: { marginBottom: spacing.xs },
  templateRow: { marginHorizontal: -layout.pageX },
  archive: { marginTop: spacing.xxl },
  archiveToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: layout.minTouch,
    borderBottomWidth: layout.hairline,
    borderBottomColor: colors.rule,
  },
});
