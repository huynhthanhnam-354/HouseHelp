import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import "./QuickBookingButton.css";

export default function QuickBookingButton({ className = "", style = {} }) {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();

  const handleClick = () => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }

    if (user?.role !== 'customer') {
      alert("Chỉ khách hàng mới có thể sử dụng tính năng đặt dịch vụ nhanh");
      return;
    }

    navigate("/quick-booking");
  };

  return (
    <button 
      className={`quick-booking-button ${className}`}
      onClick={handleClick}
      style={style}
    >
      <div className="quick-booking-icon">⚡</div>
      <div className="quick-booking-content">
        <div className="quick-booking-title">Đặt Dịch Vụ Nhanh</div>
        <div className="quick-booking-subtitle">Hệ thống tự động tìm người phù hợp</div>
      </div>
    </button>
  );
}
