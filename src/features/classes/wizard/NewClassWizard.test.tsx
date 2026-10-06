import { fireEvent, render, screen } from '@testing-library/react-native';
import { act } from 'react';
import { BackHandler } from 'react-native';

import { NewClassWizard } from './NewClassWizard';

jest.mock('expo-router', () => ({
  Stack: { Screen: () => null },
  useRouter: () => ({ back: jest.fn(), replace: jest.fn(), canGoBack: () => true }),
  useNavigation: () => ({ addListener: () => () => undefined, dispatch: jest.fn() }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('@/components/ui', () => ({
  ...jest.requireActual('@/components/ui'),
  useToast: () => ({ show: jest.fn() }),
}));

jest.mock('@/features/ocr/recognize', () => ({
  recognizeMessages: jest.requireActual('@/features/ocr/recognize').recognizeMessages,
  isExpoGo: jest.fn(() => false),
  recognizePhoto: jest.fn(),
}));

jest.mock('./setup', () => ({
  ...jest.requireActual('./setup'),
  runClassSetup: jest.fn(),
}));

type BackListener = Parameters<typeof BackHandler.addEventListener>[1];
let backListeners: BackListener[] = [];

beforeEach(() => {
  backListeners = [];
  jest.spyOn(BackHandler, 'addEventListener').mockImplementation((_event, listener) => {
    backListeners.push(listener);
    return {
      remove: () => {
        backListeners = backListeners.filter((l) => l !== listener);
      },
    };
  });
});

afterEach(() => jest.restoreAllMocks());

async function goToStudents() {
  await render(<NewClassWizard />);
  await fireEvent.changeText(screen.getByTestId('wizard-name-input'), '6/A');
  await fireEvent.press(screen.getByTestId('wizard-next'));
  expect(screen.getByTestId('wizard-step-2')).toBeTruthy();
}

describe('NewClassWizard', () => {
  it('stays on the students step when the pasted text has no names', async () => {
    await goToStudents();
    await fireEvent.press(screen.getByTestId('collect-method-paste'));
    await fireEvent.changeText(screen.getByTestId('collect-paste-input'), '123\n---');
    await fireEvent.press(screen.getByTestId('wizard-next'));

    expect(screen.getByTestId('wizard-step-2')).toBeTruthy();
    expect(screen.getByText('Listede ad bulunamadı. Her satıra bir öğrenci yazın.')).toBeTruthy();
  });

  it('advances with pasted names (kept as typed)', async () => {
    await goToStudents();
    await fireEvent.press(screen.getByTestId('collect-method-paste'));
    await fireEvent.changeText(screen.getByTestId('collect-paste-input'), 'Pek Ayşe\nŞule Ağaoğlu');
    await fireEvent.press(screen.getByTestId('wizard-next'));
    expect(screen.getByTestId('wizard-step-3')).toBeTruthy();
  });

  it('Android back goes one step back instead of leaving', async () => {
    await goToStudents();
    await fireEvent.press(screen.getByTestId('wizard-skip-students'));
    expect(screen.getByTestId('wizard-step-3')).toBeTruthy();

    let handled: boolean | null | undefined;
    await act(async () => {
      handled = backListeners.at(-1)?.({} as never);
    });
    expect(handled).toBe(true);
    expect(screen.getByTestId('wizard-step-2')).toBeTruthy();

    await act(async () => {
      backListeners.at(-1)?.({} as never);
    });
    expect(screen.getByTestId('wizard-step-1')).toBeTruthy();
    // İlk adımda geri tuşu ekranı kapatır (gezinmeye bırakılır).
    expect(backListeners).toHaveLength(0);
  });
});
