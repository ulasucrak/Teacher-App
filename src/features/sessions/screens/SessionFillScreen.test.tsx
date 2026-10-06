import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { Alert } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ToastProvider } from '@/components/ui';
import type { FormEntryRow, FormRow, FormSessionRow, StudentRow } from '@/types/database';

import * as api from '../api';
import { SessionFillScreen } from './SessionFillScreen';

jest.mock('../api', () => {
  const actual = jest.requireActual<typeof import('../api')>('../api');
  return {
    ...actual,
    getForm: jest.fn(),
    getSession: jest.fn(),
    findSessionByDate: jest.fn(),
    ensureSessionForDate: jest.fn(),
    listStudents: jest.fn(),
    listEntries: jest.fn(),
    upsertEntries: jest.fn(),
    updateSessionStatus: jest.fn(),
    deleteSession: jest.fn(),
  };
});

const mockRouter = { back: jest.fn(), push: jest.fn(), canGoBack: jest.fn(() => true) };
const mockAddListener = jest.fn((..._args: unknown[]) => () => undefined);
const mockSetOptions = jest.fn();
let mockParams: Record<string, string> = { classId: 'c1', formId: 'f1', sessionId: 's1' };

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => mockParams,
  useRouter: () => mockRouter,
  useNavigation: () => ({ addListener: mockAddListener, dispatch: jest.fn(), setOptions: mockSetOptions }),
}));
jest.mock('react-native/Libraries/Modal/Modal', () => jest.requireActual('@/test/nativeModalMock'));

const mocked = api as jest.Mocked<typeof api>;

const form: FormRow = {
  id: 'f1',
  class_id: 'c1',
  teacher_id: 't',
  title: 'Ödev kontrolü',
  subject: 'Matematik',
  description: '5. sınıf MEB kitabı',
  archived: false,
  mode: 'daily',
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
  status: 'published',
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
  mockParams = { classId: 'c1', formId: 'f1', sessionId: 's1' };
  mocked.getForm.mockResolvedValue(form);
  mocked.getSession.mockResolvedValue(session);
  mocked.listStudents.mockResolvedValue(students);
  mocked.listEntries.mockResolvedValue(entries);
  mocked.upsertEntries.mockResolvedValue(undefined);
});

const saveButton = () => screen.getByTestId('save-button');

