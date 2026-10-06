import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import type { UseRealtimeRefreshOptions } from '@/lib/realtime';

import * as api from '../api';
import { Providers, makeForm } from '../test-utils';
import FormsScreen from './FormsScreen';

const mockPush = jest.fn();

// Canlı eşitleme: abonelik yerine son seçenekler tutulur; testler onChange'i elle tetikler.
const mockRealtime: { last: UseRealtimeRefreshOptions | null } = { last: null };
jest.mock('@/lib/realtime', () => ({
  ...jest.requireActual<typeof import('@/lib/realtime')>('@/lib/realtime'),
  useRealtimeRefresh: (options: UseRealtimeRefreshOptions) => {
    mockRealtime.last = options;
  },
}));

async function fireRealtimeChange() {
  const options = mockRealtime.last;
  if (!options) throw new Error('useRealtimeRefresh çağrılmadı');
  await act(async () => {
    options.onChange('change');
  });
}

jest.mock('expo-router', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  return {
    useRouter: () => ({ push: mockPush, back: jest.fn(), replace: jest.fn(), canGoBack: () => true }),
    useLocalSearchParams: () => ({ classId: 'class-1' }),
    useFocusEffect: (cb: () => void) => {
      React.useEffect(() => cb(), [cb]);
    },
  };
});

// iOS: Sheet'in kapanış bildirimi yerel Modal onDismiss'ten gelir; taklit bunu da tetikler.
jest.mock('react-native/Libraries/Modal/Modal', () => jest.requireActual('@/test/nativeModalMock'));

jest.mock('../api', () => ({
  listForms: jest.fn(),
  listClasses: jest.fn(),
  listOtherClassesForms: jest.fn(),
  copyFormToClasses: jest.fn(),
  archiveForm: jest.fn(),
  deleteForm: jest.fn(),
}));

const mocked = jest.mocked(api);

beforeEach(() => {
  jest.clearAllMocks();
  mockRealtime.last = null;
});

async function renderScreen() {
  await render(
    <Providers>
      <FormsScreen />
    </Providers>,
  );
}

