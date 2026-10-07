import { act, cleanup, fireEvent, render, screen } from '@testing-library/react-native';
import { useState, type ReactElement } from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { tones } from '@/theme';

import { BottomActionBar } from './BottomActionBar';
import { ChipGroup } from './ChipGroup';
import { ConfirmSheet } from './ConfirmSheet';
import { EmptyState } from './EmptyState';
import { Fab } from './Fab';
import { OverflowMenu } from './OverflowMenu';
import { SearchField } from './SearchField';
import { SectionHeader } from './SectionHeader';
import { SegmentedChoice } from './SegmentedChoice';
import { Stepper } from './WizardHeader';

jest.mock('react-native/Libraries/Modal/Modal', () => jest.requireActual('@/test/nativeModalMock'));

const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

const withSafeArea = (node: ReactElement) => <SafeAreaProvider initialMetrics={metrics}>{node}</SafeAreaProvider>;

const attendance = [
  { key: 'present', label: 'Geldi', tone: 'positive' as const },
  { key: 'absent', label: 'Gelmedi', tone: 'negative' as const },
  { key: 'excused', label: 'İzinli', tone: 'neutral' as const },
];

describe('ChipGroup', () => {
  it('selects one option at a time and passes testIDs through', async () => {
    function Harness() {
      const [value, setValue] = useState<string | null>(null);
      return (
        <ChipGroup options={attendance} value={value} onChange={setValue} contextLabel="Ayşe Yılmaz" testIDPrefix="ayse" />
      );
    }
    await render(<Harness />);

    await fireEvent.press(screen.getByTestId('ayse-absent'));
    expect(screen.getByRole('radio', { name: 'Ayşe Yılmaz: Gelmedi' })).toBeChecked();
    expect(screen.getByTestId('ayse-absent')).toHaveStyle({ backgroundColor: tones.negative.solid });

    await fireEvent.press(screen.getByTestId('ayse-present'));
    expect(screen.getByRole('radio', { name: 'Ayşe Yılmaz: Geldi' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Ayşe Yılmaz: Gelmedi' })).not.toBeChecked();
  });

  it('toggles keys in multiple mode', async () => {
    const onChange = jest.fn();
    await render(<ChipGroup multiple options={attendance} value={['present']} onChange={onChange} />);

    await fireEvent.press(screen.getByRole('checkbox', { name: 'Gelmedi' }));
    expect(onChange).toHaveBeenLastCalledWith(['present', 'absent']);
    await fireEvent.press(screen.getByRole('checkbox', { name: 'Geldi' }));
    expect(onChange).toHaveBeenLastCalledWith([]);
  });
});

describe('SegmentedChoice', () => {
  it('is a radio group that reports the chosen key', async () => {
    const onChange = jest.fn();
    await render(
      <SegmentedChoice options={attendance} value="present" onChange={onChange} accessibilityLabel="Ali" testIDPrefix="seg" />,
    );
    expect(screen.getByRole('radio', { name: 'Ali: Geldi' })).toBeChecked();
    await fireEvent.press(screen.getByTestId('seg-excused'));
    expect(onChange).toHaveBeenCalledWith('excused');
  });

  it('segments are at least 44 pt tall', async () => {
    await render(<SegmentedChoice options={attendance} value={null} onChange={jest.fn()} testIDPrefix="seg" />);
    const style = StyleSheet.flatten(screen.getByTestId('seg-present').props.style);
    expect(style.minHeight).toBeGreaterThanOrEqual(44);
  });

  it('never truncates labels with an ellipsis on one line: wraps to a second line instead', async () => {
    await render(<SegmentedChoice options={attendance} value={null} onChange={jest.fn()} testIDPrefix="seg" />);
    const label = screen.getByText('Gelmedi');
    expect(label.props.numberOfLines).toBe(2);
    expect(label.props.adjustsFontSizeToFit).toBeFalsy();
    const track = StyleSheet.flatten(screen.getByTestId('seg-present').parent?.props.style);
    expect(track.flexWrap).toBe('wrap');
  });
});

describe('OverflowMenu', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(async () => {
    // Unmount before restoring real timers so animations cannot leak into other tests.
    await cleanup();
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('runs the chosen action only after the sheet has closed', async () => {
    const onEdit = jest.fn();
    function Harness() {
      const [open, setOpen] = useState(true);
      return withSafeArea(
        <OverflowMenu
          visible={open}
          onClose={() => setOpen(false)}
          title="5/B"
          testID="class-menu"
          actions={[
            { key: 'edit', label: 'Sınıfı düzenle', icon: 'edit', onPress: onEdit },
            { key: 'delete', label: 'Sınıfı sil', icon: 'trash', destructive: true, onPress: () => undefined },
          ]}
        />,
      );
    }
    await render(<Harness />);
    await act(async () => {
      await jest.runAllTimersAsync();
    });

    await fireEvent.press(screen.getByTestId('class-menu-edit'));
    // The async press can outlast the real closing animation on a busy worker.
    // Keep time frozen until we have checked that the action is still pending.
    expect(onEdit).not.toHaveBeenCalled();
    expect(screen.getByText('Sınıfı sil')).toBeOnTheScreen();
    await act(async () => {
      await jest.runAllTimersAsync();
    });
    expect(onEdit).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Sınıfı sil')).toBeNull();
  });

  it('does not run anything when dismissed with the close button', async () => {
    const onEdit = jest.fn();
    function Harness() {
      const [open, setOpen] = useState(true);
      return withSafeArea(
        <OverflowMenu
          visible={open}
          onClose={() => setOpen(false)}
          title="5/B"
          testID="menu"
          actions={[{ key: 'edit', label: 'Sınıfı düzenle', onPress: onEdit }]}
        />,
      );
    }
    await render(<Harness />);
    await act(async () => {
      await jest.runAllTimersAsync();
    });
    await fireEvent.press(screen.getByTestId('menu-close'));
    await act(async () => {
      await jest.runAllTimersAsync();
    });
    expect(screen.queryByText('Sınıfı düzenle')).toBeNull();
    expect(onEdit).not.toHaveBeenCalled();
  });
});

describe('ConfirmSheet', () => {
  it('names the action on the buttons and wires confirm/cancel', async () => {
    const onConfirm = jest.fn();
    const onCancel = jest.fn();
    await render(
      withSafeArea(
        <ConfirmSheet
          visible
          title="5/B sınıfı silinsin mi?"
          message="Bu işlem geri alınamaz."
          confirmLabel="Sınıfı sil"
          onConfirm={onConfirm}
          onCancel={onCancel}
          testID="confirm"
        />,
      ),
    );
    expect(screen.getByText('5/B sınıfı silinsin mi?')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Sınıfı sil' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    await fireEvent.press(screen.getByTestId('confirm-cancel'));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('keeps cancel disabled while the action runs', async () => {
    await render(
      withSafeArea(
        <ConfirmSheet visible loading title="Silinsin mi?" confirmLabel="Sil" onConfirm={jest.fn()} onCancel={jest.fn()} />,
      ),
    );
    expect(screen.getByRole('button', { name: 'Sil' })).toBeBusy();
    expect(screen.getByRole('button', { name: 'Vazgeç' })).toBeDisabled();
  });
});

describe('Stepper', () => {
  it('announces the step position and name', async () => {
    await render(<Stepper steps={['Ad', 'Öğrenciler', 'Bitti']} current={1} testID="stepper" />);
    expect(screen.getByLabelText('Adım 2 / 3: Öğrenciler')).toBeOnTheScreen();
    expect(screen.getByText('Adım 2 / 3')).toBeOnTheScreen();
  });
});

describe('Fab and BottomActionBar', () => {
  it('Fab is a labelled button', async () => {
    const onPress = jest.fn();
    await render(<Fab label="Yeni sınıf" onPress={onPress} testID="fab" />);
    await fireEvent.press(screen.getByRole('button', { name: 'Yeni sınıf' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('BottomActionBar renders primary, secondary and hint', async () => {
    const next = jest.fn();
    const back = jest.fn();
    await render(
      <BottomActionBar
        primary={{ label: 'Devam', onPress: next, testID: 'next' }}
        secondary={{ label: 'Geri', onPress: back, testID: 'prev' }}
        hint="3 öğrenci eklenecek"
      />,
    );
    expect(screen.getByText('3 öğrenci eklenecek')).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('next'));
    await fireEvent.press(screen.getByTestId('prev'));
    expect(next).toHaveBeenCalledTimes(1);
    expect(back).toHaveBeenCalledTimes(1);
  });
});

describe('SearchField, SectionHeader, EmptyState', () => {
  it('SearchField clears with its button', async () => {
    const onChangeText = jest.fn();
    await render(
      <SearchField value="ay" onChangeText={onChangeText} placeholder="Ad ya da numara" accessibilityLabel="Öğrenci ara" testID="search" />,
    );
    await fireEvent.press(screen.getByTestId('search-clear'));
    expect(onChangeText).toHaveBeenCalledWith('');
  });

  it('SectionHeader shows title, count and one action', async () => {
    const onAction = jest.fn();
    await render(<SectionHeader title="Formlar" count={3} actionLabel="Form" actionIcon="plus" onAction={onAction} actionTestID="add-form" />);
    expect(screen.getByRole('header', { name: 'Formlar' })).toBeOnTheScreen();
    expect(screen.getByText('3')).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('add-form'));
    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it('EmptyState offers its primary and secondary action', async () => {
    const primary = jest.fn();
    const secondary = jest.fn();
    await render(
      <EmptyState
        title="Henüz sınıfınız yok"
        description="İlk sınıfınızı ekleyin."
        actionLabel="Yeni sınıf"
        onAction={primary}
        secondaryActionLabel="Örnek göster"
        onSecondaryAction={secondary}
        actionTestID="empty-new"
      />,
    );
    await fireEvent.press(screen.getByTestId('empty-new'));
    await fireEvent.press(screen.getByRole('button', { name: 'Örnek göster' }));
    expect(primary).toHaveBeenCalledTimes(1);
    expect(secondary).toHaveBeenCalledTimes(1);
  });
});
