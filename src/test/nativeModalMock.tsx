/**
 * React Native'in jest Modal taklidi `onDismiss`'i hiç çağırmaz; iOS'ta ise yerel Modal
 * kapanınca çağrılır. Sheet'in `onDismissed` akışını test etmek için kullanın:
 *
 *   jest.mock('react-native/Libraries/Modal/Modal', () => require('@/test/nativeModalMock'));
 */
import { useEffect, useRef, type ReactNode } from 'react';
import { View } from 'react-native';

interface MockModalProps {
  visible?: boolean;
  onDismiss?: () => void;
  children?: ReactNode;
}

function NativeModalMock({ visible = true, onDismiss, children }: MockModalProps) {
  const wasVisible = useRef(visible);
  useEffect(() => {
    if (wasVisible.current && !visible) onDismiss?.();
    wasVisible.current = visible;
  }, [visible, onDismiss]);
  return visible ? <View>{children}</View> : null;
}

export default NativeModalMock;
