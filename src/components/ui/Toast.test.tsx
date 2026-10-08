import { act, render, screen } from '@testing-library/react-native';
import { useEffect } from 'react';
import { AccessibilityInfo } from 'react-native';

import { motion } from '@/theme';

import { ToastProvider, useToast } from './Toast';

jest.mock('react-native-safe-area-context', () => jest.requireActual('react-native-safe-area-context/jest/mock').default);

let toast: ReturnType<typeof useToast>;

function Capture() {
  const value = useToast();
  useEffect(() => { toast = value; }, [value]);
  return null;
}

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => {});
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

it('preserves default root rendering, announcement and automatic dismissal', async () => {
  await render(<ToastProvider><Capture /></ToastProvider>);
  await act(async () => { toast.show('Kaydedildi'); });
  expect(screen.getByText('Kaydedildi')).toBeOnTheScreen();
  expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledTimes(1);
  expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith('Kaydedildi');
  await act(async () => { jest.advanceTimersByTime(motion.toastVisibleMs + motion.duration.base); });
  expect(screen.queryByText('Kaydedildi')).toBeNull();
});

it('routes captured show calls exclusively and leaves announcements to the target', async () => {
  await render(<ToastProvider><Capture /></ToastProvider>);
  const capturedShow = toast.show;
  const target = jest.fn();
  let release!: () => void;
  await act(async () => { release = toast.routeTo(target); });
  await act(async () => { capturedShow('Hata', 'error'); capturedShow('Onay'); });
  expect(target.mock.calls).toEqual([['Hata', 'error'], ['Onay', 'success']]);
  expect(screen.queryByText('Hata')).toBeNull();
  expect(screen.queryByText('Onay')).toBeNull();
  expect(AccessibilityInfo.announceForAccessibility).not.toHaveBeenCalled();
  expect(toast.show).toBe(capturedShow);
  await act(async () => { release(); capturedShow('Normal', 'info'); });
  expect(screen.getByText('Normal')).toBeOnTheScreen();
  expect(target).toHaveBeenCalledTimes(2);
  expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledTimes(1);
});

it('clears an existing root toast without replaying it after the target exits', async () => {
  await render(<ToastProvider><Capture /></ToastProvider>);
  await act(async () => { toast.show('Eski'); });
  let release!: () => void;
  await act(async () => { release = toast.routeTo(jest.fn()); });
  expect(screen.queryByText('Eski')).toBeNull();
  await act(async () => { release(); jest.advanceTimersByTime(motion.toastVisibleMs * 2); });
  expect(screen.queryByText('Eski')).toBeNull();
});

it('restores the previous target when the latest registration is released', async () => {
  await render(<ToastProvider><Capture /></ToastProvider>);
  const first = jest.fn();
  const latest = jest.fn();
  let releaseFirst!: () => void;
  let releaseLatest!: () => void;
  await act(async () => {
    releaseFirst = toast.routeTo(first);
    releaseLatest = toast.routeTo(latest);
    toast.show('Üst katman');
    releaseLatest();
    toast.show('Alt katman');
    releaseLatest(); // Cleanup is idempotent.
    toast.show('Alt katman tekrar');
  });
  expect(latest.mock.calls).toEqual([['Üst katman', 'success']]);
  expect(first.mock.calls).toEqual([['Alt katman', 'success'], ['Alt katman tekrar', 'success']]);
  await act(async () => { releaseFirst(); toast.show('Kök'); });
  expect(screen.getByText('Kök')).toBeOnTheScreen();
});

it('supports out-of-order cleanup and independent registrations of the same target', async () => {
  await render(<ToastProvider><Capture /></ToastProvider>);
  const target = jest.fn();
  await act(async () => {
    const releaseFirst = toast.routeTo(target);
    const releaseLatest = toast.routeTo(target);
    releaseFirst();
    releaseFirst();
    toast.show('Hâlâ yönlendirilmiş');
    releaseLatest();
    toast.show('Kök');
  });
  expect(target.mock.calls).toEqual([['Hâlâ yönlendirilmiş', 'success']]);
  expect(screen.getByText('Kök')).toBeOnTheScreen();
});

it('keeps routing scoped to its own provider', async () => {
  let outer!: ReturnType<typeof useToast>;
  function OuterCapture() {
    const value = useToast();
    useEffect(() => { outer = value; }, [value]);
    return null;
  }
  await render(<ToastProvider><OuterCapture /><ToastProvider><Capture /></ToastProvider></ToastProvider>);
  const target = jest.fn();
  await act(async () => { toast.routeTo(target); outer.show('Dış'); toast.show('İç'); });
  expect(screen.getByText('Dış')).toBeOnTheScreen();
  expect(screen.queryByText('İç')).toBeNull();
  expect(target).toHaveBeenCalledWith('İç', 'success');
});
