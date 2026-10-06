import type { ReactNode } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ToastProvider } from '@/components/ui';
import type { FormOption } from '@/types/database';

import type { FormListItem } from './api';

const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

/** Ekran testleri için sağlayıcılar (güvenli alan + toast). */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <SafeAreaProvider initialMetrics={metrics}>
      <ToastProvider>{children}</ToastProvider>
    </SafeAreaProvider>
  );
}

export function makeForm(overrides: Partial<FormListItem> = {}): FormListItem {
  const options: FormOption[] = [
    { key: 'geldi', label: 'Geldi', tone: 'positive' },
    { key: 'gelmedi', label: 'Gelmedi', tone: 'negative' },
  ];
  return {
    id: 'form-1',
    class_id: 'class-1',
    teacher_id: 'teacher-1',
    title: 'Yoklama',
    subject: 'Matematik',
    description: null,
    options,
    sort_order: 0,
    archived: false,
    mode: 'daily',
    created_at: '2026-09-01T08:00:00Z',
    lastSessionDate: null,
    ...overrides,
  };
}
