import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import './BookingCompletion.css';

const BookingCompletion = ({ booking, onStatusUpdate }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [rating, setRating] = useState(5);
  const [review, setReview] = useState('');
  const [completionNotes, setCompletionNotes] = useState('');
  const [paymentInfo, setPaymentInfo] = useState(null);
  const [forceUpdate, setForceUpdate] = useState(0);

  // Fetch payment info for this booking
  useEffect(() => {
    const fetchPaymentInfo = async () => {
      if (!booking?.id) return;
      
      try {
        const response = await fetch(`http://localhost:5000/api/bookings/${booking.id}/payment`);
        
        if (response.ok) {
          const payment = await response.json();
          setPaymentInfo(payment);
          setForceUpdate(prev => prev + 1);
        } else if (response.status === 404) {
          setPaymentInfo(null);
        }
      } catch (error) {
        console.error('Error fetching payment info:', error);
        setPaymentInfo(null);
      }
    };

    fetchPaymentInfo();
  }, [booking?.id]);

  // Debug paymentInfo changes
  useEffect(() => {
    if (paymentInfo && paymentInfo.status === 'success') {
      console.log('✅ Payment success - showing completed status');
    }
  }, [paymentInfo]);

  const handleCompleteWork = async () => {
    if (!user || user.role !== 'housekeeper') return;
    
    setLoading(true);
    try {
      const response = await fetch(`http://localhost:5000/api/bookings/${booking.id}/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          housekeeperId: booking.housekeeperId,
          completionNotes: completionNotes
        }),
      });

      const result = await response.json();
      
      if (response.ok) {
        alert('✅ Đã đánh dấu công việc hoàn thành! Khách hàng sẽ nhận được thông báo để xác nhận thanh toán.');
        onStatusUpdate && onStatusUpdate('completed');
      } else {
        alert('❌ Lỗi: ' + result.error);
      }
    } catch (error) {
      console.error('Error completing booking:', error);
      alert('❌ Có lỗi xảy ra khi hoàn thành công việc');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmPayment = async () => {
    if (!user || user.role !== 'customer') return;
    
    setLoading(true);
    try {
      const response = await fetch(`http://localhost:5000/api/bookings/${booking.id}/confirm-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customerId: user.id,
          paymentMethod: paymentMethod,
          rating: rating,
          review: review
        }),
      });

      const result = await response.json();
      
      if (response.ok) {
        alert('✅ Đã xác nhận thanh toán thành công! Cảm ơn bạn đã sử dụng dịch vụ.');
        setShowPaymentModal(false);
        
        // Refresh payment info
        const paymentResponse = await fetch(`http://localhost:5000/api/bookings/${booking.id}/payment`);
        if (paymentResponse.ok) {
          const payment = await paymentResponse.json();
          setPaymentInfo(payment);
        }
        
        onStatusUpdate && onStatusUpdate('paid');
      } else {
        alert('❌ Lỗi: ' + result.error);
      }
    } catch (error) {
      console.error('Error confirming payment:', error);
      alert('❌ Có lỗi xảy ra khi xác nhận thanh toán');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount);
  };

  const renderStars = (currentRating, onRatingChange) => {
    return (
      <div className="star-rating">
        {[1, 2, 3, 4, 5].map((star) => (
          <span
            key={star}
            className={`star ${star <= currentRating ? 'active' : ''}`}
            onClick={() => onRatingChange(star)}
          >
            ⭐
          </span>
        ))}
      </div>
    );
  };

  // Housekeeper view - nút hoàn thành công việc
  if (user?.role === 'housekeeper' && booking.status === 'confirmed') {
    return (
      <div className="booking-completion housekeeper">
        <div className="completion-card">
          <h3>🏁 Hoàn thành công việc</h3>
          <p>Bạn đã hoàn thành công việc <strong>{booking.service}</strong>?</p>
          
          <div className="form-group">
            <label>Ghi chú hoàn thành (tùy chọn):</label>
            <textarea
              value={completionNotes}
              onChange={(e) => setCompletionNotes(e.target.value)}
              placeholder="Mô tả ngắn về công việc đã hoàn thành..."
              rows="3"
            />
          </div>

          <button 
            className="complete-btn"
            onClick={handleCompleteWork}
            disabled={loading}
          >
            {loading ? '⏳ Đang xử lý...' : '✅ Đánh dấu hoàn thành'}
          </button>
        </div>
      </div>
    );
  }

  // Hiển thị trạng thái đã thanh toán (dựa vào bảng payments)
  if (paymentInfo && paymentInfo.status === 'success') {
    return (
      <div className="booking-completion completed">
        <div className="completion-card success">
          <h3>✅ Đã hoàn thành</h3>
          <p>Công việc đã hoàn thành và thanh toán thành công!</p>
          <div className="completion-info">
            <span>💰 Đã thanh toán: {formatCurrency(paymentInfo.amount)}</span>
            <span>📅 Thanh toán lúc: {new Date(paymentInfo.paidAt).toLocaleString('vi-VN')}</span>
          </div>
        </div>
      </div>
    );
  }

  // Customer view - nút xác nhận thanh toán
  if (user?.role === 'customer' && booking.status === 'completed') {
    return (
      <div className="booking-completion customer">
        <div className="completion-card">
          <h3>💰 Xác nhận thanh toán</h3>
          <p><strong>{booking.housekeeperName}</strong> đã hoàn thành công việc <strong>{booking.service}</strong></p>
          <div className="payment-amount">
            <span>Số tiền: </span>
            <strong>{formatCurrency(booking.totalPrice)}</strong>
          </div>

          <button 
            className="payment-btn"
            onClick={() => setShowPaymentModal(true)}
          >
            💳 Xác nhận & Thanh toán
          </button>
        </div>

        {/* Payment Modal */}
        {showPaymentModal && (
          <div className="modal-overlay">
            <div className="payment-modal">
              <div className="modal-header">
                <h3>💳 Xác nhận thanh toán</h3>
                <button 
                  className="close-btn"
                  onClick={() => setShowPaymentModal(false)}
                >
                  ✕
                </button>
              </div>

              <div className="modal-content">
                <div className="payment-summary">
                  <p><strong>Dịch vụ:</strong> {booking.service}</p>
                  <p><strong>Người giúp việc:</strong> {booking.housekeeperName}</p>
                  <p><strong>Thời gian:</strong> {booking.duration} giờ</p>
                  <p><strong>Tổng tiền:</strong> <span className="amount">{formatCurrency(booking.totalPrice)}</span></p>
                </div>

                <div className="form-group">
                  <label>Phương thức thanh toán:</label>
                  <select 
                    value={paymentMethod} 
                    onChange={(e) => setPaymentMethod(e.target.value)}
                  >
                    <option value="cash">💵 Tiền mặt</option>
                    <option value="bank_transfer">🏦 Chuyển khoản</option>
                    <option value="e_wallet">📱 Ví điện tử</option>
                    <option value="credit_card">💳 Thẻ tín dụng</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Đánh giá dịch vụ:</label>
                  {renderStars(rating, setRating)}
                </div>

                <div className="form-group">
                  <label>Nhận xét (tùy chọn):</label>
                  <textarea
                    value={review}
                    onChange={(e) => setReview(e.target.value)}
                    placeholder="Chia sẻ trải nghiệm của bạn về dịch vụ..."
                    rows="3"
                  />
                </div>

                <div className="modal-actions">
                  <button 
                    className="cancel-btn"
                    onClick={() => setShowPaymentModal(false)}
                  >
                    Hủy
                  </button>
                  <button 
                    className="confirm-btn"
                    onClick={handleConfirmPayment}
                    disabled={loading}
                  >
                    {loading ? '⏳ Đang xử lý...' : '✅ Xác nhận thanh toán'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Hiển thị trạng thái đã thanh toán (dựa vào bảng payments)
  // Nếu có payment success, coi như completed (bất kể booking.status)
  const shouldShowCompleted = paymentInfo && paymentInfo.status === 'success';
  
  console.log('🔍 Render decision:', {
    bookingStatus: booking.status,
    hasPaymentInfo: !!paymentInfo,
    paymentStatus: paymentInfo?.status,
    shouldShowCompleted
  });

  if (shouldShowCompleted) {
    console.log('✅ Showing COMPLETED status - booking completed + payment success');
    return (
      <div className="booking-completion completed" style={{border: '2px solid green', padding: '10px', margin: '10px'}}>
        <div className="completion-card success">
          <h3>✅ Đã hoàn thành</h3>
          <p>Công việc đã hoàn thành và thanh toán thành công!</p>
          <div className="completion-info">
            <span>💰 Đã thanh toán: {formatCurrency(paymentInfo.amount)}</span>
            <span>📅 Thanh toán lúc: {new Date(paymentInfo.paidAt).toLocaleString('vi-VN')}</span>
          </div>
        </div>
      </div>
    );
  }

  console.log('🔍 BookingCompletion render check:');
  console.log('  - booking.status:', booking.status);
  console.log('  - paymentInfo:', paymentInfo);
  console.log('  - paymentInfo?.status:', paymentInfo?.status);
  console.log('  - user:', user);
  console.log('  - user?.role:', user?.role);

  return null;
};

export default BookingCompletion;
