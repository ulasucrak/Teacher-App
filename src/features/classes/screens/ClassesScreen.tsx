import { useRouter } from 'expo-router';
import { useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';

import {
  Banner,
  Button,
  ConfirmSheet,
  EmptyState,
  Fab,
  IconButton,
  LoadingState,
  OverflowMenu,
  Screen,
  useToast,
} from '@/components/ui';
import { getDisplayName, useAuth } from '@/features/auth';
import { colors, layout, spacing } from '@/theme';

import { listClasses } from '../api';
import { ClassListRow } from '../components/ClassListRow';
import { useRemoteData } from '../useRemoteData';

const LOAD_ERROR = 'Sınıflar yüklenemedi. Bağlantınızı kontrol edip tekrar deneyin.';

/** "Sınıflarım": sınıfların listesi, tek ana eylem "Yeni sınıf"; hesap "⋯" menüsünde. */
export function ClassesScreen() {
  const router = useRouter();
  const toast = useToast();
  const { user, signOut } = useAuth();
  const name = getDisplayName(user);
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const classes = useRemoteData(listClasses, LOAD_ERROR);

  const openNew = () => router.push('/class/new');

  const doSignOut = async () => {
    setSigningOut(true);
    const result = await signOut();
    setSigningOut(false);
    setConfirmOpen(false);
    if (!result.ok) toast.show(result.message, 'error');
  };

  const items = classes.data ?? [];
  const ready = classes.status === 'ready';
  const hasClasses = items.length > 0;

  let body;
  if (classes.status === 'loading') {
    body = <LoadingState label="Sınıflarınız yükleniyor" />;
  } else if (classes.status === 'error') {
    body = (
      <View style={[styles.padded, styles.errorBox]}>
        <Banner kind="error" title="Sınıflar yüklenemedi" message={classes.error ?? LOAD_ERROR} />
        <Button label="Tekrar dene" variant="secondary" onPress={classes.retry} testID="classes-retry" />
      </View>
    );
  } else {
    body = (
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <ClassListRow item={item} onPress={() => router.push(`/class/${item.id}`)} testID={`class-row-${index}`} />
        )}
        ListHeaderComponent={
          classes.error ? (
            <View style={[styles.padded, styles.banner]}>
              <Banner kind="error" message={classes.error} />
            </View>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.padded}>
            <EmptyState
              icon="people"
              title="Henüz sınıfınız yok"
              description="İlk sınıfınızı ekleyin; öğrencileri fotoğraftan alabilirsiniz."
              actionLabel="Yeni sınıf"
              onAction={openNew}
              actionTestID="classes-empty-new"
              testID="classes-empty"
            />
          </View>
        }
        refreshControl={
          <RefreshControl
            refreshing={classes.refreshing}
            onRefresh={classes.refresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
            title="Yenileniyor"
          />
        }
        contentContainerStyle={styles.listContent}
        testID="classes-list"
      />
    );
  }

  return (
    <Screen
      title="Sınıflarım"
      largeTitle
      subtitle={name ? `Merhaba, ${name}` : undefined}
      back={false}
      scroll={false}
      padded={false}
      testID="classes-screen"
      headerRight={
        <IconButton
          icon="more"
          accessibilityLabel="Diğer seçenekler"
          onPress={() => setMenuOpen(true)}
          testID="classes-menu"
        />
      }
      fab={
        ready && hasClasses ? <Fab label="Yeni sınıf" onPress={openNew} testID="classes-fab" /> : undefined
      }
    >
      {body}
      <OverflowMenu
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        title={name || 'Hesap'}
        description={user?.email ?? undefined}
        testID="classes-menu-sheet"
        actions={[
          {
            key: 'account',
            label: 'Hesap',
            icon: 'person',
            onPress: () => router.push('/account'),
            testID: 'classes-account',
          },
          {
            key: 'signout',
            label: 'Çıkış yap',
            icon: 'logout',
            destructive: true,
            onPress: () => setConfirmOpen(true),
            testID: 'classes-signout',
          },
        ]}
      />
      <ConfirmSheet
        visible={confirmOpen}
        title="Çıkış yapılsın mı?"
        message="Tekrar girmek için e-posta ve şifreniz gerekir."
        confirmLabel="Çıkış yap"
        loading={signingOut}
        onConfirm={() => void doSignOut()}
        onCancel={() => setConfirmOpen(false)}
        testID="classes-signout-confirm"
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  padded: { paddingHorizontal: layout.pageX },
  errorBox: { marginTop: spacing.lg, gap: spacing.lg },
  banner: { marginBottom: spacing.md },
  listContent: { flexGrow: 1, paddingBottom: layout.fabClearance + spacing.xxl },
});
