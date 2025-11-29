import React, { useState, useEffect } from 'react';
import AdminVerificationPanel from '../components/AdminVerificationPanel';
import CouponManagement from '../components/Admin/CouponManagement';
import './AdminDashboard.css';

const AdminDashboard = () => {
  const [overview, setOverview] = useState({});
  const [bookingStats, setBookingStats] = useState([]);
  const [topHousekeepers, setTopHousekeepers] = useState([]);
  const [timeStats, setTimeStats] = useState([]);
  const [serviceStats, setServiceStats] = useState([]);
  const [housekeeperStatus, setHousekeeperStatus] = useState([]);
  const [userGrowth, setUserGrowth] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [housekeeperDetails, setHousekeeperDetails] = useState({});
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState('dashboard');
  const [selectedHousekeeper, setSelectedHousekeeper] = useState(null);
  const [showHousekeeperModal, setShowHousekeeperModal] = useState(false);
  const [reports, setReports] = useState([]);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showWarningForm, setShowWarningForm] = useState(false);
  const [warningFormData, setWarningFormData] = useState({
    warningType: 'written',
    title: '',
    message: '',
    severity: 'medium',
    expiresAt: ''
  });

  useEffect(() => {
    fetchAllData();
  }, []);

  // Fetch reports when reports section is active
  useEffect(() => {
    if (activeSection === 'reports') {
      fetchReports();
    }
  }, [activeSection]);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [
        overviewRes,
        bookingStatsRes,
        topHousekeepersRes,
        timeStatsRes,
        serviceStatsRes,
        housekeeperStatusRes,
        userGrowthRes,
        reviewsRes,
        housekeeperDetailsRes
      ] = await Promise.all([
        fetch('http://localhost:5000/api/admin/dashboard/overview'),
        fetch('http://localhost:5000/api/admin/dashboard/booking-stats'),
        fetch('http://localhost:5000/api/admin/dashboard/top-housekeepers'),
        fetch('http://localhost:5000/api/admin/dashboard/time-stats'),
        fetch('http://localhost:5000/api/admin/dashboard/service-stats'),
        fetch('http://localhost:5000/api/admin/housekeepers/status'),
        fetch('http://localhost:5000/api/admin/dashboard/user-growth'),
        fetch('http://localhost:5000/api/admin/reviews'),
        fetch('http://localhost:5000/api/admin/dashboard/housekeeper-details')
      ]);

      setOverview(await overviewRes.json());
      setBookingStats(await bookingStatsRes.json());
      setTopHousekeepers(await topHousekeepersRes.json());
      setTimeStats(await timeStatsRes.json());
      setServiceStats(await serviceStatsRes.json());
      setHousekeeperStatus(await housekeeperStatusRes.json());
      setUserGrowth(await userGrowthRes.json());
      setReviews(await reviewsRes.json());
      setHousekeeperDetails(await housekeeperDetailsRes.json());
    } catch (error) {
      console.error('Error fetching admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateHousekeeperStatus = async (userId, isApproved, isVerified) => {
    try {
      const response = await fetch(`http://localhost:5000/api/admin/housekeepers/${userId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isApproved, isVerified }),
      });

      if (response.ok) {
        const statusRes = await fetch('http://localhost:5000/api/admin/housekeepers/status');
        setHousekeeperStatus(await statusRes.json());
      }
    } catch (error) {
      console.error('Error updating housekeeper status:', error);
    }
  };

  const viewHousekeeperDetails = async (housekeeper) => {
    try {
      // Fetch detailed housekeeper info
      const response = await fetch(`http://localhost:5000/api/housekeepers/${housekeeper.id}`);
      if (response.ok) {
        const detailedInfo = await response.json();
        setSelectedHousekeeper({ ...housekeeper, ...detailedInfo });
        setShowHousekeeperModal(true);
      }
    } catch (error) {
      console.error('Error fetching housekeeper details:', error);
      // Fallback to basic info
      setSelectedHousekeeper(housekeeper);
      setShowHousekeeperModal(true);
    }
  };

  const toggleReviewVisibility = async (reviewId, visible) => {
    try {
      const response = await fetch(`http://localhost:5000/api/admin/reviews/${reviewId}/visibility`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ visible }),
      });

      if (response.ok) {
        // Refresh reviews data
        const reviewsRes = await fetch('http://localhost:5000/api/admin/reviews');
        setReviews(await reviewsRes.json());
      }
    } catch (error) {
      console.error('Error updating review visibility:', error);
    }
  };

  // Reports management functions
  const fetchReports = async () => {
    setReportsLoading(true);
    try {
      const response = await fetch('http://localhost:5000/api/reports');
      if (response.ok) {
        const data = await response.json();
        setReports(data.reports || []);
      }
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setReportsLoading(false);
    }
  };

  const viewReportDetails = async (report) => {
    try {
      const response = await fetch(`http://localhost:5000/api/reports/${report.id}`);
      if (response.ok) {
        const detailedReport = await response.json();
        setSelectedReport(detailedReport);
        setShowReportModal(true);
      }
    } catch (error) {
      console.error('Error fetching report details:', error);
      setSelectedReport(report);
      setShowReportModal(true);
    }
  };

  const updateReportStatus = async (reportId, status, adminResponse = '') => {
    try {
      const response = await fetch(`http://localhost:5000/api/reports/${reportId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status, adminResponse }),
      });

      if (response.ok) {
        // Refresh reports data
        await fetchReports();
        // Close modal if open
        if (showReportModal) {
          setShowReportModal(false);
          setSelectedReport(null);
        }
        alert('Cập nhật báo cáo thành công!');
      } else {
        const errorData = await response.json();
        alert('Lỗi cập nhật báo cáo: ' + errorData.error);
      }
    } catch (error) {
      console.error('Error updating report status:', error);
      alert('Lỗi cập nhật báo cáo: ' + error.message);
    }
  };

  const getReportTypeLabel = (type) => {
    const types = {
      late_arrival: 'Đến muộn',
      no_show: 'Không đến',
      inappropriate_behavior: 'Hành vi không phù hợp',
      poor_service: 'Dịch vụ kém',
      damage: 'Làm hỏng đồ đạc',
      other: 'Khác'
    };
    return types[type] || type;
  };

  const getReportStatusLabel = (status) => {
    const statuses = {
      pending: 'Chờ xử lý',
      investigating: 'Đang điều tra',
      resolved: 'Đã giải quyết',
      dismissed: 'Đã từ chối'
    };
    return statuses[status] || status;
  };

  const getReportStatusColor = (status) => {
    const colors = {
      pending: '#ffc107',
      investigating: '#007bff',
      resolved: '#28a745',
      dismissed: '#6c757d'
    };
    return colors[status] || '#6c757d';
  };

  const getSeverityColor = (severity) => {
    const colors = {
      low: '#28a745',
      medium: '#ffc107',
      high: '#fd7e14',
      critical: '#dc3545'
    };
    return colors[severity] || '#6c757d';
  };

  // Warning functions
  const openWarningForm = (report) => {
    setWarningFormData({
      warningType: 'written',
      title: `Cảnh cáo vi phạm: ${getReportTypeLabel(report.reportType)}`,
      message: `Bạn đã vi phạm quy định về ${getReportTypeLabel(report.reportType).toLowerCase()}. Vui lòng cải thiện chất lượng dịch vụ để tránh các vi phạm tương tự trong tương lai.`,
      severity: report.severity || 'medium',
      expiresAt: ''
    });
    setShowWarningForm(true);
  };

  const handleWarningInputChange = (e) => {
    const { name, value } = e.target;
    setWarningFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const sendWarning = async () => {
    try {
      if (!warningFormData.title || !warningFormData.message) {
        alert('Vui lòng điền đầy đủ tiêu đề và nội dung cảnh cáo');
        return;
      }

      // Get current user (admin) ID - you might need to implement this
      const adminUser = JSON.parse(localStorage.getItem('househelp_user') || '{}');
      
      const warningData = {
        housekeeperId: selectedReport.housekeeperId,
        reportId: selectedReport.id,
        adminId: adminUser.id || 1, // Fallback admin ID
        warningType: warningFormData.warningType,
        title: warningFormData.title,
        message: warningFormData.message,
        severity: warningFormData.severity,
        expiresAt: warningFormData.expiresAt || null
      };

      const response = await fetch('http://localhost:5000/api/warnings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(warningData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Lỗi gửi cảnh cáo');
      }

      const result = await response.json();
      
      alert('Cảnh cáo đã được gửi thành công đến người giúp việc!');
      
      // Close warning form
      setShowWarningForm(false);
      
      // Reset form
      setWarningFormData({
        warningType: 'written',
        title: '',
        message: '',
        severity: 'medium',
        expiresAt: ''
      });

    } catch (error) {
      console.error('Error sending warning:', error);
      alert('Lỗi gửi cảnh cáo: ' + error.message);
    }
  };

  const deleteReview = async (reviewId) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa đánh giá này không?')) {
      try {
        const response = await fetch(`http://localhost:5000/api/admin/reviews/${reviewId}`, {
          method: 'DELETE',
        });

        if (response.ok) {
          // Refresh reviews data
          const reviewsRes = await fetch('http://localhost:5000/api/admin/reviews');
          setReviews(await reviewsRes.json());
        }
      } catch (error) {
        console.error('Error deleting review:', error);
      }
    }
  };

  // Helper functions for housekeeper status
  const getHousekeeperStatusClass = (hk) => {
    if (!hk.isVerified) return 'unverified';
    if (!hk.isApproved) return 'pending';
    if (!hk.available) return 'offline';
    return 'active';
  };

  const getHousekeeperStatusText = (hk) => {
    if (!hk.isVerified) return '🔴 Chưa xác minh';
    if (!hk.isApproved) return '🟡 Chờ duyệt';
    if (!hk.available) return '⚫ Không sẵn sàng';
    return '🟢 Hoạt động';
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('vi-VN');
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: '#ffa500',
      confirmed: '#4caf50',
      completed: '#2196f3',
      cancelled: '#f44336',
      rejected: '#9e9e9e'
    };
    return colors[status] || '#9e9e9e';
  };

  // Simple Chart Components
  const PieChart = ({ data, title }) => {
    const total = data.reduce((sum, item) => sum + item.count, 0);
    let currentAngle = 0;
    
    return (
      <div className="chart-container">
        <h3>{title}</h3>
        <div className="pie-chart">
          <svg viewBox="0 0 200 200" className="pie-svg">
            {data.map((item, index) => {
              const percentage = (item.count / total) * 100;
              const angle = (percentage / 100) * 360;
              const startAngle = currentAngle;
              const endAngle = currentAngle + angle;
              
              const x1 = 100 + 80 * Math.cos((startAngle * Math.PI) / 180);
              const y1 = 100 + 80 * Math.sin((startAngle * Math.PI) / 180);
              const x2 = 100 + 80 * Math.cos((endAngle * Math.PI) / 180);
              const y2 = 100 + 80 * Math.sin((endAngle * Math.PI) / 180);
              
              const largeArcFlag = angle > 180 ? 1 : 0;
              const pathData = [
                `M 100 100`,
                `L ${x1} ${y1}`,
                `A 80 80 0 ${largeArcFlag} 1 ${x2} ${y2}`,
                `Z`
              ].join(' ');
              
              currentAngle += angle;
              
              return (
                <path
                  key={index}
                  d={pathData}
                  fill={getStatusColor(item.status)}
                  stroke="#fff"
                  strokeWidth="2"
                />
              );
            })}
          </svg>
          <div className="pie-legend">
            {data.map((item, index) => (
              <div key={index} className="legend-item">
                <div 
                  className="legend-color" 
                  style={{ backgroundColor: getStatusColor(item.status) }}
                ></div>
                <span>{item.status}: {item.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const BarChart = ({ data, title, xKey, yKey }) => {
    const maxValue = Math.max(...data.map(item => item[yKey]));
    
    return (
      <div className="chart-container">
        <h3>{title}</h3>
        <div className="bar-chart">
          {data.slice(0, 6).map((item, index) => (
            <div key={index} className="bar-item">
              <div 
                className="bar"
                style={{ 
                  height: `${(item[yKey] / maxValue) * 100}%`,
                  backgroundColor: `hsl(${index * 60}, 70%, 60%)`
                }}
              >
                <span className="bar-value">{item[yKey]}</span>
              </div>
              <span className="bar-label">{item[xKey]}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const LineChart = ({ data, title }) => {
    const maxValue = Math.max(...data.map(item => item.bookings));
    const points = data.map((item, index) => {
      const x = (index / (data.length - 1)) * 300;
      const y = 150 - (item.bookings / maxValue) * 120;
      return `${x},${y}`;
    }).join(' ');

    return (
      <div className="chart-container">
        <h3>{title}</h3>
        <div className="line-chart">
          <svg viewBox="0 0 300 150" className="line-svg">
            <polyline
              points={points}
              fill="none"
              stroke="#4CAF50"
              strokeWidth="3"
            />
            {data.map((item, index) => {
              const x = (index / (data.length - 1)) * 300;
              const y = 150 - (item.bookings / maxValue) * 120;
              return (
                <circle
                  key={index}
                  cx={x}
                  cy={y}
                  r="4"
                  fill="#4CAF50"
                />
              );
            })}
          </svg>
          <div className="line-labels">
            {data.map((item, index) => (
              <span key={index}>{formatDate(item.date)}</span>
            ))}
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="admin-dashboard loading">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Đang tải dữ liệu...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-dashboard modern">
      {/* Sidebar */}
      <div className="admin-sidebar">
        <div className="sidebar-header">
          <h2>🏠 HouseHelp</h2>
          <p>Admin Panel</p>
        </div>
        
        <nav className="sidebar-nav">
          <button 
            className={`nav-item ${activeSection === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveSection('dashboard')}
          >
            <span className="nav-icon">📊</span>
            Dashboard
          </button>
          <button 
            className={`nav-item ${activeSection === 'users' ? 'active' : ''}`}
            onClick={() => setActiveSection('users')}
          >
            <span className="nav-icon">👥</span>
            Người dùng
          </button>
          <button 
            className={`nav-item ${activeSection === 'bookings' ? 'active' : ''}`}
            onClick={() => setActiveSection('bookings')}
          >
            <span className="nav-icon">📅</span>
            Đặt lịch
          </button>
          <button 
            className={`nav-item ${activeSection === 'analytics' ? 'active' : ''}`}
            onClick={() => setActiveSection('analytics')}
          >
            <span className="nav-icon">📈</span>
            Phân tích
          </button>
          <button 
            className={`nav-item ${activeSection === 'reviews' ? 'active' : ''}`}
            onClick={() => setActiveSection('reviews')}
          >
            <span className="nav-icon">⭐</span>
            Đánh giá
          </button>
          <button 
            className={`nav-item ${activeSection === 'verification' ? 'active' : ''}`}
            onClick={() => setActiveSection('verification')}
          >
            <span className="nav-icon">🔐</span>
            Xác thực tài khoản
          </button>
          <button 
            className={`nav-item ${activeSection === 'reports' ? 'active' : ''}`}
            onClick={() => setActiveSection('reports')}
          >
            <span className="nav-icon">⚠️</span>
            Báo cáo vi phạm
          </button>
          <button 
            className={`nav-item ${activeSection === 'coupons' ? 'active' : ''}`}
            onClick={() => setActiveSection('coupons')}
          >
            <span className="nav-icon">🎫</span>
            Mã giảm giá
          </button>
        </nav>
      </div>

      {/* Main Content */}
      <div className="admin-main">
        {/* Header */}
        <div className="admin-header">
          <div className="header-left">
            <h1>
              {activeSection === 'dashboard' && '📊 Dashboard'}
              {activeSection === 'users' && '👥 Quản lý Người dùng'}
              {activeSection === 'bookings' && '📅 Quản lý Đặt lịch'}
              {activeSection === 'analytics' && '📈 Phân tích & Báo cáo'}
              {activeSection === 'reviews' && '⭐ Quản lý Đánh giá'}
              {activeSection === 'verification' && '🔐 Xác thực tài khoản'}
              {activeSection === 'reports' && '⚠️ Quản lý Báo cáo Vi phạm'}
              {activeSection === 'coupons' && '🎫 Quản lý Mã giảm giá'}
            </h1>
            <p>Chào mừng trở lại! Đây là tổng quan hệ thống của bạn.</p>
          </div>
          <button onClick={fetchAllData} className="refresh-btn">
            🔄 Làm mới
          </button>
        </div>

        {/* Dashboard Content */}
        {activeSection === 'dashboard' && (
          <div className="dashboard-content">
            {/* Stats Cards */}
            <div className="stats-grid">
              <div className="stat-card primary">
                <div className="stat-icon">👥</div>
                <div className="stat-content">
                  <h3>Tổng người dùng</h3>
                  <p className="stat-number">{overview.totalUsers || 0}</p>
                  <span className="stat-change">+12% từ tháng trước</span>
                </div>
              </div>
              
              <div className="stat-card success">
                <div className="stat-icon">🏠</div>
                <div className="stat-content">
                  <h3>Người giúp việc</h3>
                  <p className="stat-number">{overview.totalHousekeepers || 0}</p>
                  <span className="stat-change">+8% từ tháng trước</span>
                </div>
              </div>

              <div className="stat-card info">
                <div className="stat-icon">👤</div>
                <div className="stat-content">
                  <h3>Người sử dụng dịch vụ</h3>
                  <p className="stat-number">{overview.totalCustomers || 0}</p>
                  <span className="stat-change">+10% từ tháng trước</span>
                </div>
              </div>
              
              <div className="stat-card warning">
                <div className="stat-icon">📅</div>
                <div className="stat-content">
                  <h3>Đặt lịch hôm nay</h3>
                  <p className="stat-number">{overview.todayBookings || 0}</p>
                  <span className="stat-change">+15% từ hôm qua</span>
                </div>
              </div>
              
              <div className="stat-card info">
                <div className="stat-icon">💰</div>
                <div className="stat-content">
                  <h3>Doanh thu hôm nay</h3>
                  <p className="stat-number">{formatCurrency(overview.todayRevenue)}</p>
                  <span className="stat-change">+22% từ hôm qua</span>
                </div>
              </div>
            </div>

            {/* Housekeeper Statistics Section */}
            <div className="housekeeper-stats-section">
              <div className="section-header">
                <h2>📊 Thống kê Người giúp việc</h2>
              </div>
              <div className="housekeeper-stats-grid">
                <div className="stat-card success">
                  <div className="stat-icon">✅</div>
                  <div className="stat-content">
                    <h3>Sẵn sàng nhận việc</h3>
                    <p className="stat-number">{housekeeperDetails.ready || 0}</p>
                    <span className="stat-change">Đã xác minh & có sẵn</span>
                  </div>
                </div>

                <div className="stat-card warning">
                  <div className="stat-icon">🔄</div>
                  <div className="stat-content">
                    <h3>Đang hoạt động</h3>
                    <p className="stat-number">{housekeeperDetails.available || 0}</p>
                    <span className="stat-change">Đang mở trạng thái nhận việc</span>
                  </div>
                </div>

                <div className="stat-card info">
                  <div className="stat-icon">✔️</div>
                  <div className="stat-content">
                    <h3>Đã xác minh</h3>
                    <p className="stat-number">{housekeeperDetails.verified || 0}</p>
                    <span className="stat-change">Đã được admin phê duyệt</span>
                  </div>
                </div>

                <div className="stat-card danger">
                  <div className="stat-icon">⏳</div>
                  <div className="stat-content">
                    <h3>Chờ xác minh</h3>
                    <p className="stat-number">{housekeeperDetails.unverified || 0}</p>
                    <span className="stat-change">Cần xem xét</span>
                  </div>
                </div>

                <div className="stat-card primary">
                  <div className="stat-icon">⭐</div>
                  <div className="stat-content">
                    <h3>Đánh giá trung bình</h3>
                    <p className="stat-number">{housekeeperDetails.avgRating || 0}/5</p>
                    <span className="stat-change">Từ khách hàng</span>
                  </div>
                </div>

                <div className="stat-card success">
                  <div className="stat-icon">🏆</div>
                  <div className="stat-content">
                    <h3>Tổng công việc hoàn thành</h3>
                    <p className="stat-number">{housekeeperDetails.totalCompletedJobs || 0}</p>
                    <span className="stat-change">Tất cả người giúp việc</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Charts Row */}
            <div className="charts-row">
              <div className="chart-card">
                <PieChart data={bookingStats} title="Trạng thái Đặt lịch" />
              </div>
              
              <div className="chart-card">
                <BarChart 
                  data={serviceStats} 
                  title="Dịch vụ Phổ biến" 
                  xKey="service" 
                  yKey="bookingCount" 
                />
              </div>
              
              <div className="chart-card">
                <LineChart data={timeStats} title="Xu hướng 7 ngày" />
              </div>
            </div>

            {/* Recent Activity */}
            <div className="activity-section">
              <div className="section-header">
                <h2>🏆 Top Người giúp việc</h2>
              </div>
              <div className="activity-list">
                {topHousekeepers.slice(0, 5).map((hk, index) => (
                  <div key={index} className="activity-item">
                    <div className="activity-avatar">
                      <span className="rank">#{index + 1}</span>
                    </div>
                    <div className="activity-content">
                      <h4>{hk.fullName}</h4>
                      <p>{hk.completedJobs} đơn hoàn thành • ⭐ {hk.rating}</p>
                    </div>
                    <div className="activity-value">
                      {formatCurrency(hk.totalEarnings)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Users Management */}
        {activeSection === 'users' && (
          <div className="users-content">
            <div className="section-header">
              <h2>👥 Quản lý Người giúp việc</h2>
            </div>
            <div className="users-table">
              <table>
                <thead>
                  <tr>
                    <th>Tên</th>
                    <th>Email</th>
                    <th>Trạng thái</th>
                    <th>Xác minh</th>
                    <th>Phê duyệt</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {housekeeperStatus.map((hk, index) => (
                    <tr key={index}>
                      <td>
                        <div className="user-info">
                          <div className="user-avatar">{hk.fullName.charAt(0)}</div>
                          <div>
                            <div className="user-name">{hk.fullName}</div>
                            <div className="user-meta">{hk.completedJobs} đơn hoàn thành</div>
                          </div>
                        </div>
                      </td>
                      <td>{hk.email}</td>
                      <td>
                        <span className={`status-badge ${getHousekeeperStatusClass(hk)}`}>
                          {getHousekeeperStatusText(hk)}
                        </span>
                      </td>
                      <td>
                        <span className={`verify-badge ${hk.isVerified ? 'verified' : 'unverified'}`}>
                          {hk.isVerified ? '✅ Đã xác minh' : '❌ Chưa xác minh'}
                        </span>
                      </td>
                      <td>
                        <span className={`approve-badge ${hk.isApproved ? 'approved' : 'unapproved'}`}>
                          {hk.isApproved ? '✅ Đã duyệt' : '❌ Chưa duyệt'}
                        </span>
                      </td>
                      <td>
                        <div className="action-buttons">
                          <button
                            className="action-btn info"
                            onClick={() => viewHousekeeperDetails(hk)}
                            title="Xem chi tiết thông tin"
                          >
                            Chi tiết
                          </button>
                          <button
                            className={`action-btn ${hk.isVerified ? 'danger' : 'success'}`}
                            onClick={() => updateHousekeeperStatus(hk.id, hk.isApproved, !hk.isVerified)}
                          >
                            {hk.isVerified ? 'Hủy xác minh' : 'Xác minh'}
                          </button>
                          <button
                            className={`action-btn ${hk.isApproved ? 'danger' : 'success'}`}
                            onClick={() => updateHousekeeperStatus(hk.id, !hk.isApproved, hk.isVerified)}
                          >
                            {hk.isApproved ? 'Hủy duyệt' : 'Phê duyệt'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Bookings Management */}
        {activeSection === 'bookings' && (
          <div className="bookings-content">
            <div className="booking-stats-grid">
              {bookingStats.map((stat, index) => (
                <div key={index} className="booking-stat-card">
                  <div 
                    className="stat-indicator" 
                    style={{ backgroundColor: getStatusColor(stat.status) }}
                  ></div>
                  <div className="stat-content">
                    <h3>{stat.status.toUpperCase()}</h3>
                    <p className="stat-number">{stat.count} đơn</p>
                    <p className="stat-value">{formatCurrency(stat.totalValue)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Analytics */}
        {activeSection === 'analytics' && (
          <div className="analytics-content">
            <div className="analytics-grid">
              <div className="chart-card large">
                <h3>📈 Tăng trưởng Người dùng theo Tháng</h3>
                <div className="growth-table">
                  <table>
                    <thead>
                      <tr>
                        <th>Tháng</th>
                        <th>Khách hàng</th>
                        <th>Người giúp việc</th>
                        <th>Tổng</th>
                      </tr>
                    </thead>
                    <tbody>
                      {userGrowth.filter(growth => growth.role !== 'admin').reduce((acc, growth) => {
                        const existing = acc.find(item => item.month === growth.month);
                        if (existing) {
                          existing[growth.role] = growth.count;
                        } else {
                          acc.push({
                            month: growth.month,
                            [growth.role]: growth.count
                          });
                        }
                        return acc;
                      }, []).map((row, index) => (
                        <tr key={index}>
                          <td>{row.month}</td>
                          <td>{row.customer || 0}</td>
                          <td>{row.housekeeper || 0}</td>
                          <td><strong>{(row.customer || 0) + (row.housekeeper || 0)}</strong></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Housekeeper Detail Modal */}
        {showHousekeeperModal && selectedHousekeeper && (
          <div className="modal-overlay" onClick={() => setShowHousekeeperModal(false)}>
            <div className="modal-content housekeeper-modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>📋 Thông tin chi tiết người giúp việc</h2>
                <button 
                  className="modal-close"
                  onClick={() => setShowHousekeeperModal(false)}
                >
                  ×
                </button>
              </div>
              
              <div className="modal-body">
                <div className="housekeeper-profile">
                  {/* Basic Info */}
                  <div className="profile-section">
                    <h3>👤 Thông tin cơ bản</h3>
                    <div className="info-grid">
                      <div className="info-item">
                        <label>Họ tên:</label>
                        <span>{selectedHousekeeper.fullName}</span>
                      </div>
                      <div className="info-item">
                        <label>Email:</label>
                        <span>{selectedHousekeeper.email}</span>
                      </div>
                      <div className="info-item">
                        <label>Số điện thoại:</label>
                        <span>{selectedHousekeeper.phone}</span>
                      </div>
                      <div className="info-item">
                        <label>Kinh nghiệm:</label>
                        <span>{selectedHousekeeper.experience || 'N/A'} năm</span>
                      </div>
                    </div>
                  </div>

                  {/* Work Info */}
                  <div className="profile-section">
                    <h3>💼 Thông tin công việc</h3>
                    <div className="info-grid">
                      <div className="info-item">
                        <label>Giá dịch vụ:</label>
                        <span>{formatCurrency(selectedHousekeeper.price || 0)}/giờ</span>
                      </div>
                      <div className="info-item">
                        <label>Đánh giá:</label>
                        <span>⭐ {selectedHousekeeper.rating || 0}/5 ({selectedHousekeeper.totalReviews || 0} đánh giá)</span>
                      </div>
                      <div className="info-item">
                        <label>Công việc hoàn thành:</label>
                        <span>{selectedHousekeeper.completedJobs || 0} công việc</span>
                      </div>
                      <div className="info-item">
                        <label>Trạng thái:</label>
                        <span className={selectedHousekeeper.available ? 'status-available' : 'status-unavailable'}>
                          {selectedHousekeeper.available ? '🟢 Sẵn sàng' : '🔴 Bận'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Services */}
                  <div className="profile-section">
                    <h3>🛠️ Dịch vụ cung cấp</h3>
                    <div className="services-list">
                      {selectedHousekeeper.services ? 
                        selectedHousekeeper.services.split(',').map((service, index) => (
                          <span key={index} className="service-tag">{service.trim()}</span>
                        )) : 
                        <span>Chưa có thông tin</span>
                      }
                    </div>
                  </div>

                  {/* Skills */}
                  {selectedHousekeeper.skills && (
                    <div className="profile-section">
                      <h3>💪 Kỹ năng</h3>
                      <div className="skills-list">
                        {JSON.parse(selectedHousekeeper.skills || '[]').map((skill, index) => (
                          <span key={index} className="skill-tag">{skill}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Description */}
                  {selectedHousekeeper.description && (
                    <div className="profile-section">
                      <h3>📝 Mô tả</h3>
                      <p className="description-text">{selectedHousekeeper.description}</p>
                    </div>
                  )}

                  {/* Verification Status */}
                  <div className="profile-section">
                    <h3>✅ Trạng thái xác minh</h3>
                    <div className="verification-status">
                      <div className={`status-item ${selectedHousekeeper.isVerified ? 'verified' : 'unverified'}`}>
                        {selectedHousekeeper.isVerified ? '✅' : '❌'} Xác minh danh tính
                      </div>
                      <div className={`status-item ${selectedHousekeeper.isApproved ? 'approved' : 'unapproved'}`}>
                        {selectedHousekeeper.isApproved ? '✅' : '❌'} Phê duyệt hoạt động
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <div className="modal-actions">
                  <button
                    className={`action-btn ${selectedHousekeeper.isVerified ? 'danger' : 'success'}`}
                    onClick={() => {
                      updateHousekeeperStatus(selectedHousekeeper.id, selectedHousekeeper.isApproved, !selectedHousekeeper.isVerified);
                      setShowHousekeeperModal(false);
                    }}
                  >
                    {selectedHousekeeper.isVerified ? 'Hủy xác minh' : 'Xác minh'}
                  </button>
                  <button
                    className={`action-btn ${selectedHousekeeper.isApproved ? 'danger' : 'success'}`}
                    onClick={() => {
                      updateHousekeeperStatus(selectedHousekeeper.id, !selectedHousekeeper.isApproved, selectedHousekeeper.isVerified);
                      setShowHousekeeperModal(false);
                    }}
                  >
                    {selectedHousekeeper.isApproved ? 'Hủy duyệt' : 'Phê duyệt'}
                  </button>
                  <button
                    className="action-btn secondary"
                    onClick={() => setShowHousekeeperModal(false)}
                  >
                    Đóng
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Reviews Management */}
        {activeSection === 'reviews' && (
          <div className="reviews-content">
            <div className="reviews-table-container">
              <table className="reviews-table">
                <thead>
                  <tr>
                    <th>Khách hàng</th>
                    <th>Người giúp việc</th>
                    <th>Dịch vụ</th>
                    <th>Đánh giá</th>
                    <th>Nội dung</th>
                    <th>Ngày tạo</th>
                    <th>Trạng thái</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {reviews.map((review) => (
                    <tr key={review.id}>
                      <td>
                        <div className="user-info">
                          <div className="user-name">{review.customerName}</div>
                          <div className="user-email">{review.customerEmail}</div>
                        </div>
                      </td>
                      <td>
                        <div className="user-info">
                          <div className="user-name">{review.housekeeperName}</div>
                          <div className="user-email">{review.housekeeperEmail}</div>
                        </div>
                      </td>
                      <td>
                        <span className="service-tag">{review.service || 'N/A'}</span>
                      </td>
                      <td>
                        <div className="rating-display">
                          <span className="rating-stars">
                            {'⭐'.repeat(review.rating)}
                          </span>
                          <span className="rating-number">({review.rating}/5)</span>
                        </div>
                      </td>
                      <td>
                        <div className="review-content">
                          {review.comment ? (
                            <span title={review.comment}>
                              {review.comment.length > 50 
                                ? `${review.comment.substring(0, 50)}...` 
                                : review.comment}
                            </span>
                          ) : (
                            <span className="no-comment">Không có bình luận</span>
                          )}
                        </div>
                      </td>
                      <td>
                        <span className="date-text">
                          {new Date(review.createdAt).toLocaleDateString('vi-VN')}
                        </span>
                      </td>
                      <td>
                        <span className={`status-badge ${review.isVisible ? 'visible' : 'hidden'}`}>
                          {review.isVisible ? '👁️ Hiển thị' : '🙈 Ẩn'}
                        </span>
                      </td>
                      <td>
                        <div className="action-buttons">
                          <button
                            className={`action-btn ${review.isVisible ? 'warning' : 'success'}`}
                            onClick={() => toggleReviewVisibility(review.id, !review.isVisible)}
                          >
                            {review.isVisible ? 'Ẩn' : 'Hiện'}
                          </button>
                          <button
                            className="action-btn danger"
                            onClick={() => deleteReview(review.id)}
                          >
                            Xóa
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {reviews.length === 0 && (
                <div className="empty-state">
                  <div className="empty-icon">⭐</div>
                  <h3>Chưa có đánh giá nào</h3>
                  <p>Các đánh giá từ khách hàng sẽ hiển thị ở đây.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Verification Management Section */}
        {activeSection === 'verification' && (
          <div className="verification-content">
            <AdminVerificationPanel />
          </div>
        )}

        {/* Reports Management Section */}
        {activeSection === 'reports' && (
          <div className="reports-content">
            <div className="section-header">
              <h2>⚠️ Quản lý Báo cáo Vi phạm</h2>
              <p>Xem xét và xử lý các báo cáo vi phạm từ khách hàng</p>
            </div>

            {reportsLoading ? (
              <div className="loading-state">
                <div className="spinner"></div>
                <p>Đang tải báo cáo...</p>
              </div>
            ) : reports.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📋</div>
                <h3>Chưa có báo cáo vi phạm nào</h3>
                <p>Các báo cáo vi phạm từ khách hàng sẽ hiển thị ở đây.</p>
              </div>
            ) : (
              <div className="reports-table-container">
                <table className="reports-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Loại vi phạm</th>
                      <th>Khách hàng</th>
                      <th>Người giúp việc</th>
                      <th>Mức độ</th>
                      <th>Trạng thái</th>
                      <th>Ngày tạo</th>
                      <th>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reports.map((report) => (
                      <tr key={report.id}>
                        <td>#{report.id}</td>
                        <td>
                          <span className="report-type-badge">
                            {getReportTypeLabel(report.reportType)}
                          </span>
                        </td>
                        <td>
                          <div className="user-info">
                            <strong>{report.customerFullName}</strong>
                            <br />
                            <small>{report.customerEmail}</small>
                          </div>
                        </td>
                        <td>
                          <div className="user-info">
                            <strong>{report.housekeeperFullName}</strong>
                            <br />
                            <small>{report.housekeeperEmail}</small>
                          </div>
                        </td>
                        <td>
                          <span 
                            className="severity-badge"
                            style={{ backgroundColor: getSeverityColor(report.severity) }}
                          >
                            {report.severity?.toUpperCase()}
                          </span>
                        </td>
                        <td>
                          <span 
                            className="status-badge"
                            style={{ backgroundColor: getReportStatusColor(report.status) }}
                          >
                            {getReportStatusLabel(report.status)}
                          </span>
                        </td>
                        <td>{formatDate(report.createdAt)}</td>
                        <td>
                          <button 
                            className="action-btn view-btn"
                            onClick={() => viewReportDetails(report)}
                          >
                            Xem chi tiết
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Report Detail Modal */}
        {showReportModal && selectedReport && (
          <div className="modal-overlay" onClick={() => setShowReportModal(false)}>
            <div className="modal-content report-modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Chi tiết báo cáo vi phạm #{selectedReport.id}</h3>
                <button 
                  className="close-btn"
                  onClick={() => setShowReportModal(false)}
                >
                  ×
                </button>
              </div>

              <div className="modal-body">
                <div className="report-details">
                  <div className="detail-section">
                    <h4>Thông tin báo cáo</h4>
                    <div className="detail-grid">
                      <div className="detail-item">
                        <label>Loại vi phạm:</label>
                        <span className="report-type-badge">
                          {getReportTypeLabel(selectedReport.reportType)}
                        </span>
                      </div>
                      <div className="detail-item">
                        <label>Mức độ nghiêm trọng:</label>
                        <span 
                          className="severity-badge"
                          style={{ backgroundColor: getSeverityColor(selectedReport.severity) }}
                        >
                          {selectedReport.severity?.toUpperCase()}
                        </span>
                      </div>
                      <div className="detail-item">
                        <label>Trạng thái:</label>
                        <span 
                          className="status-badge"
                          style={{ backgroundColor: getReportStatusColor(selectedReport.status) }}
                        >
                          {getReportStatusLabel(selectedReport.status)}
                        </span>
                      </div>
                      <div className="detail-item">
                        <label>Ngày tạo:</label>
                        <span>{formatDate(selectedReport.createdAt)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="detail-section">
                    <h4>Thông tin đặt lịch</h4>
                    <div className="booking-info">
                      <p><strong>Dịch vụ:</strong> {selectedReport.service}</p>
                      <p><strong>Ngày làm việc:</strong> {formatDate(selectedReport.startDate)}</p>
                      <p><strong>Địa điểm:</strong> {selectedReport.location}</p>
                    </div>
                  </div>

                  <div className="detail-section">
                    <h4>Thông tin liên quan</h4>
                    <div className="parties-info">
                      <div className="party-info">
                        <h5>Khách hàng báo cáo</h5>
                        <p><strong>Tên:</strong> {selectedReport.customerFullName}</p>
                        <p><strong>Email:</strong> {selectedReport.customerEmail}</p>
                        <p><strong>Điện thoại:</strong> {selectedReport.customerPhone}</p>
                      </div>
                      <div className="party-info">
                        <h5>Người giúp việc bị báo cáo</h5>
                        <p><strong>Tên:</strong> {selectedReport.housekeeperFullName}</p>
                        <p><strong>Email:</strong> {selectedReport.housekeeperEmail}</p>
                        <p><strong>Điện thoại:</strong> {selectedReport.housekeeperPhone}</p>
                      </div>
                    </div>
                  </div>

                  <div className="detail-section">
                    <h4>Nội dung báo cáo</h4>
                    <div className="report-content">
                      <h5>{selectedReport.title}</h5>
                      <p>{selectedReport.description}</p>
                      {selectedReport.evidence && (
                        <div className="evidence-section">
                          <h6>Bằng chứng:</h6>
                          <p>{selectedReport.evidence}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {selectedReport.adminResponse && (
                    <div className="detail-section">
                      <h4>Phản hồi của quản trị viên</h4>
                      <div className="admin-response">
                        <p>{selectedReport.adminResponse}</p>
                        {selectedReport.resolvedAt && (
                          <small>Giải quyết lúc: {formatDate(selectedReport.resolvedAt)}</small>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="modal-footer">
                {selectedReport.status === 'pending' && (
                  <>
                    <button 
                      className="action-btn investigating-btn"
                      onClick={() => {
                        const response = prompt('Nhập ghi chú điều tra (tùy chọn):');
                        updateReportStatus(selectedReport.id, 'investigating', response || '');
                      }}
                    >
                      Bắt đầu điều tra
                    </button>
                    <button 
                      className="action-btn dismiss-btn"
                      onClick={() => {
                        const response = prompt('Lý do từ chối báo cáo:');
                        if (response) {
                          updateReportStatus(selectedReport.id, 'dismissed', response);
                        }
                      }}
                    >
                      Từ chối báo cáo
                    </button>
                  </>
                )}
                
                {selectedReport.status === 'investigating' && (
                  <>
                    <button 
                      className="action-btn resolve-btn"
                      onClick={() => {
                        const response = prompt('Kết quả giải quyết:');
                        if (response) {
                          updateReportStatus(selectedReport.id, 'resolved', response);
                        }
                      }}
                    >
                      Giải quyết
                    </button>
                    <button 
                      className="action-btn warning-btn"
                      onClick={() => openWarningForm(selectedReport)}
                    >
                      ⚠️ Gửi cảnh cáo
                    </button>
                    <button 
                      className="action-btn dismiss-btn"
                      onClick={() => {
                        const response = prompt('Lý do từ chối báo cáo:');
                        if (response) {
                          updateReportStatus(selectedReport.id, 'dismissed', response);
                        }
                      }}
                    >
                      Từ chối báo cáo
                    </button>
                  </>
                )}

                {/* Nút gửi cảnh cáo cho báo cáo đã giải quyết */}
                {selectedReport.status === 'resolved' && (
                  <button 
                    className="action-btn warning-btn"
                    onClick={() => openWarningForm(selectedReport)}
                  >
                    ⚠️ Gửi cảnh cáo
                  </button>
                )}

                <button 
                  className="action-btn cancel-btn"
                  onClick={() => setShowReportModal(false)}
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Warning Form Modal */}
        {showWarningForm && selectedReport && (
          <div className="modal-overlay" onClick={() => setShowWarningForm(false)}>
            <div className="modal-content warning-modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>⚠️ Gửi cảnh cáo đến {selectedReport.housekeeperFullName}</h3>
                <button 
                  className="close-btn"
                  onClick={() => setShowWarningForm(false)}
                >
                  ×
                </button>
              </div>

              <div className="modal-body">
                <div className="warning-form">
                  <div className="form-group">
                    <label htmlFor="warningType">Loại cảnh cáo</label>
                    <select
                      id="warningType"
                      name="warningType"
                      value={warningFormData.warningType}
                      onChange={handleWarningInputChange}
                    >
                      <option value="verbal">Cảnh cáo miệng</option>
                      <option value="written">Cảnh cáo bằng văn bản</option>
                      <option value="final">Cảnh cáo cuối cùng</option>
                      <option value="suspension">Tạm đình chỉ</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label htmlFor="severity">Mức độ nghiêm trọng</label>
                    <select
                      id="severity"
                      name="severity"
                      value={warningFormData.severity}
                      onChange={handleWarningInputChange}
                    >
                      <option value="low">Thấp</option>
                      <option value="medium">Trung bình</option>
                      <option value="high">Cao</option>
                      <option value="critical">Nghiêm trọng</option>
                    </select>
                  </div>

                  {warningFormData.warningType === 'suspension' && (
                    <div className="form-group">
                      <label htmlFor="expiresAt">Thời hạn đình chỉ (đến ngày)</label>
                      <input
                        type="datetime-local"
                        id="expiresAt"
                        name="expiresAt"
                        value={warningFormData.expiresAt}
                        onChange={handleWarningInputChange}
                        min={new Date().toISOString().slice(0, 16)}
                      />
                    </div>
                  )}

                  <div className="form-group">
                    <label htmlFor="title">Tiêu đề cảnh cáo</label>
                    <input
                      type="text"
                      id="title"
                      name="title"
                      value={warningFormData.title}
                      onChange={handleWarningInputChange}
                      placeholder="Tiêu đề ngắn gọn về cảnh cáo"
                      maxLength={255}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="message">Nội dung cảnh cáo</label>
                    <textarea
                      id="message"
                      name="message"
                      value={warningFormData.message}
                      onChange={handleWarningInputChange}
                      placeholder="Nội dung chi tiết về vi phạm và yêu cầu cải thiện..."
                      rows={6}
                      maxLength={2000}
                    />
                    <small className="char-count">
                      {warningFormData.message.length}/2000 ký tự
                    </small>
                  </div>

                  <div className="warning-info">
                    <h4>Thông tin báo cáo liên quan:</h4>
                    <div className="report-summary">
                      <p><strong>Loại vi phạm:</strong> {getReportTypeLabel(selectedReport.reportType)}</p>
                      <p><strong>Mức độ:</strong> {selectedReport.severity?.toUpperCase()}</p>
                      <p><strong>Khách hàng báo cáo:</strong> {selectedReport.customerFullName}</p>
                      <p><strong>Ngày vi phạm:</strong> {formatDate(selectedReport.startDate)}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button 
                  className="action-btn cancel-btn"
                  onClick={() => setShowWarningForm(false)}
                >
                  Hủy
                </button>
                <button 
                  className="action-btn warning-btn"
                  onClick={sendWarning}
                >
                  ⚠️ Gửi cảnh cáo
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Coupon Management Section */}
        {activeSection === 'coupons' && (
          <div className="coupons-content">
            <CouponManagement />
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;