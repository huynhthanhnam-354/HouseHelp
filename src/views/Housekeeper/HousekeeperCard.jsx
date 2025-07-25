import React from "react";
import RatingStars from "../Common/RatingStars";
import Button from "../Common/Button";

export default function HousekeeperCard({ hk }) {
  const services = Array.isArray(hk.services)
    ? hk.services
    : (hk.services || "").split(",").map(s => s.trim()).filter(Boolean);
    
  const rating = parseFloat(hk.rating) || 0;
  const reviewCount = parseInt(hk.reviewCount) || 0;
  
  return (
    <div className="housekeeper-card-new">
      <div className="hk-header">
        <div className="hk-avatar-section">
          <div className="hk-avatar">{hk.initials}</div>
          <div className="hk-basic-info">
            <div className="hk-name">{hk.fullName}</div>
            <div className="hk-rating-section">
              <RatingStars rating={rating} />
              <span className="hk-rating-text">
                {rating.toFixed(1)} ({reviewCount} reviews)
              </span>
            </div>
            <div className="hk-availability">Available today</div>
          </div>
        </div>
        <div className="hk-price">${hk.price}<span className="price-unit">/hr</span></div>
      </div>
      
      <div className="hk-services-section">
        {services.map((service, i) => (
          <span className="hk-service-tag" key={i}>{service}</span>
        ))}
      </div>
      
      <div className="hk-actions">
        <button className="hk-book-btn">Book Now</button>
      </div>
    </div>
  );
} 