import { Image, StyleSheet, View } from 'react-native';

import { colors, fontFamilies, radii, strokes, typography } from '@/theme';

import { getAvatarColor, getInitials } from './avatarUtils';
import { Text } from './Text';

const sizes = { sm: 32, md: 40, lg: 56 } as const;

export interface AvatarProps {
  name: string;
  size?: keyof typeof sizes;
  imageUri?: string | null;
}

/** Öğrenci avatarı: yuvarlatılmış kare, ince kurşun çerçeve; fotoğraf yoksa baş harfler, isimden sabit kâğıt rengi. Ekran okuyucudan gizli. */
export function Avatar({ name, size = 'md', imageUri }: AvatarProps) {
  const dim = sizes[size];
  // Mockup `.av`: kare köşeli (radius ≈ %26), ince kurşun çerçeve.
  const frame = { width: dim, height: dim, borderRadius: Math.max(radii.xs - 2, Math.round(dim * 0.26)) };

  if (imageUri) {
    return (
      <Image
        source={{ uri: imageUri }}
        style={[frame, styles.image]}
        accessible={false}
        importantForAccessibility="no"
      />
    );
  }

  return (
    <View
      style={[frame, styles.fallback, { backgroundColor: getAvatarColor(name) }]}
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      testID="avatar"
    >
      <Text
        style={[typography.number, { fontFamily: fontFamilies.textExtraBold, fontSize: Math.round(dim * 0.38), lineHeight: Math.round(dim * 0.5) }]}
        maxFontSizeMultiplier={1}
      >
        {getInitials(name)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: { alignItems: 'center', justifyContent: 'center', borderWidth: strokes.thin, borderColor: colors.outline },
  image: { backgroundColor: colors.surfaceMuted, borderWidth: strokes.thin, borderColor: colors.outline },
});
