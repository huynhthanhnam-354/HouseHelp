import React from "react";
import { useAuth } from "../../hooks/useAuth";
import "./QuickInfo.css";

export default function QuickInfo({ onFilterChange, currentFilter }) {
  const { user, isAuthenticated } = useAuth();

  const handleTopRatedClick = () => {
    // Thay vì navigate, chỉ cập nhật filter trực tiếp
    if (onFilterChange) {
      onFilterChange({ topRated: true });
    }
  };

  const handleClearFilter = () => {
    if (onFilterChange) {
      onFilterChange({});
    }
  };

  const isTopRatedActive = currentFilter?.topRated;

  return (
    <div className="quick-info">
      <div className="quick-title">Quick Info</div>
      
      <button 
        className={`quick-info-btn top-rated-btn ${isTopRatedActive ? 'active' : ''}`}
        onClick={handleTopRatedClick}
      >
        ⭐ Top Rated
        <span className="btn-subtitle">Xem người giúp việc đánh giá cao nhất</span>
      </button>

      {isTopRatedActive && (
        <button 
          className="quick-info-btn clear-filter-btn"
          onClick={handleClearFilter}
        >
          🔄 Xem tất cả
          <span className="btn-subtitle">Hiển thị tất cả người giúp việc</span>
        </button>
      )}
    </div>
  );
} 