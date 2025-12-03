import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';

export type ToastType = 'success' | 'error' | 'info';

type ToastCtx = {
  show: (msg: string, type?: ToastType) => void;
};

const Ctx = React.createContext<ToastCtx | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [visible, setVisible] = React.useState(false);
  const [msg, setMsg] = React.useState('');
  const [type, setType] = React.useState<ToastType>('info');

  const show = React.useCallback((m: string, t: ToastType = 'info') => {
    setMsg(m);
    setType(t);
    setVisible(true);
    setTimeout(() => setVisible(false), 2200);
  }, []);

  return (
    <Ctx.Provider value={{ show }}>
      <View style={{ flex: 1 }}>
        {children}
        {visible && (
          <View style={[styles.toast, type === 'success' ? styles.success : type === 'error' ? styles.error : styles.info]}>
            <Text style={styles.text}>{msg}</Text>
          </View>
        )}
      </View>
    </Ctx.Provider>
  );
}

export function useToast() {
  const ctx = React.useContext(Ctx);
  if (!ctx) throw new Error('ToastContext not found');
  return ctx;
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    right: 16,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignItems: 'center',
  },
  text: { color: '#fff', fontWeight: '700' },
  success: { backgroundColor: '#16A34A' },
  error: { backgroundColor: '#D90429' },
  info: { backgroundColor: '#111' },
});
