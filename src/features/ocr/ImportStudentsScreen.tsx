import { useNavigation, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Image, Linking, StyleSheet, useWindowDimensions, View } from 'react-native';

import {
  Banner,
  Button,
  LoadingState,
  Screen,
  Sheet,
  Text,
  useToast,
} from '@/components/ui';
import { layout, radii, spacing } from '@/theme';
import type { ClassRow, StudentRow } from '@/types/database';

import { fetchImportContext, insertStudents } from './api';
import { PhotoStrip, type ImportPhoto } from './components/PhotoStrip';
import { ReviewRowItem } from './components/ReviewRowItem';
import { SampleSheet } from './components/SampleSheet';
import { permissionMessages, pickPhoto, type PhotoSource } from './photos';
import { isExpoGo, recognizeMessages, recognizePhoto } from './recognize';
import {
  appendParsed,
  computeIssues,
  createManualRow,
  nextRowId,
  toDrafts,
  type ReviewRow,
} from './review';

const TITLE = 'Fotoğraftan öğrenci ekle';

const NOTHING_FOUND =
  'Bu fotoğrafta öğrenci listesi bulunamadı. Listenin tamamı kadraja girecek şekilde, yakından ve düz çekin.';

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; classRow: ClassRow; students: StudentRow[] };

interface Notice {
  kind: 'error' | 'warning';
  message: string;
  /** İzin reddedildiyse Ayarlar'a gitme düğmesi gösterilir. */
  settings?: boolean;
}

export interface ImportStudentsScreenProps {
  classId: string;
}

