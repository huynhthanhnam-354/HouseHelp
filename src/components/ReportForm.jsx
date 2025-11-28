import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import './ReportForm.css';

const REPORT_TYPES = {
  late_arrival: {
    label: 'Đến muộn',
    description: 'Người giúp việc đến muộn so với lịch hẹn'
  },
  no_show: {
    label: 'Không đến',
    description: 'Người giúp việc không đến mà không báo trước'
  },
  inappropriate_behavior: {
    label: 'Hành vi không phù hợp',
    description: 'Có hành vi thiếu chuyên nghiệp hoặc không phù hợp'
  },
  poor_service: {
    label: 'Dịch vụ kém',
    description: 'Chất lượng dịch vụ không đạt yêu cầu'
  },
  damage: {
    label: 'Làm hỏng đồ đạc',
    description: 'Gây hư hại tài sản trong quá trình làm việc'
  },
  other: {
    label: 'Khác',
    description: 'Vấn đề khác không thuộc các loại trên'
  }
};

const SEVERITY_LEVELS = {
  low: { label: 'Thấp', color: '#28a745' },
  medium: { label: 'Trung bình', color: '#ffc107' },
  high: { label: 'Cao', color: '#fd7e14' },
  critical: { label: 'Nghiêm trọng', color: '#dc3545' }
};

export default function ReportForm({ booking, onClose, onSubmit }) {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    reportType: '',
    title: '',
    description: '',
    evidence: '',
    severity: 'medium'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Auto-generate title based on report type
    if (name === 'reportType' && value) {
      setFormData(prev => ({
        ...prev,
        title: `Báo cáo: ${REPORT_TYPES[value].label} - ${booking.housekeeperName}`
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Validate form
      if (!formData.reportType || !formData.title || !formData.description) {
        throw new Error('Vui lòng điền đầy đủ thông tin bắt buộc');
      }

      if (formData.description.length < 20) {
        throw new Error('Mô tả chi tiết phải có ít nhất 20 ký tự');
      }

      const reportData = {
        bookingId: booking.id,
        customerId: user.id,
        housekeeperId: booking.housekeeperId,
        reportType: formData.reportType,
        title: formData.title,
        description: formData.description,
        evidence: formData.evidence || null,
        severity: formData.severity
      };

      const response = await fetch('http://localhost:5000/api/reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(reportData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Lỗi tạo báo cáo');
      }

      const result = await response.json();
      
      // Call parent callback
      if (onSubmit) {
        onSubmit(result);
      }

      // Show success message
      alert('Báo cáo đã được gửi thành công! Chúng tôi sẽ xem xét và phản hồi sớm nhất có thể.');
      
      // Close form
      onClose();

    } catch (error) {
      console.error('Error submitting report:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="report-form-overlay">
      <div className="report-form-container">
        <div className="report-form-header">
          <h2>Báo cáo vi phạm</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="booking-info">
          <h3>Thông tin đặt lịch</h3>
          <div className="booking-details">
            <p><strong>Người giúp việc:</strong> {booking.housekeeperName}</p>
            <p><strong>Dịch vụ:</strong> {booking.service}</p>
            <p><strong>Ngày:</strong> {new Date(booking.startDate).toLocaleDateString('vi-VN')}</p>
            <p><strong>Thời gian:</strong> {booking.time}</p>
            <p><strong>Địa điểm:</strong> {booking.location}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="report-form">
          {error && <div className="error-message">{error}</div>}

          <div className="form-group">
            <label htmlFor="reportType">Loại vi phạm *</label>
            <select
              id="reportType"
              name="reportType"
              value={formData.reportType}
              onChange={handleInputChange}
              required
            >
              <option value="">-- Chọn loại vi phạm --</option>
              {Object.entries(REPORT_TYPES).map(([key, type]) => (
                <option key={key} value={key}>
                  {type.label} - {type.description}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="severity">Mức độ nghiêm trọng</label>
            <div className="severity-options">
              {Object.entries(SEVERITY_LEVELS).map(([key, level]) => (
                <label key={key} className="severity-option">
                  <input
                    type="radio"
                    name="severity"
                    value={key}
                    checked={formData.severity === key}
                    onChange={handleInputChange}
                  />
                  <span className="severity-label">
                    {level.label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="title">Tiêu đề báo cáo *</label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              placeholder="Tiêu đề ngắn gọn về vấn đề"
              required
              maxLength={255}
            />
          </div>

          <div className="form-group">
            <label htmlFor="description">Mô tả chi tiết *</label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Mô tả chi tiết về vấn đề xảy ra, thời gian, tình huống cụ thể..."
              required
              minLength={20}
              maxLength={2000}
              rows={6}
            />
            <small className="char-count">
              {formData.description.length}/2000 ký tự (tối thiểu 20 ký tự)
            </small>
          </div>

          <div className="form-group">
            <label htmlFor="evidence">Bằng chứng (tùy chọn)</label>
            <textarea
              id="evidence"
              name="evidence"
              value={formData.evidence}
              onChange={handleInputChange}
              placeholder="Mô tả hoặc đường dẫn đến ảnh, video, tin nhắn làm bằng chứng..."
              maxLength={1000}
              rows={3}
            />
            <small>Bạn có thể mô tả bằng chứng hoặc cung cấp đường dẫn đến ảnh/video</small>
          </div>

          <div className="form-actions">
            <button type="button" className="cancel-btn" onClick={onClose}>
              Hủy
            </button>
            <button type="submit" className="submit-btn" disabled={loading}>
              {loading ? 'Đang gửi...' : 'Gửi báo cáo'}
            </button>
          </div>
        </form>

        <div className="report-notice">
          <p><strong>Lưu ý:</strong></p>
          <ul>
            <li>Báo cáo sẽ được xem xét trong vòng 24-48 giờ</li>
            <li>Chúng tôi có thể liên hệ để xác minh thông tin</li>
            <li>Báo cáo sai sự thật có thể bị xử lý theo quy định</li>
            <li>Bạn sẽ nhận được thông báo khi có cập nhật</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
