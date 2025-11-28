import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useNotifications } from '../contexts/NotificationContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useNavigate } from 'react-router-dom';
import translations from '../locales/translations';
import BookingCompletion from '../components/BookingCompletion';
import ReportForm from '../components/ReportForm';
import './CustomerDashboard.css';

export default function CustomerDashboard() {
  const { user } = useAuth();
  const { notifications, markAsRead } = useNotifications();
  const { language } = useLanguage();
  const navigate = useNavigate();
  const t = translations[language];
  
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('bookings'); // 'bookings' | 'notifications' | 'reports'
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [showReportForm, setShowReportForm] = useState(false);
  const [selectedBookingForReport, setSelectedBookingForReport] = useState(null);
  const [reports, setReports] = useState([]);

  // Fetch customer's bookings
  useEffect(() => {
    const fetchBookings = async () => {
      if (!user?.id) return;
      
      try {
        const response = await fetch(`http://localhost:5000/api/bookings/user/${user.id}`);
        if (response.ok) {
          const data = await response.json();
          // Sắp xếp booking theo thời gian tạo mới nhất lên đầu
          const sortedBookings = data.sort((a, b) => {
            return new Date(b.createdAt) - new Date(a.createdAt);
          });
          setBookings(sortedBookings);
        }
      } catch (error) {
        console.error('Error fetching bookings:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBookings();
  }, [user?.id, refreshTrigger]);

  // Fetch customer's reports
  useEffect(() => {
    const fetchReports = async () => {
      if (!user?.id) return;
      
      try {
        const response = await fetch(`http://localhost:5000/api/reports/customer/${user.id}`);
        if (response.ok) {
          const data = await response.json();
          setReports(data.reports || []);
        }
      } catch (error) {
        console.error('Error fetching reports:', error);
      }
    };

    if (activeTab === 'reports') {
      fetchReports();
    }
  }, [user?.id, activeTab, refreshTrigger]);

  // Auto refresh mỗi 10 giây để cập nhật status
  useEffect(() => {
    const interval = setInterval(() => {
      setRefreshTrigger(prev => prev + 1);
    }, 10000); // 10 seconds

    return () => clearInterval(interval);
  }, []);

  const formatDate = (dateString) => {
    if (!dateString) return 'Chưa xác định';
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return 'Chưa xác định';
      }
      return date.toLocaleDateString('vi-VN');
    } catch (error) {
      return 'Chưa xác định';
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return 'Chưa xác định';
    
    try {
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) {
        return 'Chưa xác định';
      }
      return date.toLocaleTimeString('vi-VN');
    } catch (error) {
      return 'Chưa xác định';
    }
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
    notif.type === 'booking_confirmed' || notif.type === 'booking_rejected' || notif.type === 'report_update'
  );

  // Handle report functions
  const handleReportBooking = (booking) => {
    // Chỉ cho phép báo cáo booking đã hoàn thành hoặc đã hủy
    if (!['completed', 'cancelled', 'confirmed'].includes(booking.status)) {
      alert('Chỉ có thể báo cáo vi phạm cho các đặt lịch đã hoàn thành hoặc đã xác nhận');
      return;
    }
    
    setSelectedBookingForReport(booking);
    setShowReportForm(true);
  };

  const handleReportSubmit = (result) => {
    console.log('Report submitted:', result);
    // Refresh reports list
    setRefreshTrigger(prev => prev + 1);
  };

  const getReportTypeLabel = (type) => {
    const types = {
      late_arrival: 'Đến muộn',
      no_show: 'Không đến',
      inappropriate_behavior: 'Hành vi không phù hợp',
      poor_service: 'Dịch vụ kém',
      damage: 'Làm hỏng đồ đạc',
      other: 'Khác'
    };
    return types[type] || type;
  };

  const getReportStatusLabel = (status) => {
    const statuses = {
      pending: 'Chờ xử lý',
      investigating: 'Đang điều tra',
      resolved: 'Đã giải quyết',
      dismissed: 'Đã từ chối'
    };
    return statuses[status] || status;
  };

  const getReportStatusColor = (status) => {
    const colors = {
      pending: '#ffc107',
      investigating: '#007bff',
      resolved: '#28a745',
      dismissed: '#6c757d'
    };
    return colors[status] || '#6c757d';
  };

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
          <button 
            className="refresh-btn"
            onClick={() => setRefreshTrigger(prev => prev + 1)}
            disabled={loading}
          >
            {loading ? '⏳ Đang tải...' : '🔄 Làm mới'}
          </button>
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
        <button 
          className={`tab-btn ${activeTab === 'reports' ? 'active' : ''}`}
          onClick={() => setActiveTab('reports')}
        >
          Báo cáo vi phạm ({reports.length})
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
              {bookings.map((booking, index) => (
                <div 
                  key={booking.id} 
                  id={`booking-${booking.id}`}
                  className={`booking-card ${index === 0 ? 'newest-booking' : ''}`}
                >
                  <div className="booking-header">
                    <div className="booking-id">
                      <span className="label">Mã đặt lịch:</span>
                      <button 
                        className="booking-link"
                        onClick={() => navigate(`/booking-view/${booking.id}`)}
                      >
                        #{booking.id} {index === 0 && <span className="new-badge">MỚI NHẤT</span>}
                      </button>
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
                        <span className="value">{formatDate(booking.startDate || booking.date)}</span>
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

                    {/* Booking Actions */}
                    <div className="booking-actions">
                      {/* Booking Completion Component */}
                      <BookingCompletion 
                        booking={booking} 
                        onStatusUpdate={() => setRefreshTrigger(prev => prev + 1)}
                      />
                      
                      {/* Report Button - chỉ hiển thị cho booking đã hoàn thành hoặc xác nhận */}
                      {(['completed', 'cancelled', 'confirmed'].includes(booking.status)) && (
                        <button 
                          className="report-btn"
                          onClick={() => handleReportBooking(booking)}
                          title="Báo cáo vi phạm"
                        >
                          ⚠️ Báo cáo vi phạm
                        </button>
                      )}
                    </div>
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

      {activeTab === 'reports' && (
        <div className="reports-section">
          <div className="section-header">
            <h2>Báo cáo vi phạm</h2>
            <p className="section-description">
              Quản lý các báo cáo vi phạm của bạn đối với người giúp việc
            </p>
          </div>
          
          {reports.length === 0 ? (
            <div className="no-reports">
              <div className="no-reports-icon">📋</div>
              <h3>Chưa có báo cáo nào</h3>
              <p>Bạn chưa gửi báo cáo vi phạm nào. Nếu gặp vấn đề với người giúp việc, hãy báo cáo để chúng tôi hỗ trợ.</p>
            </div>
          ) : (
            <div className="reports-list">
              {reports.map((report) => (
                <div key={report.id} className="report-card">
                  <div className="report-header">
                    <div className="report-type">
                      <span className="type-label">{getReportTypeLabel(report.reportType)}</span>
                      <span 
                        className="status-badge"
                        style={{ backgroundColor: getReportStatusColor(report.status) }}
                      >
                        {getReportStatusLabel(report.status)}
                      </span>
                    </div>
                    <div className="report-date">
                      {new Date(report.createdAt).toLocaleDateString('vi-VN')}
                    </div>
                  </div>

                  <div className="report-content">
                    <h4>{report.title}</h4>
                    <div className="report-booking-info">
                      <p><strong>Người giúp việc:</strong> {report.housekeeperName}</p>
                      <p><strong>Dịch vụ:</strong> {report.service}</p>
                      <p><strong>Ngày làm việc:</strong> {new Date(report.startDate).toLocaleDateString('vi-VN')}</p>
                    </div>
                    
                    <div className="report-description">
                      <p>{report.description}</p>
                    </div>

                    {report.adminResponse && (
                      <div className="admin-response">
                        <h5>Phản hồi từ quản trị viên:</h5>
                        <p>{report.adminResponse}</p>
                      </div>
                    )}
                  </div>

                  <div className="report-footer">
                    <span className="report-id">Mã báo cáo: #{report.id}</span>
                    {report.resolvedAt && (
                      <span className="resolved-date">
                        Giải quyết: {new Date(report.resolvedAt).toLocaleDateString('vi-VN')}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Report Form Modal */}
      {showReportForm && selectedBookingForReport && (
        <ReportForm
          booking={selectedBookingForReport}
          onClose={() => {
            setShowReportForm(false);
            setSelectedBookingForReport(null);
          }}
          onSubmit={handleReportSubmit}
        />
      )}
    </div>
  );
}

