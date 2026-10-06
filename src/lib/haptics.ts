import * as Haptics from 'expo-haptics';

/** Seçim titreşimi. Desteklenmeyen cihazlarda sessizce yok sayılır; asla hata fırlatmaz. */
export function selectionHaptic(): void {
  try {
    Haptics.selectionAsync().catch(() => undefined);
  } catch {
    // Modül yoksa (ör. bazı ortamlarda) dokunsal geri bildirim atlanır.
  }
}
