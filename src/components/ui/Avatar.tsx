import { Image, StyleSheet, View } from 'react-native';

import { colors, radii, typography } from '@/theme';

import { getAvatarColor, getInitials } from './avatarUtils';
import { Text } from './Text';

const sizes = { sm: 32, md: 40, lg: 56 } as const;

export interface AvatarProps {
  name: string;
  size?: keyof typeof sizes;
  imageUri?: string | null;
}

/** Öğrenci avatarı: fotoğraf yoksa baş harfler, isimden sabit renk. Ekran okuyucudan gizli. */
export function Avatar({ name, size = 'md', imageUri }: AvatarProps) {
  const dim = sizes[size];
  const frame = { width: dim, height: dim, borderRadius: radii.full };

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
        style={[typography.number, { fontSize: Math.round(dim * 0.38), lineHeight: Math.round(dim * 0.5) }]}
        maxFontSizeMultiplier={1}
      >
        {getInitials(name)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: { alignItems: 'center', justifyContent: 'center' },
  image: { backgroundColor: colors.surfaceMuted },
});
