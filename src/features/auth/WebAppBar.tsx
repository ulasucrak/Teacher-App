import { StyleSheet, View } from 'react-native';

import { Avatar, Icon, Text } from '@/components/ui';
import { colors, hardShadow, iconSize, spacing, strokes } from '@/theme';

import { getDisplayName, useAuth } from './useAuth';

/**
 * Laptop "uygulama çubuğu" (mockup `.appbar`): solda sarı logo + "Sınıf Defteri", sağda öğretmenin adı ve avatarı.
 * Yalnızca geniş web ekranında, oturum açıkken `AppFrame` tarafından kâğıt sütunun üstüne konur; gezinme yapısını
 * etkilemez ve tamamen bilgi amaçlıdır (dokunulabilir öğe yok).
 */
export function WebAppBar() {
  const { user } = useAuth();
  if (!user) return null;
  const name = getDisplayName(user);
  return (
    <View style={styles.bar} testID="web-app-bar">
      <View style={styles.brand}>
        <View style={styles.logo} accessible={false} importantForAccessibility="no-hide-descendants">
          <Icon name="book" size={iconSize.xl} color={colors.text} />
        </View>
        <Text variant="heading" style={styles.brandName}>
          Sınıf Defteri
        </Text>
      </View>
      {name ? (
        <View style={styles.who} testID="web-app-bar-user">
          <Text variant="label" numberOfLines={1} style={styles.whoName}>
            {name}
          </Text>
          <Avatar name={name} size="sm" />
        </View>
      ) : null}
    </View>
  );
}

const LOGO = 40;

const styles = StyleSheet.create({
  bar: {
    height: 68,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xxxl,
    backgroundColor: colors.surface,
    borderBottomWidth: strokes.base,
    borderBottomColor: colors.outline,
  },
  brand: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  logo: {
    width: LOGO,
    height: LOGO,
    borderRadius: 10,
    backgroundColor: colors.accent,
    borderWidth: strokes.base,
    borderColor: colors.outline,
    alignItems: 'center',
    justifyContent: 'center',
    ...hardShadow('xs'),
  },
  // Mockup `.brand`: 23 pt (heading 20'den bir kademe iri).
  brandName: { fontSize: 23, lineHeight: 28 },
  who: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm + spacing.xxs, maxWidth: 320 },
  whoName: { flexShrink: 1 },
});
