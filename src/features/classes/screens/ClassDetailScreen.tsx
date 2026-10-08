import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import {
  Avatar,
  Banner,
  Button,
  ConfirmSheet,
  HeroBlock,
  IconButton,
  IconTile,
  ListRow,
  LoadingState,
  OverflowMenu,
  Pill,
  Screen,
  SectionHeader,
  Text,
  useToast,
  type OverflowAction,
} from '@/components/ui';
import { FormListRow, formsRoutes, listForms, useAddForm, useFormActions } from '@/features/forms';
import { colors, layout, spacing } from '@/theme';

import { deleteClass, getClass, listStudentPreview } from '../api';
import { toUserMessage } from '../errors';
import { classMetaParts, suggestClassName } from '../model';
import { useRemoteData } from '../useRemoteData';

const CLASS_ERROR = 'Sınıf açılamadı. Bağlantınızı kontrol edip tekrar deneyin.';
const FORMS_ERROR = 'Formlar yüklenemedi. Aşağı çekerek yenileyin.';

/**
 * `/class/[classId]`: sınıfın formları (satıra dokununca "İşaretle | Geçmiş" form ekranı açılır),
 * küçük "+ Form", altta tek satır "Öğrenciler". Sınıfı düzenle/sil "⋯" içinde.
 */
