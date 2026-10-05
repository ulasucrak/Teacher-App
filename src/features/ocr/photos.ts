/** Kamera / galeri seçimi ve izinler. */
import * as ImagePicker from 'expo-image-picker';

export type PhotoSource = 'camera' | 'library';

export type PickOutcome =
  | { status: 'picked'; uri: string; width: number; height: number }
  | { status: 'cancelled' }
  | { status: 'denied'; source: PhotoSource; canAskAgain: boolean }
  | { status: 'error'; message: string };

export const permissionMessages: Record<PhotoSource, string> = {
  camera:
    'Kamera izni kapalı. Listenin fotoğrafını çekmek için Ayarlar’da Sınıf Defteri için kamerayı açın ya da galeriden seçin.',
  library:
    'Fotoğraflara erişim izni kapalı. Ayarlar’da Sınıf Defteri için fotoğraf erişimini açın ya da fotoğrafı kamerayla çekin.',
};

const pickerOptions: ImagePicker.ImagePickerOptions = {
  mediaTypes: ['images'],
  quality: 1,
  allowsEditing: false,
  exif: false,
};

export async function pickPhoto(source: PhotoSource): Promise<PickOutcome> {
  try {
    const permission =
      source === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      return { status: 'denied', source, canAskAgain: permission.canAskAgain };
    }

    const result =
      source === 'camera'
        ? await ImagePicker.launchCameraAsync(pickerOptions)
        : await ImagePicker.launchImageLibraryAsync(pickerOptions);
    const asset = result.canceled ? undefined : result.assets[0];
    if (!asset) return { status: 'cancelled' };
    return { status: 'picked', uri: asset.uri, width: asset.width, height: asset.height };
  } catch {
    return {
      status: 'error',
      message:
        source === 'camera'
          ? 'Kamera açılamadı. Uygulamayı kapatıp açın ya da fotoğrafı galeriden seçin.'
          : 'Galeri açılamadı. Uygulamayı kapatıp açın ya da fotoğrafı kamerayla çekin.',
    };
  }
}
