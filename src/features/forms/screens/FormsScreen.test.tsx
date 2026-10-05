import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import * as api from '../api';
import { Providers, makeForm } from '../test-utils';
import FormsScreen from './FormsScreen';

const mockPush = jest.fn();

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

jest.mock('../api', () => ({
  listForms: jest.fn(),
  getClass: jest.fn(),
  listClasses: jest.fn(),
  listOtherClassesForms: jest.fn(),
  copyFormToClasses: jest.fn(),
  archiveForm: jest.fn(),
  deleteForm: jest.fn(),
}));

const mocked = jest.mocked(api);

beforeEach(() => {
  jest.clearAllMocks();
  mocked.getClass.mockResolvedValue({
    id: 'class-1',
    name: '5/B',
    grade: '5',
    section: 'B',
    created_at: '',
    teacher_id: 'teacher-1',
  });
});

async function renderScreen() {
  await render(
    <Providers>
      <FormsScreen />
    </Providers>,
  );
}

describe('FormsScreen', () => {
  it('lists the class forms with option count', async () => {
    mocked.listForms.mockResolvedValue([
      makeForm(),
      makeForm({ id: 'form-2', title: 'Sözlü', subject: null, archived: true }),
    ]);
    await renderScreen();

    expect(await screen.findByText('Yoklama')).toBeOnTheScreen();
    expect(screen.getByText('5/B')).toBeOnTheScreen();
    expect(screen.getAllByText('2 seçenek').length).toBeGreaterThan(0);
    // Arşivdeki form varsayılan olarak kapalı bölümde.
    expect(screen.queryByText('Sözlü')).toBeNull();
    expect(screen.getByText('Arşivdeki formlar (1)')).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: /^Yoklama, Matematik/ }));
    expect(mockPush).toHaveBeenCalledWith('/class/class-1/form/form-1');
  });

  it('shows the empty state with template shortcuts', async () => {
    mocked.listForms.mockResolvedValue([]);
    await renderScreen();

    expect(await screen.findByText('Bu sınıfta henüz form yok')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: /Ödev kontrolü şablonuyla form oluştur/ }));
    expect(mockPush).toHaveBeenCalledWith('/class/class-1/form/new?preset=odev');
  });

  it('shows a retryable error when loading fails', async () => {
    mocked.listForms.mockRejectedValueOnce(new Error('Network request failed'));
    await renderScreen();

    expect(await screen.findByText('Formlar yüklenemedi')).toBeOnTheScreen();
    expect(screen.getByText(/İnternet bağlantınızı kontrol edip/)).toBeOnTheScreen();
    mocked.listForms.mockResolvedValue([makeForm()]);
    await fireEvent.press(screen.getByRole('button', { name: 'Tekrar dene' }));
    expect(await screen.findByText('Yoklama')).toBeOnTheScreen();
  });

  it('adds a form from another class in two taps', async () => {
    mocked.listForms.mockResolvedValue([]);
    mocked.listOtherClassesForms.mockResolvedValue([
      {
        classInfo: { id: 'class-2', name: '6/A', grade: null, section: null },
        forms: [makeForm({ id: 'form-9', class_id: 'class-2', title: 'Ödev kontrolü' })],
      },
    ]);
    mocked.copyFormToClasses.mockResolvedValue(1);
    await renderScreen();

    await fireEvent.press(await screen.findByRole('button', { name: 'Başka sınıftan form ekle' }));
    expect(await screen.findByText('6/A')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: /^Ödev kontrolü, Matematik/ }));

    await waitFor(() => expect(mocked.copyFormToClasses).toHaveBeenCalledWith('form-9', ['class-1']));
    expect(await screen.findByText('"Ödev kontrolü" bu sınıfa eklendi')).toBeOnTheScreen();
  });

  it('copies a form to selected classes', async () => {
    mocked.listForms.mockResolvedValue([makeForm()]);
    mocked.listClasses.mockResolvedValue([
      { id: 'class-1', name: '5/B', grade: null, section: null },
      { id: 'class-2', name: '6/A', grade: null, section: null },
      { id: 'class-3', name: '7/C', grade: null, section: null },
    ]);
    mocked.copyFormToClasses.mockResolvedValue(2);
    await renderScreen();

    await fireEvent.press(await screen.findByRole('button', { name: 'Yoklama için diğer eylemler' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Diğer sınıflara kopyala' }));

    const selectAll = await screen.findByRole('checkbox', { name: 'Tümünü seç' });
    // Formun kendi sınıfı hedef listesinde yok.
    expect(screen.queryByRole('checkbox', { name: '5/B' })).toBeNull();
    await fireEvent.press(selectAll);
    await fireEvent.press(screen.getByRole('button', { name: '2 sınıfa kopyala' }));

    await waitFor(() =>
      expect(mocked.copyFormToClasses).toHaveBeenCalledWith('form-1', expect.arrayContaining(['class-2', 'class-3'])),
    );
    expect(await screen.findByText('Form 2 sınıfa eklendi')).toBeOnTheScreen();
  });
});
