import { selectionA11y } from './a11y';

describe('selectionA11y', () => {
  it('mirrors the state into aria-* props (react-native-web ignores accessibilityState)', () => {
    expect(selectionA11y({ checked: true, selected: true, disabled: false })).toEqual({
      accessibilityState: { checked: true, selected: true, disabled: false },
      'aria-checked': true,
      'aria-selected': true,
      'aria-disabled': false,
    });
  });

  it('only sets the aria props whose state is given', () => {
    expect(selectionA11y({ selected: false })).toEqual({
      accessibilityState: { selected: false },
      'aria-selected': false,
    });
    expect(selectionA11y({ checked: true })).toEqual({
      accessibilityState: { checked: true },
      'aria-checked': true,
    });
  });
});
