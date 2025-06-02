import React, { createContext, useContext, useState, useCallback } from 'react';
import { AlertCircle, CheckCircle, AlertTriangle, Info, X } from 'lucide-react';

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title?: string;
  message: string;
  duration?: number; // in milliseconds, 0 means manual close only
  action?: {
    label: string;
    onClick: () => void;
  };
  dismissible?: boolean;
}

interface NotificationContextType {
  notifications: Notification[];
  showNotification: (notification: Omit<Notification, 'id'>) => string;
  removeNotification: (id: string) => void;
  clearAll: () => void;
  // Convenience methods
  showSuccess: (message: string, options?: Partial<Notification>) => string;
  showError: (message: string, options?: Partial<Notification>) => string;
  showWarning: (message: string, options?: Partial<Notification>) => string;
  showInfo: (message: string, options?: Partial<Notification>) => string;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotification = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};

interface NotificationProviderProps {
  children: React.ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const generateId = useCallback(() => {
    return `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  const showNotification = useCallback((notification: Omit<Notification, 'id'>): string => {
    const id = generateId();
    const newNotification: Notification = {
      id,
      duration: 5000, // Default 5 seconds
      dismissible: true,
      ...notification,
    };

    setNotifications(prev => [...prev, newNotification]);

    // Auto-remove after duration if specified
    if (newNotification.duration && newNotification.duration > 0) {
      setTimeout(() => {
        removeNotification(id);
      }, newNotification.duration);
    }

    return id;
  }, [generateId]);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  // Convenience methods
  const showSuccess = useCallback((message: string, options: Partial<Notification> = {}): string => {
    return showNotification({
      type: 'success',
      message,
      ...options,
    });
  }, [showNotification]);

  const showError = useCallback((message: string, options: Partial<Notification> = {}): string => {
    return showNotification({
      type: 'error',
      message,
      duration: 0, // Errors should be manually dismissed by default
      ...options,
    });
  }, [showNotification]);

  const showWarning = useCallback((message: string, options: Partial<Notification> = {}): string => {
    return showNotification({
      type: 'warning',
      message,
      duration: 8000, // Warnings stay longer
      ...options,
    });
  }, [showNotification]);

  const showInfo = useCallback((message: string, options: Partial<Notification> = {}): string => {
    return showNotification({
      type: 'info',
      message,
      ...options,
    });
  }, [showNotification]);

  const value: NotificationContextType = {
    notifications,
    showNotification,
    removeNotification,
    clearAll,
    showSuccess,
    showError,
    showWarning,
    showInfo,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <NotificationContainer />
    </NotificationContext.Provider>
  );
};

// Notification Container Component
const NotificationContainer: React.FC = () => {
  const { notifications, removeNotification } = useNotification();

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm w-full pointer-events-none">
      {notifications.map((notification) => (
        <NotificationItem
          key={notification.id}
          notification={notification}
          onRemove={removeNotification}
        />
      ))}
    </div>
  );
};

// Individual Notification Item Component
interface NotificationItemProps {
  notification: Notification;
  onRemove: (id: string) => void;
}

const NotificationItem: React.FC<NotificationItemProps> = ({ notification, onRemove }) => {
  const getIcon = () => {
    switch (notification.type) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-600" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-amber-600" />;
      case 'info':
        return <Info className="h-5 w-5 text-blue-600" />;
      default:
        return <Info className="h-5 w-5 text-gray-600" />;
    }
  };

  const getStyles = () => {
    switch (notification.type) {
      case 'success':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'error':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'warning':
        return 'bg-amber-50 border-amber-200 text-amber-800';
      case 'info':
        return 'bg-blue-50 border-blue-200 text-blue-800';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  return (
    <div
      className={`
        pointer-events-auto transform transition-all duration-300 ease-in-out
        animate-in slide-in-from-right-full
        border rounded-lg shadow-lg p-4 ${getStyles()}
      `}
    >
      <div className="flex items-start">
        <div className="flex-shrink-0 mr-3">
          {getIcon()}
        </div>
        <div className="flex-1 min-w-0">
          {notification.title && (
            <h4 className="text-sm font-semibold mb-1">
              {notification.title}
            </h4>
          )}
          <p className="text-sm">
            {notification.message}
          </p>
          {notification.action && (
            <div className="mt-3">
              <button
                onClick={notification.action.onClick}
                className="text-sm font-medium underline hover:no-underline transition-all"
              >
                {notification.action.label}
              </button>
            </div>
          )}
        </div>
        {notification.dismissible && (
          <div className="ml-4 flex-shrink-0">
            <button
              onClick={() => onRemove(notification.id)}
              className="inline-flex rounded-md p-1.5 transition-colors hover:bg-black/10 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-transparent focus:ring-black/20"
            >
              <span className="sr-only">Dismiss</span>
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}; 