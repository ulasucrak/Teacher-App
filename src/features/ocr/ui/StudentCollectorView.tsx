import { useRef } from 'react';
import { Linking, StyleSheet, View, type TextInput } from 'react-native';

import { Banner, Button, SectionHeader, SegmentedChoice, TextField, type SegmentedChoiceItem } from '@/components/ui';
import { spacing } from '@/theme';

import { recognizeMessages } from '../recognize';
import { PhotoPanel } from './PhotoPanel';
import { ReviewList } from './ReviewList';
import type { CollectMethod, StudentCollector } from './useStudentCollector';

const METHODS: readonly SegmentedChoiceItem<CollectMethod>[] = [
  { key: 'photo', label: 'Fotoğraf' },
  { key: 'paste', label: 'Liste' },
  { key: 'type', label: 'Elle' },
];

export interface StudentCollectorViewProps {
  collector: StudentCollector;
  disabled?: boolean;
}

/**
 * Öğrenci ekleme gövdesi: yol seçimi (Fotoğraf / Liste / Elle), seçilen yolun alanı ve
 * altta tek düzenlenebilir liste. Sihirbazın 2. adımı ve "Öğrenci ekle" ekranı kullanır.
 */
export function StudentCollectorView({ collector, disabled = false }: StudentCollectorViewProps) {
  const typedRef = useRef<TextInput>(null);
  const { method, setMethod, rows, issues, notice } = collector;

  return (
    <View style={styles.wrap}>
      <SegmentedChoice
        options={METHODS}
        value={method}
        onChange={setMethod}
        disabled={disabled}
        accessibilityLabel="Öğrencileri ekleme yolu"
        testIDPrefix="collect-method"
      />

      {method === 'photo' ? (
        <>
          {!collector.photoAvailable ? (
            <Banner kind="warning" message={recognizeMessages.unavailable} />
          ) : null}
          <PhotoPanel collector={collector} disabled={disabled} />
        </>
      ) : null}

      {method === 'paste' ? (
        <View style={styles.panel}>
          <TextField
            label="Liste"
            value={collector.pasteText}
            onChangeText={collector.setPasteText}
            placeholder={'12 Ayşe Yılmaz\n15 Mehmet Kaya'}
            hint="Her satıra bir öğrenci; baştaki sayı okul numarası olur."
            multiline
            autoCapitalize="words"
            autoCorrect={false}
            editable={!disabled}
            testID="collect-paste-input"
          />
          <Button
            label="Listeye ekle"
            icon="plus"
            variant="secondary"
            onPress={() => collector.addPasted()}
            disabled={disabled || !collector.pasteText.trim()}
            testID="collect-paste-add"
          />
        </View>
      ) : null}

      {method === 'type' ? (
        <View style={styles.typeRow}>
          <TextField
            ref={typedRef}
            label="Ad soyad"
            value={collector.typedText}
            onChangeText={collector.setTypedText}
            placeholder="12 Ayşe Yılmaz"
            autoCapitalize="words"
            autoCorrect={false}
            autoComplete="off"
            returnKeyType="next"
            submitBehavior="submit"
            editable={!disabled}
            onSubmitEditing={() => {
              collector.addTyped();
              typedRef.current?.focus();
            }}
            containerStyle={styles.typeField}
            testID="collect-type-input"
          />
          <Button
            label="Ekle"
            variant="secondary"
            fullWidth={false}
            onPress={() => {
              collector.addTyped();
              typedRef.current?.focus();
            }}
            disabled={disabled || !collector.typedText.trim()}
            style={styles.typeButton}
            testID="collect-type-add"
          />
        </View>
      ) : null}

      {notice ? (
        <Banner
          kind={notice.kind}
          message={notice.message}
          actionLabel={notice.settings ? 'Ayarları aç' : undefined}
          onAction={notice.settings ? () => void Linking.openSettings() : undefined}
          actionTestID="collect-open-settings"
          testID="collect-notice"
        />
      ) : null}

      {rows.length > 0 ? (
        <View>
          <SectionHeader title="Öğrenciler" count={collector.drafts.length} />
          <ReviewList
            rows={rows}
            issues={issues}
            onChange={collector.updateRow}
            onRemove={collector.removeRow}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.lg },
  panel: { gap: spacing.sm },
  typeRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm },
  typeField: { flex: 1 },
  // Button satır içi hizasını (flex-start) ezer: alanın tabanına hizala.
  typeButton: { alignSelf: 'flex-end' },
});
