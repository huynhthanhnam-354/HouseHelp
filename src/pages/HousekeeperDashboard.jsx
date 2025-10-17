import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useNotifications } from '../contexts/NotificationContext';
import { useLanguage } from '../contexts/LanguageContext';
import translations from '../locales/translations';
import BookingCompletion from '../components/BookingCompletion';
import './HousekeeperDashboard.css';

export default function HousekeeperDashboard() {
  const { user } = useAuth();
  const { notifications, markAsRead } = useNotifications();
  const { language } = useLanguage();
  const t = translations[language];
  
  const [pendingBookings, setPendingBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Fetch bookings từ database thay vì dựa vào notifications
  useEffect(() => {
    const fetchHousekeeperBookings = async () => {
      if (!user?.id) return;
      
      try {
        setLoading(true);
        const response = await fetch(`http://localhost:5000/api/bookings/user/${user.id}`);
        if (response.ok) {
          const allBookings = await response.json();
          
              // Lọc bookings cho housekeeper (pending và confirmed)
              const housekeeperBookings = allBookings.filter(booking =>
                booking.housekeeperId === user.id &&
                (booking.status === 'pending' || booking.status === 'confirmed')
              );

              // Sắp xếp booking theo thời gian tạo mới nhất lên đầu
              const sortedBookings = housekeeperBookings.sort((a, b) => {
                return new Date(b.createdAt) - new Date(a.createdAt);
              });

              console.log('Housekeeper bookings (sorted):', sortedBookings);
              setPendingBookings(sortedBookings);
        }
      } catch (error) {
        console.error('Error fetching housekeeper bookings:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchHousekeeperBookings();
  }, [user?.id, refreshTrigger]);

  // Xác nhận booking
  const handleConfirmBooking = async (booking) => {
    setLoading(true);
    try {
      const response = await fetch(`http://localhost:5000/api/bookings/${booking.id}/confirm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (response.ok) {
        // Backend API đã tự động gửi notification rồi, không cần gửi thêm ở đây

        // Đánh dấu notification đã đọc
        await markAsRead(booking.notificationId);
        
        // Delete the notification completely to prevent re-showing
        try {
          await fetch(`http://localhost:5000/api/notifications/${booking.notificationId}`, {
            method: 'DELETE'
          });
          console.log('Notification deleted successfully (confirm)');
        } catch (deleteError) {
          console.error('Failed to delete notification (confirm):', deleteError);
        }
        
        console.log('Removing booking from pending list (confirm)...');
        console.log('Booking ID to remove:', booking.id);
        
        // Xóa booking khỏi danh sách pending
        setPendingBookings(prev => {
          const updated = prev.filter(b => b.id !== booking.id);
          console.log('Updated pending bookings after confirm:', updated.length, 'items');
          return updated;
        });
        
        alert('Đã xác nhận đơn đặt lịch thành công!');
      } else {
        throw new Error('Không thể xác nhận đơn đặt lịch');
      }
    } catch (error) {
      console.error('Error confirming booking:', error);
      alert('Có lỗi xảy ra: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Từ chối booking
  const handleRejectBooking = async (booking) => {
    console.log('🔴 handleRejectBooking called with booking:', booking);
    console.log('🔴 Booking ID:', booking.id);
    console.log('🔴 Setting loading to true...');
    setLoading(true);
    try {
      // Backend API sẽ tự động gửi notification, không cần gửi thêm ở đây
      console.log('Rejecting booking...', booking.id);

      // API để từ chối booking và update database
      console.log('Updating booking status in database...');
      const bookingResponse = await fetch(`http://localhost:5000/api/bookings/${booking.id}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      console.log('Booking response:', bookingResponse.status);
      
      if (!bookingResponse.ok) {
        console.error('Failed to reject booking in database, but continuing with UI update');
        // Continue anyway to update UI
      }

      console.log('Marking notification as read...');
      await markAsRead(booking.notificationId);
      
      // Optionally delete the notification completely to prevent re-showing
      try {
        await fetch(`http://localhost:5000/api/notifications/${booking.notificationId}`, {
          method: 'DELETE'
        });
        console.log('Notification deleted successfully');
      } catch (deleteError) {
        console.error('Failed to delete notification:', deleteError);
      }
      
      console.log('Removing booking from pending list (reject)...');
      console.log('Booking ID to remove:', booking.id);
      
      // Xóa booking khỏi danh sách pending ngay lập tức
      setPendingBookings(prev => {
        const updated = prev.filter(b => b.id !== booking.id);
        console.log('Updated pending bookings after reject:', updated.length, 'items');
        return updated;
      });
      
      alert('Đã từ chối đơn đặt lịch');
    } catch (error) {
      console.error('Error rejecting booking:', error);
      alert('Có lỗi xảy ra: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString('vi-VN');
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('vi-VN');
  };

  // Temporarily disable role check for testing
  // if (user?.role !== 'housekeeper') {
  //   return (
  //     <div className="dashboard-container">
  //       <div className="access-denied">
  //         <h2>Bạn không có quyền truy cập trang này</h2>
  //         <p>Chỉ người giúp việc mới có thể truy cập dashboard này.</p>
  //       </div>
  //     </div>
  //   );
  // }

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>Dashboard Người Giúp Việc</h1>
        <p>Xin chào, <strong>{user?.fullName}</strong>!</p>
      </div>

      <div className="pending-bookings-section">
        <h2>Đơn đặt lịch chờ xác nhận ({pendingBookings.length})</h2>
        
        {pendingBookings.length === 0 ? (
          <div className="no-bookings">
            <div className="no-bookings-icon">📋</div>
            <p>Không có đơn đặt lịch nào chờ xác nhận</p>
          </div>
        ) : (
          <div className="bookings-list">
            {pendingBookings.map((booking, index) => (
              <div key={booking.id} className={`booking-card ${index === 0 ? 'newest-booking' : ''}`}>
                <div className="booking-header">
                  <div className="customer-info">
                    <div className="customer-avatar">
                      {booking.customerName?.charAt(0) || 'C'}
                    </div>
                    <div className="customer-details">
                      <h3>
                        <button 
                          className="booking-link"
                          onClick={() => navigate(`/booking-view/${booking.id}`)}
                        >
                          {booking.customerName} (#{booking.id}) {index === 0 && <span className="new-badge">MỚI NHẤT</span>}
                        </button>
                      </h3>
                      <p>{booking.customerPhone}</p>
                      <p>{booking.customerEmail}</p>
                    </div>
                  </div>
                  <div className="booking-time">
                    <span className="time-received">
                      Nhận lúc: {formatTime(booking.createdAt)}
                    </span>
                  </div>
                </div>

                <div className="booking-details">
                  <div className="detail-row">
                    <span className="label">Dịch vụ:</span>
                    <span className="value">{booking.service}</span>
                  </div>
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
                </div>

                {booking.notes && (
                  <div className="booking-notes">
                    <h4>Ghi chú:</h4>
                    <p>{booking.notes}</p>
                  </div>
                )}

                <div className="booking-actions">
                  <button
                    className="reject-btn"
                    onClick={() => handleRejectBooking(booking)}
                    disabled={loading}
                  >
                    Từ chối
                  </button>
                  <button
                    className="confirm-btn"
                    onClick={() => handleConfirmBooking(booking)}
                    disabled={loading}
                  >
                    {loading ? 'Đang xử lý...' : 'Xác nhận'}
                  </button>
                </div>

                {/* Booking Completion Component */}
                <BookingCompletion 
                  booking={booking} 
                  onStatusUpdate={() => setRefreshTrigger(prev => prev + 1)}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

