import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { Providers } from '@/features/forms/test-utils';
import * as history from '@/features/history';
import * as api from '@/features/sessions/api';
import { todayIso } from '@/features/sessions/date';
import type { FormSessionRow } from '@/types/database';

import { FormScreen } from './FormScreen';
import { attendanceForm, plusMinusForm, tally } from './fixtures';

jest.mock('@/features/sessions/api', () => {
  const actual = jest.requireActual<typeof import('@/features/sessions/api')>('@/features/sessions/api');
  return { ...actual, getForm: jest.fn(), listSessions: jest.fn(), countStudents: jest.fn(), createSession: jest.fn() };
});

jest.mock('@/features/history/api', () => {
  const actual = jest.requireActual<typeof import('@/features/history/api')>('@/features/history/api');
  return {
    ...actual,
    getTallies: jest.fn(),
    getFormSummary: jest.fn(),
    listHistory: jest.fn(),
    addMark: jest.fn(),
    removeMark: jest.fn(),
    undoLastMark: jest.fn(),
  };
});

const mockRouter = { back: jest.fn(), push: jest.fn(), canGoBack: jest.fn(() => true) };
let mockParams: Record<string, string> = { classId: 'c1', formId: 'f1' };

jest.mock('expo-router', () => {
  const { useEffect } = jest.requireActual<typeof import('react')>('react');
  return {
    useLocalSearchParams: () => mockParams,
    useRouter: () => mockRouter,
    useFocusEffect: (effect: () => void) => useEffect(effect, [effect]),
  };
});

jest.mock('react-native/Libraries/Modal/Modal', () => jest.requireActual('@/test/nativeModalMock'));

const mockedApi = jest.mocked(api);
const mockedHistory = jest.mocked(history);

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

beforeEach(() => {
  jest.clearAllMocks();
  mockParams = { classId: 'c1', formId: 'f1' };
  mockedApi.getForm.mockResolvedValue({ ...attendanceForm, title: 'Ödev kontrolü' });
  mockedApi.countStudents.mockResolvedValue(44);
  mockedApi.listSessions.mockResolvedValue([
    { session: session('s2', '2026-09-15', 'published', 'Ünite 2'), filled: 38, counts: { var: 30, yok: 8 } },
    { session: session('s1', '2026-09-14', 'draft'), filled: 44, counts: { var: 44 } },
  ]);
  mockedHistory.getTallies.mockResolvedValue([]);
  mockedHistory.getFormSummary.mockResolvedValue({
    students: [],
    totals: {},
    items: [],
    total: 0,
    net: null,
    scored: false,
  });
  mockedHistory.listHistory.mockResolvedValue({ events: [], nextCursor: null });
});

