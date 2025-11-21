import React, { useState } from 'react';
import './ComplaintHandler.css';

const ComplaintHandler = ({ onComplaintSubmit, userContext }) => {
  const [complaintData, setComplaintData] = useState({
    type: '',
    severity: 'medium',
    bookingId: '',
    description: '',
    evidence: [],
    contactPreference: 'email'
  });
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState(null);

  // Các loại khiếu nại
  const complaintTypes = {
    'service_quality': {
      icon: '⭐',
      title: 'Chất lượng dịch vụ',
      description: 'Dịch vụ không đạt yêu cầu, làm việc không chuyên nghiệp',
      examples: ['Dọn dẹp không sạch sẽ', 'Nấu ăn không ngon', 'Làm việc chậm chạp']
    },
    'staff_behavior': {
      icon: '👤',
      title: 'Thái độ nhân viên',
      description: 'Nhân viên có thái độ không phù hợp, thiếu tôn trọng',
      examples: ['Nói chuyện khó nghe', 'Không lịch sự', 'Thái độ hách dịch']
    },
    'property_damage': {
      icon: '💥',
      title: 'Hư hỏng tài sản',
      description: 'Làm hỏng đồ đạc, thiết bị trong nhà',
      examples: ['Làm vỡ đồ', 'Làm hỏng thiết bị', 'Làm bẩn nội thất']
    },
    'safety_concern': {
      icon: '⚠️',
      title: 'Vấn đề an toàn',
      description: 'Hành vi gây nguy hiểm cho gia đình hoặc tài sản',
      examples: ['Không tuân thủ quy định', 'Hành vi đáng ngờ', 'Gây nguy hiểm']
    },
    'pricing_issue': {
      icon: '💰',
      title: 'Vấn đề giá cả',
      description: 'Tính phí không đúng, phát sinh chi phí không thông báo',
      examples: ['Tính thêm phí', 'Giá khác thỏa thuận', 'Không minh bạch chi phí']
    },
    'scheduling': {
      icon: '⏰',
      title: 'Vấn đề lịch hẹn',
      description: 'Đến muộn, hủy lịch đột xuất, không tuân thủ thời gian',
      examples: ['Đến muộn', 'Hủy lịch phút chót', 'Làm không đúng thời gian']
    },
    'other': {
      icon: '📝',
      title: 'Khác',
      description: 'Vấn đề khác không thuộc các danh mục trên',
      examples: ['Vấn đề khác', 'Tình huống đặc biệt']
    }
  };

  // Mức độ nghiêm trọng
  const severityLevels = {
    'low': {
      color: '#4CAF50',
      label: 'Nhẹ',
      description: 'Vấn đề nhỏ, có thể giải quyết dễ dàng'
    },
    'medium': {
      color: '#FF9800',
      label: 'Trung bình',
      description: 'Vấn đề cần được xử lý kịp thời'
    },
    'high': {
      color: '#f44336',
      label: 'Nghiêm trọng',
      description: 'Vấn đề cần được ưu tiên xử lý ngay'
    }
  };

  const handleInputChange = (field, value) => {
    setComplaintData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleFileUpload = (event) => {
    const files = Array.from(event.target.files);
    const maxSize = 5 * 1024 * 1024; // 5MB
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'video/mp4', 'video/quicktime'];
    
    const validFiles = files.filter(file => {
      if (file.size > maxSize) {
        alert(`File ${file.name} quá lớn. Vui lòng chọn file dưới 5MB.`);
        return false;
      }
      if (!allowedTypes.includes(file.type)) {
        alert(`File ${file.name} không được hỗ trợ. Chỉ chấp nhận ảnh và video.`);
        return false;
      }
      return true;
    });

    // Convert files to base64 for preview
    validFiles.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const fileData = {
          name: file.name,
          type: file.type,
          size: file.size,
          data: e.target.result,
          preview: file.type.startsWith('image/') ? e.target.result : null
        };
        
        setComplaintData(prev => ({
          ...prev,
          evidence: [...prev.evidence, fileData]
        }));
      };
      reader.readAsDataURL(file);
    });
  };

  const removeEvidence = (index) => {
    setComplaintData(prev => ({
      ...prev,
      evidence: prev.evidence.filter((_, i) => i !== index)
    }));
  };

  const nextStep = () => {
    if (currentStep === 1 && !complaintData.type) {
      alert('Vui lòng chọn loại khiếu nại');
      return;
    }
    if (currentStep === 2 && !complaintData.description.trim()) {
      alert('Vui lòng mô tả chi tiết vấn đề');
      return;
    }
    setCurrentStep(prev => Math.min(prev + 1, 4));
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const submitComplaint = async () => {
    setIsSubmitting(true);
    
    try {
      // Tạo complaint data để gửi
      const complaintPayload = {
        ...complaintData,
        userId: userContext?.userId,
        userName: userContext?.name,
        userEmail: userContext?.email,
        submittedAt: new Date().toISOString(),
        status: 'pending',
        ticketId: `COMPLAINT-${Date.now()}`
      };

      // Gọi API để lưu khiếu nại (giả lập)
      const response = await fetch('http://localhost:5000/api/complaints/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(complaintPayload)
      });

      if (response.ok) {
        const result = await response.json();
        setSubmitResult({
          success: true,
          ticketId: result.ticketId || complaintPayload.ticketId,
          message: 'Khiếu nại đã được gửi thành công!'
        });
        
        // Gọi callback để thông báo cho parent component
        if (onComplaintSubmit) {
          onComplaintSubmit(complaintPayload);
        }
      } else {
        throw new Error('Failed to submit complaint');
      }
    } catch (error) {
      console.error('Error submitting complaint:', error);
      setSubmitResult({
        success: false,
        message: 'Có lỗi xảy ra khi gửi khiếu nại. Vui lòng thử lại sau.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setComplaintData({
      type: '',
      severity: 'medium',
      bookingId: '',
      description: '',
      evidence: [],
      contactPreference: 'email'
    });
    setCurrentStep(1);
    setSubmitResult(null);
  };

  if (submitResult) {
    return (
      <div className="complaint-handler">
        <div className="submit-result">
          <div className={`result-icon ${submitResult.success ? 'success' : 'error'}`}>
            {submitResult.success ? '✅' : '❌'}
          </div>
          <h3>{submitResult.success ? 'Khiếu nại đã được gửi!' : 'Có lỗi xảy ra'}</h3>
          <p>{submitResult.message}</p>
          
          {submitResult.success && (
            <div className="ticket-info">
              <div className="ticket-id">
                <strong>Mã khiếu nại:</strong> {submitResult.ticketId}
              </div>
              <div className="next-steps">
                <h4>Các bước tiếp theo:</h4>
                <ul>
                  <li>Chúng tôi sẽ xem xét khiếu nại trong vòng 24 giờ</li>
                  <li>Bạn sẽ nhận được email xác nhận</li>
                  <li>Nhân viên hỗ trợ sẽ liên hệ với bạn</li>
                  <li>Chúng tôi sẽ cập nhật tiến độ xử lý</li>
                </ul>
              </div>
              <div className="contact-info">
                <p><strong>Hotline hỗ trợ:</strong> 1900-1234</p>
                <p><strong>Email:</strong> support@househelp.vn</p>
              </div>
            </div>
          )}
          
          <button className="reset-btn" onClick={resetForm}>
            {submitResult.success ? 'Gửi khiếu nại khác' : 'Thử lại'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="complaint-handler">
      <div className="complaint-header">
        <h3>🛡️ Hỗ trợ khiếu nại</h3>
        <p>Chúng tôi sẽ giúp bạn giải quyết vấn đề một cách nhanh chóng và hiệu quả</p>
      </div>

      {/* Progress Steps */}
      <div className="progress-steps">
        {[1, 2, 3, 4].map(step => (
          <div key={step} className={`step ${currentStep >= step ? 'active' : ''}`}>
            <div className="step-number">{step}</div>
            <div className="step-label">
              {step === 1 && 'Loại khiếu nại'}
              {step === 2 && 'Mô tả chi tiết'}
              {step === 3 && 'Bằng chứng'}
              {step === 4 && 'Xác nhận'}
            </div>
          </div>
        ))}
      </div>

      {/* Step 1: Complaint Type */}
      {currentStep === 1 && (
        <div className="step-content">
          <h4>Chọn loại khiếu nại:</h4>
          <div className="complaint-types">
            {Object.entries(complaintTypes).map(([key, type]) => (
              <div 
                key={key}
                className={`complaint-type ${complaintData.type === key ? 'selected' : ''}`}
                onClick={() => handleInputChange('type', key)}
              >
                <div className="type-icon">{type.icon}</div>
                <div className="type-info">
                  <h5>{type.title}</h5>
                  <p>{type.description}</p>
                  <div className="examples">
                    <small>VD: {type.examples.join(', ')}</small>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Step 2: Description */}
      {currentStep === 2 && (
        <div className="step-content">
          <h4>Mô tả chi tiết vấn đề:</h4>
          
          <div className="form-group">
            <label>Mức độ nghiêm trọng:</label>
            <div className="severity-options">
              {Object.entries(severityLevels).map(([key, level]) => (
                <label key={key} className="severity-option">
                  <input 
                    type="radio" 
                    name="severity" 
                    value={key}
                    checked={complaintData.severity === key}
                    onChange={(e) => handleInputChange('severity', e.target.value)}
                  />
                  <span className="severity-label" style={{color: level.color}}>
                    {level.label}
                  </span>
                  <small>{level.description}</small>
                </label>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label>Mã đặt lịch (nếu có):</label>
            <input 
              type="text" 
              placeholder="VD: BK123456"
              value={complaintData.bookingId}
              onChange={(e) => handleInputChange('bookingId', e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Mô tả chi tiết vấn đề: *</label>
            <textarea 
              placeholder="Vui lòng mô tả chi tiết vấn đề bạn gặp phải, bao gồm thời gian, địa điểm và những gì đã xảy ra..."
              value={complaintData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              rows="6"
              required
            />
            <small>Càng chi tiết càng giúp chúng tôi xử lý nhanh chóng</small>
          </div>
        </div>
      )}

      {/* Step 3: Evidence */}
      {currentStep === 3 && (
        <div className="step-content">
          <h4>Tải lên bằng chứng (không bắt buộc):</h4>
          
          <div className="upload-section">
            <div className="upload-area">
              <input 
                type="file" 
                id="evidence-upload"
                multiple 
                accept="image/*,video/*"
                onChange={handleFileUpload}
                style={{display: 'none'}}
              />
              <label htmlFor="evidence-upload" className="upload-label">
                <div className="upload-icon">📎</div>
                <div className="upload-text">
                  <strong>Chọn file để tải lên</strong>
                  <p>Hỗ trợ ảnh và video (tối đa 5MB mỗi file)</p>
                </div>
              </label>
            </div>

            {complaintData.evidence.length > 0 && (
              <div className="evidence-list">
                <h5>Bằng chứng đã tải lên:</h5>
                {complaintData.evidence.map((file, index) => (
                  <div key={index} className="evidence-item">
                    {file.preview && (
                      <img src={file.preview} alt="Evidence" className="evidence-preview" />
                    )}
                    <div className="evidence-info">
                      <div className="evidence-name">{file.name}</div>
                      <div className="evidence-size">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </div>
                    </div>
                    <button 
                      className="remove-evidence"
                      onClick={() => removeEvidence(index)}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="evidence-tips">
            <h5>💡 Gợi ý bằng chứng hữu ích:</h5>
            <ul>
              <li>Ảnh chụp kết quả công việc</li>
              <li>Video ghi lại sự việc</li>
              <li>Ảnh chụp tài sản bị hư hỏng</li>
              <li>Screenshot tin nhắn, email</li>
              <li>Hóa đơn, biên lai</li>
            </ul>
          </div>
        </div>
      )}

      {/* Step 4: Confirmation */}
      {currentStep === 4 && (
        <div className="step-content">
          <h4>Xác nhận thông tin khiếu nại:</h4>
          
          <div className="complaint-summary">
            <div className="summary-item">
              <strong>Loại khiếu nại:</strong>
              <span>{complaintTypes[complaintData.type]?.title}</span>
            </div>
            
            <div className="summary-item">
              <strong>Mức độ:</strong>
              <span style={{color: severityLevels[complaintData.severity].color}}>
                {severityLevels[complaintData.severity].label}
              </span>
            </div>
            
            {complaintData.bookingId && (
              <div className="summary-item">
                <strong>Mã đặt lịch:</strong>
                <span>{complaintData.bookingId}</span>
              </div>
            )}
            
            <div className="summary-item">
              <strong>Mô tả:</strong>
              <div className="description-preview">
                {complaintData.description}
              </div>
            </div>
            
            <div className="summary-item">
              <strong>Bằng chứng:</strong>
              <span>{complaintData.evidence.length} file</span>
            </div>
          </div>

          <div className="form-group">
            <label>Cách thức liên hệ ưu tiên:</label>
            <select 
              value={complaintData.contactPreference}
              onChange={(e) => handleInputChange('contactPreference', e.target.value)}
            >
              <option value="email">Email</option>
              <option value="phone">Điện thoại</option>
              <option value="both">Cả hai</option>
            </select>
          </div>

          <div className="confirmation-note">
            <p><strong>Lưu ý:</strong> Sau khi gửi khiếu nại, bạn sẽ nhận được mã số để theo dõi tiến độ xử lý. Chúng tôi cam kết phản hồi trong vòng 24 giờ.</p>
          </div>
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="step-navigation">
        {currentStep > 1 && (
          <button className="nav-btn prev-btn" onClick={prevStep}>
            ← Quay lại
          </button>
        )}
        
        {currentStep < 4 ? (
          <button className="nav-btn next-btn" onClick={nextStep}>
            Tiếp tục →
          </button>
        ) : (
          <button 
            className="nav-btn submit-btn" 
            onClick={submitComplaint}
            disabled={isSubmitting}
          >
            {isSubmitting ? '⏳ Đang gửi...' : '📤 Gửi khiếu nại'}
          </button>
        )}
      </div>
    </div>
  );
};

export default ComplaintHandler;

