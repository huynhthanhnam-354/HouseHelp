import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import NotificationService from '../services/NotificationService';

const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const { user, isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated && user) {
      // Load notifications from localStorage first
      NotificationService.loadFromLocalStorage();
      
      // Fetch fresh notifications from server
      NotificationService.fetchNotifications(user.id);
      
      // Connect to WebSocket
      NotificationService.connect(user.id, user.role);
      setIsConnected(true);

      // Request notification permission
      NotificationService.requestPermission();

      // Listen for notification updates
      const unsubscribe = NotificationService.addListener(({ notifications, unreadCount, newNotification }) => {
        setNotifications(notifications);
        setUnreadCount(unreadCount);

        // Show toast for new notifications
        if (newNotification) {
          NotificationService.showToast(newNotification);
        }
      });

      // Initial state
      setNotifications(NotificationService.getNotifications());
      setUnreadCount(NotificationService.getUnreadCount());

      return () => {
        unsubscribe();
        NotificationService.disconnect();
        setIsConnected(false);
      };
    } else {
      // User logged out
      NotificationService.disconnect();
      setNotifications([]);
      setUnreadCount(0);
      setIsConnected(false);
    }
  }, [isAuthenticated, user]);

  const markAsRead = async (notificationId) => {
    await NotificationService.markAsRead(notificationId);
  };

  const markAllAsRead = async () => {
    const unreadNotifications = notifications.filter(n => !n.read);
    for (const notification of unreadNotifications) {
      await NotificationService.markAsRead(notification.id);
    }
  };

  const clearAll = () => {
    setNotifications([]);
    setUnreadCount(0);
    NotificationService.notifications = [];
    NotificationService.saveToLocalStorage();
  };

  const value = {
    notifications,
    unreadCount,
    isConnected,
    markAsRead,
    markAllAsRead,
    clearAll
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

export default NotificationContext;

