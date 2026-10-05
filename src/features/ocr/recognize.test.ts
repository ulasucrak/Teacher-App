import TextRecognition from '@react-native-ml-kit/text-recognition';
import Constants from 'expo-constants';
import { ImageManipulator } from 'expo-image-manipulator';
import { NativeModules, Platform } from 'react-native';

import { isVisionAvailable, recognizeText } from '../../../modules/vision-text-recognition';

import {
  isModuleUnavailableError,
  loadTextReader,
  loadTextRecognition,
  loadVision,
  preparePhoto,
  recognizeMessages, recognizePhoto } from './recognize';

jest.mock('@react-native-ml-kit/text-recognition', () => ({
  __esModule: true,
  default: { recognize: jest.fn() },
}));

jest.mock('../../../modules/vision-text-recognition', () => ({
  __esModule: true,
  recognizeText: jest.fn(),
  isVisionAvailable: jest.fn(() => true),
}));

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { executionEnvironment: 'bare' },
  ExecutionEnvironment: { Bare: 'bare', Standalone: 'standalone', StoreClient: 'storeClient' },
}));

const mockRenderAsync = jest.fn();
const mockContextRelease = jest.fn();
const mockImageRelease = jest.fn();
const mockResize = jest.fn();
jest.mock('expo-image-manipulator', () => ({
  ImageManipulator: { manipulate: jest.fn(() => {
    const context = { resize: mockResize, renderAsync: mockRenderAsync, release: mockContextRelease };
    mockResize.mockReturnValue(context);
    return context;
  }) },
  SaveFormat: { JPEG: 'jpeg' },
}));

const recognize = TextRecognition.recognize as jest.Mock;
const visionRecognize = recognizeText as jest.Mock;
const visionAvailable = isVisionAvailable as jest.Mock;
const manipulate = ImageManipulator.manipulate as jest.Mock;
const constants = Constants as { executionEnvironment: string };
const nativeModules = NativeModules as Record<string, unknown>;

let platformSpy: { restore: () => void } | undefined;

function setPlatform(os: 'ios' | 'android') {
  platformSpy?.restore();
  platformSpy = jest.replaceProperty(Platform, 'OS', os);
}

afterEach(() => {
  platformSpy?.restore();
  platformSpy = undefined;
});

beforeEach(() => {
  jest.clearAllMocks();
  setPlatform('android');
  constants.executionEnvironment = 'bare';
  nativeModules.TextRecognition = {};
  visionAvailable.mockReturnValue(true);
  mockRenderAsync.mockResolvedValue({
    saveAsync: jest.fn().mockResolvedValue({ uri: 'file:///small.jpg' }),
    release: mockImageRelease,
  });
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

  it('işlem bitince yerel görüntü bağlamını bırakır (regresyon)', async () => {
    await preparePhoto('file:///big.jpg', 4032);
    expect(mockImageRelease).toHaveBeenCalledTimes(1);
    expect(mockContextRelease).toHaveBeenCalledTimes(1);

    mockRenderAsync.mockRejectedValueOnce(new Error('decode'));
    await expect(preparePhoto('file:///big.jpg', 4032)).rejects.toThrow('decode');
    expect(mockContextRelease).toHaveBeenCalledTimes(2);
  });
});

const visionResult = {
  // 1000x2000 piksel; kutular normalize ve sol-alt orijinli (Vision). İlk satır sayfanın üstünde.
  width: 1000,
  height: 2000,
  observations: [
    { text: '2 | 245 | MEHMET KARA | Erkek', confidence: 1, x: 0, y: 0.9, width: 0.3, height: 0.01 },
    { text: '1 | 112 | SELİN BAYEZİT | Kız', confidence: 1, x: 0, y: 0.95, width: 0.3, height: 0.01 },
  ],
};

