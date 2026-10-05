import { fireEvent, render, screen, within } from '@testing-library/react-native';
import { Alert } from 'react-native';

import { ToastProvider } from '@/components/ui';
import { addStudent, deleteStudents, listStudents } from '@/features/students/api';
import type { StudentRow } from '@/types/database';

import { getClass } from '../api';
import type { ClassSummary } from '../model';
import { ClassDetailScreen } from './ClassDetailScreen';

const mockPush = jest.fn();

jest.mock('react-native-safe-area-context', () => jest.requireActual('react-native-safe-area-context/jest/mock').default);
jest.mock('@/lib/supabase', () => ({ supabase: {} }));
jest.mock('expo-router', () => {
  const { useEffect } = jest.requireActual<typeof import('react')>('react');
  return {
    useRouter: () => ({ push: mockPush, replace: jest.fn(), back: jest.fn(), canGoBack: () => true }),
    useLocalSearchParams: () => ({ classId: 'c1' }),
    useFocusEffect: (effect: () => void) => useEffect(effect, [effect]),
  };
});
jest.mock('../api', () => ({ getClass: jest.fn(), deleteClass: jest.fn() }));
jest.mock('@/features/students/api', () => ({
  listStudents: jest.fn(),
  addStudent: jest.fn(),
  updateStudent: jest.fn(),
  deleteStudents: jest.fn(),
}));

const mockGetClass = getClass as jest.MockedFunction<typeof getClass>;
const mockListStudents = listStudents as jest.MockedFunction<typeof listStudents>;
const mockAddStudent = addStudent as jest.MockedFunction<typeof addStudent>;
const mockDeleteStudents = deleteStudents as jest.MockedFunction<typeof deleteStudents>;

const theClass: ClassSummary = {
  id: 'c1',
  name: '5/B',
  grade: '5',
  section: 'B',
  teacher_id: 't',
  created_at: '',
  studentCount: 3,
  formCount: 2,
};

const student = (id: string, full_name: string, number: string | null): StudentRow => ({
  id,
  full_name,
  number,
  class_id: 'c1',
  teacher_id: 't',
  photo_url: null,
  created_at: '',
});

const roster = [student('s1', 'Ayşe Yılmaz', '12'), student('s2', 'Can Demir', '3'), student('s3', 'Işık Er', '20')];

const renderScreen = () =>
  render(
    <ToastProvider>
      <ClassDetailScreen />
    </ToastProvider>,
  );

beforeEach(() => {
  jest.clearAllMocks();
  mockGetClass.mockResolvedValue(theClass);
  mockListStudents.mockResolvedValue(roster);
});

describe('ClassDetailScreen', () => {
  it('shows the class, entry points and students', async () => {
    await renderScreen();

    expect(await screen.findByText('Ayşe Yılmaz')).toBeOnTheScreen();
    expect(screen.getByRole('header', { name: '5/B' })).toBeOnTheScreen();
    expect(screen.getByText('3 öğrenci')).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: /^Formlar/ }));
    expect(mockPush).toHaveBeenCalledWith('/class/c1/forms');
    await fireEvent.press(screen.getByRole('button', { name: /^Fotoğraftan öğrenci ekle/ }));
    expect(mockPush).toHaveBeenCalledWith('/class/c1/import');
  });

  it('filters students by name ignoring Turkish diacritics', async () => {
    await renderScreen();
    await screen.findByText('Ayşe Yılmaz');

    await fireEvent.changeText(screen.getByLabelText('Öğrenci ara'), 'isik');
    expect(screen.getByText('Işık Er')).toBeOnTheScreen();
    expect(screen.queryByText('Ayşe Yılmaz')).toBeNull();
  });

  it('adds a student with a normalized name', async () => {
    mockAddStudent.mockImplementation(async (_classId, s) => student('s4', s.full_name, s.number ?? null));
    await renderScreen();
    await screen.findByText('Ayşe Yılmaz');

    await fireEvent.press(screen.getByRole('button', { name: 'Öğrenci ekle' }));
    await fireEvent.changeText(screen.getByLabelText('Ad soyad'), 'SELİN BAYEZİT');
    await fireEvent.changeText(screen.getByLabelText('Okul numarası (isteğe bağlı)'), '45');
    await fireEvent.press(screen.getByRole('button', { name: 'Öğrenciyi ekle' }));

    expect(mockAddStudent).toHaveBeenCalledWith('c1', { full_name: 'Selin Bayezit', number: '45' });
    expect(await screen.findByText('Selin Bayezit')).toBeOnTheScreen();
  });

  it('bulk-deletes selected students after confirmation', async () => {
    mockDeleteStudents.mockResolvedValue();
    const alert = jest.spyOn(Alert, 'alert').mockImplementation((_title, _msg, buttons) => {
      buttons?.find((b) => b.style === 'destructive')?.onPress?.();
    });
    await renderScreen();
    await screen.findByText('Ayşe Yılmaz');

    await fireEvent.press(screen.getByRole('button', { name: 'Silmek için öğrenci seç' }));
    await fireEvent.press(screen.getByRole('button', { name: /^Ayşe Yılmaz, numara 12, seçili değil/ }));
    await fireEvent.press(screen.getByRole('button', { name: /^Can Demir/ }));
    await fireEvent.press(screen.getByRole('button', { name: '2 öğrenciyi sil' }));

    expect(alert).toHaveBeenCalledWith('2 öğrenci silinsin mi?', expect.any(String), expect.any(Array));
    expect(mockDeleteStudents).toHaveBeenCalledWith(expect.arrayContaining(['s1', 's2']));
    expect(await screen.findByText('1 öğrenci')).toBeOnTheScreen();
    expect(within(screen.getByRole('button', { name: /^Işık Er/ })).getByText('Işık Er')).toBeOnTheScreen();
    alert.mockRestore();
  });

  it('shows the empty state when the class has no students', async () => {
    mockListStudents.mockResolvedValue([]);
    await renderScreen();
    expect(await screen.findByText('Bu sınıfta henüz öğrenci yok')).toBeOnTheScreen();
  });
});
