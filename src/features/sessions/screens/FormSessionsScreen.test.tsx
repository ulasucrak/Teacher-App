import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ToastProvider } from '@/components/ui';
import type { FormRow, FormSessionRow } from '@/types/database';

import * as api from '../api';
import { todayIso } from '../date';
import { FormSessionsScreen } from './FormSessionsScreen';

jest.mock('../api', () => {
  const actual = jest.requireActual<typeof import('../api')>('../api');
  return { ...actual, getForm: jest.fn(), listSessions: jest.fn(), countStudents: jest.fn(), createSession: jest.fn() };
});

const mockRouter = { back: jest.fn(), push: jest.fn(), canGoBack: jest.fn(() => true) };

jest.mock('expo-router', () => {
  const { useEffect } = jest.requireActual<typeof import('react')>('react');
  return {
    useLocalSearchParams: () => ({ classId: 'c1', formId: 'f1' }),
    useRouter: () => mockRouter,
    useFocusEffect: (effect: () => void) => useEffect(effect, [effect]),
  };
});

jest.mock('react-native/Libraries/Modal/Modal', () => jest.requireActual('@/test/nativeModalMock'));

const mocked = api as jest.Mocked<typeof api>;

const form: FormRow = {
  id: 'f1',
  class_id: 'c1',
  teacher_id: 't',
  title: 'Ödev kontrolü',
  subject: 'Matematik',
  description: null,
  archived: false,
  sort_order: 0,
  created_at: '',
  options: [
    { key: 'done', label: 'Tamamlandı', tone: 'positive' },
    { key: 'none', label: 'Getirmedi', tone: 'negative' },
  ],
};

const session = (id: string, session_date: string, status: FormSessionRow['status'], title: string | null = null): FormSessionRow => ({
  id,
  form_id: 'f1',
  teacher_id: 't',
  session_date,
  title,
  status,
  created_at: '',
  updated_at: '',
});

function Providers({ children }: { children: ReactNode }) {
  return (
    <SafeAreaProvider
      initialMetrics={{ frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } }}
    >
      <ToastProvider>{children}</ToastProvider>
    </SafeAreaProvider>
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  mocked.getForm.mockResolvedValue(form);
  mocked.countStudents.mockResolvedValue(44);
  mocked.listSessions.mockResolvedValue([
    { session: session('s2', '2026-09-15', 'published', 'Ünite 2'), filled: 38, counts: { done: 30, none: 8 } },
    { session: session('s1', '2026-09-14', 'draft'), filled: 44, counts: { done: 44 } },
  ]);
});

describe('FormSessionsScreen', () => {
  it('lists sessions with Turkish dates and progress', async () => {
    await render(<FormSessionsScreen />, { wrapper: Providers });

    expect(await screen.findByText('Ödev kontrolü')).toBeOnTheScreen();
    expect(screen.getByText(/^15 Eylül/)).toBeOnTheScreen();
    expect(screen.getByText('Ünite 2')).toBeOnTheScreen();
    expect(screen.getByText('38/44')).toBeOnTheScreen();
    expect(screen.getByText('44/44')).toBeOnTheScreen();
    expect(screen.queryByText('Taslak')).toBeNull();

    await fireEvent.press(screen.getByTestId('session-row-1'));
    expect(mockRouter.push).toHaveBeenCalledWith('/class/c1/form/f1/session/s1');
  });

  it("starts today's session without creating it up front", async () => {
    await render(<FormSessionsScreen />, { wrapper: Providers });
    await screen.findByText('Ödev kontrolü');

    expect(screen.getByTestId('history-today')).toHaveTextContent('Bugünün kaydını başlat');
    await fireEvent.press(screen.getByTestId('history-today'));
    expect(mockRouter.push).toHaveBeenCalledWith(`/class/c1/form/f1/session/new?date=${todayIso()}`);
    expect(mocked.createSession).not.toHaveBeenCalled();
  });

  it("offers to open today's session when it exists", async () => {
    mocked.listSessions.mockResolvedValueOnce([
      { session: session('s3', todayIso(), 'published'), filled: 2, counts: { done: 2 } },
    ]);
    await render(<FormSessionsScreen />, { wrapper: Providers });

    expect(await screen.findByText('Bugünün kaydını aç')).toBeOnTheScreen();
    expect(screen.getByText(/^Bugün, /)).toBeOnTheScreen();
  });

  it('opens another day from the day sheet', async () => {
    await render(<FormSessionsScreen />, { wrapper: Providers });
    await screen.findByText('Ödev kontrolü');

    await fireEvent.press(screen.getByTestId('history-other-day'));
    expect(await screen.findByTestId('date-next')).toBeDisabled();
    await fireEvent.press(screen.getByTestId('date-prev'));
    await fireEvent.press(screen.getByTestId('day-sheet-open'));

    const { addDays } = jest.requireActual<typeof import('../date')>('../date');
    await waitFor(() =>
      expect(mockRouter.push).toHaveBeenCalledWith(`/class/c1/form/f1/session/new?date=${addDays(todayIso(), -1)}`),
    );
  });

  it('shows an empty state without sessions', async () => {
    mocked.listSessions.mockResolvedValueOnce([]);
    await render(<FormSessionsScreen />, { wrapper: Providers });

    expect(await screen.findByText('Henüz kayıt yok')).toBeOnTheScreen();
  });

  it('shows a retryable error', async () => {
    mocked.getForm.mockRejectedValueOnce(new api.SessionsApiError('Form bulunamadı. Silinmiş olabilir; form listesine dönün.'));
    await render(<FormSessionsScreen />, { wrapper: Providers });

    expect(await screen.findByText('Form bulunamadı. Silinmiş olabilir; form listesine dönün.')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Tekrar dene' }));
    expect(await screen.findByText('Ödev kontrolü')).toBeOnTheScreen();
  });
});
