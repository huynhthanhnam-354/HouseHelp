import React, { useState, useEffect } from 'react';
import './AdminDashboard.css';

const AdminDashboard = () => {
  const [overview, setOverview] = useState({});
  const [bookingStats, setBookingStats] = useState([]);
  const [topHousekeepers, setTopHousekeepers] = useState([]);
  const [timeStats, setTimeStats] = useState([]);
  const [serviceStats, setServiceStats] = useState([]);
  const [housekeeperStatus, setHousekeeperStatus] = useState([]);
  const [userGrowth, setUserGrowth] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState('dashboard');

  useEffect(() => {
    fetchAllData();
  }, []);

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
        userGrowthRes
      ] = await Promise.all([
        fetch('http://localhost:5000/api/admin/dashboard/overview'),
        fetch('http://localhost:5000/api/admin/dashboard/booking-stats'),
        fetch('http://localhost:5000/api/admin/dashboard/top-housekeepers'),
        fetch('http://localhost:5000/api/admin/dashboard/time-stats'),
        fetch('http://localhost:5000/api/admin/dashboard/service-stats'),
        fetch('http://localhost:5000/api/admin/housekeepers/status'),
        fetch('http://localhost:5000/api/admin/dashboard/user-growth')
      ]);

      setOverview(await overviewRes.json());
      setBookingStats(await bookingStatsRes.json());
      setTopHousekeepers(await topHousekeepersRes.json());
      setTimeStats(await timeStatsRes.json());
      setServiceStats(await serviceStatsRes.json());
      setHousekeeperStatus(await housekeeperStatusRes.json());
      setUserGrowth(await userGrowthRes.json());
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
                  <p className="stat-number">{overview.totalUsers}</p>
                  <span className="stat-change">+12% từ tháng trước</span>
                </div>
              </div>
              
              <div className="stat-card success">
                <div className="stat-icon">🏠</div>
                <div className="stat-content">
                  <h3>Người giúp việc</h3>
                  <p className="stat-number">{overview.totalHousekeepers}</p>
                  <span className="stat-change">+8% từ tháng trước</span>
                </div>
              </div>
              
              <div className="stat-card warning">
                <div className="stat-icon">📅</div>
                <div className="stat-content">
                  <h3>Đặt lịch hôm nay</h3>
                  <p className="stat-number">{overview.todayBookings}</p>
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
                        <span className={`status-badge ${hk.available ? 'online' : 'offline'}`}>
                          {hk.available ? '🟢 Sẵn sàng' : '🔴 Không sẵn sàng'}
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
                      {userGrowth.reduce((acc, growth) => {
                        const existing = acc.find(item => item.month === growth.month);
                        if (existing) {
                          existing[growth.role] = growth.count;
                          existing.total += growth.count;
                        } else {
                          acc.push({
                            month: growth.month,
                            [growth.role]: growth.count,
                            total: growth.count
                          });
                        }
                        return acc;
                      }, []).map((row, index) => (
                        <tr key={index}>
                          <td>{row.month}</td>
                          <td>{row.customer || 0}</td>
                          <td>{row.housekeeper || 0}</td>
                          <td><strong>{row.total}</strong></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;