import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';

import { Providers } from '@/features/forms/test-utils';
import * as history from '@/features/history';
import * as api from '@/features/sessions/api';
import { addDays, todayIso } from '@/features/sessions/date';
import type { FormEntryRow, FormSessionRow, StudentRow } from '@/types/database';

import { monthOf, shiftMonth } from './calendar';
import { FormScreen } from './FormScreen';
import { attendanceForm, plusMinusForm, tally } from './fixtures';

jest.mock('@/features/sessions/api', () => {
  const actual = jest.requireActual<typeof import('@/features/sessions/api')>('@/features/sessions/api');
  return {
    ...actual,
    getForm: jest.fn(),
    listStudents: jest.fn(),
    findSessionByDate: jest.fn(),
    listEntries: jest.fn(),
    ensureSessionForDate: jest.fn(),
    upsertEntries: jest.fn(),
    updateSessionStatus: jest.fn(),
    deleteSession: jest.fn(),
  };
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
const mockAddListener = jest.fn((..._args: unknown[]) => () => undefined);
let mockParams: Record<string, string> = { classId: 'c1', formId: 'f1' };

jest.mock('expo-router', () => {
  const { useEffect } = jest.requireActual<typeof import('react')>('react');
  return {
    useLocalSearchParams: () => mockParams,
    useRouter: () => mockRouter,
    useNavigation: () => ({ addListener: mockAddListener, dispatch: jest.fn(), setOptions: jest.fn() }),
    useFocusEffect: (effect: () => void) => useEffect(effect, [effect]),
  };
});

jest.mock('react-native/Libraries/Modal/Modal', () => jest.requireActual('@/test/nativeModalMock'));

const mockedApi = jest.mocked(api);
const mockedHistory = jest.mocked(history);

const student = (id: string, full_name: string, number: string): StudentRow => ({
  id,
  class_id: 'c1',
  teacher_id: 't',
  full_name,
  number,
  photo_url: null,
  created_at: '',
});

const session = (id: string, session_date: string): FormSessionRow => ({
  id,
  form_id: 'f1',
  teacher_id: 't',
  session_date,
  title: null,
  status: 'published',
  created_at: '',
  updated_at: '',
});

const entry = (student_id: string, option_key: string): FormEntryRow => ({
  id: `e-${student_id}`,
  session_id: 's1',
  student_id,
  teacher_id: 't',
  option_key,
  note: null,
  updated_at: '',
});

const emptySummary = { students: [], totals: {}, items: [], total: 0, net: null, scored: false };

beforeEach(() => {
  jest.clearAllMocks();
  mockParams = { classId: 'c1', formId: 'f1' };
  mockedApi.getForm.mockResolvedValue(attendanceForm);
  mockedApi.listStudents.mockResolvedValue([student('st1', 'Ayşe Yılmaz', '7'), student('st2', 'Serra Güngör', '12')]);
  mockedApi.findSessionByDate.mockResolvedValue(null);
  mockedApi.listEntries.mockResolvedValue([]);
  mockedApi.ensureSessionForDate.mockResolvedValue({ session: session('s1', todayIso()), created: true });
  mockedApi.upsertEntries.mockResolvedValue(undefined);
  mockedHistory.getTallies.mockResolvedValue([]);
  mockedHistory.getFormSummary.mockResolvedValue(emptySummary);
  mockedHistory.listHistory.mockResolvedValue({ events: [], nextCursor: null });
});

describe('FormScreen (daily form)', () => {
  it("opens on İşaretle with today's students and options, no record list in between", async () => {
    await render(<FormScreen />, { wrapper: Providers });

    expect(await screen.findByTestId('student-row-0')).toBeOnTheScreen();
    expect(screen.getByTestId('form-tab-mark')).toBeSelected();
    expect(screen.getByTestId('fill-day-label')).toHaveTextContent(/^Bugün, /);
    expect(screen.getByTestId('student-row-0-name')).toHaveTextContent('Ayşe Yılmaz');
    expect(screen.getByTestId('save-button')).toBeDisabled();
    expect(mockedApi.findSessionByDate).toHaveBeenCalledWith('f1', todayIso());
  });

  it('marks students and saves, creating the day\'s record on the first save', async () => {
    await render(<FormScreen />, { wrapper: Providers });
    await fireEvent.press(await screen.findByTestId('bulk-var'));
    await fireEvent.press(screen.getByTestId('student-row-1-yok'));
    expect(screen.getByTestId('fill-day-trailing')).toHaveTextContent('2/2');

    await fireEvent.press(screen.getByTestId('save-button'));
    await waitFor(() => expect(mockedApi.upsertEntries).toHaveBeenCalled());
    expect(mockedApi.ensureSessionForDate).toHaveBeenCalledWith({ formId: 'f1', sessionDate: todayIso() });
    expect(mockedApi.upsertEntries.mock.calls[0]![0]).toEqual([
      { session_id: 's1', student_id: 'st1', option_key: 'var', note: null },
      { session_id: 's1', student_id: 'st2', option_key: 'yok', note: null },
    ]);
    expect(await screen.findByText('Kaydedildi')).toBeOnTheScreen();
  });

  it('shows the saved values of an existing record', async () => {
    mockedApi.findSessionByDate.mockResolvedValue(session('s1', todayIso()));
    mockedApi.listEntries.mockResolvedValue([entry('st1', 'var')]);
    await render(<FormScreen />, { wrapper: Providers });

    await screen.findByTestId('student-row-0');
    expect(screen.getByTestId('student-row-0-var')).toBeSelected();
    expect(screen.getByTestId('fill-day-trailing')).toHaveTextContent('1/2');
  });

  it('steps to the previous day and loads that day', async () => {
    await render(<FormScreen />, { wrapper: Providers });
    await screen.findByTestId('student-row-0');

    await fireEvent.press(screen.getByTestId('fill-day-prev'));
    const yesterday = addDays(todayIso(), -1);
    await waitFor(() => expect(mockedApi.findSessionByDate).toHaveBeenCalledWith('f1', yesterday));
    expect(await screen.findByTestId('fill-day-label')).toHaveTextContent(/^Dün, /);
    expect(screen.getByTestId('fill-day-next')).toBeEnabled();
  });

  it('picks another day from the calendar', async () => {
    await render(<FormScreen />, { wrapper: Providers });
    await screen.findByTestId('student-row-0');

    await fireEvent.press(screen.getByTestId('fill-day-pick'));
    await fireEvent.press(await screen.findByTestId('calendar-prev'));
    const { year, month } = shiftMonth(monthOf(todayIso()), -1);
    const first = `${year}-${String(month).padStart(2, '0')}-15`;
    await fireEvent.press(await screen.findByTestId(`calendar-day-${first}`));

    await waitFor(() => expect(mockedApi.findSessionByDate).toHaveBeenCalledWith('f1', first));
  });

  it('asks before leaving a day with unsaved changes and keeps the draft when you decline', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    await render(<FormScreen />, { wrapper: Providers });
    await fireEvent.press(await screen.findByTestId('student-row-0-yok'));

    await fireEvent.press(screen.getByTestId('fill-day-prev'));
    expect(alertSpy).toHaveBeenCalledWith(
      'Değişiklikler kaydedilmedi',
      'Devam ederseniz 1 öğrencideki değişiklik kaybolur.',
      expect.any(Array),
    );
    expect(mockedApi.findSessionByDate).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('fill-day-label')).toHaveTextContent(/^Bugün, /);

    // "Kaydetmeden geç"
    const buttons = alertSpy.mock.calls[0]![2]!;
    await act(async () => {
      buttons.find((b) => b.text === 'Kaydetmeden geç')!.onPress!();
    });
    await waitFor(() => expect(mockedApi.findSessionByDate).toHaveBeenCalledTimes(2));
    alertSpy.mockRestore();
  });

  it('keeps unsaved marks while you look at Geçmiş and come back', async () => {
    await render(<FormScreen />, { wrapper: Providers });
    await fireEvent.press(await screen.findByTestId('student-row-0-yok'));

    await fireEvent.press(screen.getByTestId('form-tab-history'));
    expect(await screen.findByTestId('history-pane')).toBeOnTheScreen();
    expect(screen.queryByTestId('student-row-0')).toBeNull();

    await fireEvent.press(screen.getByTestId('form-tab-mark'));
    expect(await screen.findByTestId('student-row-0-yok')).toBeSelected();
    expect(screen.getByTestId('save-button')).toBeEnabled();
  });

  it('guards leaving the screen with unsaved changes', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    await render(<FormScreen />, { wrapper: Providers });
    await fireEvent.press(await screen.findByTestId('student-row-0-yok'));
    const listener = mockAddListener.mock.calls.at(-1)?.[1] as (e: unknown) => void;

    const event = { preventDefault: jest.fn(), data: { action: { type: 'GO_BACK' } } };
    listener(event);
    expect(event.preventDefault).toHaveBeenCalled();
    expect(alertSpy).toHaveBeenCalledWith('Değişiklikler kaydedilmedi', expect.stringContaining('1 öğrenci'), expect.any(Array));
    alertSpy.mockRestore();
  });

  it('deletes the day\'s record from the menu and reloads an empty day', async () => {
    mockedApi.findSessionByDate.mockResolvedValueOnce(session('s1', todayIso()));
    mockedApi.listEntries.mockResolvedValueOnce([entry('st1', 'var')]);
    mockedApi.deleteSession.mockResolvedValue(undefined);
    await render(<FormScreen />, { wrapper: Providers });
    await screen.findByTestId('student-row-0');

    await fireEvent.press(screen.getByTestId('form-more'));
    await fireEvent.press(await screen.findByTestId('form-menu-delete'));
    await fireEvent.press(await screen.findByTestId('fill-delete-confirm-confirm'));

    await waitFor(() => expect(mockedApi.deleteSession).toHaveBeenCalledWith('s1'));
    await waitFor(() => expect(mockedApi.findSessionByDate).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.getByTestId('fill-day-trailing')).toHaveTextContent('0/2'));
  });

  it('shows a retryable error when the form cannot be loaded', async () => {
    mockedApi.getForm.mockRejectedValueOnce(new api.SessionsApiError('Form bulunamadı. Silinmiş olabilir; form listesine dönün.'));
    await render(<FormScreen />, { wrapper: Providers });

    expect(await screen.findByText('Form bulunamadı. Silinmiş olabilir; form listesine dönün.')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Tekrar dene' }));
    expect(await screen.findByTestId('student-row-0')).toBeOnTheScreen();
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
        { studentId: 's1', fullName: 'Ali Yılmaz', number: '12', counts: { var: 18, yok: 2 }, items: [], total: 20, net: null },
      ],
      totals: { var: 18, yok: 2 },
      items: [
        { key: 'var', label: 'Var', tone: 'positive', count: 18, score: null },
        { key: 'yok', label: 'Yok', tone: 'negative', count: 2, score: null },
      ],
      total: 20,
      net: null,
      scored: false,
    });
    await render(<FormScreen />, { wrapper: Providers });

    expect(await screen.findByTestId('form-tab-history')).toBeSelected();
    expect(await screen.findByTestId('summary-totals-counts')).toHaveProp('accessibilityLabel', '18 Var, 2 Yok');
    expect(screen.queryByTestId('summary-totals-net')).toBeNull();
    expect(screen.queryByTestId('summary-sort-name')).toBeNull();
  });

  it('"Bu günü düzenle" in Geçmiş opens that day in İşaretle', async () => {
    mockParams = { classId: 'c1', formId: 'f1', tab: 'history' };
    const yesterday = addDays(todayIso(), -1);
    mockedHistory.getFormSummary.mockResolvedValue({
      students: [{ studentId: 'st1', fullName: 'Ayşe Yılmaz', number: '7', counts: { var: 1 }, items: [{ key: 'var', label: 'Var', tone: 'positive', count: 1, score: null }], total: 1, net: null }],
      totals: { var: 1 },
      items: [],
      total: 1,
      net: null,
      scored: false,
    });
    await render(<FormScreen />, { wrapper: Providers });

    await fireEvent.press(await screen.findByTestId('history-view-day'));
    await fireEvent.press(await screen.findByTestId('review-day-prev'));
    await fireEvent.press(await screen.findByTestId('day-edit'));

    expect(await screen.findByTestId('form-tab-mark')).toBeSelected();
    await waitFor(() => expect(mockedApi.findSessionByDate).toHaveBeenCalledWith('f1', yesterday));
    expect(await screen.findByTestId('fill-day-label')).toHaveTextContent(/^Dün, /);
  });
});

describe('FormScreen (cumulative form)', () => {
  it('shows the marking list', async () => {
    mockParams = { classId: 'c1', formId: 'f2' };
    mockedApi.getForm.mockResolvedValue(plusMinusForm);
    mockedHistory.getTallies.mockResolvedValue([
      tally({ studentId: 's1', fullName: 'Ali Yılmaz', number: '12', counts: { arti: 5, eksi: 2 }, dayCounts: { arti: 1 } }),
    ]);
    await render(<FormScreen />, { wrapper: Providers });

    expect(await screen.findByTestId('mark-row-0')).toBeOnTheScreen();
    expect(mockedApi.findSessionByDate).not.toHaveBeenCalled();
  });
});
