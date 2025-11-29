import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useBooking } from "../contexts/BookingContext";
import BookingPending from "../views/Booking/BookingPending";
import "./BookingStatusPage.css";

export default function BookingStatusPage() {
  const navigate = useNavigate();
  const { 
    selectedHousekeeper, 
    bookingDetails, 
    currentStage, 
    resetBooking 
  } = useBooking();

  // Redirect if no booking data
  useEffect(() => {
    if (!bookingDetails || !selectedHousekeeper) {
      console.log('No booking data found, redirecting to home');
      navigate('/');
    }
  }, [bookingDetails, selectedHousekeeper, navigate]);

  const handleCancel = () => {
    resetBooking();
    navigate('/');
  };

  // Show loading if no data yet
  if (!bookingDetails || !selectedHousekeeper) {
    return (
      <div className="booking-status-loading">
        <div className="loading-spinner"></div>
        <p>Đang tải thông tin đặt lịch...</p>
      </div>
    );
  }

  return (
    <div className="booking-status-page">
      <div className="status-header">
        <button 
          onClick={() => navigate("/")} 
          className="home-btn"
        >
          ← Trang chủ
        </button>
        
        {bookingDetails.isQuickBooking && (
          <div className="quick-booking-badge">
            ⚡ Đặt dịch vụ nhanh
          </div>
        )}
      </div>

      <div className="status-content">
        {currentStage === 'pending' ? (
          <BookingPending
            booking={bookingDetails}
            housekeeper={selectedHousekeeper}
            onCancel={handleCancel}
          />
        ) : (
          <div className="booking-completed">
            <div className="success-icon">✅</div>
            <h2>Đặt lịch hoàn tất!</h2>
            <p>Cảm ơn bạn đã sử dụng dịch vụ HouseHelp</p>
            <button 
              onClick={() => navigate("/")}
              className="home-button"
            >
              Về trang chủ
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
