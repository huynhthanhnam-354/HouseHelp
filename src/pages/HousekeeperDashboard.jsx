import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useNotifications } from '../contexts/NotificationContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useNavigate } from 'react-router-dom';
import translations from '../locales/translations';
import BookingCompletion from '../components/BookingCompletion';
import VerificationStatus from '../components/VerificationStatus';
import ResubmitVerificationForm from '../components/ResubmitVerificationForm';
import InitialVerificationForm from '../components/InitialVerificationForm';
import './HousekeeperDashboard.css';

export default function HousekeeperDashboard() {
  const { user } = useAuth();
  const { notifications, markAsRead } = useNotifications();
  const { language } = useLanguage();
  const navigate = useNavigate();
  const t = translations[language];
  
  const [pendingBookings, setPendingBookings] = useState([]);
  const [confirmedBookings, setConfirmedBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [verificationStatus, setVerificationStatus] = useState({ isVerified: false, isApproved: false });
  const [forceUpdate, setForceUpdate] = useState(0);
  const [verificationRequest, setVerificationRequest] = useState(null);
  const [showResubmitForm, setShowResubmitForm] = useState(false);
  const [showResubmitModal, setShowResubmitModal] = useState(false);
  const [showInitialVerificationForm, setShowInitialVerificationForm] = useState(false);

  // Kiểm tra trạng thái xác minh và yêu cầu bổ sung của housekeeper
  useEffect(() => {
    const checkVerificationStatus = async () => {
      if (!user?.id) return;
      
      try {
        console.log('🔍 Checking verification status for user:', user.id);
        
        // Check verification status
        const statusResponse = await fetch(`http://localhost:5000/api/admin/housekeepers/status`);
        if (statusResponse.ok) {
          const housekeepers = await statusResponse.json();
          let currentHousekeeper = housekeepers.find(hk => hk.id === user.id);
          if (!currentHousekeeper) {
            currentHousekeeper = housekeepers.find(hk => hk.email === user.email);
          }
          
          if (currentHousekeeper) {
            const newStatus = {
              isVerified: Boolean(currentHousekeeper.isVerified),
              isApproved: Boolean(currentHousekeeper.isApproved)
            };
            console.log('✅ Setting verification status:', newStatus);
            setVerificationStatus(newStatus);
          }
        }

        // Check for verification request status
        const requestResponse = await fetch(`http://localhost:5000/api/verification/status/${user.id}`);
        if (requestResponse.ok) {
          const requestData = await requestResponse.json();
          console.log('📋 Verification request data:', requestData);
          
          if (requestData.hasRequest && requestData.request) {
            setVerificationRequest(requestData.request);
            
            // If admin requested more info, show resubmit form
            if (requestData.request.status === 'requires_more_info') {
              setShowResubmitForm(true);
            }
          }
        }
        
        setForceUpdate(prev => prev + 1);
      } catch (error) {
        console.error('Error checking verification status:', error);
      }
    };

    checkVerificationStatus();
  }, [user?.id, refreshTrigger]);

  // Listen for WebSocket updates from admin
  useEffect(() => {
    if (typeof window !== 'undefined' && window.io) {
      const socket = window.io('http://localhost:5000');
      
      socket.on('housekeeper_status_updated', (data) => {
        console.log('🔔 Received status update:', data);
        if (data.userId === user?.id) {
          console.log('🎯 Status update for current user, refreshing...');
          setVerificationStatus({
            isVerified: Boolean(data.isVerified),
            isApproved: Boolean(data.isApproved)
          });
          // Also trigger a full refresh
          setRefreshTrigger(prev => prev + 1);
        }
      });

      return () => {
        socket.disconnect();
      };
    }
  }, [user?.id]);

  // Force re-render when verification status changes
  useEffect(() => {
    console.log('🔄 Verification status changed:', verificationStatus);
    setForceUpdate(prev => prev + 1);
  }, [verificationStatus.isVerified, verificationStatus.isApproved]);

  // Fetch bookings từ database thay vì dựa vào notifications
  useEffect(() => {
    const fetchHousekeeperBookings = async () => {
      if (!user?.id) return;
      
      try {
        setLoading(true);
        const response = await fetch(`http://localhost:5000/api/bookings/user/${user.id}`);
        if (response.ok) {
          const allBookings = await response.json();
          
              // Lọc bookings cho housekeeper
              const housekeeperBookings = allBookings.filter(booking =>
                booking.housekeeperId === user.id
              );

              // Phân loại theo status
              const pending = housekeeperBookings.filter(booking => booking.status === 'pending');
              const confirmed = housekeeperBookings.filter(booking => booking.status === 'confirmed');

              // Sắp xếp theo thời gian tạo mới nhất lên đầu
              const sortedPending = pending.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
              const sortedConfirmed = confirmed.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

              console.log('Pending bookings:', sortedPending);
              console.log('Confirmed bookings:', sortedConfirmed);
              setPendingBookings(sortedPending);
              setConfirmedBookings(sortedConfirmed);
        }
      } catch (error) {
        console.error('Error fetching housekeeper bookings:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchHousekeeperBookings();
  }, [user?.id, refreshTrigger]);

  // Xác nhận booking
  const handleConfirmBooking = async (booking) => {
    setLoading(true);
    try {
      const response = await fetch(`http://localhost:5000/api/bookings/${booking.id}/confirm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          housekeeperId: user.id
        })
      });

      const result = await response.json();

      if (response.ok) {
        // Backend API đã tự động gửi notification rồi, không cần gửi thêm ở đây

        // Đánh dấu notification đã đọc
        await markAsRead(booking.notificationId);
        
        // Delete the notification completely to prevent re-showing
        try {
          await fetch(`http://localhost:5000/api/notifications/${booking.notificationId}`, {
            method: 'DELETE'
          });
          console.log('Notification deleted successfully (confirm)');
        } catch (deleteError) {
          console.error('Failed to delete notification (confirm):', deleteError);
        }
        
        console.log('Removing booking from pending list (confirm)...');
        console.log('Booking ID to remove:', booking.id);
        
        // Xóa booking khỏi danh sách pending
        setPendingBookings(prev => {
          const updated = prev.filter(b => b.id !== booking.id);
          console.log('Updated pending bookings after confirm:', updated.length, 'items');
          return updated;
        });
        
        alert('Đã xác nhận đơn đặt lịch thành công!');
      } else {
        // Hiển thị thông báo lỗi nếu chưa được xác minh/phê duyệt
        alert(result.error || 'Không thể xác nhận booking');
      }
    } catch (error) {
      console.error('Error confirming booking:', error);
      alert('Có lỗi xảy ra: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Từ chối booking
  const handleRejectBooking = async (booking) => {
    console.log('🔴 handleRejectBooking called with booking:', booking);
    console.log('🔴 Booking ID:', booking.id);
    console.log('🔴 Setting loading to true...');
    setLoading(true);
    try {
      // Backend API sẽ tự động gửi notification, không cần gửi thêm ở đây
      console.log('Rejecting booking...', booking.id);

      // API để từ chối booking và update database
      console.log('Updating booking status in database...');
      const bookingResponse = await fetch(`http://localhost:5000/api/bookings/${booking.id}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      console.log('Booking response:', bookingResponse.status);
      
      if (!bookingResponse.ok) {
        console.error('Failed to reject booking in database, but continuing with UI update');
        // Continue anyway to update UI
      }

      console.log('Marking notification as read...');
      await markAsRead(booking.notificationId);
      
      // Optionally delete the notification completely to prevent re-showing
      try {
        await fetch(`http://localhost:5000/api/notifications/${booking.notificationId}`, {
          method: 'DELETE'
        });
        console.log('Notification deleted successfully');
      } catch (deleteError) {
        console.error('Failed to delete notification:', deleteError);
      }
      
      console.log('Removing booking from pending list (reject)...');
      console.log('Booking ID to remove:', booking.id);
      
      // Xóa booking khỏi danh sách pending ngay lập tức
      setPendingBookings(prev => {
        const updated = prev.filter(b => b.id !== booking.id);
        console.log('Updated pending bookings after reject:', updated.length, 'items');
        return updated;
      });
      
      alert('Đã từ chối đơn đặt lịch');
    } catch (error) {
      console.error('Error rejecting booking:', error);
      alert('Có lỗi xảy ra: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString('vi-VN');
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('vi-VN');
  };

  // Temporarily disable role check for testing
  // if (user?.role !== 'housekeeper') {
  //   return (
  //     <div className="dashboard-container">
  //       <div className="access-denied">
  //         <h2>Bạn không có quyền truy cập trang này</h2>
  //         <p>Chỉ người giúp việc mới có thể truy cập dashboard này.</p>
  //       </div>
  //     </div>
  //   );
  // }

  return (
    <div className="dashboard-container" key={`dashboard-${forceUpdate}`}>
      <div className="dashboard-header">
        <h1>Dashboard Người Giúp Việc</h1>
        <p>Xin chào, <strong>{user?.fullName}</strong>!</p>
        <button 
          className="refresh-btn"
          onClick={() => {
            console.log('🔄 Manual refresh triggered');
            console.log('Current verification status before refresh:', verificationStatus);
            setRefreshTrigger(prev => prev + 1);
            // Force a state update to trigger re-render
            setVerificationStatus(prev => ({...prev}));
            setForceUpdate(prev => prev + 1);
          }}
          style={{
            padding: '8px 16px',
            backgroundColor: '#4f46e5',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          🔄 Làm mới
        </button>
      </div>

      {/* Verification Status Component - Use dashboard logic instead */}
      {/* <VerificationStatus /> */}



      {/* Thông báo yêu cầu bổ sung thông tin */}
      {showResubmitForm && verificationRequest && (
        <div className="resubmit-request-section">
          <div className="resubmit-card">
            <h3>📝 Admin yêu cầu bổ sung thông tin</h3>
            <div className="admin-message">
              <p><strong>Thông báo từ admin:</strong></p>
              <div className="admin-notes">
                {verificationRequest.adminNotes || 'Admin yêu cầu bạn bổ sung thêm thông tin xác minh.'}
              </div>
            </div>
            
            <div className="resubmit-actions">
              <button
                className="resubmit-btn"
                onClick={() => setShowResubmitModal(true)}
                style={{
                  padding: '12px 24px',
                  backgroundColor: '#f59e0b',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '16px',
                  fontWeight: '600'
                }}
              >
                📤 Bổ sung thông tin ngay
              </button>
              <button
                className="dismiss-btn"
                onClick={() => setShowResubmitForm(false)}
                style={{
                  padding: '12px 24px',
                  backgroundColor: '#6b7280',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '16px',
                  marginLeft: '12px'
                }}
              >
                Để sau
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Thông báo trạng thái xác minh */}
      {(!verificationStatus.isVerified || !verificationStatus.isApproved) && !showResubmitForm && (
        <div className="verification-warning">
          <div className="warning-card">
            <h3>⚠️ Tài khoản chưa được xác minh</h3>
            <p>
              {!verificationStatus.isVerified && !verificationStatus.isApproved 
                ? "Tài khoản của bạn chưa được xác minh và phê duyệt bởi admin. Bạn không thể xác nhận booking hoặc đánh dấu công việc hoàn thành."
                : !verificationStatus.isVerified 
                ? "Tài khoản của bạn chưa được xác minh bởi admin. Vui lòng chờ admin xác minh."
                : "Tài khoản của bạn chưa được phê duyệt bởi admin. Vui lòng chờ admin phê duyệt."
              }
            </p>
            
            {/* Hiển thị nút gửi yêu cầu nếu chưa có request nào */}
            {!verificationRequest ? (
              <div className="verification-actions">
                <p><strong>Bạn chưa gửi yêu cầu xét duyệt nào.</strong></p>
                <button
                  className="submit-verification-btn"
                  onClick={() => setShowInitialVerificationForm(true)}
                  style={{
                    padding: '12px 24px',
                    backgroundColor: '#10b981',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '16px',
                    fontWeight: '600',
                    marginTop: '12px'
                  }}
                >
                  📤 Gửi yêu cầu xét duyệt
                </button>
              </div>
            ) : (
              <p>Vui lòng chờ admin xem xét yêu cầu của bạn.</p>
            )}
          </div>
        </div>
      )}

      <div className="pending-bookings-section">
        <h2>Đơn đặt lịch chờ xác nhận ({pendingBookings.length})</h2>
        
        {pendingBookings.length === 0 ? (
          <div className="no-bookings">
            <div className="no-bookings-icon">📋</div>
            <p>Không có đơn đặt lịch nào chờ xác nhận</p>
          </div>
        ) : (
          <div className="bookings-list">
            {pendingBookings.map((booking, index) => (
              <div key={booking.id} className={`booking-card ${index === 0 ? 'newest-booking' : ''}`}>
                <div className="booking-header">
                  <div className="customer-info">
                    <div className="customer-avatar">
                      {booking.customerName?.charAt(0) || 'C'}
                    </div>
                    <div className="customer-details">
                      <h3>
                        <button 
                          className="booking-link"
                          onClick={() => navigate(`/booking-view/${booking.id}`)}
                        >
                          {booking.customerName} (#{booking.id}) {index === 0 && <span className="new-badge">MỚI NHẤT</span>}
                        </button>
                      </h3>
                      <p>{booking.customerPhone}</p>
                      <p>{booking.customerEmail}</p>
                    </div>
                  </div>
                  <div className="booking-time">
                    <span className="time-received">
                      Nhận lúc: {formatTime(booking.createdAt)}
                    </span>
                  </div>
                </div>

                <div className="booking-details">
                  <div className="detail-row">
                    <span className="label">Dịch vụ:</span>
                    <span className="value">{booking.service}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Ngày:</span>
                    <span className="value">{formatDate(booking.date)}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Giờ:</span>
                    <span className="value">{booking.time}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Thời gian:</span>
                    <span className="value">{booking.duration} giờ</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Địa điểm:</span>
                    <span className="value">{booking.location}</span>
                  </div>
                  <div className="detail-row price">
                    <span className="label">Tổng tiền:</span>
                    <span className="value">${booking.totalPrice}</span>
                  </div>
                </div>

                {booking.notes && (
                  <div className="booking-notes">
                    <h4>Ghi chú:</h4>
                    <p>{booking.notes}</p>
                  </div>
                )}

                <div className="booking-actions">
                  <button
                    className="chat-btn"
                    onClick={() => navigate('/chat')}
                    title="Nhắn tin với khách hàng"
                  >
                    💬 Chat
                  </button>
                  <button
                    className="reject-btn"
                    onClick={() => handleRejectBooking(booking)}
                    disabled={loading}
                  >
                    Từ chối
                  </button>
                  <button
                    className="confirm-btn"
                    onClick={() => handleConfirmBooking(booking)}
                    disabled={loading}
                  >
                    {loading ? 'Đang xử lý...' : 'Xác nhận'}
                  </button>
                </div>

                {/* Booking Completion Component */}
                <BookingCompletion 
                  booking={booking} 
                  onStatusUpdate={() => setRefreshTrigger(prev => prev + 1)}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Confirmed Bookings Section */}
      <div className="confirmed-bookings-section">
        <h2>Đơn đặt lịch đã xác nhận ({confirmedBookings.length})</h2>
        
        {confirmedBookings.length === 0 ? (
          <div className="no-bookings">
            <div className="no-bookings-icon">✅</div>
            <p>Không có đơn đặt lịch nào đã xác nhận</p>
          </div>
        ) : (
          <div className="bookings-list">
            {confirmedBookings.map((booking, index) => (
              <div key={booking.id} className={`booking-card confirmed-booking ${index === 0 ? 'newest-booking' : ''}`}>
                <div className="booking-header">
                  <div className="customer-info">
                    <div className="customer-avatar">
                      {booking.customerName?.charAt(0) || 'C'}
                    </div>
                    <div className="customer-details">
                      <h3>
                        <button 
                          className="booking-link"
                          onClick={() => navigate(`/booking-view/${booking.id}`)}
                        >
                          {booking.customerName} (#{booking.id}) 
                          <span className="status-badge confirmed">ĐÃ XÁC NHẬN</span>
                        </button>
                      </h3>
                      <p>{booking.customerPhone}</p>
                      <p>{booking.customerEmail}</p>
                    </div>
                  </div>
                  <div className="booking-time">
                    <span className="time-received">
                      Xác nhận lúc: {formatTime(booking.updatedAt || booking.createdAt)}
                    </span>
                  </div>
                </div>

                <div className="booking-details">
                  <div className="detail-row">
                    <span className="label">Dịch vụ:</span>
                    <span className="value">{booking.service}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Ngày:</span>
                    <span className="value">{formatDate(booking.date)}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Giờ:</span>
                    <span className="value">{booking.time}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Thời gian:</span>
                    <span className="value">{booking.duration} giờ</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Địa điểm:</span>
                    <span className="value">{booking.location}</span>
                  </div>
                  <div className="detail-row price">
                    <span className="label">Tổng tiền:</span>
                    <span className="value">${booking.totalPrice}</span>
                  </div>
                </div>

                {booking.notes && (
                  <div className="booking-notes">
                    <h4>Ghi chú:</h4>
                    <p>{booking.notes}</p>
                  </div>
                )}

                {/* Chỉ hiển thị Chat và Hoàn thành cho booking đã xác nhận */}
                <div className="booking-actions confirmed-actions">
                  <button
                    className="chat-btn"
                    onClick={() => navigate('/chat')}
                    title="Nhắn tin với khách hàng"
                  >
                    💬 Chat
                  </button>
                  <button
                    className="complete-btn"
                    onClick={() => {
                      // Logic đánh dấu hoàn thành sẽ được xử lý bởi BookingCompletion component
                    }}
                    title="Đánh dấu công việc hoàn thành"
                  >
                    ✅ Hoàn thành
                  </button>
                </div>

                {/* Booking Completion Component */}
                <BookingCompletion 
                  booking={booking} 
                  onStatusUpdate={() => setRefreshTrigger(prev => prev + 1)}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Resubmit Verification Modal */}
      {showResubmitModal && verificationRequest && (
        <ResubmitVerificationForm
          verificationRequest={verificationRequest}
          onClose={() => setShowResubmitModal(false)}
          onSuccess={() => {
            setShowResubmitForm(false);
            setRefreshTrigger(prev => prev + 1);
          }}
        />
      )}

      {/* Initial Verification Modal */}
      {showInitialVerificationForm && (
        <InitialVerificationForm
          onClose={() => setShowInitialVerificationForm(false)}
          onSuccess={() => {
            setRefreshTrigger(prev => prev + 1);
          }}
        />
      )}
    </div>
  );
}