describe('FormScreen (daily form)', () => {
  it('lists sessions with Turkish dates and progress under "İşaretle"', async () => {
    await render(<FormScreen />, { wrapper: Providers });

    expect(await screen.findByText('Ödev kontrolü')).toBeOnTheScreen();
    expect(await screen.findByText(/^15 Eylül/)).toBeOnTheScreen();
    expect(screen.getByText('Ünite 2')).toBeOnTheScreen();
    expect(screen.getByText('38/44')).toBeOnTheScreen();
    expect(screen.getByText('44/44')).toBeOnTheScreen();
    expect(screen.getByTestId('form-tab-mark')).toBeSelected();

    await fireEvent.press(screen.getByTestId('session-row-1'));
    expect(mockRouter.push).toHaveBeenCalledWith('/class/c1/form/f1/session/s1');
  });

  it("starts today's session without creating it up front", async () => {
    await render(<FormScreen />, { wrapper: Providers });

    const today = await screen.findByTestId('sessions-today');
    expect(today).toHaveTextContent('Bugünün kaydını başlat');
    await fireEvent.press(today);
    expect(mockRouter.push).toHaveBeenCalledWith(`/class/c1/form/f1/session/new?date=${todayIso()}`);
    expect(mockedApi.createSession).not.toHaveBeenCalled();
  });

  it("offers to open today's session when it exists", async () => {
    mockedApi.listSessions.mockResolvedValueOnce([
      { session: session('s3', todayIso(), 'published'), filled: 2, counts: { var: 2 } },
    ]);
    await render(<FormScreen />, { wrapper: Providers });

    expect(await screen.findByText('Bugünün kaydını aç')).toBeOnTheScreen();
    expect(screen.getByText(/^Bugün, /)).toBeOnTheScreen();
  });

  it('opens another day from the day sheet', async () => {
    await render(<FormScreen />, { wrapper: Providers });

    await fireEvent.press(await screen.findByTestId('sessions-other-day'));
    expect(await screen.findByTestId('date-next')).toBeDisabled();
    await fireEvent.press(screen.getByTestId('date-prev'));
    await fireEvent.press(screen.getByTestId('day-sheet-open'));

    const { addDays } = jest.requireActual<typeof import('@/features/sessions/date')>('@/features/sessions/date');
    await waitFor(() =>
      expect(mockRouter.push).toHaveBeenCalledWith(`/class/c1/form/f1/session/new?date=${addDays(todayIso(), -1)}`),
    );
  });

  it('shows an empty state without sessions', async () => {
    mockedApi.listSessions.mockResolvedValueOnce([]);
    await render(<FormScreen />, { wrapper: Providers });

    expect(await screen.findByText('Henüz kayıt yok')).toBeOnTheScreen();
  });

  it('shows a retryable error when the form cannot be loaded', async () => {
    mockedApi.getForm.mockRejectedValueOnce(new api.SessionsApiError('Form bulunamadı. Silinmiş olabilir; form listesine dönün.'));
    await render(<FormScreen />, { wrapper: Providers });

    expect(await screen.findByText('Form bulunamadı. Silinmiş olabilir; form listesine dönün.')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Tekrar dene' }));
    expect(await screen.findByText('Ödev kontrolü')).toBeOnTheScreen();
  });

  it('treats a form of another class as not found', async () => {
    mockedApi.getForm.mockResolvedValueOnce({ ...attendanceForm, class_id: 'other' });
    await render(<FormScreen />, { wrapper: Providers });

    expect(await screen.findByText(/Form bulunamadı/)).toBeOnTheScreen();
  });

  it('opens on "Geçmiş" with ?tab=history and shows the daily summary without a net', async () => {
    mockParams = { classId: 'c1', formId: 'f1', tab: 'history' };
    mockedHistory.getFormSummary.mockResolvedValue({
      students: [
        {
          studentId: 's1',
          fullName: 'Ali Yılmaz',
          number: '12',
          counts: { var: 18, yok: 2 },
          items: [],
          total: 20,
          net: null,
        },
      ],
      totals: { var: 18, yok: 2 },
      items: [],
      total: 20,
      net: null,
      scored: false,
    });
    await render(<FormScreen />, { wrapper: Providers });

    expect(await screen.findByTestId('form-tab-history')).toBeSelected();
    expect(await screen.findByTestId('summary-totals-counts')).toHaveTextContent('18 Var, 2 Yok');
    expect(screen.queryByTestId('summary-totals-net')).toBeNull();
    // Günlük, puansız formda sıralama seçeneği yok.
    expect(screen.queryByTestId('summary-sort-name')).toBeNull();
    // Sayfa açıkken İşaretle listesi gizli.
    expect(screen.queryByTestId('sessions-today')).toBeNull();
  });

  it('switches between tabs and shows the history of every change', async () => {
    mockedHistory.listHistory.mockResolvedValue({
      events: [
        {
          id: 5,
          kind: 'entry_updated',
          studentId: 's1',
          studentName: 'Ali Yılmaz',
          studentNumber: '12',
          eventDate: todayIso(),
          occurredAt: new Date(new Date().setHours(10, 32, 0, 0)).toISOString(),
          oldOptionKey: 'var',
          newOptionKey: 'yok',
          oldNote: null,
          newNote: null,
          markId: null,
          undone: false,
        },
      ],
      nextCursor: null,
    });
    await render(<FormScreen />, { wrapper: Providers });

    await fireEvent.press(await screen.findByTestId('form-tab-history'));
    await fireEvent.press(await screen.findByTestId('history-view-timeline'));

    expect(await screen.findByTestId('event-5-change')).toHaveTextContent('Var → Yok');
    expect(screen.getByText('10:32')).toBeOnTheScreen();
    expect(screen.getByText('Ali Yılmaz')).toBeOnTheScreen();
    expect(screen.getByText(/^Bugün, /)).toBeOnTheScreen();

    await fireEvent.press(screen.getByTestId('form-tab-mark'));
    expect(await screen.findByTestId('sessions-today')).toBeOnTheScreen();
  });
});

describe('FormScreen (cumulative form)', () => {
  it('shows the marking list instead of daily sessions', async () => {
    mockParams = { classId: 'c1', formId: 'f2' };
    mockedApi.getForm.mockResolvedValue(plusMinusForm);
    mockedHistory.getTallies.mockResolvedValue([
      tally({ studentId: 's1', fullName: 'Ali Yılmaz', number: '12', counts: { arti: 5, eksi: 2 }, dayCounts: { arti: 1 } }),
    ]);
    await render(<FormScreen />, { wrapper: Providers });

    expect(await screen.findByTestId('mark-row-0')).toBeOnTheScreen();
    expect(mockedApi.listSessions).not.toHaveBeenCalled();
    expect(screen.queryByTestId('sessions-today')).toBeNull();
  });
});
