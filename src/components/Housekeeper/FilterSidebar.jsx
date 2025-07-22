import React, { useEffect, useState } from "react";

export default function FilterSidebar({ onFilterChange }) {
  const [services, setServices] = useState([]);
  const [ratings, setRatings] = useState([]);
  const [priceRange, setPriceRange] = useState({ min_price: 0, max_price: 100 });
  const [availability, setAvailability] = useState([]);
  const [filter, setFilter] = useState({
    services: [],
    minRating: null,
    minPrice: null,
    maxPrice: null,
    available: null,
  });
  
  // Generate unique ID for this component instance
  const [componentId] = useState(() => Date.now() + Math.random());

  useEffect(() => {
    fetch("http://localhost:5000/api/filters/services").then(res => res.json()).then(data => {
      console.log("Services data:", data);
      setServices(data);
    });
    fetch("http://localhost:5000/api/filters/ratings").then(res => res.json()).then(data => {
      console.log("Ratings data:", data);
      setRatings(data);
    });
    fetch("http://localhost:5000/api/filters/price-range").then(res => res.json()).then(setPriceRange);
    fetch("http://localhost:5000/api/filters/availability").then(res => res.json()).then(setAvailability);
  }, []);

  useEffect(() => {
    if (onFilterChange) onFilterChange(filter);
  }, [filter, onFilterChange]);

  const handleService = s => {
    setFilter(f => ({
      ...f,
      services: f.services.includes(s)
        ? f.services.filter(x => x !== s)
        : [...f.services, s],
    }));
  };
  const handleRating = r => setFilter(f => ({ ...f, minRating: r }));
  const handlePrice = e => setFilter(f => ({ ...f, maxPrice: Number(e.target.value) }));
  const handleAvailable = e => setFilter(f => ({ ...f, available: e.target.checked ? 1 : null }));
  const handleClear = () => setFilter({ services: [], minRating: null, minPrice: null, maxPrice: null, available: null });

  const uniqueRatings = [...new Set(ratings)].filter(r => r != null);
  const uniqueServices = [...new Set(services)].filter(s => s != null && s !== "");
  
  console.log("Unique ratings:", uniqueRatings);
  console.log("Unique services:", uniqueServices);

  return (
    <div className="filter-sidebar">
      <h3>Filters</h3>
      <div className="filter-section">
        <div className="filter-label">Services</div>
        <div className="filter-services-list">
          {uniqueServices.map((s, idx) => (
            <label className="filter-service-tag" key={`service-${componentId}-${idx}`}>
              <input type="checkbox" checked={filter.services.includes(s)} onChange={() => handleService(s)} /> {s}
            </label>
          ))}
        </div>
      </div>
      <div className="filter-section">
        <div className="filter-label">Minimum Rating</div>
        <div className="filter-rating-list">
          {uniqueRatings.map((r, idx) => (
            <label className="filter-rating-tag" key={`rating-${componentId}-${idx}`}>
              <input type="radio" name={`minRating-${componentId}`} checked={filter.minRating === r} onChange={() => handleRating(r)} />
              <span className="filter-stars">{"★".repeat(r)}<span className="filter-stars-empty">{"☆".repeat(5 - r)}</span></span>
              {r === 5 ? "Any rating" : `${r}+ stars`}
            </label>
          ))}
        </div>
      </div>
      <div className="filter-section">
        <div className="filter-label">Price Range (${priceRange.min_price} - ${priceRange.max_price})</div>
        <input type="range" min={priceRange.min_price} max={priceRange.max_price} value={filter.maxPrice || priceRange.max_price} onChange={handlePrice} className="filter-slider" />
      </div>
      <div className="filter-section">
        <div className="filter-label">Availability</div>
        <label className="filter-checkbox"><input type="checkbox" checked={!!filter.available} onChange={handleAvailable} /> Available today</label>
      </div>
      <button className="btn clear-filters" onClick={handleClear}>Clear All Filters</button>
    </div>
  );
} 