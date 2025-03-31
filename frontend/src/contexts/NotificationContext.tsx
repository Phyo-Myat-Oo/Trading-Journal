import React, { createContext, useContext, useCallback } from 'react';
import { notifications } from '@mantine/notifications';
import { RiCheckLine, RiAlertLine } from 'react-icons/ri';

type NotificationType = 'success' | 'error' | 'warning' | 'info';

interface NotificationContextValue {
  showNotification: (message: string, type: NotificationType) => void;
}

const NotificationContext = createContext<NotificationContextValue | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const showNotification = useCallback((message: string, type: NotificationType) => {
    notifications.show({
      message,
      color: type === 'success' ? 'green' : 
             type === 'error' ? 'red' : 
             type === 'warning' ? 'yellow' : 'blue',
      icon: type === 'success' ? <RiCheckLine /> : <RiAlertLine />,
      withBorder: true,
      autoClose: 3000
    });
  }, []);

  return (
    <NotificationContext.Provider value={{ showNotification }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
} 