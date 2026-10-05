import { fireEvent, render, screen } from '@testing-library/react-native';

import { fetchImportContext, insertStudents } from './api';
import { ImportStudentsScreen } from './ImportStudentsScreen';
import { pickPhoto } from './photos';
import { isExpoGo, recognizePhoto } from './recognize';

const mockDismissTo = jest.fn();
const mockToastShow = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ dismissTo: mockDismissTo, back: jest.fn(), canGoBack: () => true }),
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
  it('fotoğrafı okur, uyarıları gösterir ve seçilenleri ekler', async () => {
    insert.mockResolvedValue(2);
    await render(<ImportStudentsScreen classId="c1" />);

    await fireEvent.press(await screen.findByRole('button', { name: 'Fotoğraf çek' }));
    expect(pick).toHaveBeenCalledWith('camera');

    expect(await screen.findByText('9/A sınıfına eklenecekler')).toBeTruthy();
    expect(screen.getByText('Bu sınıfta zaten var')).toBeTruthy();
    expect(screen.getByText('Soyadı eksik olabilir')).toBeTruthy();
    // Sınıfta olan öğrenci işaretsiz gelir.
    expect(screen.getByRole('checkbox', { name: 'Burak Öztürk eklensin' })).not.toBeChecked();

    await fireEvent.press(screen.getByRole('button', { name: '2 öğrenciyi ekle' }));
    expect(insert).toHaveBeenCalledWith('c1', [
      { fullName: 'Selin Bayezit', number: '112' },
      { fullName: 'Efe', number: '401' },
    ]);
    // Onay bildirimi sınıf ekranının işi (imported parametresi); burada çift gösterilmez.
    expect(mockToastShow).not.toHaveBeenCalledWith('2 öğrenci eklendi');
    expect(mockDismissTo).toHaveBeenCalledWith({
      pathname: '/class/[classId]',
      params: { classId: 'c1', imported: '2' },
    });
  });

  it('satır düzenleme, hariç tutma ve silme sayacı günceller', async () => {
    await render(<ImportStudentsScreen classId="c1" />);
    await fireEvent.press(await screen.findByRole('button', { name: 'Galeriden seç' }));
    await screen.findByText('9/A sınıfına eklenecekler');

    await fireEvent.changeText(screen.getByDisplayValue('Efe'), 'Efe Kaan Aksoy');
    expect(screen.queryByText('Soyadı eksik olabilir')).toBeNull();

    await fireEvent.press(screen.getByRole('checkbox', { name: 'Selin Bayezit eklensin' }));
    expect(screen.getByRole('button', { name: '1 öğrenciyi ekle' })).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: 'Efe Kaan Aksoy satırını sil' }));
    expect(screen.getByRole('button', { name: 'Eklenecek öğrenci seçin' })).toBeDisabled();
  });

  it('izin reddedilince Ayarlar ipucu gösterir', async () => {
    pick.mockResolvedValue({ status: 'denied', source: 'camera', canAskAgain: false });
    await render(<ImportStudentsScreen classId="c1" />);
    await fireEvent.press(await screen.findByRole('button', { name: 'Fotoğraf çek' }));
    expect(await screen.findByText(/Kamera izni kapalı/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Ayarları aç' })).toBeTruthy();
  });

  it('ML Kit yoksa açık bir mesaj gösterir', async () => {
    recognize.mockResolvedValue({ ok: false, reason: 'unavailable', message: 'Fotoğraftan okuma bu uygulama sürümünde yok.' });
    await render(<ImportStudentsScreen classId="c1" />);
    await fireEvent.press(await screen.findByRole('button', { name: 'Fotoğraf çek' }));
    expect(await screen.findByText('Fotoğraftan okuma bu uygulama sürümünde yok.')).toBeTruthy();
  });

  it("Expo Go'da fotoğraf düğmelerini kapatır, elle eklemeye izin verir", async () => {
    expoGo.mockReturnValue(true);
    await render(<ImportStudentsScreen classId="c1" />);
    expect(await screen.findByText('Fotoğraftan okuma kapalı')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Fotoğraf çek' })).toBeDisabled();

    await fireEvent.press(screen.getByRole('button', { name: 'Öğrencileri elle yazın' }));
    await fireEvent.changeText(screen.getByLabelText('Ad soyad'), 'Deniz Akın');
    expect(screen.getByRole('button', { name: '1 öğrenciyi ekle' })).toBeEnabled();
  });

  it('sınıf yüklenemezse hatayı ve yeniden deneme düğmesini gösterir', async () => {
    fetchCtx.mockRejectedValueOnce(new Error('Sunucuya ulaşılamadı.'));
    await render(<ImportStudentsScreen classId="c1" />);
    expect(await screen.findByText('Sunucuya ulaşılamadı.')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Tekrar dene' }));
    expect(await screen.findByText('9/A sınıf listesini okuyun')).toBeTruthy();
  });
});
