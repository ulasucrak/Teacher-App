import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Banner, Button, EmptyState, LoadingState, Screen, useToast } from '@/components/ui';
import { useRemoteData } from '@/features/classes/useRemoteData';
import { layout, spacing } from '@/theme';

import { listForms } from '../api';
import { FormListRow } from '../components/FormListRow';
import { errorMessage, getFormsErrorMessage } from '../errors';
import { useFormActions } from '../hooks/useFormActions';
import { firstParam, formsRoutes } from '../params';

const LOAD_ERROR = getFormsErrorMessage(null, 'load');

/**
 * /class/[classId]/forms — arşivdeki formlar. Günlük kullanılan formlar sınıf ekranında;
 * burası yalnızca arşivlenmiş formları geri almak, geçmişine bakmak ya da silmek için.
 */
export default function FormsScreen() {
  const params = useLocalSearchParams<{ classId: string }>();
  const classId = firstParam(params.classId) ?? '';
  const router = useRouter();
  const toast = useToast();

  // Yükleme hatasının forma özgü metni (useRemoteData genel metne çevirmeden önce yakalanır).
  const [loadError, setLoadError] = useState<string | null>(null);
  const loadedOnce = useRef(false);

  const load = useCallback(async () => {
    try {
      const forms = await listForms(classId);
      loadedOnce.current = true;
      setLoadError(null);
      return forms;
    } catch (error) {
      const message = errorMessage(error, 'load');
      setLoadError(message);
      // Liste ekrandayken (odaklanma ya da canlı yenileme) hata yalnızca bildirim olarak gösterilir.
      if (loadedOnce.current) toast.show(message, 'error');
      throw error;
    }
  }, [classId, toast]);

  // Odaklanınca yükler; başka cihazdaki değişikliklerde ve ön plana dönüşte sessizce yeniler.
  const forms = useRemoteData(load, LOAD_ERROR);

  const archived = useMemo(() => (forms.data ?? []).filter((f) => f.archived), [forms.data]);
  const { refresh, retry } = forms;
  const actions = useFormActions({ classId, onChanged: () => void refresh() });

  let content;
  if (forms.status === 'loading') {
    content = <LoadingState label="Formlar yükleniyor" />;
  } else if (forms.status === 'error') {
    content = (
      <View style={styles.errorBox}>
        <Banner kind="error" title="Formlar yüklenemedi" message={loadError ?? forms.error ?? LOAD_ERROR} />
        <Button label="Tekrar dene" variant="secondary" fullWidth={false} onPress={() => void retry()} testID="archive-retry" />
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
    <Screen title="Arşivdeki formlar" headerDivider scroll={forms.status !== 'loading'} testID="archive-screen">
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
