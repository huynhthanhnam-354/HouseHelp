import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';

// Component để hiển thị document với error handling
const DocumentViewer = ({ doc, index }) => {
  const [imageError, setImageError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const handleImageLoad = () => {
    setIsLoading(false);
  };

  const handleImageError = () => {
    console.error('Image load error:', doc.url);
    setImageError(true);
    setIsLoading(false);
  };

  const imageUrl = `http://localhost:5000${doc.url}`;

  return (
    <div>
      {!imageError ? (
        <>
          {isLoading && (
            <div style={{ 
              textAlign: 'center', 
              padding: '20px', 
              color: '#6b7280',
              fontSize: '12px',
              fontStyle: 'italic',
              backgroundColor: '#f9fafb',
              borderRadius: '4px',
              marginBottom: '8px'
            }}>
              ⏳ Đang tải...
            </div>
          )}
          <img 
            src={imageUrl}
            alt={`Verification document ${index + 1}`}
            style={{
              width: '100%',
              height: '120px',
              objectFit: 'cover',
              borderRadius: '4px',
              marginBottom: '8px',
              cursor: 'pointer',
              border: '1px solid #e5e7eb',
              display: imageError ? 'none' : 'block'
            }}
            onClick={() => window.open(imageUrl, '_blank')}
            onLoad={handleImageLoad}
            onError={handleImageError}
          />
        </>
      ) : (
        <div style={{ 
          textAlign: 'center', 
          padding: '20px', 
          color: '#dc2626',
          fontSize: '12px',
          fontStyle: 'italic',
          backgroundColor: '#fef2f2',
          borderRadius: '4px',
          marginBottom: '8px',
          border: '1px solid #fecaca'
        }}>
          ❌ Tài liệu không tồn tại<br/>
          <span style={{ fontSize: '10px', color: '#6b7280' }}>
            {doc.url}
          </span>
        </div>
      )}
      
      <button
        onClick={() => window.open(imageUrl, '_blank')}
        disabled={imageError}
        style={{
          width: '100%',
          padding: '6px 12px',
          backgroundColor: imageError ? '#9ca3af' : '#3b82f6',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          fontSize: '12px',
          cursor: imageError ? 'not-allowed' : 'pointer'
        }}
      >
        {imageError ? '❌ Không khả dụng' : '🔍 Xem chi tiết'}
      </button>
      
      <div style={{ 
        fontSize: '10px', 
        color: '#6b7280', 
        marginTop: '4px',
        wordBreak: 'break-all'
      }}>
        {doc.originalName || 'Không có tên file'}
      </div>
      
      {doc.uploadedAt && (
        <div style={{ 
          fontSize: '9px', 
          color: '#9ca3af', 
          marginTop: '2px'
        }}>
          Tải lên: {new Date(doc.uploadedAt).toLocaleDateString('vi-VN')}
        </div>
      )}
    </div>
  );
};

const AdminVerificationPanel = () => {
  const { user } = useAuth();
  const [verificationRequests, setVerificationRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [reviewForm, setReviewForm] = useState({
    action: '',
    adminNotes: '',
    documentReviews: []
  });
  const [submitting, setSubmitting] = useState(false);
  const [filters, setFilters] = useState({
    status: 'pending',
    priority: ''
  });

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchVerificationRequests();
    }
  }, [user, filters]);

  const fetchVerificationRequests = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.priority) params.append('priority', filters.priority);

      const response = await fetch(`http://localhost:5000/api/admin/verification/pending?${params}`);
      
      if (response.ok) {
        const data = await response.json();
        
        // Fetch documents for each request using userId
        const requestsWithDocuments = await Promise.all(
          data.map(async (request) => {
            try {
              const docResponse = await fetch(`http://localhost:5000/api/admin/verification/${request.id}/documents`);
              if (docResponse.ok) {
                const documents = await docResponse.json();
                console.log(`📄 Fetched ${documents.length} documents for user ${request.userId}`);
                return { ...request, documents };
              }
              return { ...request, documents: [] };
            } catch (error) {
              console.error(`Error fetching documents for request ${request.id}:`, error);
              return { ...request, documents: [] };
            }
          })
        );
        
        setVerificationRequests(requestsWithDocuments);
      } else {
        console.error('Error fetching verification requests');
      }
    } catch (error) {
      console.error('Error fetching verification requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReviewSubmit = async () => {
    if (!selectedRequest || !reviewForm.action) {
      alert('Vui lòng chọn hành động');
      return;
    }

    try {
      setSubmitting(true);
      
      const response = await fetch(`http://localhost:5000/api/admin/verification/${selectedRequest.id}/review`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          adminId: user.id,
          action: reviewForm.action,
          adminNotes: reviewForm.adminNotes,
          documentReviews: reviewForm.documentReviews
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        alert(data.message);
        setSelectedRequest(null);
        setReviewForm({ action: '', adminNotes: '', documentReviews: [] });
        fetchVerificationRequests(); // Refresh list
      } else {
        alert(data.message || data.error || 'Lỗi xem xét yêu cầu');
      }
    } catch (error) {
      console.error('Review submission error:', error);
      alert('Có lỗi xảy ra khi xem xét yêu cầu');
    } finally {
      setSubmitting(false);
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent': return '#dc3545';
      case 'high': return '#fd7e14';
      case 'normal': return '#28a745';
      case 'low': return '#6c757d';
      default: return '#6c757d';
    }
  };

  const getPriorityText = (priority) => {
    switch (priority) {
      case 'urgent': return 'Khẩn cấp';
      case 'high': return 'Cao';
      case 'normal': return 'Bình thường';
      case 'low': return 'Thấp';
      default: return 'Không xác định';
    }
  };

  const formatTimeAgo = (dateString) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Vừa xong';
    if (diffInHours < 24) return `${diffInHours} giờ trước`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays} ngày trước`;
    
    return date.toLocaleDateString('vi-VN');
  };

  if (!user || user.role !== 'admin') {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <div style={{ color: '#dc3545' }}>Bạn không có quyền truy cập trang này</div>
      </div>
    );
  }

  return (
    <div style={{
      backgroundColor: '#ffffff',
      border: '1px solid #e5e7eb',
      borderRadius: '12px',
      padding: '24px',
      margin: '20px 0',
      minHeight: '100vh'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px'
      }}>
        <h2 style={{ margin: 0, color: '#1f2937 !important' }}>
          👨‍💼 Quản lý xác thực tài khoản
        </h2>
        
        <button
          onClick={fetchVerificationRequests}
          style={{
            padding: '8px 16px',
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer'
          }}
        >
          🔄 Làm mới
        </button>
      </div>

      {/* Filters */}
      <div style={{
        display: 'flex',
        gap: '16px',
        marginBottom: '20px',
        padding: '16px',
        backgroundColor: '#f8f9fa',
        borderRadius: '8px'
      }}>
        <div>
          <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
            Trạng thái:
          </label>
          <select
            value={filters.status}
            onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
            style={{
              padding: '6px 12px',
              border: '1px solid #d1d5db',
              borderRadius: '4px',
              fontSize: '14px'
            }}
          >
            <option value="">Tất cả</option>
            <option value="pending">Chờ xem xét</option>
            <option value="under_review">Đang xem xét</option>
            <option value="requires_more_info">Cần bổ sung</option>
          </select>
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
            Độ ưu tiên:
          </label>
          <select
            value={filters.priority}
            onChange={(e) => setFilters(prev => ({ ...prev, priority: e.target.value }))}
            style={{
              padding: '6px 12px',
              border: '1px solid #d1d5db',
              borderRadius: '4px',
              fontSize: '14px'
            }}
          >
            <option value="">Tất cả</option>
            <option value="urgent">Khẩn cấp</option>
            <option value="high">Cao</option>
            <option value="normal">Bình thường</option>
            <option value="low">Thấp</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <div>Đang tải danh sách yêu cầu...</div>
        </div>
      ) : verificationRequests.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📋</div>
          <div>Không có yêu cầu xác thực nào</div>
        </div>
      ) : (
        <div>
          {/* Requests List */}
          <div style={{ display: 'grid', gap: '16px', marginBottom: '24px' }}>
            {verificationRequests.map((request) => (
              <div
                key={request.id}
                style={{
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  padding: '16px',
                  cursor: 'pointer',
                  backgroundColor: selectedRequest?.id === request.id ? '#eff6ff' : '#fff',
                  borderColor: selectedRequest?.id === request.id ? '#3b82f6' : '#e5e7eb'
                }}
                onClick={() => setSelectedRequest(request)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                      <h4 style={{ margin: 0, color: '#1f2937' }}>
                        {request.fullName}
                      </h4>
                      <span style={{
                        padding: '2px 8px',
                        backgroundColor: getPriorityColor(request.priority),
                        color: 'white',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: '500'
                      }}>
                        {getPriorityText(request.priority)}
                      </span>
                    </div>
                    
                    <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>
                      📧 {request.email} • 📞 {request.phone}
                    </div>
                    
                    <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '8px' }}>
                      🛠️ Dịch vụ: {request.services || 'Chưa chọn'}
                    </div>
                    
                    <div style={{ fontSize: '14px', color: '#6b7280' }}>
                      📄 {request.documentCount} tài liệu • ⏰ {formatTimeAgo(request.submittedAt)}
                    </div>
                  </div>
                  
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
                      Tham gia: {formatTimeAgo(request.userCreatedAt)}
                    </div>
                    <div style={{ fontSize: '12px', color: '#6b7280' }}>
                      Kinh nghiệm: {request.experience || 0} năm
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Review Panel */}
          {selectedRequest && (
            <div style={{
              border: '2px solid #3b82f6',
              borderRadius: '12px',
              padding: '24px',
              backgroundColor: '#f8fafc'
            }}>
              <h3 style={{ margin: '0 0 20px 0', color: '#1e40af' }}>
                📋 Xem xét yêu cầu của {selectedRequest.fullName}
              </h3>

              {/* User Info */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '16px',
                marginBottom: '20px',
                padding: '16px',
                backgroundColor: 'white',
                borderRadius: '8px'
              }}>
                <div>
                  <strong>Email:</strong> {selectedRequest.email}
                </div>
                <div>
                  <strong>Điện thoại:</strong> {selectedRequest.phone}
                </div>
                <div>
                  <strong>Kinh nghiệm:</strong> {selectedRequest.experience || 0} năm
                </div>
                <div>
                  <strong>Dịch vụ:</strong> {selectedRequest.services || 'Chưa chọn'}
                </div>
              </div>

              {/* User Notes */}
              {selectedRequest.userNotes && (
                <div style={{
                  padding: '12px',
                  backgroundColor: '#e0f2fe',
                  border: '1px solid #b3e5fc',
                  borderRadius: '6px',
                  marginBottom: '20px'
                }}>
                  <div style={{ fontWeight: '600', marginBottom: '4px', color: '#0277bd' }}>
                    💬 Ghi chú từ người dùng:
                  </div>
                  <div style={{ color: '#0277bd', fontSize: '14px' }}>
                    {selectedRequest.userNotes}
                  </div>
                </div>
              )}

              {/* Verification Documents */}
              <div style={{
                padding: '16px',
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                marginBottom: '20px'
              }}>
                <h4 style={{ margin: '0 0 16px 0', color: '#1f2937', fontSize: '16px', fontWeight: '600' }}>
                  📄 Tài liệu xác minh ({selectedRequest.documentCount || 0})
                </h4>
                
                {selectedRequest.documents && selectedRequest.documents.length > 0 ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
                    {selectedRequest.documents.map((doc, index) => (
                      <div key={index} style={{
                        border: '1px solid #d1d5db',
                        borderRadius: '8px',
                        padding: '12px',
                        backgroundColor: '#f9fafb'
                      }}>
                        <div style={{ fontSize: '14px', fontWeight: '500', marginBottom: '8px', color: '#374151' }}>
                          {doc.type || `Tài liệu ${index + 1}`}
                        </div>
                        
                        {doc.url ? (
                          <DocumentViewer 
                            doc={doc} 
                            index={index}
                          />
                        ) : (
                          <div style={{ 
                            textAlign: 'center', 
                            padding: '20px', 
                            color: '#6b7280',
                            fontSize: '12px',
                            fontStyle: 'italic'
                          }}>
                            Không có hình ảnh
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ 
                    textAlign: 'center', 
                    padding: '40px', 
                    color: '#6b7280',
                    backgroundColor: '#f9fafb',
                    borderRadius: '8px',
                    border: '2px dashed #d1d5db'
                  }}>
                    <div style={{ fontSize: '32px', marginBottom: '8px' }}>📄</div>
                    <div>Chưa có tài liệu xác minh nào được tải lên</div>
                  </div>
                )}
              </div>

              {/* Review Form */}
              <div style={{ display: 'grid', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                    Quyết định: *
                  </label>
                  <select
                    value={reviewForm.action}
                    onChange={(e) => setReviewForm(prev => ({ ...prev, action: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '14px'
                    }}
                  >
                    <option value="">Chọn hành động</option>
                    <option value="approve">✅ Phê duyệt</option>
                    <option value="reject">❌ Từ chối</option>
                    <option value="request_more_info">📋 Yêu cầu bổ sung thông tin</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                    Ghi chú cho người dùng:
                  </label>
                  <textarea
                    value={reviewForm.adminNotes}
                    onChange={(e) => setReviewForm(prev => ({ ...prev, adminNotes: e.target.value }))}
                    placeholder="Nhập ghi chú, lý do từ chối hoặc yêu cầu bổ sung..."
                    rows="4"
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '14px',
                      resize: 'vertical'
                    }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => {
                      setSelectedRequest(null);
                      setReviewForm({ action: '', adminNotes: '', documentReviews: [] });
                    }}
                    disabled={submitting}
                    style={{
                      padding: '10px 20px',
                      backgroundColor: '#6b7280',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '14px',
                      cursor: 'pointer'
                    }}
                  >
                    Hủy
                  </button>
                  
                  <button
                    onClick={handleReviewSubmit}
                    disabled={submitting || !reviewForm.action}
                    style={{
                      padding: '10px 20px',
                      backgroundColor: submitting || !reviewForm.action ? '#9ca3af' : '#3b82f6',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '14px',
                      cursor: submitting || !reviewForm.action ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {submitting ? 'Đang xử lý...' : 'Xác nhận quyết định'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminVerificationPanel;
