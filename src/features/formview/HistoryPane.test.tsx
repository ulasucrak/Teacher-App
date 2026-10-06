import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { Providers } from '@/features/forms/test-utils';
import * as history from '@/features/history';
import { addDays, todayIso } from '@/features/sessions/date';

import { attendanceForm, event, localIso, plusMinusForm } from './fixtures';
import { HistoryPane } from './HistoryPane';
import { flattenTimeline } from './HistoryTimeline';

jest.mock('@/features/history/api', () => {
  const actual = jest.requireActual<typeof import('@/features/history/api')>('@/features/history/api');
  return { ...actual, getFormSummary: jest.fn(), listHistory: jest.fn() };
});

jest.mock('react-native/Libraries/Modal/Modal', () => jest.requireActual('@/test/nativeModalMock'));

const mocked = jest.mocked(history);

const summaryOf = (form: typeof plusMinusForm | typeof attendanceForm, students: Parameters<typeof history.summarizeForm>[0]) =>
  history.summarizeForm(students, form.options);

const students: history.StudentTally[] = [
  { studentId: 's1', fullName: 'Ali Yılmaz', number: '12', counts: { arti: 5, eksi: 2 }, dayCounts: {} },
  { studentId: 's2', fullName: 'Ayşe Kaya', number: '3', counts: { arti: 1 }, dayCounts: {} },
  { studentId: 's3', fullName: 'Can Demir', number: '20', counts: { arti: 4 }, dayCounts: {} },
];

function renderPane(form = plusMinusForm) {
  return render(<HistoryPane form={form} active />, { wrapper: Providers });
}

beforeEach(() => {
  jest.clearAllMocks();
  mocked.getFormSummary.mockResolvedValue(summaryOf(plusMinusForm, students));
  mocked.listHistory.mockResolvedValue({ events: [], nextCursor: null });
});

describe('HistoryPane summary', () => {
  it('shows class totals with net and counts per student, defaulting to all time', async () => {
    await renderPane();

    expect(await screen.findByTestId('summary-totals-counts')).toHaveTextContent('10 Artı, 2 Eksi');
    expect(screen.getByTestId('summary-totals-net')).toHaveTextContent('+8');
    expect(mocked.getFormSummary).toHaveBeenCalledWith(
      { id: 'f2', options: plusMinusForm.options },
      { from: null, to: null },
    );
    // Okul numarasına göre: 3, 12, 20.
    expect(screen.getByTestId('summary-row-0')).toHaveProp('accessibilityLabel', 'Ayşe Kaya: 1 Artı, net +1');
    expect(screen.getByTestId('summary-row-1')).toHaveProp('accessibilityLabel', 'Ali Yılmaz: 5 Artı, 2 Eksi, net +3');
    expect(screen.getByTestId('summary-row-1-net')).toHaveTextContent('+3');
    expect(screen.getByTestId('range-chip')).toHaveTextContent('Tüm zamanlar');
  });

  it('can sort by net', async () => {
    await renderPane();
    await fireEvent.press(await screen.findByTestId('summary-sort-score'));

    expect(screen.getByTestId('summary-row-0')).toHaveProp('accessibilityLabel', 'Can Demir: 4 Artı, net +4');
    expect(screen.getByTestId('summary-row-1')).toHaveProp('accessibilityLabel', 'Ali Yılmaz: 5 Artı, 2 Eksi, net +3');
  });

  it('shows counts only for an attendance form: no net, no sorting', async () => {
    mocked.getFormSummary.mockResolvedValue(
      summaryOf(attendanceForm, [
        { studentId: 's1', fullName: 'Ali Yılmaz', number: '12', counts: { var: 18, yok: 2 }, dayCounts: {} },
      ]),
    );
    await renderPane(attendanceForm);

    expect(await screen.findByTestId('summary-totals-counts')).toHaveTextContent('18 Var, 2 Yok');
    expect(screen.queryByTestId('summary-totals-net')).toBeNull();
    expect(screen.queryByTestId('summary-row-0-net')).toBeNull();
    expect(screen.queryByTestId('summary-sort-name')).toBeNull();
    expect(screen.getByTestId('summary-row-0')).toHaveProp('accessibilityLabel', 'Ali Yılmaz: 18 Var, 2 Yok');
  });

  it('reloads with the chosen period', async () => {
    await renderPane();
    await screen.findByTestId('summary-totals');

    await fireEvent.press(screen.getByTestId('range-chip'));
    await fireEvent.press(await screen.findByTestId('range-week'));
    await waitFor(() => expect(mocked.getFormSummary).toHaveBeenCalledTimes(2));
    expect(mocked.getFormSummary.mock.calls[1]![1]).toEqual(history.weekRange());
    expect(screen.getByTestId('range-chip')).toHaveTextContent('Bu hafta');
  });

  it('applies a custom date range from the sheet', async () => {
    await renderPane();
    await screen.findByTestId('summary-totals');

    await fireEvent.press(screen.getByTestId('range-chip'));
    // Varsayılan: son 7 gün; başlangıcı bir gün geri al, bitişi bir gün geri al.
    await fireEvent.press(await screen.findByTestId('range-from-prev'));
    await fireEvent.press(screen.getByTestId('range-to-prev'));
    await fireEvent.press(screen.getByTestId('range-apply'));

    const today = todayIso();
    await waitFor(() => expect(mocked.getFormSummary).toHaveBeenCalledTimes(2));
    expect(mocked.getFormSummary.mock.calls[1]![1]).toEqual({ from: addDays(today, -7), to: addDays(today, -1) });
    expect(screen.getByTestId('range-chip')).toHaveTextContent(history.formatRange({ from: addDays(today, -7), to: addDays(today, -1) }));
  });

  it('explains an empty period and offers to go back to all time', async () => {
    await renderPane();
    await screen.findByTestId('summary-totals');
    mocked.getFormSummary.mockResolvedValue(summaryOf(plusMinusForm, students.map((s) => ({ ...s, counts: {} }))));

    await fireEvent.press(screen.getByTestId('range-chip'));
    await fireEvent.press(await screen.findByTestId('range-month'));
    expect(await screen.findByText('Bu dönemde işaret yok')).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('summary-reset-range'));
    await waitFor(() => expect(screen.getByTestId('range-chip')).toHaveTextContent('Tüm zamanlar'));
  });

  it('shows a retryable error', async () => {
    mocked.getFormSummary.mockRejectedValueOnce(new history.HistoryApiError({ message: 'Failed to fetch' }, 'summary'));
    await renderPane();

    expect(await screen.findByText(/Sunucuya ulaşılamadı/)).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('summary-retry'));
    expect(await screen.findByTestId('summary-totals')).toBeOnTheScreen();
  });
});