export function ClassDetailScreen() {
  const { classId, imported } = useLocalSearchParams<{ classId: string; imported?: string }>();
  const router = useRouter();
  const toast = useToast();

  // Fotoğraftan içe aktarma dönüşü: onayı bir kez göster, parametreyi temizle.
  const shownImport = useRef<string | null>(null);
  useEffect(() => {
    if (!imported) {
      shownImport.current = null;
      return;
    }
    if (shownImport.current === imported) return;
    shownImport.current = imported;
    const count = Number(imported);
    if (Number.isInteger(count) && count > 0) toast.show(`${count} öğrenci eklendi`);
    router.setParams({ imported: undefined });
  }, [imported, router, toast]);

  const loadClass = useCallback(() => getClass(classId), [classId]);
  const loadForms = useCallback(() => listForms(classId), [classId]);
  // Avatar yığını süstür: yüklenemezse sessizce boş kalır, ekranı hataya düşürmez.
  const loadPreview = useCallback(async () => {
    try {
      return await listStudentPreview(classId);
    } catch {
      return [];
    }
  }, [classId]);
  const cls = useRemoteData(loadClass, CLASS_ERROR);
  const forms = useRemoteData(loadForms, FORMS_ERROR);
  const preview = useRemoteData(loadPreview, '');

  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const allForms = useMemo(() => forms.data ?? [], [forms.data]);
  const active = useMemo(() => allForms.filter((f) => !f.archived), [allForms]);
  const archivedCount = allForms.length - active.length;
  const titles = useMemo(() => allForms.map((f) => f.title), [allForms]);

  const reloadForms = useCallback(() => {
    void forms.refresh();
  }, [forms]);
  const addForm = useAddForm({ classId, existingTitles: titles, onChanged: reloadForms });
  const formActions = useFormActions({ classId, onChanged: reloadForms });

  const refreshAll = async () => {
    await Promise.all([cls.refresh(), forms.refresh()]);
  };

  const removeClass = async () => {
    const c = cls.data;
    if (!c) return;
    setDeleting(true);
    try {
      await deleteClass(c.id);
      setConfirmDelete(false);
      toast.show(`${c.name} silindi`);
      if (router.canGoBack()) router.back();
      else router.replace('/');
    } catch (err) {
      toast.show(toUserMessage(err, 'Sınıf silinemedi. Bağlantınızı kontrol edip tekrar deneyin.'), 'error');
    } finally {
      setDeleting(false);
    }
  };

  // ----- Durumlar -----

  if (cls.status === 'loading') {
    return (
      <Screen scroll={false} testID="class-screen">
        <LoadingState label="Sınıf açılıyor" />
      </Screen>
    );
  }

  if (cls.status === 'error' || !cls.data) {
    return (
      <Screen title="Sınıf" contentStyle={styles.errorBox} testID="class-screen">
        <Banner kind="error" title="Sınıf açılamadı" message={cls.error ?? CLASS_ERROR} />
        <Button label="Tekrar dene" variant="secondary" onPress={cls.retry} testID="class-retry" />
        <Button label="Sınıflarıma dön" variant="ghost" onPress={() => router.replace('/')} />
      </Screen>
    );
  }

  const c = cls.data;

  const menuActions: OverflowAction[] = [
    {
      key: 'edit',
      label: 'Sınıfı düzenle',
      icon: 'edit',
      onPress: () => router.push({ pathname: '/class/new', params: { classId: c.id } }),
    },
  ];
  if (archivedCount > 0) {
    menuActions.push({
      key: 'archive',
      label: `Arşivdeki formlar (${archivedCount})`,
      icon: 'archive',
      onPress: () => router.push(formsRoutes.list(c.id)),
    });
  }
  menuActions.push({
    key: 'delete',
    label: 'Sınıfı sil',
    icon: 'trash',
    destructive: true,
    onPress: () => setConfirmDelete(true),
  });

  let formsContent;
  if (forms.status === 'loading') {
    formsContent = (
      <View style={styles.formsLoading}>
        <LoadingState label="Formlar yükleniyor" />
      </View>
    );
  } else if (forms.status === 'error') {
    formsContent = (
      <View style={styles.padded}>
        <Banner kind="error" message={forms.error ?? FORMS_ERROR} />
        <Button label="Tekrar dene" variant="secondary" fullWidth={false} onPress={forms.retry} testID="class-forms-retry" />
      </View>
    );
  } else if (active.length === 0) {
    formsContent = (
      <ListRow
        variant="card"
        title="Henüz form yok"
        subtitle="Yoklama ya da sözlü ekleyin"
        leading={<IconTile icon="plus" paper="gok" />}
        showChevron={false}
        onPress={addForm.open}
        accessibilityLabel="Henüz form yok. Form ekle"
        testID="class-forms-empty"
      />
    );
  } else {
    formsContent = active.map((form, index) => (
      <FormListRow
        key={form.id}
        form={form}
        index={index}
        onOpen={() => router.push(formsRoutes.open(c.id, form.id))}
        onMore={() => formActions.open(form)}
        openHint="İşaretle ve geçmiş sekmeleriyle formu açar"
      />
    ));
  }

  // Sınıf adı kimlik bloğunda; altındaki satır yalnızca addan türetilemeyen ayrıntıyı ("5. sınıf") taşır.
  const derived = suggestClassName(c.grade ?? '', c.section ?? '');
  const meta = derived && derived.toLocaleLowerCase('tr-TR') === c.name.toLocaleLowerCase('tr-TR') ? [] : classMetaParts(c);
  const previewNames = preview.data ?? [];

  return (
    <Screen
      scroll={false}
      padded={false}
      testID="class-screen"
      headerRight={
        <IconButton
          icon="more"
          accessibilityLabel="Diğer seçenekler"
          onPress={() => setMenuOpen(true)}
          testID="class-more"
        />
      }
    >
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={cls.refreshing || forms.refreshing}
            onRefresh={refreshAll}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {cls.error ? (
          <View style={styles.padded}>
            <Banner kind="error" message={cls.error} />
          </View>
        ) : null}

        <HeroBlock title={c.name} subtitle={meta.length > 0 ? meta.join(', ') : undefined} sticker style={styles.hero} testID="class-hero">
          {previewNames.length > 0 ? (
            <View style={styles.avatars}>
              {previewNames.map((n, i) => (
                <View key={`${n}-${i}`} style={i > 0 ? styles.avatarOverlap : undefined}>
                  <Avatar name={n} size="sm" />
                </View>
              ))}
            </View>
          ) : null}
          <Pill label={`${c.studentCount} öğrenci`} testID="class-student-pill" />
        </HeroBlock>

        <SectionHeader
          title="Formlar"
          count={active.length > 0 ? active.length : undefined}
          actionLabel="Form"
          actionIcon="plus"
          actionAccessibilityLabel="Form ekle"
          onAction={addForm.open}
          actionTestID="class-add-form"
          padded
          style={styles.section}
        />
        <View>{formsContent}</View>

        <View style={styles.students}>
          <ListRow
            variant="card"
            title="Öğrenciler"
            subtitle={c.studentCount === 0 ? 'Henüz öğrenci yok' : undefined}
            leading={<IconTile icon="people" paper="pembe" />}
            trailing={
              <Text variant="heading" testID="class-student-count">
                {String(c.studentCount)}
              </Text>
            }
            onPress={() => router.push(`/class/${c.id}/students`)}
            accessibilityLabel={`Öğrenciler, ${c.studentCount} öğrenci`}
            accessibilityHint="Öğrenci listesini açar"
            testID="class-students-row"
          />
        </View>
      </ScrollView>

      {addForm.sheets}
      {formActions.sheets}

      <OverflowMenu
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        title={c.name}
        actions={menuActions}
        testID="class-menu"
      />
      <ConfirmSheet
        visible={confirmDelete}
        title={`${c.name} silinsin mi?`}
        message={`${c.studentCount} öğrenci, ${c.formCount} form ve tüm kayıtlar da silinir.`}
        confirmLabel="Sınıfı sil"
        loading={deleting}
        onConfirm={() => void removeClass()}
        onCancel={() => setConfirmDelete(false)}
        testID="class-delete-confirm"
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: spacing.huge },
  padded: { paddingHorizontal: layout.pageX, gap: spacing.md, paddingVertical: spacing.sm },
  // Kimlik bloğunun bandı ve gölgesi sayfa kenarından taşar: yatay boşluk bloğun kendisinde.
  hero: { marginHorizontal: layout.pageX, marginTop: spacing.md },
  avatars: { flexDirection: 'row', alignItems: 'center' },
  avatarOverlap: { marginLeft: -spacing.xs - spacing.xxs },
  section: { marginTop: spacing.xxl, marginBottom: spacing.xs },
  formsLoading: { paddingVertical: spacing.xl },
  students: { marginTop: spacing.xs },
  errorBox: { gap: spacing.lg, paddingTop: spacing.lg },
});
