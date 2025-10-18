import React, { useState, useEffect } from 'react';
import './ReviewsList.css';

const ReviewsList = ({ housekeeperId, showAll = false }) => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (housekeeperId) {
      fetchReviews();
    }
  }, [housekeeperId]);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const response = await fetch(`http://localhost:5000/api/housekeepers/${housekeeperId}/reviews`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch reviews');
      }
      
      const data = await response.json();
      // Chỉ hiển thị reviews visible (không bị admin ẩn)
      const visibleReviews = data.filter(review => review.isVisible !== 0);
      setReviews(visibleReviews);
    } catch (err) {
      console.error('Error fetching reviews:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const renderStars = (rating) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;
    
    for (let i = 0; i < fullStars; i++) {
      stars.push(<span key={i} className="star full">⭐</span>);
    }
    
    if (hasHalfStar) {
      stars.push(<span key="half" className="star half">⭐</span>);
    }
    
    const emptyStars = 5 - Math.ceil(rating);
    for (let i = 0; i < emptyStars; i++) {
      stars.push(<span key={`empty-${i}`} className="star empty">☆</span>);
    }
    
    return stars;
  };

  if (loading) {
    return (
      <div className="reviews-loading">
        <div className="loading-spinner"></div>
        <p>Đang tải đánh giá...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="reviews-error">
        <p>Không thể tải đánh giá: {error}</p>
      </div>
    );
  }

  if (reviews.length === 0) {
    return (
      <div className="reviews-empty">
        <div className="empty-icon">⭐</div>
        <h3>Chưa có đánh giá</h3>
        <p>Người giúp việc này chưa có đánh giá nào từ khách hàng.</p>
      </div>
    );
  }

  const displayReviews = showAll ? reviews : reviews.slice(0, 3);

  return (
    <div className="reviews-list">
      <div className="reviews-header">
        <h3>📝 Đánh giá từ khách hàng ({reviews.length})</h3>
        {reviews.length > 0 && (
          <div className="reviews-summary">
            <div className="average-rating">
              <span className="rating-number">
                {(reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)}
              </span>
              <div className="rating-stars">
                {renderStars(reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length)}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="reviews-container">
        {displayReviews.map((review) => (
          <div key={review.id} className="review-card">
            <div className="review-header">
              <div className="reviewer-info">
                <div className="reviewer-avatar">
                  {review.customerName.split(' ').map(n => n[0]).join('').toUpperCase()}
                </div>
                <div className="reviewer-details">
                  <div className="reviewer-name">{review.customerName}</div>
                  <div className="review-date">{formatDate(review.createdAt)}</div>
                </div>
              </div>
              <div className="review-rating">
                <div className="rating-stars">
                  {renderStars(review.rating)}
                </div>
                <span className="rating-text">({review.rating}/5)</span>
              </div>
            </div>

            {review.service && (
              <div className="review-service">
                <span className="service-tag">📋 {review.service}</span>
              </div>
            )}

            {review.comment && (
              <div className="review-content">
                <p>"{review.comment}"</p>
              </div>
            )}

            {review.bookingDate && (
              <div className="review-booking-info">
                <small>Dịch vụ được thực hiện: {formatDate(review.bookingDate)}</small>
              </div>
            )}
          </div>
        ))}
      </div>

      {!showAll && reviews.length > 3 && (
        <div className="reviews-show-more">
          <button className="show-more-btn">
            Xem thêm {reviews.length - 3} đánh giá khác
          </button>
        </div>
      )}
    </div>
  );
};

export default ReviewsList;