describe('HistoryPane timeline', () => {
  const now = new Date();
  const todayAt = (h: number, min: number) => new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, min).toISOString();

  it('lists every event newest first, grouped by day, with undone marks set apart', async () => {
    mocked.listHistory.mockResolvedValue({
      events: [
        event({ id: 3, kind: 'mark_removed', oldOptionKey: 'arti', newOptionKey: null, occurredAt: todayAt(10, 40) }),
        event({ id: 2, newOptionKey: 'eksi', undone: true, occurredAt: todayAt(10, 32) }),
        event({ id: 1, occurredAt: localIso(2026, 9, 1, 9, 5), eventDate: '2026-09-01' }),
      ],
      nextCursor: null,
    });
    await renderPane();
    await fireEvent.press(await screen.findByTestId('history-view-list'));

    expect(await screen.findByTestId('event-3-change')).toHaveTextContent('Artı geri alındı');
    expect(screen.getByTestId('event-2-change')).toHaveTextContent('Eksi eklendi');
    expect(screen.getByTestId('event-2-change')).toHaveStyle({ textDecorationLine: 'line-through' });
    expect(screen.getByText('Geri alındı')).toBeOnTheScreen();
    expect(screen.getByText('10:40')).toBeOnTheScreen();
    expect(screen.getByText('09:05')).toBeOnTheScreen();
    expect(screen.getByText(/^Bugün, /)).toBeOnTheScreen();
    expect(screen.getByText(/^1 Eylül/)).toBeOnTheScreen();
    expect(screen.getByTestId('event-2')).toHaveProp(
      'accessibilityLabel',
      expect.stringContaining('Ali Yılmaz: Eksi eklendi. Geri alındı.'),
    );
    expect(mocked.listHistory).toHaveBeenCalledWith('f2', { range: { from: null, to: null }, studentId: null });
    expect(screen.getByTestId('timeline-end')).toBeOnTheScreen();
  });

  it('loads more pages on demand', async () => {
    const cursor = { occurredAt: '2026-10-06T10:00:00.123456+00:00', id: 2 };
    mocked.listHistory
      .mockResolvedValueOnce({ events: [event({ id: 3 }), event({ id: 2 })], nextCursor: cursor })
      .mockResolvedValueOnce({ events: [event({ id: 1 })], nextCursor: null });
    await renderPane();
    await fireEvent.press(await screen.findByTestId('history-view-list'));

    expect(await screen.findByTestId('event-3')).toBeOnTheScreen();
    expect(screen.queryByTestId('event-1')).toBeNull();
    await fireEvent.press(screen.getByTestId('timeline-more'));

    expect(await screen.findByTestId('event-1')).toBeOnTheScreen();
    expect(mocked.listHistory).toHaveBeenLastCalledWith('f2', {
      range: { from: null, to: null },
      studentId: null,
      cursor,
    });
    expect(screen.queryByTestId('timeline-more')).toBeNull();
  });

  it("opens one student's history from the summary and clears the filter", async () => {
    mocked.listHistory.mockResolvedValue({ events: [event({ id: 7 })], nextCursor: null });
    await renderPane();

    await fireEvent.press(await screen.findByTestId('summary-row-1'));
    expect(await screen.findByTestId('event-7')).toBeOnTheScreen();
    expect(mocked.listHistory).toHaveBeenCalledWith('f2', {
      range: { from: null, to: null },
      studentId: 's1',
    });
    expect(screen.getByTestId('history-view-list')).toBeSelected();

    await fireEvent.press(screen.getByTestId('timeline-clear-student'));
    await waitFor(() =>
      expect(mocked.listHistory).toHaveBeenLastCalledWith('f2', {
        range: { from: null, to: null },
        studentId: null,
      }),
    );
    expect(screen.queryByTestId('timeline-clear-student')).toBeNull();
  });

  it('shows an empty state and a retryable error', async () => {
    mocked.listHistory.mockRejectedValueOnce(new history.HistoryApiError({ message: 'Failed to fetch' }, 'history'));
    await renderPane();
    await fireEvent.press(await screen.findByTestId('history-view-list'));

    expect(await screen.findByText(/Sunucuya ulaşılamadı/)).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('timeline-retry'));
    expect(await screen.findByText('Henüz kayıt yok')).toBeOnTheScreen();
  });

  it('renders daily changes like "Var → Yok"', async () => {
    mocked.listHistory.mockResolvedValue({
      events: [event({ id: 4, kind: 'entry_updated', oldOptionKey: 'var', newOptionKey: 'yok', occurredAt: todayAt(10, 32) })],
      nextCursor: null,
    });
    await renderPane(attendanceForm);
    await fireEvent.press(await screen.findByTestId('history-view-list'));

    expect(await screen.findByTestId('event-4-change')).toHaveTextContent('Var → Yok');
    expect(screen.getByText('Ali Yılmaz')).toBeOnTheScreen();
  });
});

