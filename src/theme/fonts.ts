import { AtkinsonHyperlegibleNext_400Regular } from '@expo-google-fonts/atkinson-hyperlegible-next/400Regular';
import { AtkinsonHyperlegibleNext_700Bold } from '@expo-google-fonts/atkinson-hyperlegible-next/700Bold';
import { AtkinsonHyperlegibleNext_800ExtraBold } from '@expo-google-fonts/atkinson-hyperlegible-next/800ExtraBold';
import { BricolageGrotesque_800ExtraBold } from '@expo-google-fonts/bricolage-grotesque/800ExtraBold';

import { fontFamilies } from './typography';

/** `useFonts` için harita: yalnızca kullanılan ağırlıklar paketlenir. */
export const fontAssets = {
  [fontFamilies.displayExtraBold]: BricolageGrotesque_800ExtraBold,
  [fontFamilies.textRegular]: AtkinsonHyperlegibleNext_400Regular,
  [fontFamilies.textBold]: AtkinsonHyperlegibleNext_700Bold,
  [fontFamilies.textExtraBold]: AtkinsonHyperlegibleNext_800ExtraBold,
};
