import { createContext, useCallback, useContext, useState } from 'react';
import { Toast, ToastProps } from '../components/common/feedback/Toast';

interface ToastContextValue {
  showToast: (props: Omit<ToastProps, 'onClose'>) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

interface Toast extends Omit<ToastProps, 'onClose'> {
  id: number;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [counter, setCounter] = useState(0);

  const showToast = useCallback((props: Omit<ToastProps, 'onClose'>) => {
    setCounter((prev) => prev + 1);
    setToasts((prev) => [...prev, { ...props, id: counter }]);
  }, [counter]);

  const handleClose = useCallback((id: number) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          {...toast}
          onClose={() => handleClose(toast.id)}
        />
      ))}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
} 