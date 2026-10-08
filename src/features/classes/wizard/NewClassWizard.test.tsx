import { fireEvent, render, screen } from '@testing-library/react-native';
import { act } from 'react';
import { BackHandler } from 'react-native';

import { NewClassWizard } from './NewClassWizard';
import { runClassSetup } from './setup';

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

  it('saves the school numbers of a pasted list and shows them in the preview', async () => {
    jest.mocked(runClassSetup).mockResolvedValue({
      ok: true,
      progress: { classRow: null, studentsSaved: true, formsSaved: [] },
      classRow: { id: 'c9', name: '6/A', grade: null, section: null, teacher_id: 't', created_at: '' },
    });
    await goToStudents();
    await fireEvent.press(screen.getByTestId('collect-method-paste'));
    await fireEvent.changeText(
      screen.getByTestId('collect-paste-input'),
      '1 Ali Yılmaz\n2\tayşe kaya\n123 Can Su\nEce Nur 124',
    );
    await fireEvent.press(screen.getByTestId('collect-paste-add'));

    // Önizleme: numara ve ad ayrı alanlarda (ad numarasız).
    expect(screen.getByTestId('student-row-0-number').props.value).toBe('1');
    expect(screen.getByTestId('student-row-0-name').props.value).toBe('Ali Yılmaz');
    expect(screen.getByTestId('student-row-1-number').props.value).toBe('2');
    expect(screen.getByTestId('student-row-3-number').props.value).toBe('124');

    await fireEvent.press(screen.getByTestId('wizard-next'));
    await fireEvent.press(screen.getByTestId('wizard-create'));

    expect(runClassSetup).toHaveBeenCalledWith(
      expect.objectContaining({
        students: [
          { full_name: 'Ali Yılmaz', number: '1' },
          { full_name: 'Ayşe Kaya', number: '2' },
          { full_name: 'Can Su', number: '123' },
          { full_name: 'Ece Nur', number: '124' },
        ],
      }),
      expect.anything(),
    );
  });

  it('does not save list-order markers ("1. Ali") as school numbers', async () => {
    jest.mocked(runClassSetup).mockResolvedValue({
      ok: true,
      progress: { classRow: null, studentsSaved: true, formsSaved: [] },
      classRow: { id: 'c9', name: '6/A', grade: null, section: null, teacher_id: 't', created_at: '' },
    });
    await goToStudents();
    await fireEvent.press(screen.getByTestId('collect-method-paste'));
    await fireEvent.changeText(screen.getByTestId('collect-paste-input'), '1. Ali Yılmaz\n2. Ayşe Kaya');
    await fireEvent.press(screen.getByTestId('wizard-next'));
    await fireEvent.press(screen.getByTestId('wizard-create'));

    expect(runClassSetup).toHaveBeenCalledWith(
      expect.objectContaining({
        students: [
          { full_name: 'Ali Yılmaz', number: null },
          { full_name: 'Ayşe Kaya', number: null },
        ],
      }),
      expect.anything(),
    );
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

  it('offers one form-type choice for all selected templates and passes it on', async () => {
    jest.mocked(runClassSetup).mockResolvedValue({
      ok: true,
      progress: { classRow: null, studentsSaved: true, formsSaved: [] },
      classRow: { id: 'c9', name: '6/A', grade: null, section: null, teacher_id: 't', created_at: '' },
    });
    await goToStudents();
    await fireEvent.press(screen.getByTestId('wizard-skip-students'));

    // Varsayılan: şablonların önerdiği tür.
    expect(screen.getByTestId('wizard-mode-suggested')).toBeSelected();
    await fireEvent.press(screen.getByTestId('wizard-form-odev'));
    await fireEvent.press(screen.getByTestId('wizard-mode-repeatable'));
    expect(screen.getByTestId('wizard-mode-description')).toHaveTextContent(/birikir/);
    await fireEvent.press(screen.getByTestId('wizard-create'));

    expect(runClassSetup).toHaveBeenCalledWith(
      expect.objectContaining({ presets: ['yoklama', 'odev'], modeChoice: 'repeatable' }),
      expect.anything(),
    );
  });

  it('hides the form-type choice when no template is selected', async () => {
    await goToStudents();
    await fireEvent.press(screen.getByTestId('wizard-skip-students'));
    await fireEvent.press(screen.getByTestId('wizard-form-yoklama'));

    expect(screen.queryByTestId('wizard-mode-suggested')).toBeNull();
  });
});
