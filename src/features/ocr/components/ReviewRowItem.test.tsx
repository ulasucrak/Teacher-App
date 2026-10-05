import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { spacing } from '@/theme';

import { CHECKBOX_SIZE, ReviewRowItem } from './ReviewRowItem';

const row = { id: 'r1', number: '12', fullName: 'Ayşe Yılmaz', include: true, photoId: null, ocrDigits: false };

describe('ReviewRowItem', () => {
  it('ölçüleri tema token’larından alır (regresyon)', async () => {
    await render(<ReviewRowItem row={row} issues={['short']} onChange={jest.fn()} onRemove={jest.fn()} />);
    expect(CHECKBOX_SIZE).toBe(spacing.xxl);
    const box = StyleSheet.flatten(screen.getByTestId('checkbox-r1').props.style);
    expect(box.width).toBe(spacing.xxl);
    expect(box.height).toBe(spacing.xxl);
    expect(screen.getByRole('button', { name: 'Ayşe Yılmaz satırını sil' })).toBeTruthy();
    expect(screen.getByText('Ad çok kısa, kontrol edin')).toBeTruthy();
  });
});
