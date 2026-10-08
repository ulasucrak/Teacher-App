import { useCallback, useEffect, useState } from 'react';

import { useToast } from '@/components/ui';
import type { ToastKind } from '@/components/ui/Toast';
import { motion } from '@/theme';

interface Notification {
  message: string;
  kind: ToastKind;
}

export function useClassroomNotifications(onError?: () => void) {
  const { routeTo } = useToast();
  const [notification, setNotification] = useState<Notification | null>(null);
  const show = useCallback((message: string, kind: ToastKind = 'success') => {
    if (kind === 'error') onError?.();
    setNotification({ message, kind });
  }, [onError]);
  const dismiss = useCallback(() => setNotification(null), []);

  useEffect(() => routeTo(show), [routeTo, show]);
  useEffect(() => {
    // Errors need time to read from a distance and remain until dismissed/replaced.
    if (!notification || notification.kind === 'error') return;
    const timer = setTimeout(dismiss, motion.toastVisibleMs);
    return () => clearTimeout(timer);
  }, [notification, dismiss]);

  return { notification, show, dismiss };
}
