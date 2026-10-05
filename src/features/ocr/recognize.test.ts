import TextRecognition from '@react-native-ml-kit/text-recognition';
import Constants from 'expo-constants';
import { ImageManipulator } from 'expo-image-manipulator';

import { isModuleUnavailableError, preparePhoto, recognizeMessages, recognizePhoto } from './recognize';

jest.mock('@react-native-ml-kit/text-recognition', () => ({
  __esModule: true,
  default: { recognize: jest.fn() },
}));

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { executionEnvironment: 'bare' },
  ExecutionEnvironment: { Bare: 'bare', Standalone: 'standalone', StoreClient: 'storeClient' },
}));

const mockRenderAsync = jest.fn();
const mockResize = jest.fn(() => ({ renderAsync: mockRenderAsync }));
jest.mock('expo-image-manipulator', () => ({
  ImageManipulator: { manipulate: jest.fn(() => ({ resize: mockResize })) },
  SaveFormat: { JPEG: 'jpeg' },
}));

const recognize = TextRecognition.recognize as jest.Mock;
const manipulate = ImageManipulator.manipulate as jest.Mock;
const constants = Constants as { executionEnvironment: string };

beforeEach(() => {
  jest.clearAllMocks();
  constants.executionEnvironment = 'bare';
  mockRenderAsync.mockResolvedValue({ saveAsync: jest.fn().mockResolvedValue({ uri: 'file:///small.jpg' }) });
});

const mlkitResult = {
  text: '',
  blocks: [
    {
      text: '',
      recognizedLanguages: [],
      lines: [
        { text: '1 | 112 | SELİN BAYEZİT | Kız', elements: [], recognizedLanguages: [], frame: { left: 0, top: 10, width: 300, height: 20 } },
        { text: '2 | 245 | MEHMET KARA | Erkek', elements: [], recognizedLanguages: [], frame: { left: 0, top: 50, width: 300, height: 20 } },
      ],
    },
  ],
};

describe('preparePhoto', () => {
  it('küçük fotoğrafı olduğu gibi bırakır', async () => {
    await expect(preparePhoto('file:///a.jpg', 1200)).resolves.toBe('file:///a.jpg');
    expect(manipulate).not.toHaveBeenCalled();
  });

  it('büyük fotoğrafı 2000 piksel genişliğe küçültür', async () => {
    await expect(preparePhoto('file:///big.jpg', 4032)).resolves.toBe('file:///small.jpg');
    expect(manipulate).toHaveBeenCalledWith('file:///big.jpg');
    expect(mockResize).toHaveBeenCalledWith({ width: 2000 });
  });
});

describe('recognizePhoto', () => {
  it('ML Kit sonucunu öğrenci satırlarına çevirir', async () => {
    recognize.mockResolvedValue(mlkitResult);
    const outcome = await recognizePhoto('file:///a.jpg', 1000);
    expect(recognize).toHaveBeenCalledWith('file:///a.jpg');
    expect(outcome).toEqual({
      ok: true,
      uri: 'file:///a.jpg',
      students: [
        { number: '112', fullName: 'Selin Bayezit', warnings: [] },
        { number: '245', fullName: 'Mehmet Kara', warnings: [] },
      ],
    });
  });

  it('yerel modül bağlı değilse anlaşılır mesaj döner', async () => {
    recognize.mockImplementation(() => {
      throw new Error("The package '@react-native-ml-kit/text-recognition' doesn't seem to be linked.");
    });
    await expect(recognizePhoto('file:///a.jpg', 1000)).resolves.toEqual({
      ok: false,
      reason: 'unavailable',
      message: recognizeMessages.unavailable,
    });
  });

  it("Expo Go'da ML Kit'i hiç çağırmaz", async () => {
    constants.executionEnvironment = 'storeClient';
    const outcome = await recognizePhoto('file:///a.jpg', 1000);
    expect(outcome).toMatchObject({ ok: false, reason: 'unavailable' });
    expect(recognize).not.toHaveBeenCalled();
  });

  it('okuma hatasında yeniden çekme önerir', async () => {
    recognize.mockRejectedValue(new Error('Image decode failed'));
    await expect(recognizePhoto('file:///a.jpg', 1000)).resolves.toMatchObject({ ok: false, reason: 'failed' });
  });

  it('fotoğraf küçültülemezse farklı fotoğraf ister', async () => {
    mockRenderAsync.mockRejectedValue(new Error('decode'));
    await expect(recognizePhoto('file:///a.jpg', 5000)).resolves.toMatchObject({ ok: false, reason: 'prepareFailed' });
  });
});

describe('isModuleUnavailableError', () => {
  it('bağlantı hatalarını tanır', () => {
    expect(isModuleUnavailableError(new Error("doesn't seem to be linked"))).toBe(true);
    expect(isModuleUnavailableError(new Error('Image decode failed'))).toBe(false);
  });
});
