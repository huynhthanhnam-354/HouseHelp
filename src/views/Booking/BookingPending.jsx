import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../../contexts/LanguageContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { useBooking } from '../../contexts/BookingContext';
import { useAuth } from '../../hooks/useAuth';
import translations from '../../locales/translations';
import './BookingPending.css';

export default function BookingPending({ booking, housekeeper, onCancel }) {
  const { language } = useLanguage();
  const { notifications } = useNotifications();
  const { clearBookingState, resetBooking } = useBooking();
  const { user } = useAuth();
  const navigate = useNavigate();
  const t = translations[language];
  
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [isConfirmed, setIsConfirmed] = useState(false);
  
  // Check for notifications immediately on render
  const hasRejectNotification = notifications.some(notif => 
    notif.type === 'booking_rejected' && 
    (parseInt(notif.bookingId) === parseInt(booking?.id))
  );
  
  const hasConfirmNotification = notifications.some(notif => 
    notif.type === 'booking_confirmed' && 
    (parseInt(notif.bookingId) === parseInt(booking?.id))
  );

  // Timer để đếm thời gian chờ
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeElapsed(prev => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Lắng nghe notification xác nhận/từ chối từ housekeeper
  const [bookingResult, setBookingResult] = useState(null); // 'confirmed' | 'rejected' | null

  useEffect(() => {
      console.log('BookingPending checking notifications...', {
    notificationsCount: notifications.length,
    bookingId: booking?.id,
    currentResult: bookingResult
  });
  
  console.log('=== CUSTOMER DEBUG ===');
  console.log('Current user ID:', user?.id);
  console.log('All notifications:', notifications);
  console.log('Looking for booking ID:', booking?.id);
  
  // Debug each notification
  notifications.forEach((notif, index) => {
    console.log(`Notification ${index}:`, {
      id: notif.id,
      type: notif.type,
      bookingId: notif.bookingId,
      title: notif.title,
      message: notif.message,
      timestamp: notif.timestamp
    });
  });

    const confirmNotification = notifications.find(
      notif => notif.type === 'booking_confirmed' && 
               parseInt(notif.bookingId) === parseInt(booking?.id)
    );

    const rejectNotification = notifications.find(
      notif => notif.type === 'booking_rejected' && 
               parseInt(notif.bookingId) === parseInt(booking?.id)
    );

    console.log('Found notifications:', {
      confirmNotification: !!confirmNotification,
      rejectNotification: !!rejectNotification,
      confirmDetails: confirmNotification,
      rejectDetails: rejectNotification,
      currentBookingId: booking?.id,
      currentBookingIdType: typeof booking?.id
    });
    


    // Debug booking ID matching
    notifications.forEach((notif, index) => {
      if (notif.type === 'booking_confirmed' || notif.type === 'booking_rejected') {
        console.log(`ID Match Check ${index}:`, {
          notifBookingId: notif.bookingId,
          notifBookingIdType: typeof notif.bookingId,
          currentBookingId: booking?.id,
          currentBookingIdType: typeof booking?.id,
          exactMatch: notif.bookingId === booking?.id,
          intMatch: parseInt(notif.bookingId) === parseInt(booking?.id)
        });
      }
    });

    if (confirmNotification && !bookingResult) {
      console.log('🎉 Booking confirmed! Setting result to confirmed');
      
      // NGAY LẬP TỨC set state confirmed
      setBookingResult('confirmed');
      setIsConfirmed(true);
      
      // Show immediate toast notification like Grab
      if (window.showToast) {
        window.showToast('🎉 Đặt lịch đã được xác nhận!', 'booking_confirmed', 3000);
      }
      
      // Hiển thị thông báo thành công và chuyển về trang chủ sau 5 giây
      setTimeout(() => {
        // Clear all booking states
        localStorage.removeItem('bookingState');
        // Reset booking context
        if (resetBooking) {
          resetBooking();
        }
        // Force reload để reset hoàn toàn
        window.location.href = '/';
      }, 5000);
    } else if (rejectNotification) {
      console.log('😔 Booking rejected! Setting result to rejected');
      console.log('🔍 Current bookingResult:', bookingResult);
      console.log('🔍 Reject notification details:', rejectNotification);
      console.log('🔍 Current booking ID:', booking?.id);
      console.log('🔍 Force setting to rejected...');
      
      // NGAY LẬP TỨC set state rejected
      setBookingResult('rejected');
      
      // Show immediate toast notification like Grab
      if (window.showToast) {
        window.showToast('😔 Đặt lịch đã bị từ chối', 'booking_rejected', 3000);
      }
      
      // Chuyển về trang chủ sau 3 giây
      setTimeout(() => {
        console.log('🏠 Navigating back to home...');
        // Clear all booking states
        localStorage.removeItem('bookingState');
        // Reset booking context
        if (resetBooking) {
          resetBooking();
        }
        // Force reload để reset hoàn toàn
        window.location.href = '/';
      }, 3000);
    }
  }, [notifications, booking?.id, bookingResult, navigate]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleCancel = () => {
    console.log('Canceling booking and clearing state...');
    clearBookingState(); // Clear localStorage and reset state
    if (onCancel) {
      onCancel();
    }
    navigate('/'); // Về trang chủ
  };

  // Removed debug function

  if (bookingResult === 'confirmed' || hasConfirmNotification) {
    return (
      <div className="booking-pending-container">
        <div className="booking-confirmed-success">
          <div className="success-icon">✅</div>
          <h2>{t.bookingConfirmed || 'Đặt lịch đã được xác nhận!'}</h2>
          <p>{t.bookingConfirmedMessage || `${housekeeper?.fullName} đã xác nhận đơn đặt lịch của bạn.`}</p>
          <div className="booking-details">
            <p><strong>{t.service}:</strong> {booking?.service}</p>
            <p><strong>{t.date}:</strong> {booking?.date}</p>
            <p><strong>{t.time}:</strong> {booking?.time}</p>
            <p><strong>{t.location}:</strong> {booking?.location}</p>
            <p><strong>{t.bookingId || 'Mã đặt lịch'}:</strong> {booking?.id}</p>
          </div>
          <p className="redirect-message">{t.redirectingHome || 'Đang chuyển về trang chủ trong 5 giây...'}</p>
        </div>
      </div>
    );
  }

  if (bookingResult === 'rejected' || hasRejectNotification) {
    return (
      <div className="booking-pending-container">
        <div className="booking-rejected-message">
          <div className="reject-icon">❌</div>
          <h2>{t.bookingRejected || 'Đặt lịch bị từ chối'}</h2>
          <p>{t.bookingRejectedMessage || `Rất tiếc, ${housekeeper?.fullName} đã từ chối đơn đặt lịch của bạn.`}</p>
          <div className="booking-details">
            <p><strong>{t.service}:</strong> {booking?.service}</p>
            <p><strong>{t.date}:</strong> {booking?.date}</p>
            <p><strong>{t.time}:</strong> {booking?.time}</p>
            <p><strong>{t.location}:</strong> {booking?.location}</p>
            <p><strong>{t.bookingId || 'Mã đặt lịch'}:</strong> {booking?.id}</p>
          </div>
          <div className="rejection-suggestions">
            <h4>{t.suggestionsTitle || 'Gợi ý cho bạn:'}</h4>
            <ul>
              <li>{t.suggestion1 || 'Thử đặt lịch với người giúp việc khác'}</li>
              <li>{t.suggestion2 || 'Chọn thời gian khác phù hợp hơn'}</li>
              <li>{t.suggestion3 || 'Liên hệ trực tiếp với người giúp việc để thỏa thuận'}</li>
            </ul>
          </div>
          <div className="rejection-actions">
            <button 
              className="find-other-btn"
              onClick={() => navigate('/')}
            >
              {t.findOtherHousekeeper || 'Tìm người giúp việc khác'}
            </button>
          </div>
          <p className="redirect-message">{t.redirectingHomeReject || 'Tự động chuyển về trang chủ trong 5 giây...'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="booking-pending-container">
      <div className="booking-pending-card">
        <div className="pending-header">
          <div className="pending-icon">
            <div className="spinner"></div>
          </div>
          <h2>{t.waitingConfirmation || 'Chờ xác nhận từ người giúp việc'}</h2>
          <p className="pending-subtitle">
            {t.waitingConfirmationMessage || 'Chúng tôi đã gửi yêu cầu đến người giúp việc. Vui lòng chờ trong giây lát.'}
          </p>
        </div>

        <div className="booking-summary">
          <h3>{t.bookingSummary || 'Thông tin đặt lịch'}</h3>
          
          <div className="housekeeper-info">
            <div className="housekeeper-avatar">
              {housekeeper?.avatar || housekeeper?.fullName?.charAt(0) || 'H'}
            </div>
            <div className="housekeeper-details">
              <h4>{housekeeper?.fullName}</h4>
              <div className="rating">
                <span className="stars">{'★'.repeat(Math.floor(housekeeper?.rating || 0))}</span>
                <span>{housekeeper?.rating || 'N/A'}</span>
              </div>
            </div>
          </div>

          <div className="booking-details">
            <div className="detail-row">
              <span className="label">{t.service}:</span>
              <span className="value">{booking?.service}</span>
            </div>
            <div className="detail-row">
              <span className="label">{t.date}:</span>
              <span className="value">{booking?.date}</span>
            </div>
            <div className="detail-row">
              <span className="label">{t.time}:</span>
              <span className="value">{booking?.time}</span>
            </div>
            <div className="detail-row">
              <span className="label">{t.duration}:</span>
              <span className="value">{booking?.duration} {t.hours}</span>
            </div>
            <div className="detail-row">
              <span className="label">{t.location}:</span>
              <span className="value">{booking?.location}</span>
            </div>
            <div className="detail-row total">
              <span className="label">{t.totalPrice}:</span>
              <span className="value">${booking?.totalPrice}</span>
            </div>
          </div>

          {booking?.notes && (
            <div className="booking-notes">
              <h4>{t.specialRequests || 'Yêu cầu đặc biệt'}:</h4>
              <p>{booking.notes}</p>
            </div>
          )}
        </div>

        <div className="waiting-info">
          <div className="waiting-time">
            <span className="time-label">{t.waitingTime || 'Thời gian chờ'}:</span>
            <span className="time-value">{formatTime(timeElapsed)}</span>
          </div>
          
          <div className="waiting-tips">
            <h4>{t.whileWaiting || 'Trong khi chờ đợi'}:</h4>
            <ul>
              <li>{t.waitingTip1 || 'Người giúp việc thường phản hồi trong vòng 5-15 phút'}</li>
              <li>{t.waitingTip2 || 'Bạn sẽ nhận được thông báo ngay khi có xác nhận'}</li>
              <li>{t.waitingTip3 || 'Có thể hủy đặt lịch nếu cần thiết'}</li>
            </ul>
          </div>
        </div>

        <div className="pending-actions">
          <button 
            className="cancel-btn"
            onClick={handleCancel}
          >
            {t.cancelBooking || 'Hủy đặt lịch'}
          </button>
          <button 
            className="home-btn"
            onClick={() => navigate('/')}
          >
            {t.backToHome || 'Về trang chủ'}
          </button>

        </div>
      </div>
    </div>
  );
}

