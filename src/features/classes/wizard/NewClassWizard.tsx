import { Stack, useNavigation, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import {
  Banner,
  BottomActionBar,
  Button,
  ChipGroup,
  Screen,
  TextField,
  WizardHeader,
  useToast,
  type BottomAction,
  type ChipGroupItem,
} from '@/components/ui';
import { PRESETS, type PresetId } from '@/features/forms';
import { StudentCollectorView } from '@/features/ocr/ui/StudentCollectorView';
import { useStudentCollector } from '@/features/ocr/ui/useStudentCollector';
import { normalizeStudentName, type NewStudent } from '@/features/students';
import { spacing } from '@/theme';

import { CLASS_NAME_MAX, deriveClassParts, validateClassDraft, type ClassDraftErrors } from '../model';
import { emptyProgress, runClassSetup, type SetupProgress, type SetupStage } from './setup';

export const WIZARD_STEPS = ['Ad', 'Öğrenciler', 'Formlar'] as const;

const PRESET_OPTIONS: readonly ChipGroupItem[] = PRESETS.map((p) => ({ key: p.id, label: p.title }));

interface Failure {
  stage: SetupStage;
  message: string;
}

/**
 * `/class/new` — yeni sınıf sihirbazı: Ad → Öğrenciler (ana adım) → Formlar.
 * Sınıf son adımda tek seferde oluşturulur; yarıda kalan kurulum "Tekrar dene" ile sürer.
 */
export function NewClassWizard() {
  const router = useRouter();
  const navigation = useNavigation();
  const toast = useToast();
  const collector = useStudentCollector();

  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [grade, setGrade] = useState('');
  const [section, setSection] = useState('');
  const [details, setDetails] = useState(false);
  const [errors, setErrors] = useState<ClassDraftErrors>({});
  const [presets, setPresets] = useState<PresetId[]>(['yoklama']);
  const [saving, setSaving] = useState(false);
  const [failure, setFailure] = useState<Failure | null>(null);
  const [progress, setProgress] = useState<SetupProgress>(emptyProgress);
  const [students, setStudents] = useState<NewStudent[]>([]);
  const allowLeave = useRef(false);

  const dirty = name.trim().length > 0 || collector.dirty;
  const created = progress.classRow;

  // Gezinme koruması: girilen veri varken çıkışta onay.
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (event) => {
      if (allowLeave.current || !dirty) return;
      event.preventDefault();
      Alert.alert(
        created ? 'Kurulum yarıda kalsın mı?' : 'Yeni sınıf bırakılsın mı?',
        created ? `${created.name} oluşturuldu; eklenmeyenler kaybolur.` : 'Girdiğiniz bilgiler kaydedilmez.',
        [
          { text: 'Vazgeç', style: 'cancel' },
          {
            text: 'Çık',
            style: 'destructive',
            onPress: () => {
              allowLeave.current = true;
              navigation.dispatch(event.data.action);
            },
          },
        ],
      );
    });
    return unsubscribe;
  }, [navigation, dirty, created]);

  const close = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  const goToClass = useCallback(
    (classId: string) => {
      allowLeave.current = true;
      router.replace(`/class/${classId}`);
    },
    [router],
  );

  const validated = () => {
    const derived = details ? { grade, section } : deriveClassParts(name);
    // "5/b" gibi kısa adlar şube harfiyle birlikte büyük yazılır.
    const finalName = !details && derived.section ? name.toLocaleUpperCase('tr-TR') : name;
    return validateClassDraft({ name: finalName, grade: derived.grade, section: derived.section });
  };

  const nextFromName = () => {
    const result = validated();
    if (!result.ok) {
      setErrors(result.errors);
      if (result.errors.grade || result.errors.section) setDetails(true);
      return;
    }
    setErrors({});
    setStep(1);
  };

  const nextFromStudents = () => {
    const drafts = collector.flush();
    setStudents(drafts.map((d) => ({ full_name: normalizeStudentName(d.fullName), number: d.number })));
    setStep(2);
  };

  const skipStudents = () => {
    setStudents([]);
    setStep(2);
  };

  const finish = async () => {
    if (saving) return;
    const result = validated();
    if (!result.ok) {
      setErrors(result.errors);
      setStep(0);
      return;
    }
    setSaving(true);
    setFailure(null);
    const outcome = await runClassSetup({ klass: result.value, students, presets }, progress);
    setProgress(outcome.progress);
    if (outcome.ok) {
      toast.show(`${outcome.classRow.name} oluşturuldu`);
      goToClass(outcome.classRow.id);
      return;
    }
    setSaving(false);
    setFailure({ stage: outcome.stage, message: outcome.message });
  };

  // ------------------------------------------------------------------ görünüm
  const header = (title: string, description?: string) => (
    <WizardHeader
      steps={WIZARD_STEPS}
      current={step}
      title={title}
      description={description}
      onBack={step > 0 && !created ? () => setStep(step - 1) : undefined}
      onClose={close}
      testID={`wizard-step-${step + 1}`}
    />
  );

  const back: BottomAction = { label: 'Geri', onPress: () => setStep(step - 1), testID: 'wizard-prev', disabled: saving };
  // Kaydırma ile geri dönüş, onay sorulacaksa kapalı (native-stack beforeRemove ile hareketi durduramaz).
  const screenOptions = <Stack.Screen options={{ gestureEnabled: !dirty }} />;

  if (step === 0) {
    return (
      <Screen
        header={header('Sınıfın adı ne?')}
        testID="wizard-screen"
        footer={<BottomActionBar primary={{ label: 'Devam', onPress: nextFromName, testID: 'wizard-next' }} />}
      >
        {screenOptions}
        <View style={styles.form}>
          <TextField
            label="Sınıf adı"
            value={name}
            onChangeText={(t) => {
              setName(t);
              if (errors.name) setErrors((e) => ({ ...e, name: null }));
            }}
            error={errors.name}
            placeholder="5/B"
            maxLength={CLASS_NAME_MAX}
            autoFocus
            autoCapitalize="characters"
            autoCorrect={false}
            returnKeyType="next"
            onSubmitEditing={nextFromName}
            testID="wizard-name-input"
          />
          {details ? (
            <View style={styles.pair}>
              <TextField
                label="Düzey"
                value={grade}
                onChangeText={setGrade}
                error={errors.grade}
                placeholder="5"
                keyboardType="number-pad"
                containerStyle={styles.pairItem}
                testID="wizard-grade-input"
              />
              <TextField
                label="Şube"
                value={section}
                onChangeText={setSection}
                error={errors.section}
                placeholder="B"
                autoCapitalize="characters"
                autoCorrect={false}
                containerStyle={styles.pairItem}
                testID="wizard-section-input"
              />
            </View>
          ) : (
            <Button
              label="Ayrıntı ekle"
              icon="plus"
              variant="ghost"
              size="sm"
              fullWidth={false}
              onPress={() => {
                const derived = deriveClassParts(name);
                setGrade(derived.grade);
                setSection(derived.section);
                setDetails(true);
              }}
              style={styles.ghost}
              testID="wizard-details"
            />
          )}
        </View>
      </Screen>
    );
  }

  if (step === 1) {
    const empty = collector.drafts.length === 0 && !collector.hasPending;
    return (
      <Screen
        header={header('Öğrencileri ekleyin')}
        testID="wizard-screen"
        footer={
          <BottomActionBar
            secondary={back}
            primary={{
              label: 'Devam',
              onPress: nextFromStudents,
              disabled: empty || collector.reading !== null,
              testID: 'wizard-next',
            }}
          />
        }
      >
        {screenOptions}
        <View style={styles.form}>
          <StudentCollectorView collector={collector} />
          {empty ? (
            <Button
              label="Sonra eklerim"
              variant="ghost"
              size="sm"
              fullWidth={false}
              onPress={skipStudents}
              style={styles.ghost}
              testID="wizard-skip-students"
            />
          ) : null}
        </View>
      </Screen>
    );
  }

  const primary: BottomAction = failure
    ? { label: 'Tekrar dene', onPress: () => void finish(), loading: saving, testID: 'wizard-retry' }
    : { label: 'Sınıfı oluştur', onPress: () => void finish(), loading: saving, testID: 'wizard-create' };
  const secondary: BottomAction = created
    ? { label: 'Sınıfa git', onPress: () => goToClass(created.id), disabled: saving, testID: 'wizard-open-class' }
    : back;

  return (
    <Screen
      header={header('Hangi formları kullanacaksınız?', 'Sonradan da ekleyebilirsiniz.')}
      testID="wizard-screen"
      footer={<BottomActionBar secondary={secondary} primary={primary} />}
    >
      {screenOptions}
      <View style={styles.form}>
        {failure ? <Banner kind="error" message={failure.message} testID="wizard-error" /> : null}
        <ChipGroup
          multiple
          options={PRESET_OPTIONS}
          value={presets}
          onChange={(keys) => setPresets(keys as PresetId[])}
          compact={false}
          disabled={saving}
          contextLabel="Hazır formlar"
          testIDPrefix="wizard-form"
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: { gap: spacing.lg, paddingTop: spacing.xs },
  pair: { flexDirection: 'row', gap: spacing.md },
  pairItem: { flex: 1 },
  ghost: { alignSelf: 'flex-start', marginLeft: -spacing.md },
});
