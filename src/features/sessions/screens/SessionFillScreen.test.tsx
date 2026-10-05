import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { Alert } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ToastProvider } from '@/components/ui';
import type { ClassRow, FormEntryRow, FormRow, FormSessionRow, StudentRow } from '@/types/database';

import * as api from '../api';
import { SessionFillScreen } from './SessionFillScreen';

jest.mock('../api', () => {
  const actual = jest.requireActual<typeof import('../api')>('../api');
  return {
    ...actual,
    getForm: jest.fn(),
    getSession: jest.fn(),
    listStudents: jest.fn(),
    listEntries: jest.fn(),
    getClass: jest.fn(),
    upsertEntries: jest.fn(),
    updateSessionStatus: jest.fn(),
    deleteSession: jest.fn(),
  };
});

const mockRouter = { back: jest.fn(), push: jest.fn(), canGoBack: jest.fn(() => true) };
const mockAddListener = jest.fn((..._args: unknown[]) => () => undefined);

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ classId: 'c1', formId: 'f1', sessionId: 's1' }),
  useRouter: () => mockRouter,
  useNavigation: () => ({ addListener: mockAddListener, dispatch: jest.fn() }),
}));

const mocked = api as jest.Mocked<typeof api>;

const form: FormRow = {
  id: 'f1',
  class_id: 'c1',
  teacher_id: 't',
  title: 'Ödev kontrolü',
  subject: 'Matematik',
  description: '5. sınıf MEB kitabı',
  archived: false,
  sort_order: 0,
  created_at: '2026-10-01T00:00:00Z',
  options: [
    { key: 'done', label: 'Tamamlandı', tone: 'positive' },
    { key: 'missing', label: 'Eksik', tone: 'warning' },
    { key: 'none', label: 'Getirmedi', tone: 'negative' },
  ],
};

const session: FormSessionRow = {
  id: 's1',
  form_id: 'f1',
  teacher_id: 't',
  session_date: '2026-10-06',
  title: null,
  status: 'draft',
  created_at: '2026-10-06T08:00:00Z',
  updated_at: '2026-10-06T08:00:00Z',
};

const student = (id: string, full_name: string, number: string | null): StudentRow => ({
  id,
  class_id: 'c1',
  teacher_id: 't',
  full_name,
  number,
  photo_url: null,
  created_at: '2026-10-01T00:00:00Z',
});

const students = [student('st3', 'Selin Bayezit', '21'), student('st1', 'Ayşe Yılmaz', '7'), student('st2', 'Serra Güngör', '12')];

const entries: FormEntryRow[] = [
  { id: 'e1', session_id: 's1', student_id: 'st1', teacher_id: 't', option_key: 'done', note: null, updated_at: '' },
];

const klass: ClassRow = { id: 'c1', teacher_id: 't', name: '5/B', grade: '5', section: 'B', created_at: '' };

function Providers({ children }: { children: ReactNode }) {
  return (
    <SafeAreaProvider
      initialMetrics={{ frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } }}
    >
      <ToastProvider>{children}</ToastProvider>
    </SafeAreaProvider>
  );
}

async function renderScreen() {
  await render(<SessionFillScreen />, { wrapper: Providers });
  await screen.findByText('Ödev kontrolü');
}

beforeEach(() => {
  jest.clearAllMocks();
  mocked.getForm.mockResolvedValue(form);
  mocked.getSession.mockResolvedValue(session);
  mocked.listStudents.mockResolvedValue(students);
  mocked.listEntries.mockResolvedValue(entries);
  mocked.getClass.mockResolvedValue(klass);
  mocked.upsertEntries.mockResolvedValue(undefined);
});

const saveButton = () => screen.getByTestId('save-button');

