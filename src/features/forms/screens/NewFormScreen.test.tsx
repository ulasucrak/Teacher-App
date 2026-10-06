import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import * as api from '../api';
import { Providers, makeForm } from '../test-utils';
import NewFormScreen from './NewFormScreen';

const mockBack = jest.fn();
let mockParams: Record<string, string> = { classId: 'class-1' };

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: mockBack, replace: jest.fn(), canGoBack: () => true }),
  useLocalSearchParams: () => mockParams,
}));

jest.mock('../api', () => ({ createForm: jest.fn() }));

const mocked = jest.mocked(api);

beforeEach(() => {
  jest.clearAllMocks();
  mockParams = { classId: 'class-1' };
  mocked.createForm.mockResolvedValue(makeForm());
});

async function renderScreen() {
  await render(
    <Providers>
      <NewFormScreen />
    </Providers>,
  );
}

describe('NewFormScreen', () => {
  it('starts from the preset in the route and saves stable keys', async () => {
    mockParams = { classId: 'class-1', preset: 'yoklama' };
    await renderScreen();

    expect(screen.getByLabelText('Form adı')).toHaveDisplayValue('Yoklama');
    // Ders/açıklama "Ayrıntı ekle" arkasında.
    expect(screen.queryByLabelText('Ders (isteğe bağlı)')).toBeNull();
    await fireEvent.press(screen.getByTestId('form-details-toggle'));

    await fireEvent.changeText(screen.getByLabelText('Ders (isteğe bağlı)'), 'Matematik');
    await fireEvent.changeText(screen.getByLabelText('Seçenek adı: Geldi'), 'Derste');
    await fireEvent.press(screen.getByRole('button', { name: 'Formu oluştur' }));

    await waitFor(() => expect(mocked.createForm).toHaveBeenCalled());
    const [classId, input] = mocked.createForm.mock.calls[0]!;
    expect(classId).toBe('class-1');
    expect(input.title).toBe('Yoklama');
    expect(input.subject).toBe('Matematik');
    expect(input.description).toBeNull();
    expect(input.options[0]).toEqual({ key: 'geldi', label: 'Derste', tone: 'positive' });
    expect(input.options.map((o) => o.key)).toEqual(['geldi', 'gelmedi', 'gec_geldi', 'izinli']);
    expect(mockBack).toHaveBeenCalled();
  });

  it('blocks saving an incomplete blank form and explains why', async () => {
    await renderScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Formu oluştur' }));
    expect(mocked.createForm).not.toHaveBeenCalled();
    expect(screen.getByText(/Form adı boş olamaz/)).toBeOnTheScreen();
    expect(screen.getAllByText(/Seçenek adı boş olamaz/)).toHaveLength(2);
  });

  it('builds a custom form: add, reorder, recolour, remove', async () => {
    await renderScreen();

    await fireEvent.changeText(screen.getByLabelText('Form adı'), 'Kitap okuma');
    const inputs = screen.getAllByLabelText('Seçenek adı: Adsız seçenek');
    await fireEvent.changeText(inputs[0]!, 'Okudu');
    await fireEvent.changeText(inputs[1]!, 'Okumadı');
    await fireEvent.press(screen.getByTestId('option-add'));
    await fireEvent.changeText(screen.getByLabelText('Seçenek adı: Adsız seçenek'), 'Yarım');
    await fireEvent.press(screen.getByTestId('option-row-2-tone'));
    await fireEvent.press(screen.getByRole('radio', { name: 'Yarım: Uyarı' }));
    // Sıralama ve kaldırma "Düzenle" ile açılır.
    expect(screen.queryByRole('button', { name: 'Yarım seçeneğini yukarı taşı' })).toBeNull();
    await fireEvent.press(screen.getByTestId('form-options-edit'));
    await fireEvent.press(screen.getByRole('button', { name: 'Yarım seçeneğini yukarı taşı' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Okudu seçeneğini kaldır' }));

    await fireEvent.press(screen.getByRole('button', { name: 'Formu oluştur' }));
    await waitFor(() => expect(mocked.createForm).toHaveBeenCalled());
    const [, input] = mocked.createForm.mock.calls[0]!;
    expect(input.options).toEqual([
      { key: 'yarim', label: 'Yarım', tone: 'warning' },
      { key: 'okumadi', label: 'Okumadı', tone: 'negative' },
    ]);
  });

  it('shows the save error inline', async () => {
    mockParams = { classId: 'class-1', preset: 'sozlu' };
    mocked.createForm.mockRejectedValueOnce(new Error('Network request failed'));
    await renderScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Formu oluştur' }));
    expect(await screen.findByText(/Sunucuya ulaşılamadı/)).toBeOnTheScreen();
    expect(mockBack).not.toHaveBeenCalled();
  });
});
