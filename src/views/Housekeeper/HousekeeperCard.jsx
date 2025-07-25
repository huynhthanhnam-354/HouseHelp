import React from "react";
import { useNavigate } from "react-router-dom";
import RatingStars from "../Common/RatingStars";
import Button from "../Common/Button";

export default function HousekeeperCard({ hk }) {
  const navigate = useNavigate();
  
  const services = Array.isArray(hk.services)
    ? hk.services
    : (hk.services || "").split(",").map(s => s.trim()).filter(Boolean);
    
  const rating = parseFloat(hk.rating) || 0;
  const reviewCount = parseInt(hk.reviewCount) || 0;
  
  // Check authentication directly from localStorage
  const isAuthenticated = () => {
    try {
      const userData = localStorage.getItem("househelp_user");
      const isAuth = userData && userData !== "null" && userData !== "undefined";
      console.log("Authentication check:", isAuth, userData ? "has data" : "no data");
      return isAuth;
    } catch (error) {
      console.error("Error checking auth:", error);
      return false;
    }
  };
  
  // Handle Book Now button click
  const handleBookNow = () => {
    console.log("Book Now clicked for:", hk.fullName);
    
    if (isAuthenticated()) {
      // User is logged in, proceed with booking logic
      console.log("User authenticated - proceeding with booking");
      alert(`Booking ${hk.fullName} - Feature coming soon!`);
      // TODO: Add actual booking logic here
    } else {
      // User not logged in, redirect to login page
      console.log("User not authenticated - redirecting to login");
      navigate("/login");
    }
  };
  
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
        <button className="hk-book-btn" onClick={handleBookNow}>
          Book Now
        </button>
      </div>
    </div>
  );
} 