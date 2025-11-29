import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useBooking } from "../../contexts/BookingContext";
import "./QuickBookingResult.css";

export default function QuickBookingResult({ 
  matchedHousekeepers = [], 
  bookingData, 
  onConfirmBooking, 
  onBack,
  loading = false 
}) {
  const navigate = useNavigate();
  const { setHousekeeper } = useBooking();
  const [selectedHousekeeper, setSelectedHousekeeper] = useState(null);
  const [confirming, setConfirming] = useState(false);

  const handleSelectHousekeeper = (housekeeper) => {
    setSelectedHousekeeper(housekeeper);
  };

  const handleConfirmQuickBooking = async () => {
    if (!selectedHousekeeper) return;
    
    setConfirming(true);
    try {
      // Set housekeeper in context
      setHousekeeper(selectedHousekeeper);
      
      // Create booking with selected housekeeper
      await onConfirmBooking(selectedHousekeeper, bookingData);
    } catch (error) {
      console.error("Error confirming quick booking:", error);
    } finally {
      setConfirming(false);
    }
  };

  const handleViewProfile = (housekeeper) => {
    setHousekeeper(housekeeper);
    navigate(`/booking/${housekeeper.id}`);
  };

  const getUrgencyBadge = (urgency) => {
    const badges = {
      normal: { text: "Bình thường", class: "normal" },
      urgent: { text: "Khẩn cấp", class: "urgent" },
      asap: { text: "Càng sớm càng tốt", class: "asap" }
    };
    return badges[urgency] || badges.normal;
  };

  const calculatePrice = (housekeeper) => {
    const basePrice = housekeeper.price * bookingData.duration;
    const platformFee = 5.00;
    const serviceFee = 5.00;
    return basePrice + platformFee + serviceFee;
  };

  if (loading) {
    return (
      <div className="quick-booking-loading">
        <div className="loading-animation">
          <div className="search-icon">🔍</div>
          <div className="loading-dots">
            <span></span>
            <span></span>
            <span></span>
          </div>
        </div>
        <h3>Đang tìm người giúp việc phù hợp...</h3>
        <p>Hệ thống đang phân tích và tìm kiếm những người giúp việc tốt nhất cho bạn</p>
      </div>
    );
  }

  if (!matchedHousekeepers || matchedHousekeepers.length === 0) {
    return (
      <div className="quick-booking-no-results">
        <div className="no-results-icon">😔</div>
        <h3>Không tìm thấy người giúp việc phù hợp</h3>
        <p>Rất tiếc, hiện tại không có người giúp việc nào phù hợp với yêu cầu của bạn.</p>
        <div className="suggestions">
          <h4>Gợi ý:</h4>
          <ul>
            <li>Tăng mức giá tối đa</li>
            <li>Thay đổi thời gian làm việc</li>
            <li>Chọn ngày khác</li>
            <li>Giảm mức độ khẩn cấp</li>
          </ul>
        </div>
        <button onClick={onBack} className="back-button">
          Thử lại với yêu cầu khác
        </button>
      </div>
    );
  }

  return (
    <div className="quick-booking-result">
      <div className="result-header">
        <button onClick={onBack} className="back-btn">
          ← Quay lại
        </button>
        <div className="result-info">
          <h2>Tìm thấy {matchedHousekeepers.length} người giúp việc phù hợp</h2>
          <div className="booking-summary">
            <span className="service">{bookingData.service}</span>
            <span className="date-time">{bookingData.date} lúc {bookingData.time}</span>
            <span className="duration">{bookingData.duration} giờ</span>
            <span className={`urgency ${getUrgencyBadge(bookingData.urgency).class}`}>
              {getUrgencyBadge(bookingData.urgency).text}
            </span>
          </div>
        </div>
      </div>

      <div className="housekeepers-grid">
        {matchedHousekeepers.map((housekeeper, index) => (
          <div 
            key={housekeeper.id} 
            className={`housekeeper-card ${selectedHousekeeper?.id === housekeeper.id ? 'selected' : ''}`}
            onClick={() => handleSelectHousekeeper(housekeeper)}
          >
            <div className="card-header">
              <div className="housekeeper-avatar">
                {housekeeper.avatar || housekeeper.fullName?.charAt(0) || 'H'}
              </div>
              <div className="housekeeper-info">
                <h3>{housekeeper.fullName}</h3>
                <div className="rating">
                  <span className="stars">
                    {'★'.repeat(Math.floor(housekeeper.avgRating || housekeeper.rating || 4.5))}
                  </span>
                  <span className="rating-text">
                    {(housekeeper.avgRating || housekeeper.rating || 4.5).toFixed(1)} 
                    ({housekeeper.reviewCount || 0} đánh giá)
                  </span>
                </div>
              </div>
              <div className="match-score">
                <div className="score-circle">
                  {Math.round((1 - index * 0.1) * 100)}%
                </div>
                <div className="score-label">Phù hợp</div>
              </div>
            </div>

            <div className="card-body">
              <div className="housekeeper-details">
                <div className="detail-item">
                  <span className="label">Giá:</span>
                  <span className="value">${housekeeper.price}/giờ</span>
                </div>
                <div className="detail-item">
                  <span className="label">Kinh nghiệm:</span>
                  <span className="value">{housekeeper.experience || "2+ năm"}</span>
                </div>
                <div className="detail-item">
                  <span className="label">Khu vực:</span>
                  <span className="value">{housekeeper.location || "Gần bạn"}</span>
                </div>
              </div>

              <div className="verification-badges">
                {housekeeper.backgroundChecked && (
                  <span className="badge verified">✓ Đã xác minh</span>
                )}
                {housekeeper.insured && (
                  <span className="badge insured">🛡️ Có bảo hiểm</span>
                )}
              </div>

              <div className="price-breakdown">
                <div className="price-item">
                  <span>Dịch vụ ({bookingData.duration}h × ${housekeeper.price})</span>
                  <span>${(housekeeper.price * bookingData.duration).toFixed(2)}</span>
                </div>
                <div className="price-item">
                  <span>Phí dịch vụ</span>
                  <span>$10.00</span>
                </div>
                <div className="price-total">
                  <span>Tổng cộng</span>
                  <span>${calculatePrice(housekeeper).toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="card-actions">
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  handleViewProfile(housekeeper);
                }}
                className="view-profile-btn"
              >
                Xem hồ sơ
              </button>
              {selectedHousekeeper?.id === housekeeper.id && (
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleConfirmQuickBooking();
                  }}
                  className="select-btn selected"
                  disabled={confirming}
                >
                  {confirming ? "Đang xác nhận..." : "✓ Đã chọn"}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {selectedHousekeeper && (
        <div className="confirm-section">
          <div className="confirm-card">
            <h3>Xác nhận đặt dịch vụ</h3>
            <div className="confirm-details">
              <div className="selected-housekeeper">
                <strong>{selectedHousekeeper.fullName}</strong>
                <span>${calculatePrice(selectedHousekeeper).toFixed(2)}</span>
              </div>
              <div className="booking-info">
                <span>{bookingData.service}</span>
                <span>{bookingData.date} lúc {bookingData.time}</span>
                <span>{bookingData.duration} giờ tại {bookingData.location}</span>
              </div>
            </div>
            <button 
              onClick={handleConfirmQuickBooking}
              className="confirm-booking-btn"
              disabled={confirming}
            >
              {confirming ? (
                <>
                  <div className="loading-spinner"></div>
                  Đang xác nhận...
                </>
              ) : (
                "Xác nhận đặt dịch vụ"
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
