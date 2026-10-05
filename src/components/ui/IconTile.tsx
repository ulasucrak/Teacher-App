import { StyleSheet, View } from 'react-native';

import { colors, iconSize, layout, radii, spacing, tones, type ToneName } from '@/theme';

import { Icon, type IconName } from './Icon';

export interface IconTileProps {
  icon: IconName;
  /** Ton verilmezse sıra grisi zemin + kurşun ikon. */
  tone?: ToneName;
  /** `md` 40 (satır başı), `lg` 64 (boş durum, uygulama işareti). */
  size?: 'md' | 'lg';
}

/** Yuvarlatılmış kare içinde ikon: liste satırı başı, boş durum. Dekoratif (ekran okuyucudan gizli). */
export function IconTile({ icon, tone, size = 'md' }: IconTileProps) {
  const dim = size === 'lg' ? layout.iconBox : layout.minTouch - spacing.sm;
  const bg = tone ? tones[tone].soft : colors.surfaceMuted;
  const fg = tone ? tones[tone].onSoft : colors.text;
  return (
    <View
      style={[styles.tile, { width: dim, height: dim, backgroundColor: bg, borderRadius: size === 'lg' ? radii.md + spacing.xs : radii.sm }]}
      accessible={false}
      importantForAccessibility="no-hide-descendants"
    >
      <Icon name={icon} size={size === 'lg' ? iconSize.xxl + spacing.xs : iconSize.lg} color={fg} />
    </View>
  );
}

const styles = StyleSheet.create({
  tile: { alignItems: 'center', justifyContent: 'center' },
});
