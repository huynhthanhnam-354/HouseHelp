import React from "react";

export default function RatingStars({ rating }) {
  return (
    <span className="rating-stars">
      {[1,2,3,4,5].map(i => (
        <span key={i}>{i <= Math.round(rating) ? "★" : "☆"}</span>
      ))}
    </span>
  );
} 