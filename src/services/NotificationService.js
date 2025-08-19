import io from 'socket.io-client';

class NotificationService {
  constructor() {
    this.socket = null;
    this.notifications = [];
    this.listeners = [];
  }

  // Kết nối WebSocket
  connect(userId, role) {
    try {
      this.socket = io('http://localhost:5000', {
        timeout: 5000,
        retries: 3,
        transports: ['websocket', 'polling']
      });
      
      this.socket.on('connect', () => {
        console.log('Connected to notification service');
        this.socket.emit('join', { userId, role });
      });

      this.socket.on('notification', (notification) => {
        console.log('🔔 Received notification:', notification);
        this.addNotification(notification);
        this.notifyListeners(notification);
        
        // Show toast immediately
        this.showToast(notification);
      });

      this.socket.on('disconnect', (reason) => {
        console.log('Disconnected from notification service:', reason);
      });

      this.socket.on('connect_error', (error) => {
        console.warn('WebSocket connection failed (this is normal if backend is not running):', error.message);
        // Don't spam console with connection errors
      });

      this.socket.on('reconnect_failed', () => {
        console.warn('Failed to reconnect to notification service');
      });

    } catch (error) {
      console.error('Error connecting to notification service:', error);
    }
  }

  // Ngắt kết nối
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  // Thêm notification vào danh sách
  addNotification(notification) {
    this.notifications.unshift(notification);
    
    // Giới hạn số lượng notifications trong memory
    if (this.notifications.length > 100) {
      this.notifications = this.notifications.slice(0, 100);
    }

    // Lưu vào localStorage để persist
    this.saveToLocalStorage();
  }

  // Lấy danh sách notifications
  getNotifications() {
    return this.notifications;
  }

  // Lấy số lượng notifications chưa đọc
  getUnreadCount() {
    return this.notifications.filter(n => !n.read).length;
  }

  // Đánh dấu notification đã đọc
  async markAsRead(notificationId) {
    try {
      const response = await fetch(`http://localhost:5000/api/notifications/${notificationId}/read`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (response.ok) {
        // Update local state
        const notification = this.notifications.find(n => n.id === notificationId);
        if (notification) {
          notification.read = true;
          this.saveToLocalStorage();
          this.notifyListeners();
        }
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }

  // Đăng ký listener để nhận notifications
  addListener(callback) {
    this.listeners.push(callback);
    
    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter(listener => listener !== callback);
    };
  }

  // Thông báo cho tất cả listeners
  notifyListeners(newNotification = null) {
    this.listeners.forEach(callback => {
      callback({
        notifications: this.notifications,
        unreadCount: this.getUnreadCount(),
        newNotification
      });
    });
  }

  // Lưu notifications vào localStorage
  saveToLocalStorage() {
    try {
      localStorage.setItem('househelp_notifications', JSON.stringify(this.notifications));
    } catch (error) {
      console.error('Error saving notifications to localStorage:', error);
    }
  }

  // Load notifications từ localStorage
  loadFromLocalStorage() {
    try {
      const saved = localStorage.getItem('househelp_notifications');
      if (saved) {
        this.notifications = JSON.parse(saved);
      }
    } catch (error) {
      console.error('Error loading notifications from localStorage:', error);
      this.notifications = [];
    }
  }

  // Fetch notifications từ server
  async fetchNotifications(userId) {
    console.log('🔍 Fetching notifications for user ID:', userId);
    try {
      const url = `http://localhost:5000/api/notifications/${userId}`;
      console.log('🌐 Calling API:', url);
      
      const response = await fetch(url);
      console.log('📡 API Response status:', response.status);
      
      if (response.ok) {
        const notifications = await response.json();
        console.log('✅ Received notifications:', notifications.length, 'items');
        console.log('📋 Notifications data:', notifications);
        
        this.notifications = notifications;
        this.saveToLocalStorage();
        this.notifyListeners();
        
        console.log('🔄 Updated local notifications, count:', this.notifications.length);
      } else {
        console.error('❌ API Error:', response.status, response.statusText);
        const errorText = await response.text();
        console.error('❌ Error details:', errorText);
      }
    } catch (error) {
      console.error('🚨 Network error fetching notifications:', error);
    }
  }

  // Hiển thị toast notification
  showToast(notification) {
    // Show custom toast notification
    if (window.showToast) {
      let message = `${notification.title}: ${notification.message}`;
      
      // Customize message based on type
      if (notification.type === 'booking_confirmed') {
        message = `🎉 ${notification.message}`;
      } else if (notification.type === 'booking_rejected') {
        message = `😔 ${notification.message}`;
      } else if (notification.type === 'new_booking') {
        message = `📅 ${notification.message}`;
      }
      
      window.showToast(message, notification.type, 5000);
    }
    
    // Also show browser notification if permission granted
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(notification.title, {
        body: notification.message,
        icon: '/favicon.ico'
      });
    }
  }

  // Request notification permission
  async requestPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    return Notification.permission === 'granted';
  }
}

// Export singleton instance
export default new NotificationService();
