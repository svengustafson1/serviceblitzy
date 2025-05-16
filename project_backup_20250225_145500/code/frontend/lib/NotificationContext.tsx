'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Notification, NotificationType, NotificationToast } from '../components/ui/Notification';

interface NotificationContextType {
  notifications: Notification[];
  addNotification: (title: string, message: string, type: NotificationType, link?: string) => void;
  removeNotification: (id: string) => void;
  markAsRead: (id: string) => void;
  clearAllNotifications: () => void;
  unreadCount: number;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

interface NotificationProviderProps {
  children: React.ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [toastNotification, setToastNotification] = useState<Notification | null>(null);

  const addNotification = useCallback((title: string, message: string, type: NotificationType, link?: string) => {
    const newNotification = {
      id: uuidv4(),
      title,
      message,
      type,
      read: false,
      createdAt: new Date(),
      link,
    };

    setNotifications(prev => [newNotification, ...prev]);
    
    // Show toast for non-error notifications
    if (type !== 'error') {
      setToastNotification(newNotification);
    }
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
    
    if (toastNotification && toastNotification.id === id) {
      setToastNotification(null);
    }
  }, [toastNotification]);

  const markAsRead = useCallback((id: string) => {
    setNotifications(prev =>
      prev.map(notification =>
        notification.id === id ? { ...notification, read: true } : notification
      )
    );
  }, []);

  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
    setToastNotification(null);
  }, []);

  const unreadCount = notifications.filter(notification => !notification.read).length;

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        addNotification,
        removeNotification,
        markAsRead,
        clearAllNotifications,
        unreadCount,
      }}
    >
      {children}
      {toastNotification && (
        <NotificationToast
          notification={toastNotification}
          onClose={removeNotification}
        />
      )}
    </NotificationContext.Provider>
  );
}; 