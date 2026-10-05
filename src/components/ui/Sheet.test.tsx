import { render, screen, waitFor } from '@testing-library/react-native';
import { Platform, Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { Sheet } from './Sheet';

jest.mock('react-native/Libraries/Modal/Modal', () => jest.requireActual('@/test/nativeModalMock'));

const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

function renderSheet(visible: boolean, onDismissed: () => void) {
  return (
    <SafeAreaProvider initialMetrics={metrics}>
      <Sheet visible={visible} onClose={() => undefined} onDismissed={onDismissed} title="Eylemler">
        <Text>İçerik</Text>
      </Sheet>
    </SafeAreaProvider>
  );
}

describe('Sheet onDismissed', () => {
  afterEach(() => jest.restoreAllMocks());

  it.each(['ios', 'android'] as const)('fires once after the close animation on %s', async (os) => {
    jest.replaceProperty(Platform, 'OS', os);
    const onDismissed = jest.fn();
    const view = await render(renderSheet(true, onDismissed));
    expect(screen.getByText('İçerik')).toBeOnTheScreen();
    expect(onDismissed).not.toHaveBeenCalled();

    await view.rerender(renderSheet(false, onDismissed));

    await waitFor(() => expect(screen.queryByText('İçerik')).toBeNull());
    await waitFor(() => expect(onDismissed).toHaveBeenCalledTimes(1));
  });

  it('does not fire while the sheet stays open', async () => {
    const onDismissed = jest.fn();
    const view = await render(renderSheet(true, onDismissed));
    await view.rerender(renderSheet(true, onDismissed));
    expect(onDismissed).not.toHaveBeenCalled();
  });
});
