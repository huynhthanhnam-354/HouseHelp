import React, { useEffect, useState, useMemo, useCallback } from "react";
import HousekeeperCard from "./HousekeeperCard";

function buildQuery(filter) {
  const params = [];
  if (filter.services && filter.services.length > 0) params.push(`services=${filter.services.join(",")}`);
  if (filter.exactRating) params.push(`exactRating=${filter.exactRating}`);
  if (filter.maxPrice) params.push(`maxPrice=${filter.maxPrice}`);
  if (filter.available) params.push(`available=${filter.available}`);
  return params.length ? `?${params.join("&")}` : "";
}

export default function HousekeeperList({ filter }) {
  const [housekeepers, setHousekeepers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hasFetched, setHasFetched] = useState(false);

  // Fetch data only once when component mounts
  useEffect(() => {
    if (hasFetched) return; // Prevent multiple fetches

    const fetchHousekeepers = async () => {
      try {
        setLoading(true);
        setError(null);
        
        console.log("Fetching from:", `http://localhost:5000/api/housekeepers`);
        
        const response = await fetch(`http://localhost:5000/api/housekeepers`);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log("Dữ liệu trả về từ API:", data);
        
        // Ensure data is array
        if (Array.isArray(data)) {
          setHousekeepers(data);
          console.log("Số lượng housekeepers:", data.length);
        } else {
          console.error("API không trả về array:", data);
          setHousekeepers([]);
          setError("Dữ liệu không hợp lệ từ server");
        }
      } catch (err) {
        console.error("Lỗi khi fetch housekeepers:", err);
        setError(`Không thể kết nối với server: ${err.message}`);
        setHousekeepers([]);
      } finally {
        setLoading(false);
        setHasFetched(true);
      }
    };

    fetchHousekeepers();
  }, []); // Empty dependency array - only run once

  // Client-side filtering
  const filteredHousekeepers = useMemo(() => {
    if (!filter) return housekeepers;
    
    return housekeepers.filter(hk => {
      // Filter by keyword (search)
      if (filter.keyword && filter.keyword.trim() !== "") {
        const keyword = filter.keyword.trim().toLowerCase();
        const services = hk.services ? hk.services.toLowerCase() : "";
        const fullName = hk.fullName ? hk.fullName.toLowerCase() : "";
        if (!services.includes(keyword) && !fullName.includes(keyword)) {
          return false;
        }
      }
      
      // Filter by minimum rating
      if (filter.exactRating && (parseFloat(hk.rating) < parseFloat(filter.exactRating) || parseFloat(hk.rating) >= parseFloat(filter.exactRating) + 1)) {
        return false;
      }
      
      // Filter by max price
      if (filter.maxPrice && parseFloat(hk.price) > parseFloat(filter.maxPrice)) {
        return false;
      }
      
      // Filter by availability
      if (filter.available && hk.available !== filter.available) {
        return false;
      }
      
      // Filter by services
      if (filter.services && filter.services.length > 0) {
        const hkServices = hk.services ? hk.services.toLowerCase() : "";
        const hasMatchingService = filter.services.some(service => 
          hkServices.includes(service.toLowerCase())
        );
        if (!hasMatchingService) {
          return false;
        }
      }
      
      return true;
    });
  }, [housekeepers, filter]);

  // Hiển thị tất cả housekeepers (không giới hạn 3 cards)
  const displayList = filteredHousekeepers;

  // ...existing code...
  
  // Show loading state
  if (loading) {
    return (
      <div className="housekeeper-list">
        <div style={{textAlign: "center", color: "#666", marginTop: "32px"}}>
          <div>Đang tải danh sách người giúp việc...</div>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="housekeeper-list">
        <div style={{textAlign: "center", color: "#ff4444", marginTop: "32px"}}>
          <div>{error}</div>
          <button 
            onClick={() => window.location.reload()} 
            style={{
              marginTop: "16px", 
              padding: "8px 16px", 
              backgroundColor: "#4285F4", 
              color: "white", 
              border: "none", 
              borderRadius: "4px",
              cursor: "pointer"
            }}
          >
            Thử lại
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="housekeeper-list">
      {filteredHousekeepers.length === 0 ? (
        <div style={{textAlign: "center", color: "#999", marginTop: "32px"}}>
          <div>Không tìm thấy người giúp việc phù hợp.</div>
          {housekeepers.length > 0 && (
            <div style={{fontSize: "14px", marginTop: "8px"}}>
              Có {housekeepers.length} người giúp việc nhưng không khớp với bộ lọc hiện tại.
            </div>
          )}
          {housekeepers.length === 0 && (
            <div style={{fontSize: "14px", marginTop: "8px"}}>
              Chưa có dữ liệu người giúp việc trong hệ thống.
            </div>
          )}
        </div>
      ) : (
        displayList.map((hk) => (
          <HousekeeperCard key={hk.id} hk={hk} />
        ))
      )}
    </div>
  );
}