import { fireEvent, render, screen } from '@testing-library/react-native';

import { createForm } from '@/features/forms';
import { addStudents } from '@/features/students';

import { createClass, getClass, updateClass } from '../api';
import { ClassFormScreen } from './ClassFormScreen';

const mockReplace = jest.fn();
const mockBack = jest.fn();
const mockToast = jest.fn();
let mockParams: Record<string, string> = {};

jest.mock('react-native-safe-area-context', () => jest.requireActual('react-native-safe-area-context/jest/mock').default);
jest.mock('@/lib/supabase', () => ({ supabase: {} }));
jest.mock('expo-router', () => {
  const { useEffect } = jest.requireActual<typeof import('react')>('react');
  return {
    Stack: { Screen: () => null },
    useRouter: () => ({ push: jest.fn(), replace: mockReplace, back: mockBack, canGoBack: () => true }),
    useNavigation: () => ({ addListener: () => () => undefined, dispatch: jest.fn() }),
    useLocalSearchParams: () => mockParams,
    useFocusEffect: (effect: () => void) => useEffect(effect, [effect]),
  };
});
jest.mock('@/components/ui', () => ({
  ...jest.requireActual('@/components/ui'),
  useToast: () => ({ show: mockToast }),
}));
jest.mock('../api', () => ({ createClass: jest.fn(), getClass: jest.fn(), updateClass: jest.fn() }));
jest.mock('@/features/students', () => ({
  ...jest.requireActual('@/features/students'),
  addStudents: jest.fn(),
}));
jest.mock('@/features/forms', () => ({
  ...jest.requireActual('@/features/forms'),
  createForm: jest.fn(),
}));
jest.mock('@/features/ocr/recognize', () => ({
  recognizeMessages: { unavailable: 'Fotoğraftan okuma yok.' },
  isExpoGo: () => false,
  recognizePhoto: jest.fn(),
}));

const mockCreateClass = createClass as jest.Mock;
const mockGetClass = getClass as jest.Mock;
const mockUpdateClass = updateClass as jest.Mock;
const mockAddStudents = addStudents as jest.Mock;
const mockCreateForm = createForm as jest.Mock;

const classRow = { id: 'c9', name: '5/B', grade: '5', section: 'B', teacher_id: 't', created_at: '' };

beforeEach(() => {
  jest.clearAllMocks();
  mockParams = {};
  mockCreateClass.mockResolvedValue(classRow);
  mockAddStudents.mockResolvedValue([]);
  mockCreateForm.mockResolvedValue({});
});

async function fillNameAndContinue(name = '5/b') {
  await fireEvent.changeText(screen.getByTestId('wizard-name-input'), name);
  await fireEvent.press(screen.getByTestId('wizard-next'));
}

