import React, { useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import "./CouponInput.css";

export default function CouponInput({ totalAmount, onCouponApplied }) {
  const [couponCode, setCouponCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const { user } = useAuth();

  const validateCoupon = async () => {
    if (!couponCode.trim()) {
      setMessage("Vui lòng nhập mã giảm giá");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const response = await fetch('http://localhost:5000/api/coupons/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: couponCode,
          customerId: user?.id,
          totalAmount: totalAmount
        })
      });

      const data = await response.json();

      if (data.valid) {
        setAppliedCoupon(data);
        setMessage(data.message);
        onCouponApplied(data);
      } else {
        setMessage(data.message);
        setAppliedCoupon(null);
        onCouponApplied(null);
      }
    } catch (error) {
      console.error('Error validating coupon:', error);
      setMessage("Lỗi kiểm tra mã giảm giá");
      setAppliedCoupon(null);
      onCouponApplied(null);
    } finally {
      setLoading(false);
    }
  };

  const removeCoupon = () => {
    setCouponCode("");
    setAppliedCoupon(null);
    setMessage("");
    onCouponApplied(null);
  };

  return (
    <div className="coupon-input">
      <div className="coupon-header">
        <span className="coupon-icon">🎫</span>
        <span className="coupon-title">Mã giảm giá</span>
      </div>
      
      {!appliedCoupon ? (
        <div className="coupon-form">
          <div className="coupon-input-group">
            <input
              type="text"
              placeholder="Nhập mã giảm giá (VD: FIRST20)"
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
              className="coupon-field"
              disabled={loading}
            />
            <button
              type="button"
              onClick={validateCoupon}
              disabled={loading || !couponCode.trim()}
              className="coupon-apply-btn"
            >
              {loading ? "Đang kiểm tra..." : "Áp dụng"}
            </button>
          </div>
          
          {message && (
            <div className={`coupon-message ${appliedCoupon ? 'success' : 'error'}`}>
              {message}
            </div>
          )}
          
          <div className="coupon-suggestions">
            <div className="suggestion-title">Mã giảm giá có sẵn:</div>
            <div className="suggestion-codes">
              <span className="suggestion-code" onClick={() => setCouponCode("FIRST20")}>
                FIRST20 - Giảm 20% đơn đầu
              </span>
              <span className="suggestion-code" onClick={() => setCouponCode("SAVE10")}>
                SAVE10 - Giảm $10
              </span>
              <span className="suggestion-code" onClick={() => setCouponCode("EMERGENCY15")}>
                EMERGENCY15 - Giảm 15% khẩn cấp
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="coupon-applied">
          <div className="applied-info">
            <div className="applied-code">
              <strong>{appliedCoupon.coupon.code}</strong>
              <span className="applied-desc">{appliedCoupon.coupon.description}</span>
            </div>
            <div className="applied-discount">
              -${appliedCoupon.discountAmount.toFixed(2)}
            </div>
          </div>
          <button
            type="button"
            onClick={removeCoupon}
            className="coupon-remove-btn"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
