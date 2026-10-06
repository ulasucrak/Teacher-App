import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import * as api from '../api';
import { Providers, makeForm } from '../test-utils';
import EditFormScreen from './EditFormScreen';

const mockBack = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: mockBack, replace: jest.fn(), canGoBack: () => true }),
  useLocalSearchParams: () => ({ classId: 'class-1', formId: 'form-1' }),
}));

jest.mock('../api', () => ({ getForm: jest.fn(), updateForm: jest.fn(), formHasRecords: jest.fn() }));

jest.mock('react-native/Libraries/Modal/Modal', () => jest.requireActual('@/test/nativeModalMock'));

const mocked = jest.mocked(api);

beforeEach(() => {
  jest.clearAllMocks();
  mocked.updateForm.mockResolvedValue(makeForm());
  mocked.formHasRecords.mockResolvedValue(false);
});

async function renderScreen() {
  await render(
    <Providers>
      <EditFormScreen />
    </Providers>,
  );
}

describe('EditFormScreen', () => {
  it('keeps option keys on rename and warns before removing an option', async () => {
    mocked.getForm.mockResolvedValue(
      makeForm({
        options: [
          { key: 'geldi', label: 'Geldi', tone: 'positive' },
          { key: 'gelmedi', label: 'Gelmedi', tone: 'negative' },
          { key: 'izinli', label: 'İzinli', tone: 'neutral' },
        ],
      }),
    );
    await renderScreen();

    await fireEvent.changeText(await screen.findByLabelText('Seçenek adı: Geldi'), 'Var');
    await fireEvent.press(screen.getByTestId('form-options-edit'));
    await fireEvent.press(screen.getByRole('button', { name: 'İzinli seçeneğini kaldır' }));
    expect(screen.getByText(/"İzinli" kaldırıldı/)).toBeOnTheScreen();

    await fireEvent.press(screen.getByTestId('form-save'));
    expect(mocked.updateForm).not.toHaveBeenCalled();
    expect(await screen.findByText('Seçenek kaldırılsın mı?')).toBeOnTheScreen();

    await fireEvent.press(screen.getByTestId('form-remove-confirm-confirm'));

    await waitFor(() => expect(mocked.updateForm).toHaveBeenCalled());
    const [formId, input] = mocked.updateForm.mock.calls[0]!;
    expect(formId).toBe('form-1');
    expect(input.options).toEqual([
      { key: 'geldi', label: 'Var', tone: 'positive' },
      { key: 'gelmedi', label: 'Gelmedi', tone: 'negative' },
    ]);
    await waitFor(() => expect(mockBack).toHaveBeenCalled());
  });

  it('shows a retryable error when the form cannot be loaded', async () => {
    mocked.getForm.mockRejectedValueOnce({ code: 'PGRST116', message: 'no rows' });
    await renderScreen();

    expect(await screen.findByText(/Form bulunamadı/)).toBeOnTheScreen();
    mocked.getForm.mockResolvedValue(makeForm());
    await fireEvent.press(screen.getByRole('button', { name: 'Tekrar dene' }));
    expect(await screen.findByLabelText('Form adı')).toHaveDisplayValue('Yoklama');
  });

  it('treats a form from another class as not found', async () => {
    mocked.getForm.mockResolvedValue(makeForm({ class_id: 'class-other' }));
    await renderScreen();

    expect(await screen.findByText(/Form bulunamadı/)).toBeOnTheScreen();
    expect(screen.queryByLabelText('Form adı')).toBeNull();
  });

  it('lets you change the form type while the form has no records', async () => {
    mocked.getForm.mockResolvedValue(makeForm());
    await renderScreen();

    expect(await screen.findByTestId('form-mode-daily')).toBeSelected();
    await fireEvent.press(screen.getByTestId('form-mode-repeatable'));
    expect(screen.getByTestId('form-mode-description')).toHaveTextContent(/birden çok işaret/);

    await fireEvent.press(screen.getByTestId('form-save'));
    await waitFor(() => expect(mocked.updateForm).toHaveBeenCalled());
    expect(mocked.updateForm.mock.calls[0]![1].mode).toBe('repeatable');
  });

  it('locks the form type and says why once the form has records', async () => {
    mocked.getForm.mockResolvedValue(makeForm({ mode: 'repeatable' }));
    mocked.formHasRecords.mockResolvedValue(true);
    await renderScreen();

    expect(await screen.findByTestId('form-mode-repeatable')).toBeSelected();
    expect(screen.getByTestId('form-mode-daily')).toBeDisabled();
    expect(screen.getByTestId('form-mode-description')).toHaveTextContent(/kayıt olduğu için türü değiştirilemez/);

    await fireEvent.press(screen.getByTestId('form-mode-daily'));
    expect(screen.getByTestId('form-mode-repeatable')).toBeSelected();
  });

  it('shows saved scores and keeps them on save', async () => {
    mocked.getForm.mockResolvedValue(
      makeForm({
        mode: 'repeatable',
        options: [
          { key: 'arti', label: 'Artı', tone: 'positive', score: 1 },
          { key: 'eksi', label: 'Eksi', tone: 'negative', score: -1 },
        ],
      }),
    );
    await renderScreen();

    expect(await screen.findByLabelText('Artı puanı, isteğe bağlı')).toHaveDisplayValue('1');
    expect(screen.getByLabelText('Eksi puanı, isteğe bağlı')).toHaveDisplayValue('-1');
    await fireEvent.changeText(screen.getByLabelText('Eksi puanı, isteğe bağlı'), '-2');
    await fireEvent.press(screen.getByTestId('form-save'));

    await waitFor(() => expect(mocked.updateForm).toHaveBeenCalled());
    expect(mocked.updateForm.mock.calls[0]![1].options.map((o) => o.score)).toEqual([1, -2]);
  });
});
