import React from "react";
import { useLanguage } from "../../contexts/LanguageContext";
import { useAuth } from "../../hooks/useAuth";
import translations from "../../locales/translations";
import RatingStars from "../Common/RatingStars";
import "./BookingCompleted.css";

export default function BookingCompleted({ housekeeper, booking, onBack }) {
  const { language } = useLanguage();
  const { user } = useAuth();
  const t = translations[language];

  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const generateBookingId = () => {
    return `BK-${Date.now().toString().slice(-6)}`;
  };

  return (
    <div className="booking-completed-container">
      {/* Header with Status */}
      <div className="completion-header">
        <div className="status-badge completed">
          {t.completed || "Completed"}
        </div>
        <div className="booking-id">
          {t.bookingID || "Booking ID"}: {generateBookingId()}
        </div>
        <div className="action-buttons">
          <button className="reschedule-btn">
            {t.reschedule || "Reschedule"}
          </button>
          <button className="cancel-btn">
            {t.cancel || "Cancel"}
          </button>
        </div>
      </div>

      {/* Service Information */}
      <div className="service-info-section">
        <h2>{t.serviceInformation || "Service Information"}</h2>
        
        <div className="service-type">
          <span className="service-label">{t.serviceType || "Service Type"}</span>
          <span className="service-value">{booking.service || "House Cleaning"}</span>
        </div>

        <div className="service-location">
          <span className="location-label">{t.location || "Location"}</span>
          <span className="location-value">
            {booking.location || "123 Main Street, Apt 4B"}
          </span>
          <span className="location-sub">New York, NY 10001</span>
        </div>

        <div className="service-timing">
          <div className="timing-item">
            <span className="timing-label">{t.dateTime || "Date & Time"}</span>
            <span className="timing-value">
              {booking.date ? formatDate(booking.date) : "March 15, 2024 at 2:00 PM"}
            </span>
          </div>
          <div className="timing-item">
            <span className="timing-label">{t.duration || "Duration"}</span>
            <span className="timing-value">{booking.duration || 3} {t.hours || "hours"}</span>
          </div>
        </div>

        <div className="special-instructions">
          <span className="instructions-label">{t.specialInstructions || "Special Instructions"}</span>
          <span className="instructions-value">
            {booking.notes || "Please focus on kitchen and bathrooms. Pet-friendly products only."}
          </span>
          <span className="contact-info">
            {t.contact || "Contact"}: Maria (555) 123-4567
          </span>
        </div>
      </div>

      {/* Housekeeper Information */}
      <div className="housekeeper-info-section">
        <h2>{t.housekeeperInformation || "Housekeeper Information"}</h2>
        
        <div className="hk-profile">
          <div className="hk-avatar">{housekeeper?.avatar || "MS"}</div>
          <div className="hk-details">
            <div className="hk-name">{housekeeper?.fullName || "Maria Santos"}</div>
            <div className="hk-rating">
              <RatingStars rating={housekeeper?.rating || 4.8} />
              <span className="rating-value">
                {housekeeper?.rating || 4.8} ({housekeeper?.reviewCount || 127} {t.reviews})
              </span>
            </div>
            <div className="hk-badge-container">
              <span className="hk-badge cleaning">
                {t.cleaning || "Cleaning"}
              </span>
              <span className="hk-badge cooking">
                {t.cooking || "Cooking"}  
              </span>
              <span className="hk-badge pet-care">
                {t.petCare || "Pet Care"}
              </span>
            </div>
            <div className="hk-experience">
              {housekeeper?.experience || "5+ years experience"} • {t.backgroundChecked || "Background checked"} • {t.insured || "Insured"}
            </div>
          </div>
          <div className="hk-price">
            <span className="price-amount">${housekeeper?.price || 25}</span>
            <span className="price-unit">/hour</span>
          </div>
        </div>
      </div>

      {/* Price Breakdown */}
      <div className="price-breakdown-section">
        <h2>{t.priceBreakdown || "Price Breakdown"}</h2>
        
        <div className="price-items">
          <div className="price-item">
            <span>{t.service || "Service"} ({booking.duration || 3} {t.hours || "hours"} × ${housekeeper?.price || 25}/hr)</span>
            <span>${((booking.duration || 3) * (housekeeper?.price || 25)).toFixed(2)}</span>
          </div>
          <div className="price-item">
            <span>{t.platformFee || "Platform fee"}</span>
            <span>$5.00</span>
          </div>
          <div className="price-item">
            <span>{t.serviceFee || "Service fee"}</span>
            <span>$5.00</span>
          </div>
        </div>
        
        <div className="price-total">
          <span>{t.total || "Total"}</span>
          <span>${(((booking.duration || 3) * (housekeeper?.price || 25)) + 10).toFixed(2)}</span>
        </div>
      </div>

      {/* Booking Timeline */}
      <div className="timeline-section">
        <h2>{t.bookingTimeline || "Booking Timeline"}</h2>
        
        <div className="timeline">
          <div className="timeline-item completed">
            <div className="timeline-icon">✓</div>
            <div className="timeline-content">
              <div className="timeline-title">{t.bookingCreated || "Booking Created"}</div>
              <div className="timeline-time">March 14, 2024 at 10:39 AM</div>
            </div>
          </div>
          
          <div className="timeline-item completed">
            <div className="timeline-icon">✓</div>
            <div className="timeline-content">
              <div className="timeline-title">{t.bookingConfirmed || "Booking Confirmed"}</div>
              <div className="timeline-time">March 14, 2024 at 11:15 AM</div>
            </div>
          </div>
          
          <div className="timeline-item completed">
            <div className="timeline-icon">✓</div>
            <div className="timeline-content">
              <div className="timeline-title">{t.serviceInProgress || "Service In Progress"}</div>
              <div className="timeline-time">March 15, 2024 at 2:00 PM</div>
            </div>
          </div>
          
          <div className="timeline-item completed">
            <div className="timeline-icon">✓</div>
            <div className="timeline-content">
              <div className="timeline-title">{t.serviceCompleted || "Service Completed"}</div>
              <div className="timeline-time">March 15, 2024 at 5:00 PM</div>
            </div>
          </div>
        </div>
      </div>

      {/* Rate Experience */}
      <div className="rating-section">
        <h2>{t.rateYourExperience || "Rate Your Experience"}</h2>
        <p>{t.howWouldYouRate || "How would you rate Maria's service?"}</p>
        
        <div className="rating-stars-large">
          <RatingStars rating={0} size="large" interactive={true} />
        </div>
        
        <textarea 
          className="feedback-textarea"
          placeholder={t.shareFeedback || "Share your feedback (optional)"}
          rows="3"
        />
        
        <button className="submit-rating-btn">
          {t.submitRating || "Submit Rating"}
        </button>
      </div>

      {/* Need Help */}
      <div className="help-section">
        <h2>{t.needHelp || "Need Help?"}</h2>
        <p>{t.havingIssues || "Having issues with your booking? Our support team is here to help."}</p>
        
        <button className="report-issue-btn">
          {t.reportIssue || "Report Issue"}
        </button>
      </div>

      {/* Back to Home */}
      <div className="back-section">
        <button className="back-home-btn" onClick={onBack}>
          {t.backToHome || "Back to Home"}
        </button>
      </div>
    </div>
  );
}
