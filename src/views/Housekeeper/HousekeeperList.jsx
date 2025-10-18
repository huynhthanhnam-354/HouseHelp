import React, { useEffect, useState, useMemo } from "react";
import { useAuth } from "../../hooks/useAuth";
import HousekeeperCard from "./HousekeeperCard";
import io from 'socket.io-client';

function buildQuery(filter) {
  const params = [];
  if (filter.services && filter.services.length > 0) params.push(`services=${filter.services.join(",")}`);
  if (filter.exactRating) params.push(`exactRating=${filter.exactRating}`);
  if (filter.maxPrice) params.push(`maxPrice=${filter.maxPrice}`);
  if (filter.available) params.push(`available=${filter.available}`);
  return params.length ? `?${params.join("&")}` : "";
}

export default function HousekeeperList({ filter }) {
  const { user } = useAuth();
  const [housekeepers, setHousekeepers] = useState([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [previousCount, setPreviousCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Fetch housekeepers with auto-refresh
  useEffect(() => {
    console.log(`📡 Fetching housekeepers... (trigger: ${refreshTrigger})`);
    const query = buildQuery(filter || {});
    
    const fetchHousekeepers = async () => {
      try {
        setLoading(refreshTrigger === 0); // Only show loading on first fetch
        
        const response = await fetch(`http://localhost:5000/api/housekeepers${query}`);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log(`📊 Received ${data.length} housekeepers from API`);
        console.log('Housekeepers:', data.map(hk => ({ name: hk.fullName, verified: hk.isVerified, approved: hk.isApproved })));
        
        // Lọc theo vai trò người dùng
        let filteredData = data;
        if (user && user.role === 'housekeeper') {
          // Nếu là housekeeper, loại bỏ chính mình khỏi danh sách
          filteredData = data.filter(hk => hk.userId !== user.id);
          console.log(`🏠 Housekeeper user detected - filtered out self. Showing ${filteredData.length}/${data.length} housekeepers`);
        } else {
          console.log(`👤 Customer user - showing all ${data.length} housekeepers`);
        }
        
        // Kiểm tra nếu số lượng housekeeper thay đổi (chỉ log, không hiển thị toast)
        if (previousCount > 0 && filteredData.length !== previousCount) {
          console.log(`🔄 Housekeeper count changed: ${previousCount} → ${filteredData.length}`);
        }
        
        setHousekeepers(filteredData);
        setPreviousCount(filteredData.length);
      } catch (err) {
        console.error("Lỗi khi fetch housekeepers:", err);
        if (refreshTrigger === 0) { // Only set error on first fetch
          setHousekeepers([]);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchHousekeepers();
  }, [filter, refreshTrigger, previousCount, user]);

  // Auto-refresh mỗi 3 giây để cập nhật nhanh hơn
  useEffect(() => {
    console.log('🔄 Setting up auto-refresh interval (3 seconds)');
    const interval = setInterval(() => {
      console.log('⏰ Auto-refresh triggered');
      setRefreshTrigger(prev => prev + 1);
    }, 3000); // 3 seconds - cập nhật nhanh hơn
    return () => {
      console.log('🛑 Cleaning up auto-refresh interval');
      clearInterval(interval);
    };
  }, []);

  // WebSocket listener for real-time housekeeper status updates
  useEffect(() => {
    console.log('🔌 Setting up WebSocket connection for housekeeper updates');
    const socket = io('http://localhost:5000');
    
    socket.on('housekeeper_status_updated', (data) => {
      console.log('📡 Received housekeeper status update:', data);
      
      // Trigger immediate refresh (không hiển thị toast)
      setRefreshTrigger(prev => prev + 1);
    });
    
    return () => {
      console.log('🔌 Cleaning up WebSocket connection');
      socket.disconnect();
    };
  }, []);

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

  return (
    <div className="housekeeper-list">
      {filteredHousekeepers.length === 0 ? (
        <div style={{textAlign: "center", color: "#999", marginTop: "32px"}}>
          <div>
            {user && user.role === 'housekeeper' 
              ? "Không tìm thấy người giúp việc khác phù hợp." 
              : "Không tìm thấy người giúp việc phù hợp."
            }
          </div>
          {housekeepers.length > 0 && (
            <div style={{fontSize: "14px", marginTop: "8px"}}>
              Có {housekeepers.length} người giúp việc nhưng không khớp với bộ lọc hiện tại.
            </div>
          )}
          {housekeepers.length === 0 && (
            <div style={{fontSize: "14px", marginTop: "8px"}}>
              {user && user.role === 'housekeeper' 
                ? "Chưa có người giúp việc khác trong hệ thống." 
                : "Chưa có dữ liệu người giúp việc trong hệ thống."
              }
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