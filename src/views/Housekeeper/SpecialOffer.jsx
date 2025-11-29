import React, { useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import { useNavigate } from "react-router-dom";
import "./SpecialOffer.css";

export default function SpecialOffer() {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [copiedCode, setCopiedCode] = useState(false);

  const handleSpecialOfferClick = () => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }
    
    // Copy mã giảm giá
    navigator.clipboard.writeText("FIRST20");
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleEmergencyClick = () => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }
    navigate("/quick-booking?urgency=asap");
  };

  return (
    <div className="special-offer">
      <div className="offer-card special-discount" onClick={handleSpecialOfferClick}>
        <div className="offer-icon">🎉</div>
        <div className="offer-content">
          <div className="offer-title">Special Offer: Get 20% off your first booking!</div>
          <div className="offer-code">
            Mã: <strong>FIRST20</strong>
            {copiedCode && <span className="copied-text">✓ Đã copy!</span>}
          </div>
        </div>
      </div>
      
      <div className="offer-card emergency-service" onClick={handleEmergencyClick}>
        <div className="offer-icon">🚨</div>
        <div className="offer-content">
          <div className="offer-title">Emergency Service</div>
          <div className="offer-subtitle">Need help now? Book emergency service.</div>
        </div>
      </div>
    </div>
  );
} 