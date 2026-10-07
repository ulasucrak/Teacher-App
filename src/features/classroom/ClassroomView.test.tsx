import { fireEvent, render, screen } from '@testing-library/react-native';
import { Animated } from 'react-native';

import { Providers } from '@/features/forms/test-utils';
import { plusMinusForm, tally } from '@/features/formview/fixtures';
import type { MarkBoard } from '@/features/formview/useMarkBoard';
import { todayIso } from '@/features/sessions/date';
import type { SessionFill } from '@/features/sessions/hooks/useSessionFill';

import { ClassroomView } from './ClassroomView';
import * as presentation from './presentation';

jest.mock('react-native/Libraries/Modal/Modal', () => jest.requireActual('@/test/nativeModalMock'));
jest.mock('./presentation', () => ({
  releasePresentationFullscreen: jest.fn(),
  subscribePresentationExit: jest.fn(() => jest.fn()),
  subscribeMotionPreference: jest.fn((update) => { update(false); return jest.fn(); }),
}));
let mockReduced = false;
jest.mock('@/theme', () => ({ ...jest.requireActual('@/theme'), useReducedMotion: () => mockReduced }));

const form = { ...plusMinusForm, options: [...plusMinusForm.options, { key: 'half', label: 'Yarım artı', tone: 'positive' as const, score: 0.5 }] };
const day = todayIso();
function board(): MarkBoard {
  return {
    rows: [tally({ studentId: 's1', fullName: 'Ali', number: '12', counts: { arti: 3, eksi: 1, half: 1 }, dayCounts: { arti: 1 } }), tally({ studentId: 's2', fullName: 'Ayşe', number: '13' })],
    day, today: day, loadError: null, changeDay: jest.fn(), reload: jest.fn(), mark: jest.fn(), undoStudent: jest.fn(), undoLast: jest.fn(), dismissLast: jest.fn(), undoingIds: new Set(),
    lastMark: { markId: 'm1', studentId: 's1', optionKey: 'arti', message: 'Artı eklendi' },
  };
}
function dailyFill(overrides: Partial<SessionFill> = {}): SessionFill {
  return {
    data: { date: day }, students: [{ id: 's1', full_name: 'Ali', number: '12' }], draft: { s1: { optionKey: 'eksi', note: 'Not korunur' } },
    saving: false, dirtyCount: 1, onToggle: jest.fn(), dispatch: jest.fn(), onSave: jest.fn(), loadError: null,
    ...overrides,
  } as unknown as SessionFill;
}
const onExit = jest.fn();
/** Dekoratif öğeler (ton işareti, vurgu, "+1") ekran okuyucudan gizli; sorguda dahil edilir. */
const hidden = { includeHiddenElements: true };
beforeEach(() => { jest.clearAllMocks(); mockReduced = false; });

