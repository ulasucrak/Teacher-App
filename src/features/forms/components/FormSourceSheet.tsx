import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { Banner, Button, LoadingState, Sheet, Text } from '@/components/ui';
import { colors, iconSize, layout, spacing } from '@/theme';
import type { FormRow } from '@/types/database';

import { classLabel, optionCountLabel, sameTitle, type ClassFormsGroup } from '../format';
import { FormIcon } from './FormIcon';
import { ToneDots } from './ToneDots';

interface FormSourceSheetProps {
  visible: boolean;
  onClose: () => void;
  /** `null` → yükleniyor. */
  groups: ClassFormsGroup[] | null;
  loadError?: string | null;
  onRetry?: () => void;
  /** Bu sınıftaki form adları ("aynı adlı form var" notu için). */
  existingTitles: readonly string[];
  /** Kopyalanmakta olan formun id'si. */
  busyFormId?: string | null;
  /** Ekleme hatası (Sheet açıkken toast görünmez). */
  pickError?: string | null;
  onPick: (form: FormRow) => void;
}

/** "Başka sınıftan form ekle": diğer sınıfların formları, sınıfa göre. Dokununca bu sınıfa eklenir. */
export function FormSourceSheet({
  visible,
  onClose,
  groups,
  loadError,
  onRetry,
  existingTitles,
  busyFormId,
  pickError,
  onPick,
}: FormSourceSheetProps) {
  return (
    <Sheet visible={visible} onClose={onClose} title="Başka sınıftan form ekle">
      <Text variant="bodySmall" tone="muted" style={styles.lead}>
        Dokunduğunuz form, seçenekleriyle birlikte bu sınıfa eklenir. Eski işaretlemeler kopyalanmaz.
      </Text>
      {pickError ? (
        <View style={styles.pickError}>
          <Banner kind="error" message={pickError} />
        </View>
      ) : null}
      {loadError ? (
        <View style={styles.gap}>
          <Banner kind="error" message={loadError} />
          {onRetry ? <Button label="Tekrar dene" variant="secondary" fullWidth={false} onPress={onRetry} /> : null}
        </View>
      ) : groups === null ? (
        <View style={styles.loading}>
          <LoadingState label="Formlar yükleniyor" />
        </View>
      ) : groups.length === 0 ? (
        <Banner
          kind="info"
          title="Diğer sınıflarınızda form yok"
          message="Başka bir sınıfta form oluşturduğunuzda buradan tek dokunuşla bu sınıfa ekleyebilirsiniz."
        />
      ) : (
        <View style={styles.groups}>
          {groups.map((group) => (
            <View key={group.classInfo.id}>
              <Text variant="heading" accessibilityRole="header" style={styles.groupTitle}>
                {classLabel(group.classInfo)}
              </Text>
              {group.forms.map((form) => {
                const duplicate = existingTitles.some((t) => sameTitle(t, form.title));
                const busy = busyFormId === form.id;
                const meta = [form.subject, optionCountLabel(form.options.length)].filter(Boolean).join(', ');
                return (
                  <Pressable
                    key={form.id}
                    onPress={() => onPick(form)}
                    disabled={Boolean(busyFormId)}
                    accessibilityRole="button"
                    accessibilityLabel={`${form.title}, ${meta}${duplicate ? ', bu sınıfta aynı adlı form var' : ''}`}
                    accessibilityHint="Formu bu sınıfa ekler"
                    accessibilityState={{ busy, disabled: Boolean(busyFormId) }}
                    style={({ pressed }) => [styles.row, pressed && styles.pressed]}
                  >
                    <View style={styles.texts}>
                      <Text variant="bodyStrong" numberOfLines={2}>
                        {form.title}
                      </Text>
                      <View style={styles.metaRow}>
                        <ToneDots options={form.options} />
                        <Text variant="caption" tone="muted" numberOfLines={1} style={styles.meta}>
                          {meta}
                        </Text>
                      </View>
                      {duplicate ? (
                        <Text variant="caption" tone="muted">
                          Bu sınıfta aynı adlı bir form var.
                        </Text>
                      ) : null}
                    </View>
                    {busy ? (
                      <ActivityIndicator color={colors.primary} />
                    ) : (
                      <FormIcon name="plus" size={iconSize.lg} color={colors.primary} />
                    )}
                  </Pressable>
                );
              })}
            </View>
          ))}
        </View>
      )}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  lead: { marginBottom: spacing.sm },
  gap: { gap: spacing.md },
  pickError: { marginBottom: spacing.md },
  loading: { paddingVertical: spacing.xl },
  groups: { gap: spacing.lg },
  groupTitle: { paddingTop: spacing.sm, paddingBottom: spacing.xs },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: layout.minTouch + spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: layout.hairline,
    borderBottomColor: colors.rule,
  },
  pressed: { backgroundColor: colors.pressedOverlay },
  texts: { flex: 1, gap: spacing.xs },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  meta: { flexShrink: 1 },
});
