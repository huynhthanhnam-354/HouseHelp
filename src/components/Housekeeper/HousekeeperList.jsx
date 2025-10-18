import React, { useEffect, useState } from "react";
import HousekeeperCard from "./HousekeeperCard";

// Simple toast notification component
const Toast = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000); // Auto close after 4 seconds
    return () => clearTimeout(timer);
  }, [onClose]);

  const getBackgroundColor = () => {
    switch(type) {
      case 'success': return '#4CAF50';
      case 'warning': return '#FF5722';
      case 'info': return '#2196F3';
      default: return '#FF5722';
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: '20px',
      right: '20px',
      background: getBackgroundColor(),
      color: 'white',
      padding: '12px 20px',
      borderRadius: '8px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
      zIndex: 1000,
      fontSize: '14px',
      fontWeight: '500',
      maxWidth: '300px'
    }}>
      {message}
      <button 
        onClick={onClose}
        style={{
          background: 'none',
          border: 'none',
          color: 'white',
          marginLeft: '10px',
          cursor: 'pointer',
          fontSize: '16px'
        }}
      >
        ×
      </button>
    </div>
  );
};

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
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [previousCount, setPreviousCount] = useState(0);
  const [toast, setToast] = useState(null);
  
  useEffect(() => {
    console.log(`📡 Fetching housekeepers... (trigger: ${refreshTrigger})`);
    const query = buildQuery(filter || {});
    fetch(`http://localhost:5000/api/housekeepers${query}`)
      .then(res => res.json())
      .then(data => {
        console.log(`📊 Received ${data.length} housekeepers from API`);
        console.log('Housekeepers:', data.map(hk => ({ name: hk.fullName, verified: hk.isVerified, approved: hk.isApproved })));
        
        // Kiểm tra nếu số lượng housekeeper thay đổi (có người mới được xác minh hoặc bị hủy xác minh)
        if (previousCount > 0 && data.length !== previousCount) {
          console.log(`🔄 Housekeeper count changed: ${previousCount} → ${data.length}`);
          // Hiển thị thông báo cho user
          if (data.length > previousCount) {
            setToast({
              message: `🎉 Có ${data.length - previousCount} người giúp việc mới được xác minh!`,
              type: 'success'
            });
          } else {
            setToast({
              message: `⚠️ Một số người giúp việc đã bị hủy xác minh`,
              type: 'warning'
            });
          }
        }
        
        setHousekeepers(data);
        setPreviousCount(data.length);
      })
      .catch(error => console.error('Error fetching housekeepers:', error));
  }, [filter, refreshTrigger, previousCount]);

  // Auto-refresh mỗi 5 giây để cập nhật trạng thái xác minh nhanh hơn
  useEffect(() => {
    console.log('🔄 Setting up auto-refresh interval (5 seconds)');
    const interval = setInterval(() => {
      console.log('⏰ Auto-refresh triggered');
      setRefreshTrigger(prev => prev + 1);
    }, 5000); // 5 seconds - nhanh hơn để phát hiện thay đổi
    return () => {
      console.log('🛑 Cleaning up auto-refresh interval');
      clearInterval(interval);
    };
  }, []);

  // Function để manual refresh
  const handleManualRefresh = () => {
    console.log('🔄 Manual refresh triggered');
    setRefreshTrigger(prev => prev + 1);
    setToast({
      message: '🔄 Đang làm mới danh sách...',
      type: 'info'
    });
  };

  // Function để force reload page
  const handleForceReload = () => {
    console.log('🔄 Force reload page');
    window.location.reload();
  };

  // Lọc theo từ khóa nếu có
  let filteredHousekeepers = housekeepers;
  if (filter && filter.keyword && filter.keyword.trim() !== "") {
    const keyword = filter.keyword.trim().toLowerCase();
    filteredHousekeepers = housekeepers.filter(hk => {
      const services = hk.services ? hk.services.toLowerCase() : "";
      const fullName = hk.fullName ? hk.fullName.toLowerCase() : "";
      return services.includes(keyword) || fullName.includes(keyword);
    });
  }

  // Hiển thị tất cả housekeepers (không giới hạn 3 cards)
  const displayList = filteredHousekeepers;

  return (
    <div className="housekeeper-list">
      {/* Toast notification */}
      {toast && (
        <Toast 
          message={toast.message} 
          type={toast.type} 
          onClose={() => setToast(null)} 
        />
      )}

      {/* Nút refresh manual */}
      <div className="refresh-section" style={{
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '20px',
        padding: '10px 0'
      }}>
        <div style={{fontSize: '14px', color: '#666'}}>
          Tự động cập nhật mỗi 5 giây • {housekeepers.length} người giúp việc • Lần cuối: {new Date().toLocaleTimeString('vi-VN')}
        </div>
        <div style={{display: 'flex', gap: '10px'}}>
          <button 
            onClick={handleManualRefresh}
            style={{
              background: '#4285F4',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              padding: '8px 16px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
            onMouseOver={(e) => e.target.style.background = '#3367d6'}
            onMouseOut={(e) => e.target.style.background = '#4285F4'}
          >
            🔄 Làm mới
          </button>
          <button 
            onClick={handleForceReload}
            style={{
              background: '#FF5722',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              padding: '8px 16px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
            onMouseOver={(e) => e.target.style.background = '#E64A19'}
            onMouseOut={(e) => e.target.style.background = '#FF5722'}
            title="Reload toàn bộ trang"
          >
            ⚡ Force Reload
          </button>
        </div>
      </div>

      {filteredHousekeepers.length === 0 ? (
        <div style={{textAlign: "center", color: "#999", marginTop: "32px"}}>
          Không tìm thấy kết quả phù hợp.
        </div>
      ) : (
        displayList.map((hk) => (
          <HousekeeperCard key={hk.id} hk={hk} />
        ))
      )}
    </div>
  );
} 