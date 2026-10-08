import { fireEvent, render, screen } from '@testing-library/react-native';

import { paper } from '@/theme';

import type { ClassSummary } from '../model';
import { ClassListRow } from './ClassListRow';

const cls = (over: Partial<ClassSummary> = {}): ClassSummary => ({
  id: 'c1',
  name: '5/B',
  grade: '5',
  section: 'B',
  teacher_id: 't',
  created_at: '',
  studentCount: 28,
  formCount: 4,
  ...over,
});

describe('ClassListRow', () => {
  it('reads as one button: name, students and forms; opens the class on press', async () => {
    const onPress = jest.fn();
    await render(<ClassListRow item={cls()} onPress={onPress} testID="row" />);
    const row = screen.getByRole('button', { name: '5/B, 28 öğrenci, 4 form' });
    expect(row).toBe(screen.getByTestId('row'));
    await fireEvent.press(row);
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(screen.getByText('28')).toBeOnTheScreen();
    expect(screen.getByText('öğrenci')).toBeOnTheScreen();
    expect(screen.getByText('4 form')).toBeOnTheScreen();
  });

  it('says "Henüz form yok" for a class without forms', async () => {
    await render(<ClassListRow item={cls({ formCount: 0 })} onPress={jest.fn()} />);
    expect(screen.getByText('Henüz form yok')).toBeOnTheScreen();
  });

  it('colours the name block by list position (mint, sky, lilac, orange, pink), never yellow', async () => {
    const expected = [paper.nane, paper.gok, paper.lila, paper.turuncu, paper.pembe, paper.nane];
    for (const [index, color] of expected.entries()) {
      const view = await render(<ClassListRow item={cls()} index={index} onPress={jest.fn()} testID="row" />);
      expect(view.getByTestId('row-tag')).toHaveStyle({ backgroundColor: color });
      expect(color).not.toBe(paper.sari);
      await view.unmount();
    }
  });
});
