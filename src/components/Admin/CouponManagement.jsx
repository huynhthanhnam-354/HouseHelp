import React, { useState, useEffect } from "react";
import "./CouponManagement.css";

export default function CouponManagement() {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState(null);
  const [formData, setFormData] = useState({
    code: "",
    description: "",
    discount: "",
    type: "percentage",
    minAmount: "",
    maxDiscount: "",
    firstTimeOnly: false,
    isActive: true,
    usageLimit: "",
    expiresAt: ""
  });

  // Load coupons from API
  useEffect(() => {
    fetchCoupons();
  }, []);

  const fetchCoupons = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:5000/api/admin/coupons');
      const data = await response.json();
      setCoupons(data);
    } catch (error) {
      console.error('Error fetching coupons:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const url = editingCoupon 
        ? `http://localhost:5000/api/admin/coupons/${editingCoupon.id}`
        : 'http://localhost:5000/api/admin/coupons';
      
      const method = editingCoupon ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        await fetchCoupons();
        resetForm();
        alert(editingCoupon ? 'Cập nhật mã giảm giá thành công!' : 'Tạo mã giảm giá thành công!');
      } else {
        const error = await response.json();
        alert('Lỗi: ' + error.message);
      }
    } catch (error) {
      console.error('Error saving coupon:', error);
      alert('Lỗi khi lưu mã giảm giá');
    }
  };

  const handleEdit = (coupon) => {
    setEditingCoupon(coupon);
    setFormData({
      code: coupon.code,
      description: coupon.description,
      discount: coupon.discount,
      type: coupon.type,
      minAmount: coupon.minAmount || "",
      maxDiscount: coupon.maxDiscount || "",
      firstTimeOnly: coupon.firstTimeOnly,
      isActive: coupon.isActive,
      usageLimit: coupon.usageLimit || "",
      expiresAt: coupon.expiresAt ? coupon.expiresAt.split('T')[0] : ""
    });
    setShowForm(true);
  };

  const handleDelete = async (couponId) => {
    if (!confirm('Bạn có chắc muốn xóa mã giảm giá này?')) return;

    try {
      const response = await fetch(`http://localhost:5000/api/admin/coupons/${couponId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        await fetchCoupons();
        alert('Xóa mã giảm giá thành công!');
      } else {
        alert('Lỗi khi xóa mã giảm giá');
      }
    } catch (error) {
      console.error('Error deleting coupon:', error);
      alert('Lỗi khi xóa mã giảm giá');
    }
  };

  const resetForm = () => {
    setFormData({
      code: "",
      description: "",
      discount: "",
      type: "percentage",
      minAmount: "",
      maxDiscount: "",
      firstTimeOnly: false,
      isActive: true,
      usageLimit: "",
      expiresAt: ""
    });
    setEditingCoupon(null);
    setShowForm(false);
  };

  const formatDate = (dateString) => {
    if (!dateString) return "Không giới hạn";
    return new Date(dateString).toLocaleDateString('vi-VN');
  };

  return (
    <div className="coupon-management">
      <div className="coupon-header">
        <h2>🎫 Quản Lý Mã Giảm Giá</h2>
        <button 
          className="btn btn-primary"
          onClick={() => setShowForm(true)}
        >
          + Thêm Mã Mới
        </button>
      </div>

      {showForm && (
        <div className="coupon-form-overlay">
          <div className="coupon-form">
            <div className="form-header">
              <h3>{editingCoupon ? 'Sửa Mã Giảm Giá' : 'Thêm Mã Giảm Giá Mới'}</h3>
              <button className="close-btn" onClick={resetForm}>×</button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-grid">
                <div className="form-group">
                  <label>Mã giảm giá *</label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => handleInputChange('code', e.target.value.toUpperCase())}
                    placeholder="VD: SUMMER2024"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Loại giảm giá *</label>
                  <select
                    value={formData.type}
                    onChange={(e) => handleInputChange('type', e.target.value)}
                  >
                    <option value="percentage">Phần trăm (%)</option>
                    <option value="fixed">Số tiền cố định ($)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>
                    Giá trị giảm * 
                    {formData.type === 'percentage' ? ' (%)' : ' ($)'}
                  </label>
                  <input
                    type="number"
                    value={formData.discount}
                    onChange={(e) => handleInputChange('discount', e.target.value)}
                    placeholder={formData.type === 'percentage' ? "VD: 20" : "VD: 10"}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Số tiền tối thiểu ($)</label>
                  <input
                    type="number"
                    value={formData.minAmount}
                    onChange={(e) => handleInputChange('minAmount', e.target.value)}
                    placeholder="VD: 50"
                  />
                </div>

                {formData.type === 'percentage' && (
                  <div className="form-group">
                    <label>Giảm tối đa ($)</label>
                    <input
                      type="number"
                      value={formData.maxDiscount}
                      onChange={(e) => handleInputChange('maxDiscount', e.target.value)}
                      placeholder="VD: 100"
                    />
                  </div>
                )}

                <div className="form-group">
                  <label>Giới hạn sử dụng</label>
                  <input
                    type="number"
                    value={formData.usageLimit}
                    onChange={(e) => handleInputChange('usageLimit', e.target.value)}
                    placeholder="Để trống = không giới hạn"
                  />
                </div>

                <div className="form-group">
                  <label>Ngày hết hạn</label>
                  <input
                    type="date"
                    value={formData.expiresAt}
                    onChange={(e) => handleInputChange('expiresAt', e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group full-width">
                <label>Mô tả *</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="VD: Giảm 20% cho đơn hàng đầu tiên"
                  required
                />
              </div>

              <div className="form-checkboxes">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={formData.firstTimeOnly}
                    onChange={(e) => handleInputChange('firstTimeOnly', e.target.checked)}
                  />
                  Chỉ dành cho khách hàng mới
                </label>

                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => handleInputChange('isActive', e.target.checked)}
                  />
                  Kích hoạt
                </label>
              </div>

              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={resetForm}>
                  Hủy
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingCoupon ? 'Cập Nhật' : 'Tạo Mã'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="coupons-list">
        {loading ? (
          <div className="loading">Đang tải...</div>
        ) : (
          <div className="coupons-table">
            <div className="table-header">
              <div>Mã</div>
              <div>Mô tả</div>
              <div>Giảm giá</div>
              <div>Đã dùng</div>
              <div>Hết hạn</div>
              <div>Trạng thái</div>
              <div>Thao tác</div>
            </div>

            {coupons.map(coupon => (
              <div key={coupon.id} className="table-row">
                <div className="coupon-code">{coupon.code}</div>
                <div className="coupon-description">{coupon.description}</div>
                <div className="coupon-discount">
                  {coupon.type === 'percentage' ? `${coupon.discount}%` : `$${coupon.discount}`}
                  {coupon.firstTimeOnly && <span className="badge">Khách mới</span>}
                </div>
                <div className="coupon-usage">
                  {coupon.usedCount || 0}
                  {coupon.usageLimit && ` / ${coupon.usageLimit}`}
                </div>
                <div className="coupon-expires">
                  {formatDate(coupon.expiresAt)}
                </div>
                <div className="coupon-status">
                  <span className={`status-badge ${coupon.isActive ? 'active' : 'inactive'}`}>
                    {coupon.isActive ? 'Hoạt động' : 'Tạm dừng'}
                  </span>
                </div>
                <div className="coupon-actions">
                  <button 
                    className="btn-edit"
                    onClick={() => handleEdit(coupon)}
                  >
                    ✏️
                  </button>
                  <button 
                    className="btn-delete"
                    onClick={() => handleDelete(coupon.id)}
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}

            {coupons.length === 0 && (
              <div className="empty-state">
                <p>Chưa có mã giảm giá nào</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
