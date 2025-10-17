import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import BookingCompletion from '../components/BookingCompletion';
import './BookingViewPage.css';

export default function BookingViewPage() {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchBookingDetails();
  }, [bookingId]);

  const fetchBookingDetails = async () => {
    try {
      setLoading(true);
      const response = await fetch(`http://localhost:5000/api/bookings/user/${user.id}`);
      if (response.ok) {
        const allBookings = await response.json();
        const foundBooking = allBookings.find(b => b.id == bookingId);
        
        if (foundBooking) {
          setBooking(foundBooking);
        } else {
          setError('Không tìm thấy booking');
        }
      } else {
        setError('Lỗi khi tải thông tin booking');
      }
    } catch (err) {
      console.error('Error fetching booking:', err);
      setError('Có lỗi xảy ra khi tải dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('vi-VN');
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString('vi-VN');
  };

  const getStatusText = (status) => {
    const statusMap = {
      pending: 'Chờ xác nhận',
      confirmed: 'Đã xác nhận',
      completed: 'Đã hoàn thành',
      cancelled: 'Đã hủy',
      rejected: 'Đã từ chối'
    };
    return statusMap[status] || status;
  };

  const getStatusColor = (status) => {
    const colorMap = {
      pending: '#ffa500',
      confirmed: '#4caf50',
      completed: '#2196f3',
      cancelled: '#f44336',
      rejected: '#9e9e9e'
    };
    return colorMap[status] || '#9e9e9e';
  };

  if (loading) {
    return (
      <div className="booking-view-page">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Đang tải thông tin booking...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="booking-view-page">
        <div className="error-container">
          <h2>❌ Lỗi</h2>
          <p>{error}</p>
          <button onClick={() => navigate(-1)} className="back-btn">
            ← Quay lại
          </button>
        </div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="booking-view-page">
        <div className="error-container">
          <h2>📋 Không tìm thấy booking</h2>
          <p>Booking ID {bookingId} không tồn tại hoặc bạn không có quyền xem.</p>
          <button onClick={() => navigate(-1)} className="back-btn">
            ← Quay lại
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="booking-view-page">
      <div className="booking-header">
        <button onClick={() => navigate(-1)} className="back-btn">
          ← Quay lại
        </button>
        <h1>Chi tiết Booking #{booking.id}</h1>
      </div>

      <div className="booking-content">
        <div className="booking-info-card">
          <div className="booking-status-header">
            <h2>Thông tin đặt lịch</h2>
            <div 
              className="status-badge"
              style={{ backgroundColor: getStatusColor(booking.status) }}
            >
              {getStatusText(booking.status)}
            </div>
          </div>

          <div className="booking-details-grid">
            <div className="detail-section">
              <h3>👤 Thông tin khách hàng</h3>
              <div className="detail-row">
                <span className="label">Tên:</span>
                <span className="value">{booking.customerName}</span>
              </div>
              <div className="detail-row">
                <span className="label">Email:</span>
                <span className="value">{booking.customerEmail}</span>
              </div>
              <div className="detail-row">
                <span className="label">Điện thoại:</span>
                <span className="value">{booking.customerPhone}</span>
              </div>
            </div>

            <div className="detail-section">
              <h3>🏠 Thông tin người giúp việc</h3>
              <div className="detail-row">
                <span className="label">Tên:</span>
                <span className="value">{booking.housekeeperName}</span>
              </div>
              <div className="detail-row">
                <span className="label">Dịch vụ:</span>
                <span className="value">{booking.service}</span>
              </div>
            </div>

            <div className="detail-section">
              <h3>📅 Thông tin lịch hẹn</h3>
              <div className="detail-row">
                <span className="label">Ngày:</span>
                <span className="value">{formatDate(booking.startDate)}</span>
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
            </div>

            <div className="detail-section">
              <h3>💰 Thông tin thanh toán</h3>
              <div className="detail-row">
                <span className="label">Tổng tiền:</span>
                <span className="value price">{formatCurrency(booking.totalPrice)}</span>
              </div>
              <div className="detail-row">
                <span className="label">Đặt lúc:</span>
                <span className="value">{formatTime(booking.createdAt)}</span>
              </div>
            </div>
          </div>

          {booking.notes && (
            <div className="booking-notes">
              <h3>📝 Ghi chú</h3>
              <p>{booking.notes}</p>
            </div>
          )}

          {/* Booking Completion Component */}
          <BookingCompletion 
            booking={booking} 
            onStatusUpdate={fetchBookingDetails}
          />
        </div>
      </div>
    </div>
  );
}
