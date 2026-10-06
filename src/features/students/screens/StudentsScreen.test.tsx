import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import type { StudentRow } from '@/types/database';

import { deleteStudents, listStudents, updateStudent } from '../api';
import { StudentsScreen } from './StudentsScreen';

const mockPush = jest.fn();
const mockToast = jest.fn();

jest.mock('react-native/Libraries/Modal/Modal', () => jest.requireActual('@/test/nativeModalMock'));
jest.mock('react-native-safe-area-context', () => jest.requireActual('react-native-safe-area-context/jest/mock').default);
jest.mock('@/lib/supabase', () => ({ supabase: {} }));
jest.mock('expo-router', () => {
  const { useEffect } = jest.requireActual<typeof import('react')>('react');
  return {
    useRouter: () => ({ push: mockPush, replace: jest.fn(), back: jest.fn(), canGoBack: () => true }),
    useFocusEffect: (effect: () => void) => useEffect(effect, [effect]),
  };
});
jest.mock('@/components/ui', () => ({
  ...jest.requireActual('@/components/ui'),
  useToast: () => ({ show: mockToast }),
}));
jest.mock('../api', () => ({ listStudents: jest.fn(), updateStudent: jest.fn(), deleteStudents: jest.fn() }));

const mockList = listStudents as jest.Mock;
const mockUpdate = updateStudent as jest.Mock;
const mockDelete = deleteStudents as jest.Mock;

const student = (id: string, full_name: string, number: string | null): StudentRow => ({
  id,
  full_name,
  number,
  class_id: 'c1',
  teacher_id: 't',
  photo_url: null,
  created_at: '',
});

const roster = [student('s1', 'Ayşe Yılmaz', '12'), student('s2', 'Mehmet Kaya', '15'), student('s3', 'Işıl Demir', '20')];

beforeEach(() => {
  jest.clearAllMocks();
  mockList.mockResolvedValue(roster);
  mockDelete.mockResolvedValue(undefined);
});

describe('StudentsScreen', () => {
  it('lists and searches students', async () => {
    await render(<StudentsScreen classId="c1" />);
    expect(await screen.findByText('Ayşe Yılmaz')).toBeOnTheScreen();
    expect(screen.getByText('3 öğrenci')).toBeOnTheScreen();

    await fireEvent.changeText(screen.getByTestId('students-search'), 'isil');
    expect(screen.getByText('Işıl Demir')).toBeOnTheScreen();
    expect(screen.queryByText('Ayşe Yılmaz')).toBeNull();

    await fireEvent.changeText(screen.getByTestId('students-search'), 'zz');
    expect(screen.getByText('“zz” ile eşleşen öğrenci yok.')).toBeOnTheScreen();
  });

  it('edits a student from the row sheet', async () => {
    mockUpdate.mockResolvedValue(student('s2', 'Mehmet Ali Kaya', '15'));
    await render(<StudentsScreen classId="c1" />);
    await fireEvent.press(await screen.findByTestId('student-row-1'));
    await fireEvent.changeText(screen.getByTestId('student-sheet-name'), 'mehmet ali kaya');
    await fireEvent.press(screen.getByTestId('student-sheet-save'));
    expect(mockUpdate).toHaveBeenCalledWith('s2', { full_name: 'Mehmet Ali Kaya', number: '15' });
    expect(await screen.findByText('Mehmet Ali Kaya')).toBeOnTheScreen();
    expect(mockToast).toHaveBeenCalledWith('Kaydedildi');
  });

  it('deletes one student via the sheet and a confirmation', async () => {
    await render(<StudentsScreen classId="c1" />);
    await fireEvent.press(await screen.findByTestId('student-row-0'));
    await fireEvent.press(screen.getByTestId('student-sheet-delete'));
    await fireEvent.press(await screen.findByTestId('students-delete-confirm-confirm'));
    expect(mockDelete).toHaveBeenCalledWith(['s1']);
    await waitFor(() => expect(screen.queryByText('Ayşe Yılmaz')).toBeNull());
    expect(mockToast).toHaveBeenCalledWith('Ayşe Yılmaz silindi');
  });

  it('multi-selects and deletes from the overflow menu', async () => {
    await render(<StudentsScreen classId="c1" />);
    await screen.findByText('Ayşe Yılmaz');
    await fireEvent.press(screen.getByTestId('students-menu'));
    await fireEvent.press(screen.getByTestId('students-menu-select'));

    await waitFor(() => expect(screen.getByTestId('students-delete-selected')).toBeOnTheScreen());
    await fireEvent.press(screen.getByTestId('student-row-0'));
    await fireEvent.press(screen.getByTestId('student-row-2'));
    expect(screen.getByText('2 seçili')).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('students-delete-selected'));
    await fireEvent.press(await screen.findByTestId('students-delete-confirm-confirm'));
    expect(mockDelete).toHaveBeenCalledWith(['s1', 's3']);
    expect(mockToast).toHaveBeenCalledWith('2 öğrenci silindi');
    await waitFor(() => expect(screen.queryByTestId('students-delete-selected')).toBeNull());
  });

  it('opens the add flow with the chosen method', async () => {
    await render(<StudentsScreen classId="c1" />);
    await screen.findByText('Ayşe Yılmaz');
    await fireEvent.press(screen.getByTestId('students-menu'));
    await fireEvent.press(screen.getByTestId('students-menu-add'));
    await fireEvent.press(await screen.findByTestId('students-add-paste'));
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/class/c1/import?method=paste'));
  });

  it('shows an empty state with an add action', async () => {
    mockList.mockResolvedValue([]);
    await render(<StudentsScreen classId="c1" />);
    expect(await screen.findByText('Henüz öğrenci yok')).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('students-empty-add'));
    await fireEvent.press(await screen.findByTestId('students-add-photo'));
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/class/c1/import?method=photo'));
  });
});
