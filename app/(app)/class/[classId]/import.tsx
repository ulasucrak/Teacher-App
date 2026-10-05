import { useLocalSearchParams } from 'expo-router';

import { ImportStudentsScreen } from '@/features/ocr/ImportStudentsScreen';

/** /class/[classId]/import — sınıf listesini fotoğraftan (cihaz üstü OCR) içe aktarma. */
export default function ImportStudentsRoute() {
  const { classId } = useLocalSearchParams<{ classId: string }>();
  return <ImportStudentsScreen classId={String(classId)} />;
}
