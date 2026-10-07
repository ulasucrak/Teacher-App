import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import type { TextProps } from 'react-native';

import type { FitTextOptions, FitTextResult } from './fitText';

export type { FitTextOptions, FitTextResult } from './fitText';

/** Yazı boyutu bu adımla aşağı yuvarlanır (alt piksel taşmasını önler). */
const STEP = 0.25;

/**
 * Taşan tek satırlık metin için yeni yazı boyutu. Sığıyorsa `base` döner;
 * sığmıyorsa oranla küçültür, ama `base * minimumFontScale` altına inmez
 * (o noktada iOS'taki gibi "…" ile kesilir).
 */
export function computeFitFontSize(base: number, available: number, natural: number, minimumFontScale: number): number {
  if (available <= 0 || natural <= available) return base;
  const scale = Math.max(minimumFontScale, Math.min(1, available / natural));
  return Math.max(base * minimumFontScale, Math.floor((base * scale) / STEP) * STEP);
}

/**
 * Web: react-native-web `adjustsFontSizeToFit`'i desteklemez, uzun etiket "Gelm…" olur.
 * Metnin DOM düğümü varyantın taban boyutunda ölçülür (genişlik / kaydırma genişliği) ve taşıyorsa
 * yazı boyutu `minimumFontScale`'e kadar küçültülür. Kapsayıcı ya da metin boyutu
 * değişince (pencere, ✓ simgesi, font yüklenmesi) yeniden ölçülür.
 */
export function useFitText(text: string, { enabled = true, minimumFontScale }: FitTextOptions): FitTextResult {
  const ref = useRef<HTMLElement | null>(null);
  const [fitted, setFitted] = useState<number | undefined>(undefined);

  const measure = useCallback(() => {
    const node = ref.current;
    if (!node || !enabled) return;
    // Satır içi (küçültülmüş) boyut geçici olarak kaldırılır: varyantın taban boyutu ölçülür.
    const previous = node.style.fontSize;
    node.style.fontSize = '';
    const base = parseFloat(getComputedStyle(node).fontSize);
    const available = node.clientWidth;
    const natural = node.scrollWidth;
    node.style.fontSize = previous;
    if (!Number.isFinite(base) || base <= 0) return;
    const next = computeFitFontSize(base, available, natural, minimumFontScale);
    setFitted(next === base ? undefined : next);
  }, [enabled, minimumFontScale]);

  useLayoutEffect(() => {
    if (!enabled) return undefined;
    measure();
    const node = ref.current;
    if (!node) return undefined;

    let observer: ResizeObserver | undefined;
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(() => measure());
      observer.observe(node);
      if (node.parentElement) observer.observe(node.parentElement);
    }
    const fonts = typeof document !== 'undefined' ? document.fonts : undefined;
    fonts?.addEventListener?.('loadingdone', measure);
    fonts?.ready?.then(measure).catch(() => undefined);
    return () => {
      observer?.disconnect();
      fonts?.removeEventListener?.('loadingdone', measure);
    };
  }, [enabled, measure, text]);

  return {
    // RN Web'de Text ref'i DOM düğümüdür; Text'in prop tipinde ref olmadığı için genişletilir.
    textProps: { ref } as unknown as Partial<TextProps>,
    style: enabled && fitted !== undefined ? { fontSize: fitted } : undefined,
  };
}