it('shows every total on the option buttons, the fractional net, the day marks and the class day summary; search keeps totals', async () => {
  const data = board();
  await render(<ClassroomView form={form} board={data} day={day} onDay={data.changeDay} onExit={onExit} />, { wrapper: Providers });
  expect(screen.getByTestId('classroom-net-s1')).toHaveTextContent('+2,5');
  expect(screen.getByTestId('classroom-s1-arti-count')).toHaveTextContent('3');
  expect(screen.getByTestId('classroom-s1-eksi-count')).toHaveTextContent('1');
  expect(screen.getByTestId('classroom-s1-half-count')).toHaveTextContent('1');
  expect(screen.getByTestId('classroom-s2-eksi-count')).toHaveTextContent('0');
  expect(screen.getByTestId('classroom-day-s1')).toHaveTextContent('Bugün: 1 Artı');
  // "işaret yok" her kartta tekrarlanmaz.
  expect(screen.queryByTestId('classroom-day-s2')).toBeNull();
  expect(screen.getByText('No 12')).toBeOnTheScreen();
  expect(screen.getByTestId('classroom-summary')).toHaveTextContent(/2 öğrenci/);
  expect(screen.getByTestId('classroom-summary')).toHaveTextContent(/1 Artı/);
  expect(screen.getByTestId('classroom-summary').props.accessibilityLabel).toBe('2 öğrenci. Bugün: 1 Artı');
  // Tonlar renkten bağımsız şekille de ayrılır.
  expect(screen.getAllByTestId('tone-mark-positive', hidden).length).toBeGreaterThan(0);
  expect(screen.getAllByTestId('tone-mark-negative', hidden).length).toBeGreaterThan(0);
  await fireEvent.changeText(screen.getByTestId('classroom-search'), '13');
  expect(screen.queryByTestId('classroom-student-s1')).toBeNull();
  expect(screen.getByTestId('classroom-student-s2')).toBeOnTheScreen();
  expect(screen.getByTestId('classroom-summary')).toHaveTextContent(/2 öğrenci/);
  await fireEvent.changeText(screen.getByTestId('classroom-search'), 'zz');
  expect(screen.getByText('“zz” ile eşleşen öğrenci yok.')).toBeOnTheScreen();
});

it('marks, celebrates only positive actions on the tile and in the strip, undoes and changes the day through the existing handlers', async () => {
  const data = board();
  await render(<ClassroomView form={form} board={data} day={day} onDay={data.changeDay} onExit={onExit} />, { wrapper: Providers });
  expect(screen.getByTestId('classroom-notification-message')).toHaveTextContent('Artı eklendi');
  await fireEvent.press(screen.getByTestId('classroom-s1-eksi'));
  expect(data.mark).toHaveBeenLastCalledWith('s1', 'eksi');
  expect(screen.queryByTestId('classroom-celebration')).toBeNull();
  expect(screen.queryByTestId('classroom-delta-s1', hidden)).toBeNull();
  await fireEvent.press(screen.getByTestId('classroom-s1-arti'));
  expect(data.mark).toHaveBeenLastCalledWith('s1', 'arti');
  expect(screen.getByTestId('classroom-celebration')).toHaveTextContent('Ali, bir adım daha');
  expect(screen.getByTestId('classroom-delta-s1', hidden)).toHaveTextContent('+1');
  // Kutlama, eski "eklendi" bildiriminin yerini alır; tek şerit.
  expect(screen.queryByTestId('classroom-notification')).toBeNull();
  await fireEvent.press(screen.getByTestId('classroom-s1-half'));
  expect(screen.getByTestId('classroom-celebration')).toHaveTextContent('Ali, emeğine sağlık');
  expect(screen.getByTestId('classroom-delta-s1', hidden)).toHaveTextContent('+0,5');
  await fireEvent.press(screen.getByTestId('classroom-undo-s1'));
  expect(data.undoStudent).toHaveBeenCalledWith('s1');
  expect(screen.queryByTestId('classroom-celebration')).toBeNull();
  expect(screen.getByTestId('classroom-idle')).toHaveTextContent('Her adım ilerlemedir');
  await fireEvent.press(screen.getByTestId('classroom-undo'));
  expect(data.undoLast).toHaveBeenCalled();
  await fireEvent.press(screen.getByTestId('classroom-day-prev'));
  expect(data.changeDay).toHaveBeenCalled();
  await fireEvent.press(screen.getByTestId('classroom-exit'));
  expect(onExit).toHaveBeenCalled();
});

it('disables a student undo without marks on the selected day', async () => {
  const data = board();
  await render(<ClassroomView form={form} board={data} day={day} onDay={data.changeDay} onExit={onExit} />, { wrapper: Providers });
  expect(screen.getByTestId('classroom-undo-s2')).toBeDisabled();
  expect(screen.getByTestId('classroom-undo-s1')).not.toBeDisabled();
});

