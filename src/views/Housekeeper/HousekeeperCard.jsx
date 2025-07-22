import React from "react";
import RatingStars from "../Common/RatingStars";
import Button from "../Common/Button";

export default function HousekeeperCard({ hk }) {
  const services = Array.isArray(hk.services)
    ? hk.services
    : (hk.services || "").split(",").map(s => s.trim()).filter(Boolean);
  return (
    <div className="housekeeper-card">
      <div className="avatar-circle">{hk.initials}</div>
      <div className="hk-info">
        <div className="hk-name">{hk.fullName}</div>
        <RatingStars rating={hk.rating} />
        <div className="hk-services">
          {services.map((s, i) => (
            <span className="service-tag" key={i}>{s}</span>
          ))}
        </div>
        <div className="hk-price">${hk.price}</div>
        <div className="hk-availability">{hk.available ? "Available" : "Unavailable"}</div>
        <Button>Book Now</Button>
      </div>
    </div>
  );
} 