import { Image, Pressable, ScrollView, StyleSheet } from 'react-native';

import { Text } from '@/components/ui';
import { colors, layout, radii, spacing, strokes } from '@/theme';

import type { ImportPhoto } from '../ui/useStudentCollector';

export type { ImportPhoto };

export interface PhotoStripProps {
  photos: ImportPhoto[];
  onOpen: (photo: ImportPhoto, index: number) => void;
}

/** Küçük resim: 3:4 sayfa oranına yakın, ikon kutusu genişliğinde. */
const THUMB_W = layout.iconBox;
const THUMB_H = layout.iconBox + spacing.xl;

/** Eklenen sayfaların küçük resimleri; dokununca büyük gösterilir. */
export function PhotoStrip({ photos, onOpen }: PhotoStripProps) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.strip}>
      {photos.map((photo, index) => (
        <Pressable
          key={photo.id}
          testID={`photo-page-${index}`}
          onPress={() => onOpen(photo, index)}
          accessibilityRole="imagebutton"
          accessibilityLabel={`Sayfa ${index + 1}, ${photo.rowCount} öğrenci`}
          accessibilityHint="Fotoğrafı büyük gösterir"
          style={({ pressed }) => [styles.item, pressed && styles.pressed]}
        >
          <Image source={{ uri: photo.uri }} style={styles.thumb} resizeMode="cover" />
          <Text variant="caption" tone="muted" maxFontSizeMultiplier={1.2}>
            {`Sayfa ${index + 1}`}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  strip: { gap: spacing.md, paddingVertical: spacing.xs },
  item: { alignItems: 'center', gap: spacing.xs, borderRadius: radii.xs, minWidth: layout.minTouch },
  pressed: { opacity: 0.7 },
  thumb: {
    width: THUMB_W,
    height: THUMB_H,
    borderRadius: radii.xs,
    borderWidth: strokes.thin,
    borderColor: colors.outline,
    backgroundColor: colors.surfaceMuted,
  },
});
