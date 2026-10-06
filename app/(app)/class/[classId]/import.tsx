import { useLocalSearchParams } from 'expo-router';

import { ImportStudentsScreen } from '@/features/ocr/ImportStudentsScreen';
import { toCollectMethod } from '@/features/ocr/ui';

/** /class/[classId]/import?method=photo|paste|type — var olan sınıfa öğrenci ekleme. */
export default function ImportStudentsRoute() {
  const { classId, method } = useLocalSearchParams<{ classId: string; method?: string }>();
  return <ImportStudentsScreen classId={String(classId)} initialMethod={toCollectMethod(method)} />;
}
