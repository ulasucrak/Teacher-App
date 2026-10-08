import { fireEvent, render, screen } from '@testing-library/react-native';

import type { FormOption } from '@/types/database';

import { MarkRow } from './MarkRow';
import { tally } from './fixtures';

jest.mock('react-native-safe-area-context', () => jest.requireActual('react-native-safe-area-context/jest/mock').default);

const plusMinus: FormOption[] = [
  { key: 'arti', label: 'Artı', tone: 'positive', score: 1 },
  { key: 'eksi', label: 'Eksi', tone: 'negative', score: -1 },
];

/** Sözlü şablonu birikimli türde: Artı, Yarım artı, Eksi. */
const oral: FormOption[] = [
  { key: 'arti', label: 'Artı', tone: 'positive', score: 1 },
  { key: 'yarim_arti', label: 'Yarım artı', tone: 'positive', score: 0.5 },
  { key: 'eksi', label: 'Eksi', tone: 'negative', score: -1 },
];

const student = tally({ studentId: 's1', fullName: 'Ali Yılmaz', number: '12', counts: { arti: 3, eksi: 1 }, dayCounts: { arti: 2 } });

async function renderRow(options: FormOption[], overrides: Partial<Parameters<typeof MarkRow>[0]> = {}) {
  const onMark = jest.fn();
  const onUndo = jest.fn();
  await render(
    <MarkRow
      student={student}
      index={0}
      options={options}
      undoing={false}
      onMark={onMark}
      onUndo={onUndo}
      {...overrides}
    />,
  );
  return { onMark, onUndo };
}

describe('MarkRow (tek satır sayaç)', () => {
  it('shows the net between a − and a + button and gives one mark per tap', async () => {
    const { onMark } = await renderRow(plusMinus);
    expect(screen.getByTestId('mark-row-0-net')).toHaveTextContent('+2');
    await fireEvent.press(screen.getByTestId('mark-row-0-arti'));
    expect(onMark).toHaveBeenLastCalledWith('s1', 'arti');
    await fireEvent.press(screen.getByTestId('mark-row-0-eksi'));
    expect(onMark).toHaveBeenLastCalledWith('s1', 'eksi');
    // Seçenek adı ekran okuyucu etiketinde: + ve − yalnız ikondur.
    expect(screen.getByRole('button', { name: 'Ali Yılmaz: Artı' })).toBe(screen.getByTestId('mark-row-0-arti'));
    expect(screen.getByRole('button', { name: 'Ali Yılmaz: Eksi' })).toBe(screen.getByTestId('mark-row-0-eksi'));
  });

  it("writes today's plus count under the name and offers a per-row undo only when there is a mark today", async () => {
    const { onUndo } = await renderRow(plusMinus);
    expect(screen.getByTestId('mark-row-0-day')).toHaveTextContent('Bugün +2');
    await fireEvent.press(screen.getByTestId('mark-row-0-undo'));
    expect(onUndo).toHaveBeenCalledWith('s1');
  });

  it('keeps extra options (Yarım artı) as small chips below the row, still one tap each', async () => {
    const { onMark } = await renderRow(oral);
    // "+" ilk olumlu, "−" ilk olumsuz seçenektir; diğerleri çip.
    expect(screen.getByTestId('mark-row-0-arti')).toBeOnTheScreen();
    expect(screen.getByTestId('mark-row-0-eksi')).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('mark-row-0-yarim_arti'));
    expect(onMark).toHaveBeenLastCalledWith('s1', 'yarim_arti');
    expect(screen.getByRole('button', { name: 'Ali Yılmaz: Yarım artı' })).toBeOnTheScreen();
  });

  it('shows a minus-only day', async () => {
    await renderRow(plusMinus, { student: tally({ studentId: 's2', fullName: 'Ayşe Kaya', counts: {}, dayCounts: { eksi: 1 } }) });
    expect(screen.getByTestId('mark-row-0-day')).toHaveTextContent('Bugün −1');
  });

  it('renders an untouched student with a muted 0 and no day line', async () => {
    await renderRow(plusMinus, { student: tally({ studentId: 's2', fullName: 'Ayşe Kaya' }) });
    expect(screen.getByTestId('mark-row-0-net')).toHaveTextContent('0');
    expect(screen.queryByTestId('mark-row-0-day')).toBeNull();
    expect(screen.queryByTestId('mark-row-0-undo')).toBeNull();
  });

  it('uses the given day label for past days', async () => {
    await renderRow(plusMinus, { dayLabel: '6 Eki' });
    expect(screen.getByTestId('mark-row-0-day')).toHaveTextContent('6 Eki +2');
  });
});
