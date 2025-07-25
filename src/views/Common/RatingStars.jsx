import React from "react";

export default function RatingStars({ rating }) {
  const componentId = Date.now() + Math.random();
  const roundedRating = Math.round(rating * 2) / 2; // Round to nearest 0.5
  
  return (
    <span className="rating-stars-new">
      {[1,2,3,4,5].map(i => {
        let starClass = "star-empty";
        if (i <= Math.floor(roundedRating)) {
          starClass = "star-full";
        } else if (i === Math.ceil(roundedRating) && roundedRating % 1 !== 0) {
          starClass = "star-half";
        }
        
        return (
          <span key={`star-${componentId}-${i}`} className={`star ${starClass}`}>
            ★
          </span>
        );
      })}
    </span>
  );
} 