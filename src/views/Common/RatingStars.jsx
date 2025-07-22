import React from "react";

export default function RatingStars({ rating }) {
  const componentId = Date.now() + Math.random();
  return (
    <span className="rating-stars">
      {[1,2,3,4,5].map(i => (
        <span key={`star-${componentId}-${i}`}>{i <= Math.round(rating) ? "★" : "☆"}</span>
      ))}
    </span>
  );
} 