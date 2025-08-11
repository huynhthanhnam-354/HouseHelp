import React from "react";
import { useNavigate } from "react-router-dom";
import RatingStars from "../Common/RatingStars";
import Button from "../Common/Button";
import { useLanguage } from "../../contexts/LanguageContext";
import translations from "../../locales/translations";
import "./HousekeeperCard.css";

export default function HousekeeperCard({ hk }) {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const t = translations[language];

  const services = Array.isArray(hk.services)
    ? hk.services
    : (hk.services || "").split(",").map(s => s.trim()).filter(Boolean);

  const rating = parseFloat(hk.rating) || 0;
  const reviewCount = parseInt(hk.reviewCount) || 0;

  const isAuthenticated = () => {
    try {
      const userData = localStorage.getItem("househelp_user");
      const isAuth = userData && userData !== "null" && userData !== "undefined";
      return isAuth;
    } catch (error) {
      return false;
    }
  };

  const handleBookNow = () => {
    if (isAuthenticated()) {
      alert(`Booking ${hk.fullName} - Feature coming soon!`);
    } else {
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
                {rating.toFixed(1)} ({reviewCount} {t.reviews})
              </span>
            </div>
            <div className="hk-availability">{t.availableToday}</div>
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
          {t.bookNow}
        </button>
      </div>
    </div>
  );
}