describe('SessionFillScreen', () => {
  it('renders compact rows sorted by number, date, progress and a disabled save button', async () => {
    await renderScreen();

    expect(screen.getByTestId('fill-date')).toHaveTextContent(/6 Ekim/);
    expect(screen.getByTestId('fill-progress')).toHaveTextContent('1/3');
    expect(screen.queryByText('Yayınla')).toBeNull();

    const names = screen.getAllByText(/^(Ayşe Yılmaz|Serra Güngör|Selin Bayezit)$/).map((n) => n.props.children);
    expect(names).toEqual(['Ayşe Yılmaz', 'Serra Güngör', 'Selin Bayezit']);
    expect(screen.getByTestId('student-row-0-name')).toHaveTextContent('Ayşe Yılmaz');

    expect(screen.getByRole('radio', { name: 'Ayşe Yılmaz: Tamamlandı' })).toBeSelected();
    expect(saveButton()).toBeDisabled();
    expect(mockAddListener).toHaveBeenCalledWith('beforeRemove', expect.any(Function));
    // Az öğrencide arama alanı yok.
    expect(screen.queryByTestId('fill-search')).toBeNull();
  });

  it('saves only changed rows, clearing sends null', async () => {
    await renderScreen();

    await fireEvent.press(screen.getByTestId('student-row-1-missing'));
    await fireEvent.press(screen.getByRole('radio', { name: 'Ayşe Yılmaz: Tamamlandı' })); // tekrar dokun → temizle

    expect(screen.getByText('2 öğrencide kaydedilmemiş değişiklik')).toBeOnTheScreen();
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
    expect(mocked.ensureSessionForDate).not.toHaveBeenCalled();
    expect(mocked.updateSessionStatus).not.toHaveBeenCalled();
  });

  it("opens today's unsaved session and creates it on first save", async () => {
    mockParams = { classId: 'c1', formId: 'f1', sessionId: 'new', date: '2026-10-07' };
    mocked.findSessionByDate.mockResolvedValue(null);
    mocked.ensureSessionForDate.mockResolvedValue({ session: { ...session, id: 'created', session_date: '2026-10-07' }, created: true });
    await renderScreen();

    expect(mocked.findSessionByDate).toHaveBeenCalledWith('f1', '2026-10-07');
    expect(mocked.listEntries).not.toHaveBeenCalled();
    expect(screen.getByTestId('fill-progress')).toHaveTextContent('0/3');

    await fireEvent.press(screen.getByTestId('bulk-done'));
    await fireEvent.press(saveButton());

    await waitFor(() => expect(mocked.upsertEntries).toHaveBeenCalledTimes(1));
    expect(mocked.ensureSessionForDate).toHaveBeenCalledWith({ formId: 'f1', sessionDate: '2026-10-07' });
    expect(mocked.upsertEntries.mock.calls[0][0]).toHaveLength(3);
    expect(mocked.upsertEntries.mock.calls[0][0][0]).toMatchObject({ session_id: 'created' });
  });

  it('deletes the just-created session when the first save fails', async () => {
    mockParams = { classId: 'c1', formId: 'f1', sessionId: 'new', date: '2026-10-07' };
    mocked.findSessionByDate.mockResolvedValue(null);
    mocked.ensureSessionForDate.mockResolvedValue({ session: { ...session, id: 'created', session_date: '2026-10-07' }, created: true });
    mocked.upsertEntries.mockRejectedValueOnce(new Error('network down'));
    mocked.deleteSession.mockResolvedValue(undefined);
    await renderScreen();

    await fireEvent.press(screen.getByTestId('bulk-done'));
    await fireEvent.press(saveButton());

    await waitFor(() => expect(mocked.deleteSession).toHaveBeenCalledWith('created'));
    // Değişiklikler hâlâ kaydedilmemiş; tekrar kaydetmek yeni kayıt oluşturur.
    expect(saveButton()).not.toBeDisabled();
  });

  it('keeps a session another device created when the first save fails', async () => {
    mockParams = { classId: 'c1', formId: 'f1', sessionId: 'new', date: '2026-10-07' };
    mocked.findSessionByDate.mockResolvedValue(null);
    mocked.ensureSessionForDate.mockResolvedValue({ session: { ...session, id: 'other', session_date: '2026-10-07' }, created: false });
    mocked.upsertEntries.mockRejectedValueOnce(new Error('network down'));
    await renderScreen();

    await fireEvent.press(screen.getByTestId('bulk-done'));
    await fireEvent.press(saveButton());

    await waitFor(() => expect(mocked.upsertEntries).toHaveBeenCalledTimes(1));
    expect(mocked.deleteSession).not.toHaveBeenCalled();
  });

  it('disables the iOS swipe-back gesture while there are unsaved changes', async () => {
    await renderScreen();
    expect(mockSetOptions).toHaveBeenLastCalledWith({ gestureEnabled: true });
    await fireEvent.press(screen.getByTestId('bulk-done'));
    expect(mockSetOptions).toHaveBeenLastCalledWith({ gestureEnabled: false });
  });

  it("reuses the day's existing session", async () => {
    mockParams = { classId: 'c1', formId: 'f1', sessionId: 'new', date: '2026-10-06' };
    mocked.findSessionByDate.mockResolvedValue(session);
    await renderScreen();

    expect(mocked.listEntries).toHaveBeenCalledWith('s1');
    expect(screen.getByRole('radio', { name: 'Ayşe Yılmaz: Tamamlandı' })).toBeSelected();
  });

  it('publishes an old draft session when saving', async () => {
    mocked.getSession.mockResolvedValue({ ...session, status: 'draft' });
    mocked.updateSessionStatus.mockResolvedValue(session);
    await renderScreen();

    await fireEvent.press(screen.getByTestId('student-row-2-none'));
    await fireEvent.press(saveButton());

    await waitFor(() => expect(mocked.updateSessionStatus).toHaveBeenCalledWith('s1', 'published'));
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
    expect(screen.getByText('1 öğrencide kaydedilmemiş değişiklik')).toBeOnTheScreen();
  });

  it('applies an option to everyone and can undo it', async () => {
    await renderScreen();

    await fireEvent.press(screen.getByRole('radio', { name: 'Tüm öğrenciler: Eksik' }));

    for (const name of ['Ayşe Yılmaz', 'Serra Güngör', 'Selin Bayezit']) {
      expect(screen.getByRole('radio', { name: `${name}: Eksik` })).toBeSelected();
    }
    expect(screen.getByText('3 öğrenci: Eksik')).toBeOnTheScreen();
    expect(screen.getByText('3 öğrencide kaydedilmemiş değişiklik')).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Geri al' }));

    expect(screen.getByRole('radio', { name: 'Ayşe Yılmaz: Tamamlandı' })).toBeSelected();
    expect(screen.getByRole('radio', { name: 'Serra Güngör: Eksik' })).not.toBeSelected();
    expect(screen.queryByText('3 öğrenci: Eksik')).toBeNull();
    expect(saveButton()).toBeDisabled();
  });

  it('filters students by name or number in a large class', async () => {
    const many = [
      ...students,
      ...Array.from({ length: 10 }, (_, i) => student(`x${i}`, `Öğrenci ${i}`, String(40 + i))),
    ];
    mocked.listStudents.mockResolvedValue(many);
    await renderScreen();

    await fireEvent.changeText(screen.getByTestId('fill-search'), 'ser');

    expect(screen.getByText('Serra Güngör')).toBeOnTheScreen();
    expect(screen.queryByText('Ayşe Yılmaz')).toBeNull();

    await fireEvent.changeText(screen.getByTestId('fill-search'), '99');
    expect(screen.getByTestId('fill-no-match')).toBeOnTheScreen();
  });

  it('shows a retryable error when loading fails', async () => {
    mocked.getSession.mockRejectedValueOnce(new api.SessionsApiError('Kayıt bulunamadı. Silinmiş olabilir; kayıt listesine dönün.'));
    await render(<SessionFillScreen />, { wrapper: Providers });

    expect(await screen.findByText('Kayıt bulunamadı. Silinmiş olabilir; kayıt listesine dönün.')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Tekrar dene' }));
    expect(await screen.findByText('Ödev kontrolü')).toBeOnTheScreen();
  });

  it('treats a session from another form as not found', async () => {
    mocked.getSession.mockResolvedValueOnce({ ...session, form_id: 'other' });
    await render(<SessionFillScreen />, { wrapper: Providers });

    expect(await screen.findByText('Kayıt bulunamadı. Silinmiş olabilir; kayıt listesine dönün.')).toBeOnTheScreen();
    expect(screen.queryByTestId('student-row-0')).toBeNull();
  });

  it('shows an empty state when the class has no students', async () => {
    mocked.listStudents.mockResolvedValueOnce([]);
    await renderScreen();

    expect(screen.getByText('Bu sınıfta öğrenci yok')).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('fill-add-students'));
    expect(mockRouter.push).toHaveBeenCalledWith('/class/c1/students');
  });

  it('opens the form history from the menu', async () => {
    await renderScreen();

    await fireEvent.press(screen.getByTestId('fill-more'));
    await fireEvent.press(await screen.findByTestId('fill-menu-history'));
    await waitFor(() => expect(mockRouter.push).toHaveBeenCalledWith('/class/c1/form/f1?tab=history'));
  });

  it('deletes the session from the menu after confirmation', async () => {
    mocked.deleteSession.mockResolvedValue(undefined);
    await renderScreen();

    await fireEvent.press(screen.getByTestId('fill-more'));
    await fireEvent.press(await screen.findByTestId('fill-menu-delete'));
    await fireEvent.press(await screen.findByTestId('fill-delete-confirm-confirm'));

    await waitFor(() => expect(mocked.deleteSession).toHaveBeenCalledWith('s1'));
    expect(mockRouter.back).toHaveBeenCalled();
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

    await fireEvent.press(screen.getByTestId('student-row-0-note'));
    await fireEvent.changeText(await screen.findByTestId('note-input'), 'Kitabını evde unuttu');
    await fireEvent.press(screen.getByTestId('note-save'));

    expect(await screen.findByText('Kitabını evde unuttu')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Ayşe Yılmaz notunu düzenle' })).toBeOnTheScreen();
    expect(screen.getByText('1 öğrencide kaydedilmemiş değişiklik')).toBeOnTheScreen();
  });
});