describe('HistoryPane day review', () => {
  const today = todayIso();
  const yesterday = addDays(today, -1);
  const dayEvent = (id: number, studentId: string, kind: 'entry_created' | 'entry_updated') =>
    event({ id, kind, studentId, oldOptionKey: kind === 'entry_updated' ? 'var' : null, newOptionKey: kind === 'entry_updated' ? 'yok' : 'var', eventDate: today });
  const item = (key: string, label: string, tone: 'positive' | 'negative') => [{ key, label, tone, count: 1, score: null }];

  it('shows every student\'s value for the day with the number of changes', async () => {
    mocked.getFormSummary.mockResolvedValue({
      students: [
        { studentId: 's1', fullName: 'Ali Yılmaz', number: '12', counts: { yok: 1 }, items: item('yok', 'Yok', 'negative'), total: 1, net: null },
        { studentId: 's2', fullName: 'Ayşe Kaya', number: '3', counts: { var: 1 }, items: item('var', 'Var', 'positive'), total: 1, net: null },
        { studentId: 's3', fullName: 'Can Demir', number: '20', counts: {}, items: [], total: 0, net: null },
      ],
      totals: { var: 1, yok: 1 },
      items: [],
      total: 2,
      net: null,
      scored: false,
    });
    mocked.listHistory.mockResolvedValue({
      events: [
        dayEvent(3, 's1', 'entry_updated'),
        dayEvent(2, 's1', 'entry_created'),
        dayEvent(1, 's2', 'entry_created'),
        event({ id: 9, kind: 'entry_baseline', studentId: 's3', newOptionKey: 'var' }),
      ],
      nextCursor: null,
    });
    await renderPane(attendanceForm);
    await fireEvent.press(await screen.findByTestId('history-view-day'));

    // Varsayılan bugün; dönem çipi bu görünümde yok.
    expect(await screen.findByTestId('day-totals-counts')).toHaveTextContent('1 Var, 1 Yok');
    expect(screen.getByTestId('review-day-label')).toHaveTextContent(/^Bugün, /);
    expect(screen.queryByTestId('range-chip')).toBeNull();
    expect(mocked.getFormSummary).toHaveBeenLastCalledWith(
      { id: 'f1', options: attendanceForm.options },
      { from: today, to: today },
    );
    expect(mocked.listHistory).toHaveBeenLastCalledWith('f1', { range: { from: today, to: today }, limit: 200 });
    // İlk içe aktarım olayı sayılmaz: 3 değişiklik.
    expect(screen.getByTestId('day-changes')).toHaveTextContent('3 değişiklik');
    // Okul numarasına göre: Ayşe (3), Ali (12), Can (20).
    expect(screen.getByTestId('day-row-0-value')).toHaveTextContent('Var');
    expect(screen.getByTestId('day-row-1-value')).toHaveTextContent('Yok');
    expect(screen.getByTestId('day-row-1')).toHaveProp('accessibilityLabel', 'Ali Yılmaz: Yok, 2 değişiklik');
    expect(screen.getByTestId('day-row-2-value')).toHaveTextContent('Kayıt yok');
  });

  it('steps to the previous day and reloads', async () => {
    mocked.getFormSummary.mockResolvedValue(summaryOf(attendanceForm, []));
    await renderPane(attendanceForm);
    await fireEvent.press(await screen.findByTestId('history-view-day'));
    await screen.findByTestId('day-empty');

    await fireEvent.press(screen.getByTestId('review-day-prev'));
    await waitFor(() =>
      expect(mocked.getFormSummary).toHaveBeenLastCalledWith(
        { id: 'f1', options: attendanceForm.options },
        { from: yesterday, to: yesterday },
      ),
    );
    expect(screen.getByTestId('review-day-label')).toHaveTextContent(/^Dün, /);
    expect(screen.getByTestId('review-day-next')).toBeEnabled();
    expect(screen.getByText('Bu günde kayıt yok')).toBeOnTheScreen();
  });

  it('offers to edit the day (daily) and to jump to that day\'s list', async () => {
    mocked.getFormSummary.mockResolvedValue(
      summaryOf(attendanceForm, [{ studentId: 's1', fullName: 'Ali Yılmaz', number: '12', counts: { var: 1 }, dayCounts: {} }]),
    );
    const onEditDay = jest.fn();
    await render(<HistoryPane form={attendanceForm} active onEditDay={onEditDay} />, { wrapper: Providers });
    await fireEvent.press(await screen.findByTestId('history-view-day'));

    await fireEvent.press(await screen.findByTestId('day-edit'));
    expect(onEditDay).toHaveBeenCalledWith(today);

    await fireEvent.press(screen.getByTestId('day-open-list'));
    await waitFor(() =>
      expect(mocked.listHistory).toHaveBeenLastCalledWith('f1', { range: { from: today, to: today }, studentId: null }),
    );
    expect(screen.getByTestId('history-view-list')).toBeSelected();
    expect(screen.getByTestId('range-chip')).toHaveTextContent(/^Bugün|\d/);
  });

  it('shows counts and net for a cumulative form and opens one student\'s day', async () => {
    mocked.getFormSummary.mockResolvedValue(summaryOf(plusMinusForm, students));
    await renderPane();
    await fireEvent.press(await screen.findByTestId('history-view-day'));

    expect(await screen.findByTestId('day-totals-net')).toHaveTextContent('+8');
    expect(screen.queryByTestId('day-changes')).toBeNull();
    expect(screen.queryByTestId('day-edit')).toBeNull();
    expect(mocked.listHistory).not.toHaveBeenCalled();
    expect(screen.getByTestId('day-row-1-net')).toHaveTextContent('+3');

    await fireEvent.press(screen.getByTestId('day-row-1'));
    await waitFor(() =>
      expect(mocked.listHistory).toHaveBeenLastCalledWith('f2', { range: { from: today, to: today }, studentId: 's1' }),
    );
    expect(screen.getByTestId('timeline-clear-student')).toBeOnTheScreen();
  });

  it('picks a day from the calendar', async () => {
    await renderPane(attendanceForm);
    await fireEvent.press(await screen.findByTestId('history-view-day'));
    await fireEvent.press(await screen.findByTestId('review-day-pick'));
    await fireEvent.press(await screen.findByTestId(`calendar-day-${yesterday}`));

    await waitFor(() =>
      expect(mocked.getFormSummary).toHaveBeenLastCalledWith(
        { id: 'f1', options: attendanceForm.options },
        { from: yesterday, to: yesterday },
      ),
    );
  });
});

describe('flattenTimeline', () => {
  it('puts a day header before the first event of each local day', () => {
    const items = flattenTimeline([
      event({ id: 3, occurredAt: localIso(2026, 10, 6, 11) }),
      event({ id: 2, occurredAt: localIso(2026, 10, 6, 9) }),
      event({ id: 1, occurredAt: localIso(2026, 10, 5, 8) }),
    ]);
    expect(items.map((i) => (i.type === 'day' ? `day ${i.day}` : `event ${i.event.id}`))).toEqual([
      'day 2026-10-06',
      'event 3',
      'event 2',
      'day 2026-10-05',
      'event 1',
    ]);
  });
});
