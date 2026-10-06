import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { Providers } from '@/features/forms/test-utils';
import * as history from '@/features/history';
import { todayIso } from '@/features/sessions/date';
import type { FormMarkRow } from '@/types/database';

import { plusMinusForm, tally } from './fixtures';
import { RepeatableFormView } from './RepeatableFormView';

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

jest.mock('expo-router', () => {
  const { useEffect } = jest.requireActual<typeof import('react')>('react');
  return {
    useRouter: () => mockRouter,
    useFocusEffect: (effect: () => void) => useEffect(effect, [effect]),
  };
});

jest.mock('react-native/Libraries/Modal/Modal', () => jest.requireActual('@/test/nativeModalMock'));

const mocked = jest.mocked(history);

const mark = (id: string, option_key: string): FormMarkRow => ({
  id,
  form_id: 'f2',
  student_id: 's1',
  teacher_id: 't',
  option_key,
  mark_date: todayIso(),
  marked_at: '',
  note: null,
  created_at: '',
});

async function renderView() {
  await render(<RepeatableFormView classId="c1" form={plusMinusForm} initialTab="mark" />, { wrapper: Providers });
  return screen.findByTestId('mark-row-0');
}

beforeEach(() => {
  jest.clearAllMocks();
  mocked.getTallies.mockResolvedValue([
    tally({ studentId: 's1', fullName: 'Ali Yılmaz', number: '12', counts: { arti: 5, eksi: 2 }, dayCounts: { arti: 1 } }),
    tally({ studentId: 's2', fullName: 'Ayşe Kaya', number: '15' }),
  ]);
  mocked.addMark.mockResolvedValue(mark('m1', 'arti'));
  mocked.removeMark.mockResolvedValue(mark('m1', 'arti'));
  mocked.undoLastMark.mockResolvedValue(mark('m0', 'arti'));
});