describe('FormsScreen (arşiv)', () => {
  it('lists only archived forms and opens their history', async () => {
    mocked.listForms.mockResolvedValue([
      makeForm(),
      makeForm({ id: 'form-2', title: 'Sözlü', archived: true, lastSessionDate: '2025-12-01' }),
    ]);
    await renderScreen();

    expect(await screen.findByText('Sözlü')).toBeOnTheScreen();
    expect(screen.queryByText('Yoklama')).toBeNull();
    expect(screen.getByText('Son kayıt: 1 Aralık 2025')).toBeOnTheScreen();

    await fireEvent.press(screen.getByTestId('form-row-0'));
    expect(mockPush).toHaveBeenCalledWith('/class/class-1/form/form-2');
  });

  it('shows a short empty state', async () => {
    mocked.listForms.mockResolvedValue([makeForm()]);
    await renderScreen();

    expect(await screen.findByText('Arşiv boş')).toBeOnTheScreen();
  });

  it('shows a retryable error when loading fails', async () => {
    mocked.listForms.mockRejectedValueOnce(new Error('Network request failed'));
    await renderScreen();

    expect(await screen.findByText('Formlar yüklenemedi')).toBeOnTheScreen();
    expect(screen.getByText(/İnternet bağlantınızı kontrol edip/)).toBeOnTheScreen();
    mocked.listForms.mockResolvedValue([makeForm({ archived: true })]);
    await fireEvent.press(screen.getByTestId('archive-retry'));
    expect(await screen.findByText('Yoklama')).toBeOnTheScreen();
  });

  it('unarchives from the row menu without confirmation', async () => {
    mocked.listForms.mockResolvedValue([makeForm({ archived: true })]);
    mocked.archiveForm.mockResolvedValue();
    await renderScreen();

    await fireEvent.press(await screen.findByTestId('form-row-0-more'));
    await fireEvent.press(await screen.findByTestId('form-menu-archive'));

    await waitFor(() => expect(mocked.archiveForm).toHaveBeenCalledWith('form-1', false));
    expect(await screen.findByText('Yoklama arşivden çıkarıldı')).toBeOnTheScreen();
  });

  it('copies a form to selected classes', async () => {
    mocked.listForms.mockResolvedValue([makeForm({ archived: true })]);
    mocked.listClasses.mockResolvedValue([
      { id: 'class-1', name: '5/B', grade: null, section: null },
      { id: 'class-2', name: '6/A', grade: null, section: null },
      { id: 'class-3', name: '7/C', grade: null, section: null },
    ]);
    mocked.copyFormToClasses.mockResolvedValue(2);
    await renderScreen();

    await fireEvent.press(await screen.findByTestId('form-row-0-more'));
    await fireEvent.press(await screen.findByTestId('form-menu-copy'));

    const selectAll = await screen.findByTestId('copy-class-all');
    // Formun kendi sınıfı hedef listesinde yok.
    expect(screen.queryByRole('checkbox', { name: '5/B' })).toBeNull();
    await fireEvent.press(selectAll);
    await fireEvent.press(screen.getByTestId('copy-classes-confirm'));

    await waitFor(() =>
      expect(mocked.copyFormToClasses).toHaveBeenCalledWith('form-1', expect.arrayContaining(['class-2', 'class-3'])),
    );
    expect(await screen.findByText('Form 2 sınıfa kopyalandı')).toBeOnTheScreen();
  });

  it('reports an error instead of "0 sınıfa" when nothing was copied', async () => {
    mocked.listForms.mockResolvedValue([makeForm({ archived: true })]);
    mocked.listClasses.mockResolvedValue([{ id: 'class-2', name: '6/A', grade: null, section: null }]);
    mocked.copyFormToClasses.mockResolvedValue(0);
    await renderScreen();

    await fireEvent.press(await screen.findByTestId('form-row-0-more'));
    await fireEvent.press(await screen.findByTestId('form-menu-copy'));
    await fireEvent.press(await screen.findByTestId('copy-class-0'));
    await fireEvent.press(screen.getByTestId('copy-classes-confirm'));

    expect(await screen.findByText(/Form hiçbir sınıfa eklenmedi/)).toBeOnTheScreen();
    await waitFor(() => expect(mocked.listClasses).toHaveBeenCalledTimes(2));
  });

  it('deletes a form only after the confirm sheet', async () => {
    mocked.listForms.mockResolvedValue([makeForm({ archived: true })]);
    mocked.deleteForm.mockResolvedValue();
    await renderScreen();

    await fireEvent.press(await screen.findByTestId('form-row-0-more'));
    await fireEvent.press(await screen.findByTestId('form-menu-delete'));
    expect(await screen.findByText('Yoklama silinsin mi?')).toBeOnTheScreen();
    expect(mocked.deleteForm).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByTestId('form-delete-confirm-confirm'));
    await waitFor(() => expect(mocked.deleteForm).toHaveBeenCalledWith('form-1'));
    expect(await screen.findByText('Yoklama silindi')).toBeOnTheScreen();
  });

  it('refreshes live when forms change on another device', async () => {
    mocked.listForms.mockResolvedValue([makeForm({ archived: true })]);
    await renderScreen();
    expect(await screen.findByText('Yoklama')).toBeOnTheScreen();

    expect(mockRealtime.last?.enabled).toBe(true);
    expect(mockRealtime.last?.tables).toEqual(expect.arrayContaining([{ table: 'forms', own: true }]));

    mocked.listForms.mockResolvedValue([
      makeForm({ archived: true }),
      makeForm({ id: 'form-2', title: 'Sözlü', archived: true }),
    ]);
    await fireRealtimeChange();

    expect(await screen.findByText('Sözlü')).toBeOnTheScreen();
    expect(screen.queryByTestId('archive-retry')).toBeNull();
  });

  it('keeps the list and shows a toast when a live refresh fails', async () => {
    mocked.listForms.mockResolvedValue([makeForm({ archived: true })]);
    await renderScreen();
    expect(await screen.findByText('Yoklama')).toBeOnTheScreen();

    mocked.listForms.mockRejectedValueOnce(new Error('Network request failed'));
    await fireRealtimeChange();

    expect(await screen.findByText(/İnternet bağlantınızı kontrol edip/)).toBeOnTheScreen();
    expect(screen.getByText('Yoklama')).toBeOnTheScreen();
    expect(screen.queryByText('Formlar yüklenemedi')).toBeNull();
  });
});
