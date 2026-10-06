import { StyleSheet, View } from 'react-native';

import { colors, layout, radii, spacing } from '@/theme';

import { IconButton } from './IconButton';
import { backIconSize, desktopBarInset, useDesktopWeb } from './ScreenChrome';
import { Text } from './Text';

export interface StepperProps {
  /** Adım adları (2–4): ["Ad", "Öğrenciler", "Bitti"]. */
  steps: readonly string[];
  /** 0 tabanlı geçerli adım. */
  current: number;
  testID?: string;
}

/**
 * Sihirbaz ilerlemesi: adım sayısı kadar ince çubuk (biten + geçerli kurşun, kalan sıra grisi)
 * ve altında "Adım 2 / 3 · Öğrenciler" yerine iki ayrı metin. Gerçek bir sıra olduğu için numaralıdır.
 */
export function Stepper({ steps, current, testID }: StepperProps) {
  const index = Math.min(Math.max(current, 0), steps.length - 1);
  const name = steps[index] ?? '';
  return (
    <View
      testID={testID}
      style={styles.stepper}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={`Adım ${index + 1} / ${steps.length}: ${name}`}
      accessibilityValue={{ min: 1, max: steps.length, now: index + 1 }}
    >
      <View style={styles.bars}>
        {steps.map((step, i) => (
          <View key={step} style={[styles.bar, i <= index ? styles.barDone : styles.barTodo]} />
        ))}
      </View>
      <View style={styles.caption}>
        <Text variant="caption" tone="muted">{`Adım ${index + 1} / ${steps.length}`}</Text>
        <Text variant="caption" tone="muted">
          {name}
        </Text>
      </View>
    </View>
  );
}

export interface WizardHeaderProps extends StepperProps {
  /** Adımın sorusu/başlığı: "Sınıfın adı ne?" */
  title: string;
  /** Tek kısa cümle (isteğe bağlı). */
  description?: string;
  /** Önceki adıma dön. İlk adımda verilmezse geri düğmesi gizlenir. */
  onBack?: () => void;
  /** Sihirbazdan çık (✕). */
  onClose?: () => void;
}

/**
 * Sihirbaz ekranlarının üst kısmı: geri / kapat çubuğu, adım çubuğu, büyük başlık.
 * `Screen header={<WizardHeader … />}` ile kullanın; altta `BottomActionBar` ile "Devam".
 */
export function WizardHeader({ title, description, steps, current, onBack, onClose, testID }: WizardHeaderProps) {
  const desktopWeb = useDesktopWeb();
  return (
    <View style={styles.header} testID={testID}>
      <View style={[styles.bar0, desktopWeb && styles.barDesktop]}>
        <View style={styles.side}>
          {onBack ? (
            <IconButton
              icon="back"
              accessibilityLabel="Önceki adım"
              onPress={onBack}
              size={backIconSize}
              testID="wizard-back"
            />
          ) : null}
        </View>
        <View style={styles.stepperWrap}>
          <Stepper steps={steps} current={current} />
        </View>
        <View style={[styles.side, styles.sideRight]}>
          {onClose ? (
            <IconButton icon="close" accessibilityLabel="Kapat" onPress={onClose} testID="wizard-close" />
          ) : null}
        </View>
      </View>
      <View style={styles.titles}>
        <Text variant="title" accessibilityRole="header">
          {title}
        </Text>
        {description ? (
          <Text variant="body" tone="muted">
            {description}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  stepper: { gap: spacing.xs + spacing.xxs },
  bars: { flexDirection: 'row', gap: spacing.xs },
  bar: { flex: 1, height: layout.stepBar, borderRadius: radii.full },
  barDone: { backgroundColor: colors.text },
  barTodo: { backgroundColor: colors.rule },
  caption: { flexDirection: 'row', justifyContent: 'space-between' },
  header: { paddingBottom: spacing.lg },
  bar0: {
    minHeight: layout.headerHeight,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xs,
  },
  barDesktop: { paddingTop: desktopBarInset },
  side: { width: layout.minTouch, flexDirection: 'row' },
  sideRight: { justifyContent: 'flex-end' },
  stepperWrap: { flex: 1, paddingHorizontal: spacing.md, paddingTop: spacing.md },
  titles: { paddingHorizontal: layout.pageX, paddingTop: spacing.lg, gap: spacing.sm },
});
