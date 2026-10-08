import { StyleSheet, View } from 'react-native';

import { colors, hardShadow, iconSize, layout, paper, radii, strokes, tones, type PaperName, type ToneName } from '@/theme';

import { Icon, type IconName } from './Icon';

export interface IconTileProps {
  icon: IconName;
  /** Ton verilmezse sıra grisi zemin. Ton → o tonun açık kâğıt zemini; ikon hep kurşun. */
  tone?: ToneName;
  /** Ton yerine doğrudan el işi kâğıdı rengi (sınıf/form kimliği gibi): önceliklidir. */
  paper?: PaperName;
  /** `md` 46 (satır başı), `lg` 64 (boş durum, uygulama işareti; hafif eğik + gölgeli). */
  size?: 'md' | 'lg';
}

/** Kurşun çerçeveli renkli kâğıt kare içinde ikon: liste satırı başı, boş durum. Dekoratif (ekran okuyucudan gizli). */
export function IconTile({ icon, tone, paper: paperName, size = 'md' }: IconTileProps) {
  const lg = size === 'lg';
  const dim = lg ? layout.iconBox : layout.iconTile;
  const bg = paperName ? paper[paperName] : tone ? tones[tone].soft : colors.surfaceMuted;
  return (
    <View
      style={[
        styles.tile,
        { width: dim, height: dim, backgroundColor: bg, borderRadius: lg ? radii.md : radii.sm },
        lg ? styles.lg : styles.md,
        lg && hardShadow('md'),
      ]}
      accessible={false}
      importantForAccessibility="no-hide-descendants"
    >
      <Icon name={icon} size={lg ? iconSize.xxl + 4 : iconSize.lg} color={colors.text} />
    </View>
  );
}

const styles = StyleSheet.create({
  tile: { alignItems: 'center', justifyContent: 'center', borderColor: colors.outline },
  md: { borderWidth: strokes.thin },
  lg: { borderWidth: strokes.base, transform: [{ rotate: '-4deg' }] },
});
