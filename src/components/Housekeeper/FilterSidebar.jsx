import React, { useEffect, useState } from "react";

export default function FilterSidebar() {
  const [services, setServices] = useState([]);
  const [ratings, setRatings] = useState([]);
  const [priceRange, setPriceRange] = useState({ min_price: 0, max_price: 100 });
  const [availability, setAvailability] = useState([]);
  const [selected, setSelected] = useState({});

  useEffect(() => {
    fetch("http://localhost:5000/api/filters/services").then(res => res.json()).then(setServices);
    fetch("http://localhost:5000/api/filters/ratings").then(res => res.json()).then(setRatings);
    fetch("http://localhost:5000/api/filters/price-range").then(res => res.json()).then(setPriceRange);
    fetch("http://localhost:5000/api/filters/availability").then(res => res.json()).then(setAvailability);
  }, []);

  return (
    <div className="filter-sidebar">
      <h3>Filters</h3>
      <div className="filter-section">
        <div className="filter-label">Services</div>
        <div className="filter-services-list">
          {services.map(s => (
            <label className="filter-service-tag" key={s}>
              <input type="checkbox" /> {s}
            </label>
          ))}
        </div>
      </div>
      <div className="filter-section">
        <div className="filter-label">Minimum Rating</div>
        <div className="filter-rating-list">
          {ratings.map(r => (
            <label className="filter-rating-tag" key={r}>
              <input type="radio" name="minRating" />
              <span className="filter-stars">{"★".repeat(r)}<span className="filter-stars-empty">{"☆".repeat(5 - r)}</span></span>
              {r === 5 ? "Any rating" : `${r}+ stars`}
            </label>
          ))}
        </div>
      </div>
      <div className="filter-section">
        <div className="filter-label">Price Range (${priceRange.min_price} - ${priceRange.max_price})</div>
        <input type="range" min={priceRange.min_price} max={priceRange.max_price} defaultValue={priceRange.max_price} className="filter-slider" />
      </div>
      <div className="filter-section">
        <div className="filter-label">Availability</div>
        <label className="filter-checkbox"><input type="checkbox" /> Available today</label>
        <label className="filter-checkbox"><input type="checkbox" /> Available this week</label>
      </div>
      <button className="btn clear-filters">Clear All Filters</button>
    </div>
  );
} 