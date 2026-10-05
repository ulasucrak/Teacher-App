import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { Badge, Card, Icon, Text } from '@/components/ui';
import { colors, layout, radii, spacing } from '@/theme';
import type { FormSessionStatus } from '@/types/database';

export const STATUS_LABEL: Record<FormSessionStatus, string> = { published: 'Yayında', draft: 'Taslak' };

export interface FormHeaderCardProps {
  /** Ders adı (cümle düzeninde, örn. "Matematik"). Yoksa `fallbackTitle` gösterilir. */
  subject: string | null;
  description: string | null;
  fallbackTitle: string;
  status?: FormSessionStatus;
  /** Alt bölüm: tarih, eylemler. */
  children?: ReactNode;
}

/** Referans ekrandaki başlık kartı: ders ikonu, ders, açıklama, durum rozeti. */
export function FormHeaderCard({ subject, description, fallbackTitle, status, children }: FormHeaderCardProps) {
  const heading = subject?.trim() || fallbackTitle;
  return (
    <Card style={styles.card}>
      <View style={styles.row}>
        <View style={styles.iconBox}>
          <Icon name="book" color={colors.primary} />
        </View>
        <View style={styles.texts}>
          <Text variant="bodyStrong" numberOfLines={1}>
            {heading}
          </Text>
          {description ? (
            <Text variant="bodySmall" tone="muted" numberOfLines={2}>
              {description}
            </Text>
          ) : null}
        </View>
        {status ? <Badge label={STATUS_LABEL[status]} tone={status === 'published' ? 'positive' : 'neutral'} /> : null}
      </View>
      {children ? <View style={styles.extra}>{children}</View> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.md },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  iconBox: {
    width: layout.minTouch - spacing.sm,
    height: layout.minTouch - spacing.sm,
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  texts: { flex: 1, gap: spacing.xxs, paddingTop: spacing.xxs },
  extra: {
    borderTopWidth: layout.hairline,
    borderTopColor: colors.rule,
    paddingTop: spacing.md,
    gap: spacing.md,
  },
});
