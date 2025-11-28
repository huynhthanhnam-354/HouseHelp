import React, { useState } from 'react';
import './AppGuide.css';

const AppGuide = ({ onGuideComplete, userContext }) => {
  const [currentSection, setCurrentSection] = useState('overview');
  const [completedSteps, setCompletedSteps] = useState([]);

  // Hướng dẫn chi tiết cho từng tính năng
  const guideContent = {
    overview: {
      title: '📱 Tổng quan ứng dụng HouseHelp',
      icon: '🏠',
      content: `
        Chào mừng bạn đến với HouseHelp - ứng dụng đặt dịch vụ giúp việc nhà hàng đầu Việt Nam!
        
        **Các tính năng chính:**
        • 🔍 Tìm kiếm và đặt dịch vụ giúp việc
        • 💬 Chat trực tiếp với housekeeper
        • 💰 Thanh toán an toàn, minh bạch
        • ⭐ Đánh giá và phản hồi
        • 🤖 AI Assistant hỗ trợ 24/7
        
        **Dành cho ai:**
        • Khách hàng: Đặt dịch vụ giúp việc nhà
        • Housekeeper: Nhận việc và kiếm thu nhập
        • Admin: Quản lý hệ thống
      `,
      steps: [
        'Đăng ký tài khoản',
        'Xác thực thông tin',
        'Khám phá giao diện',
        'Thiết lập hồ sơ'
      ]
    },
    
    registration: {
      title: '📝 Đăng ký và đăng nhập',
      icon: '👤',
      content: `
        **Cách đăng ký tài khoản:**
        
        1. **Truy cập trang đăng ký**
           • Nhấn "Đăng ký" trên trang chủ
           • Hoặc vào /register
        
        2. **Điền thông tin cá nhân**
           • Họ tên đầy đủ
           • Email hợp lệ
           • Số điện thoại
           • Mật khẩu mạnh (tối thiểu 6 ký tự)
        
        3. **Chọn vai trò**
           • **Customer**: Đặt dịch vụ giúp việc
           • **Housekeeper**: Cung cấp dịch vụ
        
        4. **Xác thực (dành cho Housekeeper)**
           • Upload ảnh CMND/CCCD mặt trước
           • Upload ảnh CMND/CCCD mặt sau
           • Chọn dịch vụ có thể cung cấp
        
        **Đăng nhập:**
        • Sử dụng email và mật khẩu đã đăng ký
        • Hệ thống sẽ tự động chuyển đến dashboard phù hợp
      `,
      steps: [
        'Nhập thông tin cá nhân',
        'Chọn vai trò phù hợp',
        'Xác thực tài khoản (nếu cần)',
        'Đăng nhập thành công'
      ]
    },
    
    booking: {
      title: '📅 Đặt lịch dịch vụ',
      icon: '🛎️',
      content: `
        **Cách đặt dịch vụ giúp việc:**
        
        1. **Tìm kiếm housekeeper**
           • Vào trang chủ hoặc /
           • Sử dụng bộ lọc: dịch vụ, đánh giá, giá cả, khu vực
           • Xem danh sách housekeeper phù hợp
        
        2. **Chọn housekeeper**
           • Xem hồ sơ chi tiết
           • Đọc đánh giá từ khách hàng khác
           • Kiểm tra lịch trống
           • Nhấn "Đặt lịch"
        
        3. **Điền thông tin đặt lịch**
           • Chọn dịch vụ cần thiết
           • Ngày và giờ bắt đầu
           • Thời gian dự kiến
           • Địa chỉ cụ thể
           • Ghi chú đặc biệt (nếu có)
        
        4. **Xác nhận và thanh toán**
           • Kiểm tra thông tin
           • Chọn phương thức thanh toán
           • Xác nhận đặt lịch
        
        **Trạng thái đơn hàng:**
        • 🟡 Pending: Chờ housekeeper xác nhận
        • 🟢 Confirmed: Đã xác nhận, sẵn sàng thực hiện
        • 🔵 In Progress: Đang thực hiện
        • ✅ Completed: Hoàn thành
        • ❌ Cancelled: Đã hủy
      `,
      steps: [
        'Tìm kiếm housekeeper',
        'Xem hồ sơ và đánh giá',
        'Điền thông tin đặt lịch',
        'Xác nhận và thanh toán'
      ]
    },
    
    chat: {
      title: '💬 Chat và giao tiếp',
      icon: '💬',
      content: `
        **Hệ thống chat tích hợp:**
        
        1. **Truy cập chat**
           • Vào /chat hoặc nhấn icon chat
           • Xem danh sách cuộc trò chuyện
           • Chọn cuộc trò chuyện cần thiết
        
        2. **Gửi tin nhắn**
           • Nhập tin nhắn trong ô chat
           • Nhấn Enter hoặc nút gửi
           • Hỗ trợ emoji và ảnh
        
        3. **Tính năng chat**
           • 📱 Real-time messaging
           • 🔔 Thông báo tin nhắn mới
           • 📷 Gửi ảnh minh họa
           • 🕒 Lịch sử tin nhắn
           • ✅ Trạng thái đã đọc
        
        4. **Chat với AI Assistant**
           • Nhấn nút chatbot (🤖) ở góc phải
           • Hỏi bất kỳ câu hỏi nào
           • Nhận tư vấn tự động
           • Hỗ trợ 24/7
        
        **Mẹo sử dụng chat hiệu quả:**
        • Giao tiếp lịch sự, rõ ràng
        • Gửi ảnh để minh họa yêu cầu
        • Xác nhận thông tin quan trọng
        • Báo cáo nếu có vấn đề
      `,
      steps: [
        'Truy cập trang chat',
        'Chọn cuộc trò chuyện',
        'Gửi tin nhắn',
        'Sử dụng AI Assistant'
      ]
    },
    
    payment: {
      title: '💳 Thanh toán',
      icon: '💰',
      content: `
        **Hệ thống thanh toán an toàn:**
        
        1. **Phương thức thanh toán**
           • 💳 Thẻ tín dụng/ghi nợ
           • 🏦 Chuyển khoản ngân hàng
           • 📱 Ví điện tử (MoMo, ZaloPay)
           • 💵 Tiền mặt (sau khi hoàn thành)
        
        2. **Quy trình thanh toán**
           • Xác nhận đơn hàng
           • Chọn phương thức thanh toán
           • Nhập thông tin thanh toán
           • Xác thực giao dịch
           • Nhận xác nhận thanh toán
        
        3. **Bảo mật thanh toán**
           • 🔒 Mã hóa SSL 256-bit
           • 🛡️ Không lưu thông tin thẻ
           • ✅ Xác thực 2 lớp
           • 📧 Email xác nhận giao dịch
        
        4. **Chính sách hoàn tiền**
           • Hủy trước 24h: Hoàn 100%
           • Hủy trước 6h: Hoàn 50%
           • Hủy trong 6h: Không hoàn tiền
           • Lỗi từ housekeeper: Hoàn 100%
        
        **Lưu ý quan trọng:**
        • Kiểm tra thông tin trước khi thanh toán
        • Lưu lại biên lai giao dịch
        • Liên hệ hỗ trợ nếu có vấn đề
      `,
      steps: [
        'Chọn phương thức thanh toán',
        'Nhập thông tin thanh toán',
        'Xác thực giao dịch',
        'Nhận xác nhận'
      ]
    },
    
    profile: {
      title: '👤 Quản lý hồ sơ',
      icon: '⚙️',
      content: `
        **Cập nhật thông tin cá nhân:**
        
        1. **Truy cập hồ sơ**
           • Vào /profile
           • Hoặc nhấn avatar ở góc phải
        
        2. **Thông tin cơ bản**
           • Họ tên
           • Email (không thể thay đổi)
           • Số điện thoại
           • Địa chỉ
           • Ảnh đại diện
        
        3. **Cài đặt bảo mật**
           • Đổi mật khẩu
           • Xác thực 2 lớp
           • Lịch sử đăng nhập
           • Thiết bị đã đăng nhập
        
        4. **Tùy chọn thông báo**
           • Email thông báo
           • Push notification
           • SMS alerts
           • Tần suất thông báo
        
        **Dành cho Housekeeper:**
        • Cập nhật dịch vụ cung cấp
        • Thiết lập giá cả
        • Quản lý lịch làm việc
        • Upload portfolio
        • Xem thống kê thu nhập
        
        **Dành cho Customer:**
        • Lưu housekeeper yêu thích
        • Xem lịch sử đặt lịch
        • Quản lý địa chỉ
        • Cài đặt thanh toán
      `,
      steps: [
        'Truy cập trang hồ sơ',
        'Cập nhật thông tin',
        'Cài đặt bảo mật',
        'Tùy chỉnh thông báo'
      ]
    },
    
    dashboard: {
      title: '📊 Dashboard và thống kê',
      icon: '📈',
      content: `
        **Dashboard theo vai trò:**
        
        **Customer Dashboard (/customer/dashboard):**
        • 📅 Lịch hẹn sắp tới
        • 📋 Lịch sử đặt lịch
        • ⭐ Housekeeper yêu thích
        • 💰 Chi tiêu tháng này
        • 🔔 Thông báo mới
        
        **Housekeeper Dashboard (/housekeeper/dashboard):**
        • 📋 Đơn hàng chờ xác nhận
        • 📅 Lịch làm việc hôm nay
        • 💰 Thu nhập tháng này
        • ⭐ Đánh giá gần đây
        • 📊 Thống kê hiệu suất
        
        **Admin Dashboard (/admin/dashboard):**
        • 📊 Thống kê tổng quan hệ thống
        • 👥 Quản lý người dùng
        • 📅 Quản lý đặt lịch
        • 📈 Báo cáo doanh thu
        • ⚙️ Cài đặt hệ thống
        
        **Tính năng chung:**
        • 🔄 Cập nhật real-time
        • 📱 Responsive design
        • 🌙 Dark mode
        • 🌐 Đa ngôn ngữ
        • 📊 Biểu đồ tương tác
      `,
      steps: [
        'Truy cập dashboard',
        'Xem thông tin tổng quan',
        'Quản lý công việc',
        'Theo dõi thống kê'
      ]
    },
    
    troubleshooting: {
      title: '🔧 Xử lý sự cố',
      icon: '🛠️',
      content: `
        **Các vấn đề thường gặp:**
        
        **1. Không đăng nhập được**
        • Kiểm tra email/mật khẩu
        • Reset mật khẩu nếu quên
        • Xóa cache trình duyệt
        • Thử trình duyệt khác
        
        **2. Không tìm thấy housekeeper**
        • Mở rộng khu vực tìm kiếm
        • Thay đổi bộ lọc
        • Thử vào thời gian khác
        • Liên hệ hỗ trợ
        
        **3. Lỗi thanh toán**
        • Kiểm tra thông tin thẻ
        • Đảm bảo có đủ số dư
        • Thử phương thức khác
        • Liên hệ ngân hàng
        
        **4. Không nhận được thông báo**
        • Kiểm tra cài đặt thông báo
        • Xem trong thư mục spam
        • Cập nhật số điện thoại
        • Bật push notification
        
        **5. Chat không hoạt động**
        • Kiểm tra kết nối internet
        • Refresh trang
        • Xóa cache
        • Thử thiết bị khác
        
        **Liên hệ hỗ trợ:**
        • 📞 Hotline: 1900-1234
        • 📧 Email: support@househelp.vn
        • 💬 Live chat: 24/7
        • 🤖 AI Assistant: Luôn sẵn sàng
      `,
      steps: [
        'Xác định vấn đề',
        'Thử các giải pháp cơ bản',
        'Kiểm tra cài đặt',
        'Liên hệ hỗ trợ nếu cần'
      ]
    }
  };

  const sections = Object.keys(guideContent);

  const markStepComplete = (step) => {
    if (!completedSteps.includes(step)) {
      setCompletedSteps([...completedSteps, step]);
    }
  };

  const getProgressPercentage = () => {
    const totalSteps = Object.values(guideContent).reduce((total, section) => total + section.steps.length, 0);
    return Math.round((completedSteps.length / totalSteps) * 100);
  };

  const handleSectionComplete = () => {
    const currentSteps = guideContent[currentSection].steps;
    const newCompletedSteps = [...completedSteps];
    
    currentSteps.forEach(step => {
      if (!newCompletedSteps.includes(step)) {
        newCompletedSteps.push(step);
      }
    });
    
    setCompletedSteps(newCompletedSteps);
    
    // Move to next section or complete guide
    const currentIndex = sections.indexOf(currentSection);
    if (currentIndex < sections.length - 1) {
      setCurrentSection(sections[currentIndex + 1]);
    } else {
      // Guide completed
      if (onGuideComplete) {
        onGuideComplete({
          completedSections: sections.length,
          completedSteps: newCompletedSteps.length,
          progress: 100
        });
      }
    }
  };

  const currentContent = guideContent[currentSection];

  return (
    <div className="app-guide">
      <div className="guide-header">
        <h3>📚 Hướng dẫn sử dụng HouseHelp</h3>
        <div className="progress-info">
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${getProgressPercentage()}%` }}
            ></div>
          </div>
          <span className="progress-text">{getProgressPercentage()}% hoàn thành</span>
        </div>
      </div>

      <div className="guide-navigation">
        <div className="section-tabs">
          {sections.map((section) => (
            <button
              key={section}
              className={`section-tab ${currentSection === section ? 'active' : ''}`}
              onClick={() => setCurrentSection(section)}
            >
              <span className="tab-icon">{guideContent[section].icon}</span>
              <span className="tab-title">{guideContent[section].title.split(' ').slice(1).join(' ')}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="guide-content">
        <div className="content-header">
          <h4>{currentContent.title}</h4>
        </div>

        <div className="content-body">
          <div className="content-text">
            {currentContent.content.split('\n').map((line, index) => {
              if (line.trim() === '') return <br key={index} />;
              
              if (line.trim().startsWith('**') && line.trim().endsWith('**')) {
                return (
                  <h5 key={index} className="content-heading">
                    {line.replace(/\*\*/g, '')}
                  </h5>
                );
              }
              
              if (line.trim().startsWith('•')) {
                return (
                  <div key={index} className="bullet-point">
                    {line.trim().substring(1).trim()}
                  </div>
                );
              }
              
              return (
                <p key={index} className="content-paragraph">
                  {line.trim()}
                </p>
              );
            })}
          </div>

          <div className="steps-checklist">
            <h5>✅ Các bước thực hiện:</h5>
            <div className="steps-list">
              {currentContent.steps.map((step, index) => (
                <div 
                  key={index} 
                  className={`step-item ${completedSteps.includes(step) ? 'completed' : ''}`}
                  onClick={() => markStepComplete(step)}
                >
                  <div className="step-checkbox">
                    {completedSteps.includes(step) ? '✅' : '⬜'}
                  </div>
                  <div className="step-text">{step}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="content-actions">
          <div className="navigation-buttons">
            {sections.indexOf(currentSection) > 0 && (
              <button 
                className="nav-btn prev-btn"
                onClick={() => setCurrentSection(sections[sections.indexOf(currentSection) - 1])}
              >
                ← Trước
              </button>
            )}
            
            <button 
              className="nav-btn complete-btn"
              onClick={handleSectionComplete}
            >
              {sections.indexOf(currentSection) === sections.length - 1 
                ? '🎉 Hoàn thành hướng dẫn' 
                : 'Tiếp theo →'
              }
            </button>
          </div>
          
          <div className="quick-actions">
            <button className="quick-action-btn" onClick={() => setCurrentSection('troubleshooting')}>
              🔧 Xử lý sự cố
            </button>
            <button className="quick-action-btn" onClick={() => window.open('mailto:support@househelp.vn')}>
              📧 Liên hệ hỗ trợ
            </button>
          </div>
        </div>
      </div>

      <div className="guide-footer">
        <div className="help-info">
          <p>💡 <strong>Mẹo:</strong> Bạn có thể quay lại hướng dẫn này bất kỳ lúc nào bằng cách hỏi AI Assistant</p>
          <p>🤖 <strong>AI Assistant:</strong> Luôn sẵn sàng hỗ trợ bạn 24/7 với bất kỳ câu hỏi nào!</p>
        </div>
      </div>
    </div>
  );
};

export default AppGuide;



