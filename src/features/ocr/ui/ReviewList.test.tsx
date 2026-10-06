import { fireEvent, render, screen } from '@testing-library/react-native';

import type { ReviewRow, RowIssue } from '../review';
import { ReviewList } from './ReviewList';

const rows: ReviewRow[] = [
  { id: 'a', number: '12', fullName: 'Ayşe Yılmaz', include: true, photoId: 'p', ocrDigits: false },
  { id: 'b', number: '15', fullName: 'Mehmet Kya', include: true, photoId: 'p', ocrDigits: false },
];

describe('ReviewList', () => {
  it('shows one subtle flag per row and wires edit/remove', async () => {
    const issues = new Map<string, RowIssue[]>([
      ['a', []],
      ['b', ['lowConfidence']],
    ]);
    const onChange = jest.fn();
    const onRemove = jest.fn();
    await render(<ReviewList rows={rows} issues={issues} onChange={onChange} onRemove={onRemove} />);

    expect(screen.queryByTestId('student-row-0-issue')).toBeNull();
    expect(screen.getByTestId('student-row-1-issue')).toHaveTextContent('Okuma belirsiz, kontrol edin');

    await fireEvent.changeText(screen.getByTestId('student-row-1-name'), 'Mehmet Kaya');
    expect(onChange).toHaveBeenCalledWith('b', { fullName: 'Mehmet Kaya' });
    await fireEvent.changeText(screen.getByTestId('student-row-0-number'), '1 2a');
    expect(onChange).toHaveBeenCalledWith('a', { number: '12a' });
    await fireEvent.press(screen.getByTestId('student-row-0-remove'));
    expect(onRemove).toHaveBeenCalledWith('a');
  });
});
