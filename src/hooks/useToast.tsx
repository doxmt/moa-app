import { createContext, useCallback, useContext, useRef, useState } from 'react';
import { Animated, Modal, StyleSheet, Text, View } from 'react-native';

type ToastContextType = {
  showToast: (message: string) => void;
};

const ToastContext = createContext<ToastContextType>({ showToast: () => {} });

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [message, setMessage] = useState('');
  const [visible, setVisible] = useState(false);
  const opacity = useRef(new Animated.Value(0)).current;
  const animRef = useRef<Animated.CompositeAnimation | null>(null);

  const showToast = useCallback((msg: string) => {
    if (animRef.current) animRef.current.stop();
    setMessage(msg);
    setVisible(true);
    opacity.setValue(0);
    animRef.current = Animated.sequence([
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.delay(2500),
      Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]);
    animRef.current.start(() => setVisible(false));
  }, [opacity]);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <Modal visible={visible} transparent animationType="none" statusBarTranslucent presentationStyle="overFullScreen">
        <Animated.View style={[styles.toast, { opacity }]} pointerEvents="none">
          <View style={styles.pill}>
            <Text style={styles.text}>{message}</Text>
          </View>
        </Animated.View>
      </Modal>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    bottom: 80,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 9999,
  },
  pill: {
    backgroundColor: 'rgba(0,0,0,0.75)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    maxWidth: '80%',
  },
  text: { color: 'white', fontSize: 14, textAlign: 'center' },
});
