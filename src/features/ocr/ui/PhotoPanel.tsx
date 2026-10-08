import { useState } from 'react';
import { Image, StyleSheet, useWindowDimensions, View } from 'react-native';

import { Button, LoadingState, Sheet, Text } from '@/components/ui';
import { colors, layout, radii, spacing, strokes } from '@/theme';

import { PhotoStrip } from '../components/PhotoStrip';
import type { ImportPhoto, StudentCollector } from './useStudentCollector';

export interface PhotoPanelProps {
  collector: StudentCollector;
  disabled?: boolean;
}

/** "Fotoğraf" yolu: büyük "Fotoğraf çek" / "Galeriden seç", okunan sayfaların küçük resimleri. */
export function PhotoPanel({ collector, disabled = false }: PhotoPanelProps) {
  const { photos, reading, photoAvailable, addPhoto, removePhoto } = collector;
  const [preview, setPreview] = useState<{ photo: ImportPhoto; index: number } | null>(null);
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const off = disabled || !photoAvailable || reading !== null;
  const more = photos.length > 0;

  const previewSize = preview
    ? (() => {
        const maxW = windowWidth - layout.pageX * 2;
        const ratio = preview.photo.height > 0 ? preview.photo.height / preview.photo.width : 4 / 3;
        const h = Math.min(maxW * ratio, windowHeight * 0.55);
        return { width: h / ratio, height: h };
      })()
    : null;

  return (
    <View style={styles.wrap}>
      {reading ? (
        <View style={styles.reading} testID="photo-reading">
          <LoadingState label={more ? 'Sayfa okunuyor' : 'Fotoğraf okunuyor'} />
        </View>
      ) : (
        <View style={styles.buttons}>
          <Button
            label={more ? 'Sonraki sayfayı çek' : 'Fotoğraf çek'}
            icon="camera"
            variant="secondary"
            onPress={() => void addPhoto('camera')}
            disabled={off}
            testID="photo-camera"
          />
          <Button
            label="Galeriden seç"
            icon="photo"
            variant="secondary"
            onPress={() => void addPhoto('library')}
            disabled={off}
            testID="photo-library"
          />
          {!more ? (
            <Text variant="caption" tone="muted">
              Sınıf listesinin fotoğrafı yeterli. Adları siz onaylamadan eklenmez.
            </Text>
          ) : null}
        </View>
      )}

      {more ? <PhotoStrip photos={photos} onOpen={(photo, index) => setPreview({ photo, index })} /> : null}

      <Sheet
        visible={preview !== null}
        onClose={() => setPreview(null)}
        title={preview ? `Sayfa ${preview.index + 1}` : ''}
        testID="photo-preview"
      >
        {preview && previewSize ? (
          <View style={styles.previewBody}>
            <Image
              source={{ uri: preview.photo.uri }}
              style={[styles.previewImage, previewSize]}
              resizeMode="contain"
              accessibilityLabel={`Sayfa ${preview.index + 1} fotoğrafı`}
            />
            <Button
              label="Sayfayı kaldır"
              icon="trash"
              variant="secondary"
              onPress={() => {
                removePhoto(preview.photo.id);
                setPreview(null);
              }}
              accessibilityHint="Bu sayfadan eklenen öğrenciler de listeden çıkar"
              testID="photo-preview-remove"
            />
          </View>
        ) : null}
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.md },
  buttons: { gap: spacing.sm },
  reading: { minHeight: layout.iconBox * 2, justifyContent: 'center' },
  previewBody: { gap: spacing.lg, alignItems: 'center' },
  previewImage: { borderRadius: radii.xs, borderWidth: strokes.thin, borderColor: colors.outline },
});