describe('New class wizard', () => {
  it('requires a class name', async () => {
    await render(<ClassFormScreen />);
    await fireEvent.press(screen.getByTestId('wizard-next'));
    expect(screen.getByText('Sınıf adını yazın. Örnek: 5/B')).toBeOnTheScreen();
    expect(screen.getByText('Adım 1 / 3')).toBeOnTheScreen();
  });

  it('creates the class with pasted students and the selected forms', async () => {
    await render(<ClassFormScreen />);
    await fillNameAndContinue();

    expect(screen.getByText('Öğrencileri ekleyin')).toBeOnTheScreen();
    expect(screen.getByTestId('wizard-next')).toBeDisabled();
    await fireEvent.press(screen.getByTestId('collect-method-paste'));
    await fireEvent.changeText(screen.getByTestId('collect-paste-input'), '112 selin bayezit\n245 Mehmet Ali Kara');
    await fireEvent.press(screen.getByTestId('collect-paste-add'));
    expect(screen.getByDisplayValue('Selin Bayezit')).toBeOnTheScreen();
    await fireEvent.changeText(screen.getByTestId('student-row-1-name'), 'Mehmet Kara');
    await fireEvent.press(screen.getByTestId('wizard-next'));

    expect(screen.getByText('Hangi formları kullanacaksınız?')).toBeOnTheScreen();
    expect(screen.getByTestId('wizard-form-yoklama')).toBeSelected();
    await fireEvent.press(screen.getByTestId('wizard-form-sozlu'));
    await fireEvent.press(screen.getByTestId('wizard-create'));

    expect(mockCreateClass).toHaveBeenCalledWith({ name: '5/B', grade: '5', section: 'B' });
    expect(mockAddStudents).toHaveBeenCalledWith('c9', [
      { full_name: 'Selin Bayezit', number: '112' },
      { full_name: 'Mehmet Kara', number: '245' },
    ]);
    expect(mockCreateForm.mock.calls.map((c) => c[1].title)).toEqual(['Yoklama', 'Sözlü']);
    expect(mockToast).toHaveBeenCalledWith('5/B oluşturuldu');
    expect(mockReplace).toHaveBeenCalledWith('/class/c9');
  });

  it('can skip students and forms', async () => {
    await render(<ClassFormScreen />);
    await fillNameAndContinue('Matematik kulübü');
    await fireEvent.press(screen.getByTestId('wizard-skip-students'));
    await fireEvent.press(screen.getByTestId('wizard-form-yoklama'));
    await fireEvent.press(screen.getByTestId('wizard-create'));
    expect(mockCreateClass).toHaveBeenCalledWith({ name: 'Matematik kulübü', grade: null, section: null });
    expect(mockAddStudents).not.toHaveBeenCalled();
    expect(mockCreateForm).not.toHaveBeenCalled();
    expect(mockReplace).toHaveBeenCalledWith('/class/c9');
  });

  it('adds typed students with Enter and goes back a step keeping them', async () => {
    await render(<ClassFormScreen />);
    await fillNameAndContinue();
    await fireEvent.press(screen.getByTestId('collect-method-type'));
    const input = screen.getByTestId('collect-type-input');
    await fireEvent.changeText(input, '7 ali veli');
    await fireEvent(input, 'submitEditing');
    // Yazılıp eklenmemiş ad da Devam'da listeye girer.
    await fireEvent.changeText(screen.getByTestId('collect-type-input'), 'Can Su');
    await fireEvent.press(screen.getByTestId('wizard-next'));
    await fireEvent.press(screen.getByTestId('wizard-prev'));
    expect(screen.getByDisplayValue('Ali Veli')).toBeOnTheScreen();
    expect(screen.getByDisplayValue('Can Su')).toBeOnTheScreen();
  });

  it('keeps the created class when students fail, retries and can open the class', async () => {
    mockAddStudents.mockRejectedValueOnce(new Error('boom'));
    await render(<ClassFormScreen />);
    await fillNameAndContinue();
    await fireEvent.press(screen.getByTestId('collect-method-type'));
    await fireEvent.changeText(screen.getByTestId('collect-type-input'), 'Ali Veli');
    await fireEvent.press(screen.getByTestId('wizard-next'));
    await fireEvent.press(screen.getByTestId('wizard-create'));

    expect(await screen.findByText('5/B oluşturuldu ama öğrenciler eklenemedi. Tekrar deneyin.')).toBeOnTheScreen();
    expect(mockReplace).not.toHaveBeenCalled();
    expect(screen.getByTestId('wizard-open-class')).toBeOnTheScreen();

    await fireEvent.press(screen.getByTestId('wizard-retry'));
    expect(mockCreateClass).toHaveBeenCalledTimes(1);
    expect(mockAddStudents).toHaveBeenCalledTimes(2);
    expect(mockReplace).toHaveBeenCalledWith('/class/c9');
  });
});

describe('Edit class (?classId=)', () => {
  it('renames the class', async () => {
    mockParams = { classId: 'c1' };
    mockGetClass.mockResolvedValue({ ...classRow, id: 'c1', studentCount: 3, formCount: 1 });
    mockUpdateClass.mockResolvedValue({});
    await render(<ClassFormScreen />);

    const input = await screen.findByTestId('class-edit-name');
    expect(input.props.value).toBe('5/B');
    await fireEvent.changeText(input, '5/C');
    await fireEvent.press(screen.getByTestId('class-edit-save'));
    expect(mockUpdateClass).toHaveBeenCalledWith('c1', { name: '5/C', grade: '5', section: 'B' });
    expect(mockToast).toHaveBeenCalledWith('Kaydedildi');
    expect(mockBack).toHaveBeenCalled();
  });
});
