import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useNotifications } from '../contexts/NotificationContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useNavigate } from 'react-router-dom';
import translations from '../locales/translations';
import './CustomerDashboard.css';

export default function CustomerDashboard() {
  const { user } = useAuth();
  const { notifications, markAsRead } = useNotifications();
  const { language } = useLanguage();
  const navigate = useNavigate();
  const t = translations[language];
  
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('bookings'); // 'bookings' | 'notifications'

  // Fetch customer's bookings
  useEffect(() => {
    const fetchBookings = async () => {
      if (!user?.id) return;
      
      try {
        const response = await fetch(`http://localhost:5000/api/bookings/user/${user.id}`);
        if (response.ok) {
          const data = await response.json();
          setBookings(data);
        }
      } catch (error) {
        console.error('Error fetching bookings:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBookings();
  }, [user?.id]);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('vi-VN');
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString('vi-VN');
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'confirmed': return '#4CAF50';
      case 'rejected': return '#f44336';
      case 'pending': return '#ff9800';
      case 'completed': return '#2196F3';
      default: return '#666';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'confirmed': return 'Đã xác nhận';
      case 'rejected': return 'Bị từ chối';
      case 'pending': return 'Chờ xác nhận';
      case 'completed': return 'Hoàn thành';
      default: return status;
    }
  };

  const handleNotificationClick = async (notification) => {
    // Mark as read if unread
    if (!notification.read) {
      await markAsRead(notification.id);
    }

    // Navigate based on notification type
    if (notification.bookingId) {
      setActiveTab('bookings');
      // Scroll to booking or highlight it
      const bookingElement = document.getElementById(`booking-${notification.bookingId}`);
      if (bookingElement) {
        bookingElement.scrollIntoView({ behavior: 'smooth' });
        bookingElement.classList.add('highlight');
        setTimeout(() => bookingElement.classList.remove('highlight'), 3000);
      }
    }
  };

  const customerNotifications = notifications.filter(notif => 
    notif.type === 'booking_confirmed' || notif.type === 'booking_rejected'
  );

  // Redirect if not customer
  if (user?.role !== 'customer') {
    return (
      <div className="dashboard-container">
        <div className="access-denied">
          <h2>Bạn không có quyền truy cập trang này</h2>
          <p>Chỉ khách hàng mới có thể truy cập dashboard này.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>Dashboard Khách Hàng</h1>
        <p>Xin chào, <strong>{user?.fullName}</strong>!</p>
      </div>

      <div className="dashboard-tabs">
        <button 
          className={`tab-btn ${activeTab === 'bookings' ? 'active' : ''}`}
          onClick={() => setActiveTab('bookings')}
        >
          Lịch sử đặt hàng ({bookings.length})
        </button>
        <button 
          className={`tab-btn ${activeTab === 'notifications' ? 'active' : ''}`}
          onClick={() => setActiveTab('notifications')}
        >
          Thông báo ({customerNotifications.filter(n => !n.read).length})
        </button>
      </div>

      {activeTab === 'bookings' && (
        <div className="bookings-section">
          <div className="section-header">
            <h2>Lịch sử đặt lịch</h2>
            <button 
              className="book-new-btn"
              onClick={() => navigate('/')}
            >
              Đặt lịch mới
            </button>
          </div>
          
          {loading ? (
            <div className="loading">
              <div className="spinner"></div>
              <p>Đang tải dữ liệu...</p>
            </div>
          ) : bookings.length === 0 ? (
            <div className="no-bookings">
              <div className="no-bookings-icon">📋</div>
              <h3>Chưa có đặt lịch nào</h3>
              <p>Bạn chưa đặt lịch dịch vụ nào. Hãy khám phá các người giúp việc có sẵn!</p>
              <button 
                className="browse-btn"
                onClick={() => navigate('/')}
              >
                Khám phá dịch vụ
              </button>
            </div>
          ) : (
            <div className="bookings-list">
              {bookings.map((booking) => (
                <div 
                  key={booking.id} 
                  id={`booking-${booking.id}`}
                  className="booking-card"
                >
                  <div className="booking-header">
                    <div className="booking-id">
                      <span className="label">Mã đặt lịch:</span>
                      <span className="value">#{booking.id}</span>
                    </div>
                    <div 
                      className="booking-status"
                      style={{ color: getStatusColor(booking.status) }}
                    >
                      {getStatusText(booking.status)}
                    </div>
                  </div>

                  <div className="booking-content">
                    <div className="housekeeper-info">
                      <div className="housekeeper-avatar">
                        {booking.housekeeperName?.charAt(0) || 'H'}
                      </div>
                      <div className="housekeeper-details">
                        <h4>{booking.housekeeperName || 'Người giúp việc'}</h4>
                        <p>Dịch vụ: {booking.service}</p>
                      </div>
                    </div>

                    <div className="booking-details">
                      <div className="detail-row">
                        <span className="label">Ngày:</span>
                        <span className="value">{formatDate(booking.date)}</span>
                      </div>
                      <div className="detail-row">
                        <span className="label">Giờ:</span>
                        <span className="value">{booking.time}</span>
                      </div>
                      <div className="detail-row">
                        <span className="label">Thời gian:</span>
                        <span className="value">{booking.duration} giờ</span>
                      </div>
                      <div className="detail-row">
                        <span className="label">Địa điểm:</span>
                        <span className="value">{booking.location}</span>
                      </div>
                      <div className="detail-row price">
                        <span className="label">Tổng tiền:</span>
                        <span className="value">${booking.totalPrice}</span>
                      </div>
                      <div className="detail-row">
                        <span className="label">Đặt lúc:</span>
                        <span className="value">{formatTime(booking.createdAt)}</span>
                      </div>
                    </div>

                    {booking.notes && (
                      <div className="booking-notes">
                        <h5>Ghi chú:</h5>
                        <p>{booking.notes}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'notifications' && (
        <div className="notifications-section">
          <div className="section-header">
            <h2>Thông báo</h2>
          </div>
          
          {customerNotifications.length === 0 ? (
            <div className="no-notifications">
              <div className="no-notifications-icon">🔔</div>
              <h3>Không có thông báo nào</h3>
              <p>Bạn sẽ nhận được thông báo khi người giúp việc phản hồi đặt lịch của bạn.</p>
            </div>
          ) : (
            <div className="notifications-list">
              {customerNotifications.map((notification) => (
                <div 
                  key={notification.id} 
                  className={`notification-card ${notification.read ? 'read' : 'unread'}`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="notification-icon">
                    {notification.type === 'booking_confirmed' ? '✅' : 
                     notification.type === 'booking_rejected' ? '❌' : '🔔'}
                  </div>
                  <div className="notification-content">
                    <h4>{notification.title}</h4>
                    <p>{notification.message}</p>
                    <div className="notification-meta">
                      <span className="time">{formatTime(notification.timestamp)}</span>
                      {notification.bookingId && (
                        <span className="booking-ref">Mã đặt lịch: #{notification.bookingId}</span>
                      )}
                    </div>
                  </div>
                  {!notification.read && <div className="unread-indicator"></div>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

