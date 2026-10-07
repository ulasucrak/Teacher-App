import { useRef } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { colors, iconSize, layout, radii, spacing } from '@/theme';

import { Icon, type IconName } from './Icon';
import { Sheet } from './Sheet';
import { Text } from './Text';

export interface OverflowAction {
  key: string;
  label: string;
  /** Tek satır açıklama (isteğe bağlı): "Diğer sınıftaki bir formu kopyalar". */
  description?: string;
  icon?: IconName;
  /** Kırmızı; listenin sonuna koyun. Onayı `ConfirmSheet` ile alın. */
  destructive?: boolean;
  disabled?: boolean;
  onPress: () => void;
  testID?: string;
}

export interface OverflowMenuProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  actions: readonly OverflowAction[];
  /** Panele `testID`; eylemlere kendi `testID`'leri ya da `${testID}-${key}` verilir. */
  testID?: string;
}

/**
 * İkincil eylemler için alttan açılan liste ("⋯" düğmesinin arkası). Seçilen eylem panel
 * tamamen kapandıktan SONRA çalışır — böylece ardından Alert, ConfirmSheet ya da gezinme
 * güvenle açılır (iOS aynı anda iki modal sunamaz).
 */
export function OverflowMenu({ visible, onClose, title, description, actions, testID }: OverflowMenuProps) {
  const pending = useRef<(() => void) | null>(null);

  const choose = (action: OverflowAction) => {
    pending.current = action.onPress;
    onClose();
  };

  const runPending = () => {
    const run = pending.current;
    pending.current = null;
    run?.();
  };

  return (
    <Sheet
      visible={visible}
      onClose={() => {
        pending.current = null;
        onClose();
      }}
      onDismissed={runPending}
      title={title}
      description={description}
      testID={testID}
    >
      <View>
        {actions.map((action, index) => {
          const fg = action.destructive ? colors.danger : colors.text;
          return (
            <Pressable
              key={action.key}
              testID={action.testID ?? (testID ? `${testID}-${action.key}` : undefined)}
              onPress={() => choose(action)}
              disabled={action.disabled}
              accessibilityRole="button"
              accessibilityLabel={action.description ? `${action.label}. ${action.description}` : action.label}
              accessibilityState={{ disabled: action.disabled }}
              style={({ pressed }) => [
                styles.item,
                index < actions.length - 1 && styles.divider,
                pressed && styles.pressed,
                action.disabled && styles.disabled,
              ]}
            >
              {action.icon ? (
                <View style={[styles.iconBox, action.destructive && styles.iconBoxDanger]}>
                  <Icon name={action.icon} size={iconSize.lg} color={fg} />
                </View>
              ) : null}
              <View style={styles.texts}>
                <Text variant="bodyStrong" color={fg}>
                  {action.label}
                </Text>
                {action.description ? (
                  <Text variant="caption" tone="muted">
                    {action.description}
                  </Text>
                ) : null}
              </View>
            </Pressable>
          );
        })}
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: layout.rowHeight,
    paddingVertical: spacing.sm,
    marginHorizontal: -spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  divider: { borderBottomWidth: layout.hairline, borderBottomColor: colors.rule },
  // Basılıyken yuvarlak vurgu; ayraç düz kalsın diye yarıçap yalnızca burada (ayraç basılıyken gizlenir).
  pressed: { backgroundColor: colors.surfaceMuted, borderRadius: radii.sm, borderBottomColor: 'transparent' },
  disabled: { opacity: 0.45 },
  iconBox: {
    width: layout.minTouch - spacing.sm,
    height: layout.minTouch - spacing.sm,
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBoxDanger: { backgroundColor: colors.dangerMuted },
  texts: { flex: 1, gap: spacing.xxs },
});