describe('RepeatableFormView', () => {
  it('shows today and total counts and the net for each student', async () => {
    await renderView();

    expect(mocked.getTallies).toHaveBeenCalledWith('f2', { day: todayIso() });
    expect(screen.getByTestId('mark-row-0-day')).toHaveTextContent('Bugün: 1 Artı');
    expect(screen.getByTestId('mark-row-0-total')).toHaveTextContent('Toplam: 5 Artı, 2 Eksi');
    expect(screen.getByTestId('mark-row-0-net')).toHaveTextContent('+3');
    expect(screen.getByTestId('mark-row-1-empty')).toHaveTextContent('Henüz işaret yok');
    expect(screen.getByTestId('mark-row-1-net')).toHaveTextContent('0');
    expect(screen.getByTestId('mark-today-total')).toHaveTextContent('1 işaret');
  });

  it('adds a mark with one tap, updates counts at once and offers to undo it', async () => {
    let finish: (row: FormMarkRow) => void = () => undefined;
    mocked.addMark.mockReturnValueOnce(new Promise<FormMarkRow>((resolve) => (finish = resolve)));
    await renderView();

    await fireEvent.press(screen.getByTestId('mark-row-1-arti'));
    // Sunucu yanıtı gelmeden sayı artar (iyimser güncelleme).
    expect(screen.getByTestId('mark-row-1-net')).toHaveTextContent('+1');
    expect(screen.getByTestId('mark-row-1-day')).toHaveTextContent('Bugün: 1 Artı');
    expect(mocked.addMark).toHaveBeenCalledWith({
      formId: 'f2',
      studentId: 's2',
      optionKey: 'arti',
      markDate: todayIso(),
    });

    await act(async () => finish(mark('m9', 'arti')));
    expect(await screen.findByText('Ayşe Kaya: Artı eklendi')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Geri al' })).toBeOnTheScreen();
  });

  it('gives several marks on the same day and keeps adding up', async () => {
    await renderView();

    await fireEvent.press(screen.getByTestId('mark-row-1-eksi'));
    await fireEvent.press(screen.getByTestId('mark-row-1-eksi'));
    await fireEvent.press(screen.getByTestId('mark-row-1-arti'));

    expect(mocked.addMark).toHaveBeenCalledTimes(3);
    expect(screen.getByTestId('mark-row-1-day')).toHaveTextContent('Bugün: 1 Artı, 2 Eksi');
    expect(screen.getByTestId('mark-row-1-net')).toHaveTextContent('−1');
    expect(screen.getByTestId('mark-today-total')).toHaveTextContent('4 işaret');
  });

  it('rolls the count back and says why when the server rejects the mark', async () => {
    mocked.addMark.mockRejectedValueOnce(new history.HistoryApiError({ message: 'Network request failed' }, 'mark'));
    await renderView();

    await fireEvent.press(screen.getByTestId('mark-row-1-arti'));
    expect(await screen.findByText(/Sunucuya ulaşılamadı/)).toBeOnTheScreen();
    await waitFor(() => expect(screen.getByTestId('mark-row-1-empty')).toBeOnTheScreen());
    expect(screen.queryByText('Ayşe Kaya: Artı eklendi')).toBeNull();
  });

  it('undoes the last added mark from the undo bar', async () => {
    await renderView();
    await fireEvent.press(screen.getByTestId('mark-row-1-arti'));
    await fireEvent.press(await screen.findByRole('button', { name: 'Geri al' }));

    await waitFor(() => expect(mocked.removeMark).toHaveBeenCalledWith('m1'));
    expect(screen.getByTestId('mark-row-1-empty')).toBeOnTheScreen();
    expect(screen.queryByText('Ayşe Kaya: Artı eklendi')).toBeNull();
  });

  it('restores the count when undoing from the bar fails', async () => {
    mocked.removeMark.mockRejectedValueOnce(new Error('boom'));
    await renderView();
    await fireEvent.press(screen.getByTestId('mark-row-1-arti'));
    await fireEvent.press(await screen.findByRole('button', { name: 'Geri al' }));

    expect(await screen.findByText(/İşaret geri alınamadı/)).toBeOnTheScreen();
    expect(screen.getByTestId('mark-row-1-day')).toHaveTextContent('Bugün: 1 Artı');
  });

  it("undoes a student's last mark of today from the row", async () => {
    mocked.undoLastMark.mockResolvedValueOnce(mark('m0', 'arti'));
    await renderView();

    // Yalnızca bugün işareti olan öğrencide etkin.
    expect(screen.getByTestId('mark-row-1-undo')).toBeDisabled();
    await fireEvent.press(screen.getByTestId('mark-row-0-undo'));

    await waitFor(() =>
      expect(mocked.undoLastMark).toHaveBeenCalledWith({ formId: 'f2', studentId: 's1', markDate: todayIso() }),
    );
    await waitFor(() => expect(screen.getByTestId('mark-row-0-net')).toHaveTextContent('+2'));
    expect(screen.getByTestId('mark-row-0-total')).toHaveTextContent('Toplam: 4 Artı, 2 Eksi');
    expect(screen.getByTestId('mark-row-0-undo')).toBeDisabled();
  });

  it('shows a retryable error when the counts cannot be loaded', async () => {
    mocked.getTallies.mockRejectedValueOnce(new history.HistoryApiError({ message: 'Failed to fetch' }, 'counts'));
    await render(<RepeatableFormView classId="c1" form={plusMinusForm} initialTab="mark" />, { wrapper: Providers });

    expect(await screen.findByText(/Sunucuya ulaşılamadı/)).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('mark-retry'));
    expect(await screen.findByTestId('mark-row-0')).toBeOnTheScreen();
  });

  it('explains an empty class and offers to add students', async () => {
    mocked.getTallies.mockResolvedValueOnce([]);
    await render(<RepeatableFormView classId="c1" form={plusMinusForm} initialTab="mark" />, { wrapper: Providers });

    expect(await screen.findByText('Bu sınıfta öğrenci yok')).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('mark-add-students'));
    expect(mockRouter.push).toHaveBeenCalledWith('/class/c1/students');
  });

  it('searches the list once the class is large', async () => {
    mocked.getTallies.mockResolvedValueOnce(
      Array.from({ length: 14 }, (_, i) => tally({ studentId: `s${i}`, fullName: i === 3 ? 'Zeynep Arslan' : `Öğrenci ${i}`, number: String(i + 1) })),
    );
    await render(<RepeatableFormView classId="c1" form={plusMinusForm} initialTab="mark" />, { wrapper: Providers });

    await fireEvent.changeText(await screen.findByTestId('mark-search'), 'zeynep');
    expect(screen.getByText('Zeynep Arslan')).toBeOnTheScreen();
    expect(screen.queryByText('Öğrenci 5')).toBeNull();
    await fireEvent.changeText(screen.getByTestId('mark-search'), 'xyz');
    expect(screen.getByTestId('mark-no-match')).toHaveTextContent('“xyz” ile eşleşen öğrenci yok.');
  });
});
