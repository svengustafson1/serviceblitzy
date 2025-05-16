'use client';

import React, { useState, useEffect } from 'react';
import { X, Bell, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

export type NotificationType = 'success' | 'error' | 'info' | 'warning';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  read?: boolean;
  createdAt: Date;
  link?: string;
}

interface NotificationItemProps {
  notification: Notification;
  onClose: (id: string) => void;
  onClick?: (notification: Notification) => void;
  autoClose?: boolean;
  duration?: number;
}

export const NotificationItem: React.FC<NotificationItemProps> = ({
  notification,
  onClose,
  onClick,
  autoClose = false,
  duration = 5000,
}) => {
  useEffect(() => {
    let timer: NodeJS.Timeout;
    
    if (autoClose) {
      timer = setTimeout(() => {
        onClose(notification.id);
      }, duration);
    }
    
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [autoClose, duration, notification.id, onClose]);

  const iconMap = {
    success: <CheckCircle className="h-5 w-5 text-green-500" />,
    error: <AlertCircle className="h-5 w-5 text-red-500" />,
    info: <Info className="h-5 w-5 text-blue-500" />,
    warning: <AlertTriangle className="h-5 w-5 text-yellow-500" />,
  };

  const bgColorMap = {
    success: 'bg-green-50',
    error: 'bg-red-50',
    info: 'bg-blue-50',
    warning: 'bg-yellow-50',
  };

  const handleClick = () => {
    if (onClick) onClick(notification);
  };

  return (
    <div 
      className={`rounded-lg shadow-sm p-4 mb-3 ${bgColorMap[notification.type]} ${!notification.read ? 'border-l-4 border-l-blue-500' : ''}`}
      onClick={handleClick}
    >
      <div className="flex items-start">
        <div className="flex-shrink-0 pt-0.5">
          {iconMap[notification.type]}
        </div>
        <div className="ml-3 flex-1">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-900">{notification.title}</p>
            <div className="flex items-center">
              <div className="text-xs text-gray-500 ml-auto mr-4">
                {notification.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onClose(notification.id);
                }}
                className="inline-flex text-gray-400 hover:bg-gray-200 hover:text-gray-500 rounded-full p-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <span className="sr-only">Close</span>
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
          <p className="mt-1 text-sm text-gray-500">{notification.message}</p>
        </div>
      </div>
    </div>
  );
};

interface NotificationListProps {
  notifications: Notification[];
  onNotificationClose: (id: string) => void;
  onNotificationClick?: (notification: Notification) => void;
  className?: string;
  emptyMessage?: string;
}

export const NotificationList: React.FC<NotificationListProps> = ({
  notifications,
  onNotificationClose,
  onNotificationClick,
  className = '',
  emptyMessage = 'No notifications',
}) => {
  return (
    <div className={`space-y-1 ${className}`}>
      {notifications.length === 0 ? (
        <div className="text-center py-6 text-gray-500">
          <Bell className="mx-auto h-8 w-8 text-gray-400" />
          <p className="mt-2">{emptyMessage}</p>
        </div>
      ) : (
        notifications.map((notification) => (
          <NotificationItem
            key={notification.id}
            notification={notification}
            onClose={onNotificationClose}
            onClick={onNotificationClick}
          />
        ))
      )}
    </div>
  );
};

interface NotificationToastProps {
  notification: Notification;
  onClose: (id: string) => void;
}

export const NotificationToast: React.FC<NotificationToastProps> = ({ notification, onClose }) => {
  return (
    <div className="fixed top-5 right-5 w-80 z-50">
      <NotificationItem
        notification={notification}
        onClose={onClose}
        autoClose={true}
      />
    </div>
  );
};

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: Notification[];
  onClearAll: () => void;
  onNotificationClose: (id: string) => void;
  onNotificationClick?: (notification: Notification) => void;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  isOpen,
  onClose,
  notifications,
  onClearAll,
  onNotificationClose,
  onNotificationClick,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-25 flex justify-end z-40">
      <div className="bg-white w-full max-w-sm h-full shadow-lg flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-medium">Notifications</h3>
          <div className="flex space-x-2">
            {notifications.length > 0 && (
              <button
                onClick={onClearAll}
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                Clear All
              </button>
            )}
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 focus:outline-none"
              aria-label="Close notifications panel"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <NotificationList
            notifications={notifications}
            onNotificationClose={onNotificationClose}
            onNotificationClick={onNotificationClick}
            emptyMessage="You don't have any notifications yet"
          />
        </div>
      </div>
    </div>
  );
}; 