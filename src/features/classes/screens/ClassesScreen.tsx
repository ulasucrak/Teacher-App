import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, FlatList, RefreshControl, StyleSheet, View } from 'react-native';

import { Banner, Button, EmptyState, IconButton, LoadingState, Screen, Sheet, Text, useToast } from '@/components/ui';
import { getDisplayName, useAuth } from '@/features/auth';
import { colors, layout, spacing } from '@/theme';

import { listClasses } from '../api';
import { ClassListRow } from '../components/ClassListRow';
import { useRemoteData } from '../useRemoteData';

const LOAD_ERROR = 'Sınıflar yüklenemedi. Aşağı çekerek ya da "Tekrar dene" ile yeniden deneyin.';

/** "Sınıflarım": öğretmenin sınıfları, sayılarıyla. */
export function ClassesScreen() {
  const router = useRouter();
  const toast = useToast();
  const { user, signOut } = useAuth();
  const name = getDisplayName(user);
  const [accountOpen, setAccountOpen] = useState(false);
  const classes = useRemoteData(listClasses, LOAD_ERROR);

  const openNew = () => router.push('/class/new');

  const confirmSignOut = () => {
    // Uyarı açık panelin üstünde gösterilir; panel karar verilince kapanır.
    Alert.alert('Çıkış yapılsın mı?', 'Tekrar girmek için e-posta ve şifreniz gerekir.', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Çıkış yap',
        style: 'destructive',
        onPress: async () => {
          setAccountOpen(false);
          const result = await signOut();
          if (!result.ok) toast.show(result.message, 'error');
        },
      },
    ]);
  };

  const items = classes.data ?? [];
  const hasClasses = items.length > 0;

  const header = (
    <View style={styles.header}>
      <Text variant="title" accessibilityRole="header">
        Sınıflarım
      </Text>
      {name ? (
        <Text variant="body" tone="muted">
          {name}
        </Text>
      ) : null}
      {classes.error && classes.status === 'ready' ? (
        <View style={styles.banner}>
          <Banner kind="error" message={classes.error} />
        </View>
      ) : null}
    </View>
  );

  let body;
  if (classes.status === 'loading') {
    body = (
      <>
        {header}
        <LoadingState label="Sınıflarınız yükleniyor" />
      </>
    );
  } else if (classes.status === 'error') {
    body = (
      <>
        {header}
        <View style={[styles.padded, styles.errorBox]}>
          <Banner kind="error" title="Sınıflar yüklenemedi" message={classes.error ?? LOAD_ERROR} />
          <Button label="Tekrar dene" variant="secondary" onPress={classes.retry} />
        </View>
      </>
    );
  } else {
    body = (
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ClassListRow item={item} onPress={() => router.push(`/class/${item.id}`)} />
        )}
        ListHeaderComponent={
          <>
            {header}
            {hasClasses ? <View style={styles.listTop} /> : null}
          </>
        }
        ListEmptyComponent={
          <View style={styles.padded}>
            <EmptyState
              icon="people"
              title="Henüz sınıfınız yok"
              description="Sınıf eklediğinizde öğrencileriniz, yoklama ve ödev formları burada listelenir. İlk sınıfınızı ekleyerek başlayın."
              actionLabel="Sınıf ekle"
              onAction={openNew}
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
      />
    );
  }

  return (
    <Screen
      back={false}
      scroll={false}
      padded={false}
      headerRight={
        <IconButton icon="more" accessibilityLabel="Hesap seçenekleri" onPress={() => setAccountOpen(true)} />
      }
      footer={hasClasses ? <Button label="Sınıf ekle" icon="plus" onPress={openNew} /> : undefined}
    >
      {body}
      <Sheet visible={accountOpen} onClose={() => setAccountOpen(false)} title="Hesap">
        <View style={styles.account}>
          {name ? <Text variant="bodyStrong">{name}</Text> : null}
          {user?.email ? (
            <Text variant="bodySmall" tone="muted">
              {user.email}
            </Text>
          ) : null}
        </View>
        <Button label="Çıkış yap" variant="secondary" icon="logout" onPress={confirmSignOut} />
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: layout.pageX, paddingTop: spacing.sm, gap: spacing.xs },
  banner: { marginTop: spacing.md },
  padded: { paddingHorizontal: layout.pageX },
  errorBox: { marginTop: spacing.xl, gap: spacing.lg },
  listTop: {
    marginTop: spacing.xl,
    borderBottomWidth: layout.hairline,
    borderBottomColor: colors.rule,
  },
  listContent: { flexGrow: 1, paddingBottom: spacing.xxl },
  account: { gap: spacing.xxs, marginBottom: spacing.xl },
});