it('keeps positive feedback static with reduced motion and releases fullscreen on unmount', async () => {
  mockReduced = true;
  const spring = jest.spyOn(Animated, 'spring');
  const data = board();
  const view = await render(<ClassroomView form={form} board={data} day={day} onDay={data.changeDay} onExit={onExit} />, { wrapper: Providers });
  await fireEvent.press(screen.getByTestId('classroom-s1-half'));
  expect(screen.getByTestId('classroom-celebration')).toHaveTextContent('Ali, bir adım daha');
  // Yalnız opaklık vurgusu: yükselen çip ve yaylanma yok.
  expect(screen.queryByTestId('classroom-delta-s1', hidden)).toBeNull();
  expect(spring).not.toHaveBeenCalled();
  expect(screen.getByTestId('classroom-glow-s1', hidden)).toBeOnTheScreen();
  await view.unmount();
  expect(presentation.releasePresentationFullscreen).toHaveBeenCalled();
  spring.mockRestore();
});

it('edits and saves a daily draft as a radio choice, restoring the previous selection on undo', async () => {
  const fill = dailyFill();
  await render(<ClassroomView form={form} fill={fill} day={day} onDay={jest.fn()} onExit={onExit} />, { wrapper: Providers });
  const eksi = screen.getByTestId('classroom-s1-eksi');
  expect(eksi.props.accessibilityState).toEqual(expect.objectContaining({ checked: true, selected: true }));
  expect(screen.getByTestId('classroom-s1-arti').props.accessibilityState).toEqual(expect.objectContaining({ checked: false }));
  // Günlük kartta sayı rozeti ve geri alma düğmesi yok; seçimin yerinde ✓.
  expect(screen.queryByTestId('classroom-s1-arti-count')).toBeNull();
  expect(screen.queryByTestId('classroom-undo-s1')).toBeNull();
  expect(screen.getByTestId('classroom-dirty')).toHaveTextContent('1 öğrencide kaydedilmemiş değişiklik');
  await fireEvent.press(screen.getByTestId('classroom-s1-arti'));
  expect(fill.onToggle).toHaveBeenCalledWith('s1', 'arti');
  expect(screen.getByTestId('classroom-celebration')).toHaveTextContent('Ali, bir adım daha');
  const updated = { ...fill, draft: { s1: { optionKey: 'arti', note: 'Not korunur' } } } as SessionFill;
  await screen.rerender(<ClassroomView form={form} fill={updated} day={day} onDay={jest.fn()} onExit={onExit} />);
  await fireEvent.press(screen.getByTestId('classroom-undo'));
  expect(fill.onToggle).toHaveBeenLastCalledWith('s1', 'eksi');
  expect(screen.getByTestId('classroom-notification-message')).toHaveTextContent('Seçim geri alındı');
  await fireEvent.press(screen.getByTestId('classroom-save'));
  expect(fill.onSave).toHaveBeenCalled();
});

it('does not celebrate when a selected positive choice is pressed again (deselect)', async () => {
  const fill = dailyFill({ draft: { s1: { optionKey: 'arti', note: '' } } } as Partial<SessionFill>);
  await render(<ClassroomView form={form} fill={fill} day={day} onDay={jest.fn()} onExit={onExit} />, { wrapper: Providers });
  await fireEvent.press(screen.getByTestId('classroom-s1-arti'));
  expect(fill.onToggle).toHaveBeenCalledWith('s1', 'arti');
  expect(screen.queryByTestId('classroom-celebration')).toBeNull();
});

it('prevents stale daily writes while the selected day is loading', async () => {
  const fill = { data: { date: '2000-01-01' }, students: [], draft: {}, dirtyCount: 1, saving: false } as unknown as SessionFill;
  await render(<ClassroomView form={form} fill={fill} day={day} onDay={jest.fn()} onExit={onExit} />, { wrapper: Providers });
  expect(screen.getByTestId('classroom-save')).toBeDisabled();
  expect(screen.queryByTestId('classroom-s1-arti')).toBeNull();
});
