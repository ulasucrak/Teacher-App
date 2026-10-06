import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button, Sheet, TextField } from '@/components/ui';
import { spacing } from '@/theme';

export const NOTE_MAX_LENGTH = 500;

export interface NoteSheetProps {
  visible: boolean;
  studentName: string;
  initialNote: string | null;
  onSave: (note: string | null) => void;
  onClose: () => void;
}

/** Öğrenciye kısa not. Taslağa yazar; sunucuya alt çubuktaki "Kaydet" ile gider. */
export function NoteSheet({ visible, studentName, initialNote, onSave, onClose }: NoteSheetProps) {
  const [text, setText] = useState(initialNote ?? '');
  const [lastInitial, setLastInitial] = useState({ initialNote, visible });

  // Sheet her açıldığında (ya da başka öğrenciye geçildiğinde) alanı sıfırla.
  if (lastInitial.initialNote !== initialNote || lastInitial.visible !== visible) {
    setLastInitial({ initialNote, visible });
    if (visible) setText(initialNote ?? '');
  }

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={studentName}
      testID="note-sheet"
      footer={
        <View style={styles.actions}>
          <Button label="Notu kaydet" onPress={() => onSave(text)} testID="note-save" />
          {initialNote ? (
            <Button label="Notu sil" variant="ghost" onPress={() => onSave(null)} testID="note-delete" />
          ) : null}
        </View>
      }
    >
      <TextField
        label="Not"
        value={text}
        onChangeText={setText}
        placeholder="Örneğin: Kitabını unuttu"
        multiline
        maxLength={NOTE_MAX_LENGTH}
        autoFocus
        textAlignVertical="top"
        testID="note-input"
      />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  actions: { gap: spacing.xs },
});
