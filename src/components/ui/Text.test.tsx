import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { isUnselectableOnWeb, Text } from './Text';

describe('Text selection on web', () => {
  it('titles, headings and labels are not selectable', () => {
    for (const variant of ['display', 'title', 'heading', 'bodyStrong', 'label', 'caption', 'number'] as const) {
      expect(isUnselectableOnWeb(variant)).toBe(true);
    }
  });

  it('body text stays selectable', () => {
    expect(isUnselectableOnWeb('body')).toBe(false);
    expect(isUnselectableOnWeb('bodySmall')).toBe(false);
  });

  it('an explicit selectable prop is left to React Native', () => {
    expect(isUnselectableOnWeb('title', true)).toBe(false);
    expect(isUnselectableOnWeb('title', false)).toBe(false);
  });

  it('does not add userSelect on native', async () => {
    await render(<Text variant="title">Sınıf</Text>);
    expect(StyleSheet.flatten(screen.getByText('Sınıf').props.style).userSelect).toBeUndefined();
  });
});
