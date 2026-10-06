import { fireEvent, render, screen } from '@testing-library/react-native';

import { fetchImportContext, insertStudents } from './api';
import { ImportStudentsScreen } from './ImportStudentsScreen';
import { pickPhoto } from './photos';
import { isExpoGo, recognizePhoto } from './recognize';

const mockBack = jest.fn();
const mockToastShow = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: mockBack, replace: jest.fn(), canGoBack: () => true }),
  useNavigation: () => ({ addListener: () => () => undefined, dispatch: jest.fn() }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('@/components/ui', () => ({
  ...jest.requireActual('@/components/ui'),
  useToast: () => ({ show: mockToastShow }),
}));

jest.mock('./api', () => ({
  ...jest.requireActual('./api'),
  fetchImportContext: jest.fn(),
  insertStudents: jest.fn(),
}));

jest.mock('./photos', () => ({
  ...jest.requireActual('./photos'),
  pickPhoto: jest.fn(),
}));

jest.mock('./recognize', () => ({
  recognizeMessages: jest.requireActual('./recognize').recognizeMessages,
  isExpoGo: jest.fn(() => false),
  recognizePhoto: jest.fn(),
}));

const fetchCtx = fetchImportContext as jest.Mock;
const insert = insertStudents as jest.Mock;
const pick = pickPhoto as jest.Mock;
const recognize = recognizePhoto as jest.Mock;
const expoGo = isExpoGo as jest.Mock;

const classRow = { id: 'c1', name: '9/A', grade: null, section: null, created_at: '', teacher_id: 't' };

beforeEach(() => {
  jest.clearAllMocks();
  expoGo.mockReturnValue(false);
  fetchCtx.mockResolvedValue({
    classRow,
    students: [{ id: 's1', class_id: 'c1', full_name: 'Burak Öztürk', number: '389', created_at: '', photo_url: null, teacher_id: 't' }],
  });
  pick.mockResolvedValue({ status: 'picked', uri: 'file:///list.jpg', width: 1500, height: 2000 });
  recognize.mockResolvedValue({
    ok: true,
    uri: 'file:///list.jpg',
    students: [
      { number: '112', fullName: 'Selin Bayezit', warnings: [] },
      { number: '389', fullName: 'Burak Öztürk', warnings: [] },
      { number: '401', fullName: 'Efe', warnings: ['short', 'singleWord'] },
    ],
  });
});

describe('ImportStudentsScreen', () => {
  it('reads a photo, skips students already in the class and adds the rest', async () => {
    insert.mockResolvedValue(2);
    await render(<ImportStudentsScreen classId="c1" />);

    await fireEvent.press(await screen.findByTestId('photo-camera'));
    expect(pick).toHaveBeenCalledWith('camera');

    expect(await screen.findByDisplayValue('Selin Bayezit')).toBeTruthy();
    expect(screen.queryByDisplayValue('Burak Öztürk')).toBeNull();
    expect(screen.getByText('1 satır zaten listede olduğu için atlandı.')).toBeTruthy();
    expect(screen.getByText('Ad çok kısa, kontrol edin')).toBeTruthy();
    expect(screen.getByText('9/A sınıfına 2 öğrenci eklenecek')).toBeTruthy();

    await fireEvent.press(screen.getByTestId('import-save'));
    expect(insert).toHaveBeenCalledWith('c1', [
      { fullName: 'Selin Bayezit', number: '112' },
      { fullName: 'Efe', number: '401' },
    ]);
    expect(mockToastShow).toHaveBeenCalledWith('2 öğrenci eklendi');
    expect(mockBack).toHaveBeenCalled();
  });

  it('edits and removes rows in the review list', async () => {
    await render(<ImportStudentsScreen classId="c1" />);
    await fireEvent.press(await screen.findByTestId('photo-library'));
    await screen.findByDisplayValue('Efe');

    await fireEvent.changeText(screen.getByTestId('student-row-1-name'), 'Efe Kaan Aksoy');
    expect(screen.queryByText('Ad çok kısa, kontrol edin')).toBeNull();

    await fireEvent.press(screen.getByTestId('student-row-0-remove'));
    expect(screen.getByText('9/A sınıfına 1 öğrenci eklenecek')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('student-row-0-remove'));
    expect(screen.getByTestId('import-save')).toBeDisabled();
  });

  it('adds a pasted list and saves it', async () => {
    insert.mockResolvedValue(2);
    await render(<ImportStudentsScreen classId="c1" initialMethod="paste" />);
    await fireEvent.changeText(await screen.findByTestId('collect-paste-input'), '115 ali veli\n240 Can Su');
    // Listeye eklemeden kaydetmek de yapıştırılanı ekler.
    await fireEvent.press(screen.getByTestId('import-save'));
    expect(insert).toHaveBeenCalledWith('c1', [
      { fullName: 'Ali Veli', number: '115' },
      { fullName: 'Can Su', number: '240' },
    ]);
  });

  it('adds students one by one', async () => {
    await render(<ImportStudentsScreen classId="c1" initialMethod="type" />);
    const input = await screen.findByTestId('collect-type-input');
    await fireEvent.changeText(input, '7 deniz akın');
    await fireEvent(input, 'submitEditing');
    expect(screen.getByDisplayValue('Deniz Akın')).toBeTruthy();
    expect(screen.getByDisplayValue('7')).toBeTruthy();
    expect(screen.getByTestId('collect-type-input').props.value).toBe('');
  });

  it('shows a settings hint when permission is denied', async () => {
    pick.mockResolvedValue({ status: 'denied', source: 'camera', canAskAgain: false });
    await render(<ImportStudentsScreen classId="c1" />);
    await fireEvent.press(await screen.findByTestId('photo-camera'));
    expect(await screen.findByText(/Kamera izni kapalı/)).toBeTruthy();
    expect(screen.getByTestId('collect-open-settings')).toBeTruthy();
  });

  it('disables photo buttons in Expo Go', async () => {
    expoGo.mockReturnValue(true);
    await render(<ImportStudentsScreen classId="c1" initialMethod="photo" />);
    expect(await screen.findByText(/Fotoğraftan okuma bu uygulama sürümünde yok/)).toBeTruthy();
    expect(screen.getByTestId('photo-camera')).toBeDisabled();
  });

  it('shows a load error with retry', async () => {
    fetchCtx.mockRejectedValueOnce(new Error('Sunucuya ulaşılamadı.'));
    await render(<ImportStudentsScreen classId="c1" />);
    expect(await screen.findByText('Sunucuya ulaşılamadı.')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('import-retry'));
    expect(await screen.findByTestId('photo-camera')).toBeTruthy();
  });

  it('keeps the list and shows the error when saving fails', async () => {
    insert.mockRejectedValueOnce(new Error('Öğrenciler eklenemedi.'));
    await render(<ImportStudentsScreen classId="c1" initialMethod="type" />);
    const input = await screen.findByTestId('collect-type-input');
    await fireEvent.changeText(input, 'Deniz Akın');
    await fireEvent.press(screen.getByTestId('import-save'));
    expect(await screen.findByText('Öğrenciler eklenemedi.')).toBeTruthy();
    expect(screen.getByDisplayValue('Deniz Akın')).toBeTruthy();
    expect(mockBack).not.toHaveBeenCalled();
  });
});