describe('SessionFillScreen', () => {
  it('renders the header, students sorted by number and a disabled save button', async () => {
    await renderScreen();

    expect(screen.getByText('Matematik')).toBeOnTheScreen();
    expect(screen.getByText('5. sınıf MEB kitabı')).toBeOnTheScreen();
    expect(screen.getByText('6 Ekim 2026 Salı')).toBeOnTheScreen();
    expect(screen.getByText('Taslak')).toBeOnTheScreen();
    expect(screen.getByText('3 öğrenci')).toBeOnTheScreen();

    const names = screen.getAllByText(/^(Ayşe Yılmaz|Serra Güngör|Selin Bayezit)$/).map((n) => n.props.children);
    expect(names).toEqual(['Ayşe Yılmaz', 'Serra Güngör', 'Selin Bayezit']);

    expect(screen.getByRole('radio', { name: 'Ayşe Yılmaz: Tamamlandı' })).toBeSelected();
    expect(saveButton()).toBeDisabled();
    expect(mockAddListener).toHaveBeenCalledWith('beforeRemove', expect.any(Function));
  });

  it('saves only changed rows, clearing sends null', async () => {
    await renderScreen();

    await fireEvent.press(screen.getByRole('radio', { name: 'Serra Güngör: Eksik' }));
    await fireEvent.press(screen.getByRole('radio', { name: 'Ayşe Yılmaz: Tamamlandı' })); // tekrar dokun → temizle

    expect(screen.getByText('2 değişikliği kaydet')).toBeOnTheScreen();
    expect(saveButton()).toBeEnabled();

    await fireEvent.press(saveButton());

    await waitFor(() => expect(mocked.upsertEntries).toHaveBeenCalledTimes(1));
    expect(mocked.upsertEntries.mock.calls[0][0]).toEqual(
      expect.arrayContaining([
        { session_id: 's1', student_id: 'st2', option_key: 'missing', note: null },
        { session_id: 's1', student_id: 'st1', option_key: null, note: null },
      ]),
    );
    expect(mocked.upsertEntries.mock.calls[0][0]).toHaveLength(2);
    expect(await screen.findByText('Kaydedildi')).toBeOnTheScreen();
    expect(saveButton()).toBeDisabled();
  });

  it('keeps changes and shows the error when saving fails', async () => {
    mocked.upsertEntries.mockRejectedValueOnce(
      new api.SessionsApiError('Değişiklikler kaydedilemedi. Bağlantınızı kontrol edip tekrar kaydedin.'),
    );
    await renderScreen();

    await fireEvent.press(screen.getByRole('radio', { name: 'Selin Bayezit: Getirmedi' }));
    await fireEvent.press(saveButton());

    expect(
      await screen.findByText('Değişiklikler kaydedilemedi. Bağlantınızı kontrol edip tekrar kaydedin.'),
    ).toBeOnTheScreen();
    expect(screen.getByText('1 değişikliği kaydet')).toBeOnTheScreen();
  });

  it('applies an option to everyone and can undo it', async () => {
    await renderScreen();

    await fireEvent.press(screen.getByRole('radio', { name: 'Tüm öğrenciler: Eksik' }));

    for (const name of ['Ayşe Yılmaz', 'Serra Güngör', 'Selin Bayezit']) {
      expect(screen.getByRole('radio', { name: `${name}: Eksik` })).toBeSelected();
    }
    expect(screen.getByText('3 öğrenci Eksik olarak işaretlendi')).toBeOnTheScreen();
    expect(screen.getByText('3 değişikliği kaydet')).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Geri al' }));

    expect(screen.getByRole('radio', { name: 'Ayşe Yılmaz: Tamamlandı' })).toBeSelected();
    expect(screen.getByRole('radio', { name: 'Serra Güngör: Eksik' })).not.toBeSelected();
    expect(screen.queryByText('3 öğrenci Eksik olarak işaretlendi')).toBeNull();
    expect(saveButton()).toBeDisabled();
  });

  it('filters students by name or number', async () => {
    await renderScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Öğrenci ara' }));
    await fireEvent.changeText(screen.getByLabelText('Öğrenci ara'), 'ser');

    expect(screen.getByText('Serra Güngör')).toBeOnTheScreen();
    expect(screen.queryByText('Ayşe Yılmaz')).toBeNull();

    await fireEvent.changeText(screen.getByLabelText('Öğrenci ara'), '99');
    expect(screen.getByText(/ile eşleşen öğrenci yok/)).toBeOnTheScreen();
  });

  it('shows a retryable error when loading fails', async () => {
    mocked.getSession.mockRejectedValueOnce(new api.SessionsApiError('Kayıt bulunamadı. Silinmiş olabilir; kayıt listesine dönün.'));
    await render(<SessionFillScreen />, { wrapper: Providers });

    expect(await screen.findByText('Kayıt bulunamadı. Silinmiş olabilir; kayıt listesine dönün.')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Tekrar dene' }));
    expect(await screen.findByText('Ödev kontrolü')).toBeOnTheScreen();
  });

  it('shows an empty state when the class has no students', async () => {
    mocked.listStudents.mockResolvedValueOnce([]);
    await renderScreen();

    expect(screen.getByText('Bu sınıfta öğrenci yok')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Öğrenci ekle' }));
    expect(mockRouter.push).toHaveBeenCalledWith('/class/c1/import');
  });

  it('asks before leaving with unsaved changes', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    await renderScreen();
    const listener = mockAddListener.mock.calls.at(-1)?.[1] as (e: unknown) => void;

    const clean = { preventDefault: jest.fn(), data: { action: { type: 'GO_BACK' } } };
    listener(clean);
    expect(clean.preventDefault).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByRole('radio', { name: 'Serra Güngör: Getirmedi' }));
    const dirty = { preventDefault: jest.fn(), data: { action: { type: 'GO_BACK' } } };
    listener(dirty);
    expect(dirty.preventDefault).toHaveBeenCalled();
    expect(alertSpy).toHaveBeenCalledWith(
      'Değişiklikler kaydedilmedi',
      'Çıkarsanız 1 öğrencideki değişiklik kaybolur.',
      expect.any(Array),
    );
    alertSpy.mockRestore();
  });

  it('adds a note through the sheet', async () => {
    await renderScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Ayşe Yılmaz için not ekle' }));
    await fireEvent.changeText(await screen.findByLabelText('Not'), 'Kitabını evde unuttu');
    await fireEvent.press(screen.getByRole('button', { name: 'Notu kaydet' }));

    expect(await screen.findByText('Kitabını evde unuttu')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Ayşe Yılmaz notunu düzenle' })).toBeOnTheScreen();
    expect(screen.getByText('1 değişikliği kaydet')).toBeOnTheScreen();
  });
});