export function ImportStudentsScreen({ classId }: ImportStudentsScreenProps) {
  const router = useRouter();
  const navigation = useNavigation();
  const toast = useToast();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const expoGo = useMemo(() => isExpoGo(), []);

  const [load, setLoad] = useState<LoadState>({ status: 'loading' });
  const [photos, setPhotos] = useState<ImportPhoto[]>([]);
  const [rows, setRows] = useState<ReviewRow[]>([]);
  const [manual, setManual] = useState(false);
  const [reading, setReading] = useState<PhotoSource | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [preview, setPreview] = useState<{ photo: ImportPhoto; index: number } | null>(null);
  const [saving, setSaving] = useState(false);
  const [focusRowId, setFocusRowId] = useState<string | null>(null);
  const allowLeave = useRef(false);

  // ------------------------------------------------------------------ yükleme
  const [loadAttempt, setLoadAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    fetchImportContext(classId).then(
      (ctx) => {
        if (active) setLoad({ status: 'ready', classRow: ctx.classRow, students: ctx.students });
      },
      (error: unknown) => {
        if (active) setLoad({ status: 'error', message: error instanceof Error ? error.message : String(error) });
      },
    );
    return () => {
      active = false;
    };
  }, [classId, loadAttempt]);

  const retryLoad = () => {
    setLoad({ status: 'loading' });
    setLoadAttempt((n) => n + 1);
  };

  const existing = useMemo(() => (load.status === 'ready' ? load.students : []), [load]);
  const issues = useMemo(() => computeIssues(rows, existing), [rows, existing]);
  const drafts = useMemo(() => toDrafts(rows), [rows]);
  const flaggedCount = useMemo(
    () => rows.filter((r) => r.include && (issues.get(r.id)?.length ?? 0) > 0).length,
    [rows, issues],
  );
  const reviewing = rows.length > 0 || manual;
  const dirty = rows.some((r) => r.fullName.trim() || r.number.trim());

  // ---------------------------------------------- kaydedilmemiş listeden çıkış
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (event) => {
      if (allowLeave.current || !dirty) return;
      event.preventDefault();
      Alert.alert('Okunan liste silinsin mi?', 'Eklemediğiniz öğrenciler kaybolur.', [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Listeyi sil',
          style: 'destructive',
          onPress: () => {
            allowLeave.current = true;
            navigation.dispatch(event.data.action);
          },
        },
      ]);
    });
    return unsubscribe;
  }, [navigation, dirty]);

  // ---------------------------------------------------------- fotoğraf ekleme
  const addPhoto = useCallback(
    async (source: PhotoSource) => {
      setNotice(null);
      const picked = await pickPhoto(source);
      if (picked.status === 'cancelled') return;
      if (picked.status === 'denied') {
        setNotice({ kind: 'warning', message: permissionMessages[picked.source], settings: !picked.canAskAgain });
        return;
      }
      if (picked.status === 'error') {
        setNotice({ kind: 'error', message: picked.message });
        return;
      }

      setReading(source);
      const outcome = await recognizePhoto(picked.uri, picked.width);
      setReading(null);

      if (!outcome.ok) {
        setNotice({ kind: 'error', message: outcome.message });
        return;
      }
      if (outcome.students.length === 0) {
        setNotice({ kind: 'warning', message: NOTHING_FOUND });
        return;
      }

      const photo: ImportPhoto = {
        id: nextRowId(),
        uri: outcome.uri,
        width: picked.width,
        height: picked.height,
        rowCount: outcome.students.length,
      };
      setPhotos((prev) => [...prev, photo]);
      setRows((prev) => appendParsed(prev, outcome.students, photo.id, existing));
      toast.show(`${outcome.students.length} satır okundu`, 'info');
    },
    [existing, toast],
  );

  // ------------------------------------------------------------ satır işlemleri
  const updateRow = useCallback(
    (id: string, patch: Partial<Pick<ReviewRow, 'number' | 'fullName' | 'include'>>) => {
      setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
    },
    [],
  );

  const removeRow = useCallback((id: string) => {
    setRows((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const addManualRow = useCallback(() => {
    const row = createManualRow();
    setManual(true);
    setFocusRowId(row.id);
    setRows((prev) => [...prev, row]);
  }, []);

  const removePhoto = useCallback((photoId: string) => {
    setPreview(null);
    setPhotos((prev) => prev.filter((p) => p.id !== photoId));
    setRows((prev) => prev.filter((r) => r.photoId !== photoId));
  }, []);

  // ------------------------------------------------------------------ kaydetme
  const save = useCallback(async () => {
    if (drafts.length === 0 || saving) return;
    setSaving(true);
    setNotice(null);
    try {
      const count = await insertStudents(classId, drafts);
      allowLeave.current = true;
      // Onay bildirimi sınıf ekranında `imported` parametresiyle bir kez gösterilir.
      router.dismissTo({ pathname: '/class/[classId]', params: { classId, imported: String(count) } });
    } catch (error) {
      setNotice({ kind: 'error', message: error instanceof Error ? error.message : String(error) });
      setSaving(false);
    }
  }, [classId, drafts, router, saving]);

  // -------------------------------------------------------------------- görünüm
  if (load.status === 'loading') {
    return (
      <Screen title={TITLE} scroll={false}>
        <LoadingState label="Sınıf bilgileri yükleniyor" />
      </Screen>
    );
  }

  if (load.status === 'error') {
    return (
      <Screen title={TITLE}>
        <View style={styles.section}>
          <Banner kind="error" title="Sınıf yüklenemedi" message={load.message} />
          <Button label="Tekrar dene" variant="secondary" onPress={retryLoad} />
        </View>
      </Screen>
    );
  }

  const className = load.classRow.name;
  const busy = reading !== null || saving;

  const noticeView = notice ? (
    <View style={styles.notice}>
      <Banner kind={notice.kind} message={notice.message} />
      {notice.settings ? (
        <Button label="Ayarları aç" variant="ghost" size="sm" fullWidth={false} onPress={() => void Linking.openSettings()} />
      ) : null}
    </View>
  ) : null;

  const unavailableBanner = expoGo ? (
    <Banner kind="warning" title="Fotoğraftan okuma kapalı" message={recognizeMessages.unavailable} />
  ) : null;

  // ------------------------------------------------------------ 1. adım: giriş
  if (!reviewing) {
    return (
      <Screen
        title={TITLE}
        footer={
          <>
            <Button
              label="Fotoğraf çek"
              icon="camera"
              onPress={() => void addPhoto('camera')}
              loading={reading === 'camera'}
              disabled={expoGo || busy}
            />
            <Button
              label="Galeriden seç"
              icon="photo"
              variant="secondary"
              onPress={() => void addPhoto('library')}
              loading={reading === 'library'}
              disabled={expoGo || busy}
            />
          </>
        }
      >
        <View style={styles.section}>
          <Text variant="heading" accessibilityRole="header">
            {`${className} sınıf listesini okuyun`}
          </Text>
          <Text variant="body" tone="muted">
            e-Okul’dan aldığınız ya da elle yazdığınız listenin fotoğrafını çekin. Numaraları ve adları
            okuyup size gösteririz; siz onaylamadan hiçbir öğrenci eklenmez.
          </Text>
        </View>

        {unavailableBanner}
        {noticeView}

        {reading ? (
          <View style={styles.reading}>
            <LoadingState label="Fotoğraf okunuyor" />
          </View>
        ) : (
          <View style={styles.section}>
            <SampleSheet />
            <View style={styles.tips}>
              <Text variant="bodySmall" tone="muted">
                Sıra numarası ve cinsiyet sütunu atlanır, adlar “Selin Bayezit” biçimine çevrilir.
              </Text>
              <Text variant="bodySmall" tone="muted">
                Sayfayı düz bir yüzeye koyun, gölge düşürmeyin. Liste birden fazla sayfaysa her sayfayı ayrı
                ekleyin.
              </Text>
            </View>
            <Button
              label="Öğrencileri elle yazın"
              icon="edit"
              variant="ghost"
              fullWidth={false}
              onPress={addManualRow}
              disabled={busy}
            />
          </View>
        )}
      </Screen>
    );
  }

  // ------------------------------------------------------- 2. adım: inceleme
  const previewSize = preview
    ? (() => {
        const maxW = windowWidth - layout.pageX * 2;
        const ratio = preview.photo.height > 0 ? preview.photo.height / preview.photo.width : 4 / 3;
        const h = Math.min(maxW * ratio, windowHeight * 0.55);
        return { width: h / ratio, height: h };
      })()
    : null;

  return (
    <Screen
      title={TITLE}
      padded={false}
      footer={
        <Button
          label={drafts.length > 0 ? `${drafts.length} öğrenciyi ekle` : 'Eklenecek öğrenci seçin'}
          onPress={() => void save()}
          loading={saving}
          disabled={drafts.length === 0 || reading !== null}
          accessibilityHint={`${className} sınıfına ekler`}
        />
      }
    >
      <View style={[styles.section, styles.padded]}>
        <Text variant="heading" accessibilityRole="header">
          {`${className} sınıfına eklenecekler`}
        </Text>
        <Text variant="bodySmall" tone="muted">
          Numaraları ve adları fotoğrafla karşılaştırın; düzeltmek için üstüne dokunun. İşaretini kaldırdığınız
          satırlar eklenmez.
        </Text>
      </View>

      {photos.length > 0 ? (
        <View style={styles.padded}>
          <PhotoStrip photos={photos} onOpen={(photo, index) => setPreview({ photo, index })} />
        </View>
      ) : null}

      <View style={[styles.padded, styles.addPage]}>
        {reading ? (
          <LoadingState label="Sayfa okunuyor" />
        ) : (
          <View style={styles.addButtons}>
            <Button
              label={photos.length > 0 ? 'Sonraki sayfayı çek' : 'Fotoğraf çek'}
              icon="camera"
              variant="secondary"
              size="sm"
              fullWidth={false}
              onPress={() => void addPhoto('camera')}
              disabled={expoGo || busy}
            />
            <Button
              label="Galeriden seç"
              icon="photo"
              variant="ghost"
              size="sm"
              fullWidth={false}
              onPress={() => void addPhoto('library')}
              disabled={expoGo || busy}
            />
          </View>
        )}
      </View>

      <View style={[styles.padded, styles.banners]}>
        {unavailableBanner}
        {noticeView}
        {flaggedCount > 0 ? (
          <Banner
            kind="warning"
            title={`${flaggedCount} satırı kontrol edin`}
            message="Uyarılı satırlar yanlış okunmuş ya da zaten sınıfta olabilir."
          />
        ) : null}
      </View>

      <View style={styles.listHead}>
        <Text variant="label" tone="muted">
          {`${rows.length} satır`}
        </Text>
        <Text variant="label" tone="muted">
          {`${drafts.length} eklenecek`}
        </Text>
      </View>

      <View accessibilityRole="list">
        {rows.map((row) => (
          <ReviewRowItem
            key={row.id}
            row={row}
            issues={issues.get(row.id) ?? []}
            onChange={updateRow}
            onRemove={removeRow}
            autoFocus={row.id === focusRowId}
          />
        ))}
      </View>

      <View style={[styles.padded, styles.addRow]}>
        <Button label="Satır ekle" icon="plus" variant="ghost" fullWidth={false} onPress={addManualRow} />
      </View>

      <Sheet visible={preview !== null} onClose={() => setPreview(null)} title={preview ? `Sayfa ${preview.index + 1}` : ''}>
        {preview && previewSize ? (
          <View style={styles.previewBody}>
            <Image
              source={{ uri: preview.photo.uri }}
              style={[styles.previewImage, previewSize]}
              resizeMode="contain"
              accessibilityLabel={`Sayfa ${preview.index + 1} fotoğrafı`}
            />
            <Text variant="bodySmall" tone="muted">
              {`Bu sayfadan ${preview.photo.rowCount} satır okundu.`}
            </Text>
            <Button
              label="Sayfayı kaldır"
              icon="trash"
              variant="destructive"
              onPress={() => removePhoto(preview.photo.id)}
              accessibilityHint="Bu sayfadan okunan satırlar da listeden çıkarılır"
            />
          </View>
        ) : null}
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  padded: { paddingHorizontal: layout.pageX },
  section: { gap: spacing.md, marginTop: spacing.sm, marginBottom: spacing.lg },
  tips: { gap: spacing.sm },
  notice: { gap: spacing.xs, marginBottom: spacing.lg },
  reading: { minHeight: layout.iconBox * 4 },
  addPage: { marginTop: spacing.md, marginBottom: spacing.lg },
  addButtons: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  banners: { gap: spacing.sm },
  listHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: layout.pageX,
    paddingBottom: spacing.sm,
    marginTop: spacing.sm,
  },
  addRow: { paddingVertical: spacing.md },
  previewBody: { gap: spacing.md, alignItems: 'center' },
  previewImage: { borderRadius: radii.xs },
});
