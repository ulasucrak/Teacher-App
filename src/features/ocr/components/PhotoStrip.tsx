import { Image, Pressable, ScrollView, StyleSheet } from 'react-native';

import { Text } from '@/components/ui';
import { colors, layout, radii, spacing } from '@/theme';

export interface ImportPhoto {
  id: string;
  uri: string;
  width: number;
  height: number;
  /** Bu sayfadan okunan satır sayısı. */
  rowCount: number;
}

export interface PhotoStripProps {
  photos: ImportPhoto[];
  onOpen: (photo: ImportPhoto, index: number) => void;
}

const THUMB_W = 60;
const THUMB_H = 80;

/** Eklenen sayfaların küçük resimleri; dokununca büyük gösterilir. */
export function PhotoStrip({ photos, onOpen }: PhotoStripProps) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.strip}>
      {photos.map((photo, index) => (
        <Pressable
          key={photo.id}
          onPress={() => onOpen(photo, index)}
          accessibilityRole="imagebutton"
          accessibilityLabel={`Sayfa ${index + 1}, ${photo.rowCount} satır okundu`}
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
    borderWidth: layout.hairline,
    borderColor: colors.rule,
    backgroundColor: colors.surfaceMuted,
  },
});
