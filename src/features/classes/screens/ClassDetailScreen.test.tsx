import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ToastProvider } from '@/components/ui';
import * as formsApi from '@/features/forms/api';
import { todayIso } from '@/features/sessions/date';
import type { FormOption } from '@/types/database';

import { deleteClass, getClass } from '../api';
import type { ClassSummary } from '../model';
import { ClassDetailScreen } from './ClassDetailScreen';

const mockPush = jest.fn();
const mockBack = jest.fn();
const mockSetParams = jest.fn();
let mockParams: Record<string, string | undefined> = { classId: 'c1' };

jest.mock('@/lib/supabase', () => ({ supabase: {} }));
jest.mock('react-native/Libraries/Modal/Modal', () => jest.requireActual('@/test/nativeModalMock'));
jest.mock('expo-router', () => {
  const { useEffect } = jest.requireActual<typeof import('react')>('react');
  return {
    useRouter: () => ({
      push: mockPush,
      replace: jest.fn(),
      back: mockBack,
      canGoBack: () => true,
      setParams: mockSetParams,
    }),
    useLocalSearchParams: () => mockParams,
    useFocusEffect: (effect: () => void) => useEffect(effect, [effect]),
  };
});
jest.mock('../api', () => ({ getClass: jest.fn(), deleteClass: jest.fn() }));
jest.mock('@/features/forms/api', () => ({
  listForms: jest.fn(),
  createForm: jest.fn(),
  listOtherClassesForms: jest.fn(),
  copyFormToClasses: jest.fn(),
  listClasses: jest.fn(),
  archiveForm: jest.fn(),
  deleteForm: jest.fn(),
}));

const mockGetClass = jest.mocked(getClass);
const mockDeleteClass = jest.mocked(deleteClass);
const forms = jest.mocked(formsApi);

const theClass: ClassSummary = {
  id: 'c1',
  name: '5/B',
  grade: '5',
  section: 'B',
  teacher_id: 't',
  created_at: '',
  studentCount: 28,
  formCount: 2,
};

const options: FormOption[] = [
  { key: 'geldi', label: 'Geldi', tone: 'positive' },
  { key: 'gelmedi', label: 'Gelmedi', tone: 'negative' },
];

const form = (id: string, title: string, extra: Partial<formsApi.FormListItem> = {}): formsApi.FormListItem => ({
  id,
  class_id: 'c1',
  teacher_id: 't',
  title,
  subject: null,
  description: null,
  options,
  sort_order: 0,
  archived: false,
  mode: 'daily',
  created_at: '',
  lastSessionDate: null,
  ...extra,
});

function Providers({ children }: { children: ReactNode }) {
  return (
    <SafeAreaProvider
      initialMetrics={{ frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } }}
    >
      <ToastProvider>{children}</ToastProvider>
    </SafeAreaProvider>
  );
}

const renderScreen = () => render(<ClassDetailScreen />, { wrapper: Providers });

beforeEach(() => {
  jest.clearAllMocks();
  mockParams = { classId: 'c1' };
  mockGetClass.mockResolvedValue(theClass);
  forms.listForms.mockResolvedValue([
    form('f1', 'Yoklama', { lastSessionDate: todayIso() }),
    form('f2', 'Ödev kontrolü'),
    form('f3', 'Eski sözlü', { archived: true }),
  ]);
});

