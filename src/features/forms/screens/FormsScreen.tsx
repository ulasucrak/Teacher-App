import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Banner, Button, EmptyState, LoadingState, Screen, useToast } from '@/components/ui';
import { layout, spacing } from '@/theme';

import { listForms, type FormListItem } from '../api';
import { FormListRow } from '../components/FormListRow';
import { errorMessage } from '../errors';
import { useFormActions } from '../hooks/useFormActions';
import { firstParam, formsRoutes } from '../params';

type ListState =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; forms: FormListItem[] };

/**
 * /class/[classId]/forms — arşivdeki formlar. Günlük kullanılan formlar sınıf ekranında;
 * burası yalnızca arşivlenmiş formları geri almak, geçmişine bakmak ya da silmek için.
 */
export default function FormsScreen() {
  const params = useLocalSearchParams<{ classId: string }>();
  const classId = firstParam(params.classId) ?? '';
  const router = useRouter();
  const toast = useToast();

  const [state, setState] = useState<ListState>({ kind: 'loading' });
  const loadedOnce = useRef(false);

  const load = useCallback(async () => {
    if (!loadedOnce.current) setState({ kind: 'loading' });
    try {
      const forms = await listForms(classId);
      loadedOnce.current = true;
      setState({ kind: 'ready', forms });
    } catch (error) {
      if (!loadedOnce.current) setState({ kind: 'error', message: errorMessage(error, 'load') });
      else toast.show(errorMessage(error, 'load'), 'error');
    }
  }, [classId, toast]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const archived = useMemo(() => (state.kind === 'ready' ? state.forms.filter((f) => f.archived) : []), [state]);
  const actions = useFormActions({ classId, onChanged: () => void load() });

  let content;
  if (state.kind === 'loading') {
    content = <LoadingState label="Formlar yükleniyor" />;
  } else if (state.kind === 'error') {
    content = (
      <View style={styles.errorBox}>
        <Banner kind="error" title="Formlar yüklenemedi" message={state.message} />
        <Button label="Tekrar dene" variant="secondary" fullWidth={false} onPress={() => void load()} testID="archive-retry" />
      </View>
    );
  } else if (archived.length === 0) {
    content = (
      <EmptyState
        icon="archive"
        title="Arşiv boş"
        description="Arşivlediğiniz formlar burada görünür."
        testID="archive-empty"
      />
    );
  } else {
    content = (
      <View style={styles.list}>
        {archived.map((form, index) => (
          <FormListRow
            key={form.id}
            form={form}
            index={index}
            onOpen={() => router.push(formsRoutes.sessions(classId, form.id))}
            onMore={() => actions.open(form)}
            openHint="Formun geçmiş kayıtlarını açar"
          />
        ))}
      </View>
    );
  }

  return (
    <Screen title="Arşivdeki formlar" headerDivider scroll={state.kind !== 'loading'} testID="archive-screen">
      {content}
      {actions.sheets}
    </Screen>
  );
}

const styles = StyleSheet.create({
  errorBox: { gap: spacing.lg, paddingTop: spacing.lg },
  // ListRow kendi sayfa boşluğunu taşır; Screen'in yatay boşluğunu dengeler.
  list: { marginHorizontal: -layout.pageX },
});
