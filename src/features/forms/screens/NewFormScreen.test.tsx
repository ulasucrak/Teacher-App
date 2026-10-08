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

  it('defaults to a once-a-day form and can switch to a cumulative one', async () => {
    await renderScreen();

    expect(screen.getByTestId('form-mode-daily')).toBeSelected();
    expect(screen.getByTestId('form-mode-description')).toHaveTextContent(/yerine geçer/);
    await fireEvent.press(screen.getByTestId('form-mode-repeatable'));
    expect(screen.getByTestId('form-mode-repeatable')).toBeSelected();
    expect(screen.getByTestId('form-mode-description')).toHaveTextContent(/birikir/);

    await fireEvent.changeText(screen.getByLabelText('Form adı'), 'Katılım puanı');
    const inputs = screen.getAllByLabelText('Seçenek adı: Adsız seçenek');
    await fireEvent.changeText(inputs[0]!, 'Artı');
    await fireEvent.changeText(inputs[1]!, 'Eksi');
    await fireEvent.press(screen.getByRole('button', { name: 'Formu oluştur' }));

    await waitFor(() => expect(mocked.createForm).toHaveBeenCalled());
    expect(mocked.createForm.mock.calls[0]![1].mode).toBe('repeatable');
  });

  it('starts the oral preset as a once-a-day form with plus / half plus / minus scores', async () => {
    mockParams = { classId: 'class-1', preset: 'sozlu' };
    await renderScreen();

    expect(screen.getByTestId('form-mode-daily')).toBeSelected();
    expect(screen.getByLabelText('Artı puanı, isteğe bağlı')).toHaveDisplayValue('1');
    expect(screen.getByLabelText('Yarım artı puanı, isteğe bağlı')).toHaveDisplayValue('0,5');
    expect(screen.getByLabelText('Eksi puanı, isteğe bağlı')).toHaveDisplayValue('-1');

    await fireEvent.press(screen.getByRole('button', { name: 'Formu oluştur' }));
    await waitFor(() => expect(mocked.createForm).toHaveBeenCalled());
    const [, input] = mocked.createForm.mock.calls[0]!;
    expect(input.mode).toBe('daily');
    expect(input.options).toEqual([
      { key: 'arti', label: 'Artı', tone: 'positive', score: 1 },
      { key: 'yarim_arti', label: 'Yarım artı', tone: 'positive', score: 0.5 },
      { key: 'eksi', label: 'Eksi', tone: 'negative', score: -1 },
    ]);
  });

  it('starts the plus / minus preset as cumulative with scores', async () => {
    mockParams = { classId: 'class-1', preset: 'artieksi' };
    await renderScreen();

    expect(screen.getByTestId('form-mode-repeatable')).toBeSelected();
    expect(screen.getByLabelText('Artı puanı, isteğe bağlı')).toHaveDisplayValue('1');
    expect(screen.getByLabelText('Eksi puanı, isteğe bağlı')).toHaveDisplayValue('-1');
    expect(screen.getByTestId('form-scores-hint')).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Formu oluştur' }));
    await waitFor(() => expect(mocked.createForm).toHaveBeenCalled());
    const input = mocked.createForm.mock.calls[0]![1];
    expect(input.mode).toBe('repeatable');
    expect(input.options).toEqual([
      { key: 'arti', label: 'Artı', tone: 'positive', score: 1 },
      { key: 'eksi', label: 'Eksi', tone: 'negative', score: -1 },
    ]);
  });

  it('adds an optional score on request, treats an empty score as unscored and flags a bad one', async () => {
    mockParams = { classId: 'class-1', preset: 'yoklama' };
    await renderScreen();

    expect(screen.queryByLabelText('Geldi puanı, isteğe bağlı')).toBeNull();
    await fireEvent.press(screen.getByTestId('form-scores-toggle'));
    const geldi = screen.getByLabelText('Geldi puanı, isteğe bağlı');
    expect(geldi).toHaveDisplayValue('');

    await fireEvent.changeText(geldi, '-');
    await fireEvent.press(screen.getByRole('button', { name: 'Formu oluştur' }));
    expect(mocked.createForm).not.toHaveBeenCalled();
    expect(screen.getByText(/Puan −1000 ile 1000 arasında/)).toBeOnTheScreen();

    await fireEvent.changeText(geldi, '2,5');
    await fireEvent.press(screen.getByRole('button', { name: 'Formu oluştur' }));
    await waitFor(() => expect(mocked.createForm).toHaveBeenCalled());
    const options = mocked.createForm.mock.calls[0]![1].options;
    expect(options[0]).toEqual({ key: 'geldi', label: 'Geldi', tone: 'positive', score: 2.5 });
    expect(options[1]).not.toHaveProperty('score');
  });
});