describe('ClassDetailScreen', () => {
  it('shows forms first and a single students row', async () => {
    await renderScreen();

    expect(await screen.findByText('Yoklama')).toBeOnTheScreen();
    expect(screen.getByRole('header', { name: '5/B' })).toBeOnTheScreen();
    expect(screen.getByText('Son kayıt: Bugün')).toBeOnTheScreen();
    expect(screen.getByText('Henüz kayıt yok')).toBeOnTheScreen();
    // Arşivdeki form sınıf ekranında görünmez.
    expect(screen.queryByText('Eski sözlü')).toBeNull();
    expect(screen.getByTestId('class-student-count')).toHaveTextContent('28');
    // Öğrenci listesi bu ekranda yok.
    expect(screen.queryByLabelText('Öğrenci ara')).toBeNull();

    await fireEvent.press(screen.getByTestId('class-students-row'));
    expect(mockPush).toHaveBeenCalledWith('/class/c1/students');
  });

  it("opens today's session when a form row is tapped", async () => {
    await renderScreen();

    await fireEvent.press(await screen.findByTestId('form-row-1'));
    expect(mockPush).toHaveBeenCalledWith(`/class/c1/form/f2/session/new?date=${todayIso()}`);
  });

  it('sends a cumulative form to its marking screen and labels its type', async () => {
    forms.listForms.mockResolvedValue([
      form('f1', 'Yoklama'),
      form('f4', 'Artı / eksi', { mode: 'repeatable', lastSessionDate: todayIso() }),
    ]);
    await renderScreen();

    expect(await screen.findByTestId('form-row-1-mode')).toHaveTextContent('Birikimli');
    expect(screen.queryByTestId('form-row-0-mode')).toBeNull();
    expect(screen.getByText('Son işaret: Bugün')).toBeOnTheScreen();

    // Birikimli formun günlük kaydı olamaz: işaretleme ekranı açılır.
    await fireEvent.press(screen.getByTestId('form-row-1'));
    expect(mockPush).toHaveBeenCalledWith('/class/c1/form/f4');
    // Günlük form: bugünün kaydı.
    await fireEvent.press(screen.getByTestId('form-row-0'));
    expect(mockPush).toHaveBeenCalledWith(`/class/c1/form/f1/session/new?date=${todayIso()}`);
  });

  it('opens the history of a form from its row menu', async () => {
    await renderScreen();

    await fireEvent.press(await screen.findByTestId('form-row-0-more'));
    await fireEvent.press(await screen.findByRole('button', { name: 'Geçmiş' }));
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/class/c1/form/f1?tab=history'));
  });

  it('confirms a photo import once and clears the route param', async () => {
    mockParams = { classId: 'c1', imported: '7' };
    await renderScreen();

    expect(await screen.findByText('7 öğrenci eklendi')).toBeOnTheScreen();
    expect(mockSetParams).toHaveBeenCalledTimes(1);
    expect(mockSetParams).toHaveBeenCalledWith({ imported: undefined });
  });

  it('adds a preset form with one tap from the + Form sheet', async () => {
    forms.listForms.mockResolvedValueOnce([]);
    forms.createForm.mockResolvedValue(form('f9', 'Yoklama'));
    await renderScreen();

    await fireEvent.press(await screen.findByTestId('class-forms-empty'));
    await fireEvent.press(await screen.findByTestId('add-form-preset-yoklama'));

    await waitFor(() => expect(forms.createForm).toHaveBeenCalledTimes(1));
    const [classId, input] = forms.createForm.mock.calls[0]!;
    expect(classId).toBe('c1');
    expect(input.title).toBe('Yoklama');
    expect(input.options.map((o) => o.key)).toEqual(['geldi', 'gelmedi', 'gec_geldi', 'izinli']);
    expect(await screen.findByText('Yoklama eklendi')).toBeOnTheScreen();
    await waitFor(() => expect(forms.listForms).toHaveBeenCalledTimes(2));
  });

  it('copies a form from another class', async () => {
    forms.listOtherClassesForms.mockResolvedValue([
      {
        classInfo: { id: 'c2', name: '6/A', grade: null, section: null },
        forms: [form('f7', 'Sözlü', { class_id: 'c2' })],
      },
    ]);
    forms.copyFormToClasses.mockResolvedValue(1);
    await renderScreen();

    await fireEvent.press(await screen.findByTestId('class-add-form'));
    await fireEvent.press(await screen.findByTestId('add-form-copy'));
    await fireEvent.press(await screen.findByTestId('source-form-0-0'));

    await waitFor(() => expect(forms.copyFormToClasses).toHaveBeenCalledWith('f7', ['c1']));
    expect(await screen.findByText('Sözlü eklendi')).toBeOnTheScreen();
  });

  it('opens the blank form builder', async () => {
    await renderScreen();

    await fireEvent.press(await screen.findByTestId('class-add-form'));
    await fireEvent.press(await screen.findByTestId('add-form-blank'));

    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/class/c1/form/new'));
  });

  it('archives a form from its row menu without confirmation', async () => {
    forms.archiveForm.mockResolvedValue();
    await renderScreen();

    await fireEvent.press(await screen.findByTestId('form-row-0-more'));
    await fireEvent.press(await screen.findByTestId('form-menu-archive'));

    await waitFor(() => expect(forms.archiveForm).toHaveBeenCalledWith('f1', true));
    expect(await screen.findByText('Yoklama arşivlendi')).toBeOnTheScreen();
  });

  it('renames, opens the archive and deletes the class from the menu', async () => {
    mockDeleteClass.mockResolvedValue();
    await renderScreen();

    await fireEvent.press(await screen.findByTestId('class-more'));
    await fireEvent.press(await screen.findByTestId('class-menu-edit'));
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith({ pathname: '/class/new', params: { classId: 'c1' } }));

    await fireEvent.press(screen.getByTestId('class-more'));
    await fireEvent.press(await screen.findByTestId('class-menu-archive'));
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/class/c1/forms'));

    await fireEvent.press(screen.getByTestId('class-more'));
    await fireEvent.press(await screen.findByTestId('class-menu-delete'));
    expect(await screen.findByText('5/B silinsin mi?')).toBeOnTheScreen();
    expect(mockDeleteClass).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByTestId('class-delete-confirm-confirm'));
    await waitFor(() => expect(mockDeleteClass).toHaveBeenCalledWith('c1'));
    expect(mockBack).toHaveBeenCalled();
    expect(await screen.findByText('5/B silindi')).toBeOnTheScreen();
  });

  it('shows a retryable error when the class cannot be loaded', async () => {
    mockGetClass.mockRejectedValueOnce(new Error('boom'));
    await renderScreen();

    expect(await screen.findByText('Sınıf açılamadı')).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('class-retry'));
    expect(await screen.findByText('Yoklama')).toBeOnTheScreen();
  });
});
