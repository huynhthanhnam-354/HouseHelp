import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import RatingStars from "../Common/RatingStars";
import Button from "../Common/Button";
import { useLanguage } from "../../contexts/LanguageContext";
import { useBooking } from "../../contexts/BookingContext";
import translations from "../../locales/translations";
import "./HousekeeperCard.css";

export default function HousekeeperCard({ hk }) {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const { setHousekeeper } = useBooking();
  const { user, isAuthenticated } = useAuth();
  const t = translations[language];

  const services = Array.isArray(hk.services)
    ? hk.services
    : (hk.services || "").split(",").map(s => s.trim()).filter(Boolean);

  const rating = parseFloat(hk.rating) || 0;
  const reviewCount = parseInt(hk.reviewCount) || 0;

  // Kiểm tra xem user có phải là housekeeper không
  const isHousekeeperUser = user && user.role === 'housekeeper';

  const isAuthenticatedOld = () => {
    try {
      const userData = localStorage.getItem("househelp_user");
      const isAuth = userData && userData !== "null" && userData !== "undefined";
      return isAuth;
    } catch (error) {
      return false;
    }
  };

  const handleBookNow = () => {
    // Ngăn housekeeper đặt lịch
    if (isHousekeeperUser) {
      alert("Bạn là người giúp việc, không thể đặt lịch cho người giúp việc khác. Chỉ khách hàng mới có thể đặt lịch.");
      return;
    }

    if (isAuthenticated) {
      console.log("Original housekeeper data:", hk);
      
      // Process housekeeper data and set it in booking context
      const housekeeperId = hk.id || hk.housekeeperId; // Use real database ID only
      console.log("Using housekeeper ID:", housekeeperId);
      
      if (!housekeeperId) {
        console.error("No valid housekeeper ID found!");
        alert("Lỗi: Không tìm thấy ID người giúp việc");
        return;
      }
      
      const processedHousekeeper = {
        id: housekeeperId,
        fullName: hk.fullName || hk.name || "Unknown Housekeeper",
        rating: parseFloat(hk.rating) || 4.5,
        reviewCount: parseInt(hk.reviewCount) || 0,
        price: parseFloat(hk.price) || 25,
        services: services,
        avatar: hk.avatar || getInitials(hk.fullName || hk.name),
        experience: hk.experience || "Professional housekeeper",
        backgroundChecked: hk.backgroundChecked !== false,
        insured: hk.insured !== false,
        location: hk.location || hk.address || "Location not specified",
        bio: hk.bio || hk.description || "Professional housekeeper with experience.",
        phone: hk.phone || hk.phoneNumber || "+1 (555) 123-4567",
        availability: hk.availability || "Available today"
      };

      // Set housekeeper in booking context
      setHousekeeper(processedHousekeeper);
      
      // Navigate to booking detail page
      navigate(`/booking/${processedHousekeeper.id}`);
    } else {
      navigate("/login");
    }
  };

  // Helper function to get initials from name
  const getInitials = (name) => {
    if (!name) return "HK";
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
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
        {isHousekeeperUser ? (
          <div className="hk-info-message">
            <span className="info-icon">👀</span>
            <span className="info-text">Chỉ xem thông tin</span>
          </div>
        ) : (
          <button className="hk-book-btn" onClick={handleBookNow}>
            {t.bookNow}
          </button>
        )}
      </div>
    </div>
  );
}