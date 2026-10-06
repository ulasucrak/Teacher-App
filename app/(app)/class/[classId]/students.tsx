import { useLocalSearchParams } from 'expo-router';

import { StudentsScreen } from '@/features/students';

/** /class/[classId]/students — öğrencileri yönetme (ara, düzenle, sil, ekle). */
export default function StudentsRoute() {
  const { classId } = useLocalSearchParams<{ classId: string }>();
  return <StudentsScreen classId={String(classId)} />;
}
