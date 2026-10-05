import { AtkinsonHyperlegibleNext_400Regular } from '@expo-google-fonts/atkinson-hyperlegible-next/400Regular';
import { AtkinsonHyperlegibleNext_600SemiBold } from '@expo-google-fonts/atkinson-hyperlegible-next/600SemiBold';
import { AtkinsonHyperlegibleNext_700Bold } from '@expo-google-fonts/atkinson-hyperlegible-next/700Bold';
import { BricolageGrotesque_600SemiBold } from '@expo-google-fonts/bricolage-grotesque/600SemiBold';
import { BricolageGrotesque_700Bold } from '@expo-google-fonts/bricolage-grotesque/700Bold';

import { fontFamilies } from './typography';

/** `useFonts` için harita: yalnızca kullanılan ağırlıklar paketlenir. */
export const fontAssets = {
  [fontFamilies.displayBold]: BricolageGrotesque_700Bold,
  [fontFamilies.displaySemiBold]: BricolageGrotesque_600SemiBold,
  [fontFamilies.textRegular]: AtkinsonHyperlegibleNext_400Regular,
  [fontFamilies.textSemiBold]: AtkinsonHyperlegibleNext_600SemiBold,
  [fontFamilies.textBold]: AtkinsonHyperlegibleNext_700Bold,
};