describe('recognizePhoto (iOS: Apple Vision)', () => {
  beforeEach(() => setPlatform('ios'));

  it("Vision'ı tr-TR ayarıyla çağırır, sonucu ML Kit biçimine çevirip öğrenci satırlarına ayırır", async () => {
    visionRecognize.mockResolvedValue(visionResult);
    const outcome = await recognizePhoto('file:///a.jpg', 1000);
    expect(visionRecognize).toHaveBeenCalledWith('file:///a.jpg', { languages: ['tr-TR'], usesLanguageCorrection: true });
    expect(recognize).not.toHaveBeenCalled();
    // Satırlar Vision sırasına değil görsel konuma göre dizilir (üstteki satır önce).
    expect(outcome).toEqual({
      ok: true,
      uri: 'file:///a.jpg',
      students: [
        { number: '112', fullName: 'Selin Bayezit', warnings: [] },
        { number: '245', fullName: 'Mehmet Kara', warnings: [] },
      ],
    });
  });

  it('Vision modülü yoksa anlaşılır mesaj döner', async () => {
    visionRecognize.mockRejectedValue(new Error("Cannot find native module 'VisionTextRecognition'"));
    await expect(recognizePhoto('file:///a.jpg', 1000)).resolves.toEqual({
      ok: false,
      reason: 'unavailable',
      message: recognizeMessages.unavailable,
    });
  });

  it('Vision yerel modülü bağlı değilse okumadan elle eklemeye yönlendirir', async () => {
    visionAvailable.mockReturnValue(false);
    await expect(recognizePhoto('file:///a.jpg', 5000)).resolves.toEqual({
      ok: false,
      reason: 'unavailable',
      message: recognizeMessages.unavailable,
    });
    expect(visionRecognize).not.toHaveBeenCalled();
    expect(manipulate).not.toHaveBeenCalled();
  });

  it("iOS'ta ML Kit bağlı olsa bile Vision kullanılır", async () => {
    visionRecognize.mockResolvedValue({ width: 10, height: 10, observations: [] });
    await recognizePhoto('file:///a.jpg', 1000);
    expect(visionRecognize).toHaveBeenCalledTimes(1);
    expect(recognize).not.toHaveBeenCalled();
  });

  it('okuma hatasında yeniden çekme önerir', async () => {
    visionRecognize.mockRejectedValue(new Error('Text recognition failed: boom'));
    await expect(recognizePhoto('file:///a.jpg', 1000)).resolves.toMatchObject({ ok: false, reason: 'failed' });
  });

  it("Expo Go'da Vision'ı hiç çağırmaz", async () => {
    constants.executionEnvironment = 'storeClient';
    await expect(recognizePhoto('file:///a.jpg', 1000)).resolves.toMatchObject({ ok: false, reason: 'unavailable' });
    expect(visionRecognize).not.toHaveBeenCalled();
  });
});

describe('recognizePhoto (Android: ML Kit)', () => {
  it('ML Kit sonucunu öğrenci satırlarına çevirir', async () => {
    recognize.mockResolvedValue(mlkitResult);
    const outcome = await recognizePhoto('file:///a.jpg', 1000);
    expect(recognize).toHaveBeenCalledWith('file:///a.jpg');
    expect(visionRecognize).not.toHaveBeenCalled();
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

  it('ML Kit yerel modülü bağlı değilse elle eklemeye yönlendirir', async () => {
    delete nativeModules.TextRecognition;
    await expect(recognizePhoto('file:///a.jpg', 1000)).resolves.toEqual({
      ok: false,
      reason: 'unavailable',
      message: recognizeMessages.unavailable,
    });
    expect(recognize).not.toHaveBeenCalled();
    expect(manipulate).not.toHaveBeenCalled();
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

describe('loadTextRecognition', () => {
  it('yerel modül bağlıysa ML Kit modülünü döner', () => {
    expect(loadTextRecognition()).toBe(TextRecognition);
  });

  it('yerel modül yoksa null döner', () => {
    delete nativeModules.TextRecognition;
    expect(loadTextRecognition()).toBeNull();
  });
});


describe('loadVision', () => {
  it('yerel modül bağlıysa Vision modülünü döner', () => {
    expect(loadVision()).toMatchObject({ recognizeText });
  });

  it('yerel modül yoksa null döner', () => {
    visionAvailable.mockReturnValue(false);
    expect(loadVision()).toBeNull();
  });
});

describe('loadTextReader', () => {
  it("iOS'ta Vision yoksa ML Kit'e düşmez, null döner", () => {
    setPlatform('ios');
    visionAvailable.mockReturnValue(false);
    expect(loadTextReader()).toBeNull();
  });

  it("Android'de ML Kit yoksa null döner", () => {
    delete nativeModules.TextRecognition;
    expect(loadTextReader()).toBeNull();
  });
});
