import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useLanguage } from '../../contexts/LanguageContext';
import translations from '../../locales/translations';
import ServiceAdvisor from './ServiceAdvisor';
import ComplaintHandler from './ComplaintHandler';
import CostCalculator from './CostCalculator';
import AppGuide from './AppGuide';
import './AIChatbot.css';

const AIChatbot = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  
  // Force re-render when user role changes
  const userKey = `${user?.id || 'guest'}-${user?.role || 'customer'}`;
  const { language } = useLanguage();
  const t = translations[language];
  
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [sessionId] = useState(() => Date.now().toString());
  const [activeComponent, setActiveComponent] = useState(null);
  
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Focus input when chatbot opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Initialize chatbot with welcome message from backend
  useEffect(() => {
    if (isOpen) {
      // Send initial greeting to backend to get role-specific welcome
      sendInitialGreeting();
    }
  }, [isOpen, userKey]);

  const sendInitialGreeting = async () => {
    try {
      const userContext = {
        userId: user?.id,
        name: user?.fullName,
        location: user?.address || 'TP.HCM',
        role: user?.role || 'customer'
      };

      const response = await fetch('http://localhost:5000/api/chatbot/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'xin chào',
          conversationHistory: [],
          userContext
        })
      });

      const data = await response.json();
      
      console.log('🔍 Backend response:', data);
      console.log('🔍 Backend suggestions:', data.suggestions);
      
      if (data.response) {
        const botMessage = {
          id: Date.now(),
          type: 'bot',
          content: data.response,
          timestamp: new Date().toISOString()
        };
        
        setMessages([botMessage]);
        
        // Set suggestions from backend
        if (data.suggestions && data.suggestions.length > 0) {
          console.log('✅ Setting backend suggestions:', data.suggestions);
          setSuggestions(data.suggestions);
        } else {
          console.log('⚠️ No suggestions from backend, using fallback');
          setSuggestions(['Tìm hiểu thêm', 'Đặt dịch vụ', 'Liên hệ hỗ trợ']);
        }
      }
    } catch (error) {
      console.error('Error getting initial greeting:', error);
      // Fallback to frontend welcome message
      const welcomeMessage = generateWelcomeMessage(user);
      setMessages([welcomeMessage]);
      setSuggestions(welcomeMessage.suggestions);
    }
  };

  // Force reset when user/role changes
  useEffect(() => {
    setMessages([]);
    setActiveComponent(null);
    setSuggestions([]);
  }, [userKey]);

  const generateWelcomeMessage = (user) => {
    const userRole = user?.role || 'customer';
    const userName = user?.fullName ? ` ${user.fullName}` : '';

    if (userRole === 'housekeeper') {
      return {
        id: Date.now(),
        type: 'bot',
        content: `Xin chào Housekeeper${userName}! 👋\n\nTôi là AI Assistant dành cho Housekeeper. Tôi có thể hỗ trợ bạn:\n\n📋 Quản lý đơn hàng và lịch làm việc\n💰 Tối ưu hóa giá dịch vụ\n⭐ Cải thiện đánh giá và hiệu suất\n💬 Giao tiếp hiệu quả với khách hàng\n📚 Hướng dẫn sử dụng app Housekeeper\n🛡️ Hỗ trợ giải quyết vấn đề\n\nBạn cần hỗ trợ gì hôm nay?`,
        timestamp: new Date().toISOString(),
        suggestions: [
          'Quản lý đơn hàng',
          'Tối ưu giá dịch vụ',
          'Cải thiện đánh giá',
          'Hướng dẫn app Housekeeper',
          'Giải quyết vấn đề với khách'
        ]
      };
    } else if (userRole === 'admin') {
      return {
        id: Date.now(),
        type: 'bot',
        content: `Xin chào Admin${userName}! 👋\n\nTôi là AI Assistant dành cho Admin. Tôi có thể hỗ trợ bạn:\n\n📊 Phân tích dữ liệu hệ thống\n👥 Quản lý người dùng\n🔧 Hỗ trợ kỹ thuật\n📈 Báo cáo và thống kê\n⚙️ Cấu hình hệ thống\n🛡️ Xử lý khiếu nại cấp cao\n\nBạn cần hỗ trợ gì hôm nay?`,
        timestamp: new Date().toISOString(),
        suggestions: [
          'Phân tích dữ liệu',
          'Quản lý người dùng',
          'Báo cáo hệ thống',
          'Xử lý khiếu nại',
          'Cấu hình hệ thống'
        ]
      };
    } else {
      // Default: Customer
      return {
        id: Date.now(),
        type: 'bot',
        content: `Xin chào${userName}! 👋\n\nTôi là AI Assistant của HouseHelp. Tôi có thể giúp bạn:\n\n🏠 Tư vấn chọn dịch vụ phù hợp\n💰 Dự toán chi phí tự động\n📦 Gợi ý gói combo tiết kiệm\n🛡️ Hỗ trợ khiếu nại\n📚 Hướng dẫn sử dụng app\n⭐ Tư vấn gói nâng cao\n\nBạn cần hỗ trợ gì hôm nay?`,
        timestamp: new Date().toISOString(),
        suggestions: [
          'Tư vấn dịch vụ dọn dẹp',
          'Tính chi phí thuê giúp việc',
          'Gói combo tiết kiệm',
          'Hướng dẫn sử dụng app',
          'Hỗ trợ khiếu nại',
          'Gói nâng cao'
        ]
      };
    }
  };

  const sendMessage = async (messageText = inputMessage) => {
    if (!messageText.trim() || isLoading) return;

    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: messageText.trim(),
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);
    setSuggestions([]);

    try {
      // Prepare conversation history for API
      const conversationHistory = messages.map(msg => ({
        role: msg.type === 'user' ? 'user' : 'assistant',
        content: msg.content
      }));

      // Prepare user context
      const userContext = {
        userId: user?.id,
        name: user?.fullName,
        location: user?.address || 'TP.HCM',
        role: user?.role || 'customer'
      };

      const response = await fetch('http://localhost:5000/api/chatbot/message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: messageText.trim(),
          conversationHistory: conversationHistory,
          userContext: userContext
        })
      });

      const data = await response.json();

      if (data.success) {
        const botMessage = {
          id: Date.now() + 1,
          type: 'bot',
          content: data.response,
          timestamp: data.timestamp,
          intent: data.intent,
          suggestions: data.suggestions
        };

        setMessages(prev => [...prev, botMessage]);
        setSuggestions(data.suggestions || []);

        // Handle special intents that require component display
        handleSpecialIntent(data.intent, botMessage);

        // Save conversation to backend
        if (user?.id) {
          saveConversation([...messages, userMessage, botMessage]);
        }
      } else {
        throw new Error(data.message || 'Failed to get response');
      }

    } catch (error) {
      console.error('Chatbot error:', error);
      
      const errorMessage = {
        id: Date.now() + 1,
        type: 'bot',
        content: 'Xin lỗi, tôi đang gặp sự cố kỹ thuật. Vui lòng thử lại sau hoặc liên hệ hỗ trợ khách hàng.',
        timestamp: new Date().toISOString(),
        isError: true
      };

      setMessages(prev => [...prev, errorMessage]);
      setSuggestions([
        'Tư vấn dịch vụ dọn dẹp',
        'Tính chi phí thuê giúp việc', 
        'Hỗ trợ khiếu nại',
        'Hướng dẫn sử dụng app'
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const saveConversation = async (conversationData) => {
    try {
      await fetch('http://localhost:5000/api/chatbot/save-conversation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          sessionId: sessionId,
          conversationData: conversationData
        })
      });
    } catch (error) {
      console.error('Failed to save conversation:', error);
    }
  };

  const handleSuggestionClick = (suggestion) => {
    const userRole = user?.role || 'customer';
    console.log('🔍 Suggestion clicked:', suggestion);
    console.log('🔍 User role:', userRole);
    
    // Role-based suggestion handling
    if (userRole === 'customer') {
      // Customer-specific suggestions
      if (suggestion.includes('tư vấn dịch vụ') || suggestion.includes('chọn dịch vụ')) {
        setActiveComponent('service_advisor');
      } else if (suggestion.includes('tính chi phí') || suggestion.includes('dự toán')) {
        setActiveComponent('cost_calculator');
      } else if (suggestion.includes('khiếu nại') || suggestion.includes('hỗ trợ khiếu nại')) {
        setActiveComponent('complaint_handler');
      } else if (suggestion.includes('gói nâng cao') || suggestion.includes('bảo hiểm')) {
        setActiveComponent('premium_advisor');
      } else if (suggestion.includes('hướng dẫn') || suggestion.includes('cách dùng') || suggestion.includes('sử dụng app')) {
        setActiveComponent('app_guide');
      } else {
        sendMessage(suggestion);
      }
    } else if (userRole === 'housekeeper') {
      // Housekeeper-specific suggestions (case insensitive)
      const suggestionLower = suggestion.toLowerCase();
      
      if (suggestionLower.includes('quản lý đơn hàng') || suggestionLower.includes('đơn hàng')) {
        console.log('🏠 Opening housekeeper_orders component for:', suggestion);
        alert('🏠 Mở component Quản lý đơn hàng cho Housekeeper!');
        setActiveComponent('housekeeper_orders');
      } else if (suggestionLower.includes('tối ưu giá') || suggestionLower.includes('giá dịch vụ') || suggestionLower.includes('tối ưu')) {
        console.log('🏠 Opening pricing_optimizer component');
        setActiveComponent('pricing_optimizer');
      } else if (suggestionLower.includes('cải thiện đánh giá') || suggestionLower.includes('hiệu suất') || suggestionLower.includes('đánh giá')) {
        console.log('🏠 Opening performance_guide component');
        setActiveComponent('performance_guide');
      } else if (suggestionLower.includes('hướng dẫn app housekeeper') || suggestionLower.includes('hướng dẫn app')) {
        console.log('🏠 Opening housekeeper_guide component');
        setActiveComponent('housekeeper_guide');
      } else if (suggestionLower.includes('giải quyết vấn đề') || suggestionLower.includes('khách hàng')) {
        console.log('🏠 Opening customer_relations component');
        setActiveComponent('customer_relations');
      } else {
        console.log('🏠 Sending message:', suggestion);
        sendMessage(suggestion);
      }
    } else if (userRole === 'admin') {
      // Admin-specific suggestions
      if (suggestion.includes('phân tích dữ liệu') || suggestion.includes('báo cáo')) {
        setActiveComponent('admin_analytics');
      } else if (suggestion.includes('quản lý người dùng')) {
        setActiveComponent('user_management');
      } else if (suggestion.includes('xử lý khiếu nại')) {
        setActiveComponent('complaint_handler');
      } else if (suggestion.includes('cấu hình hệ thống')) {
        setActiveComponent('system_config');
      } else {
        sendMessage(suggestion);
      }
    } else {
      // Default behavior
      sendMessage(suggestion);
    }
  };

  const handleSpecialIntent = (intent, message) => {
    // Auto-open components based on AI intent detection
    switch (intent) {
      case 'service_inquiry':
        if (message.content.includes('tư vấn') || message.content.includes('chọn dịch vụ')) {
          setTimeout(() => setActiveComponent('service_advisor'), 1000);
        }
        break;
      case 'price_inquiry':
        if (message.content.includes('tính toán') || message.content.includes('dự toán')) {
          setTimeout(() => setActiveComponent('cost_calculator'), 1000);
        }
        break;
      case 'complaint':
        setTimeout(() => setActiveComponent('complaint_handler'), 1000);
        break;
      case 'premium_inquiry':
        setTimeout(() => setActiveComponent('premium_advisor'), 1000);
        break;
      case 'app_guide':
        setTimeout(() => setActiveComponent('app_guide'), 1000);
        break;
      default:
        break;
    }
  };

  const closeComponent = () => {
    setActiveComponent(null);
  };

  const handleComponentAction = (action, data) => {
    // Handle actions from specialized components
    const actionMessage = {
      id: Date.now(),
      type: 'bot',
      content: `Đã ${action}. ${data ? JSON.stringify(data) : ''}`,
      timestamp: new Date().toISOString(),
      isSystemMessage: true
    };
    
    setMessages(prev => [...prev, actionMessage]);
    setActiveComponent(null);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = () => {
    setMessages([]);
    setSuggestions([]);
    // Re-initialize with welcome message
    setTimeout(() => {
      const welcomeMessage = {
        id: Date.now(),
        type: 'bot',
        content: `Cuộc trò chuyện đã được xóa. Tôi có thể giúp gì khác cho bạn?`,
        timestamp: new Date().toISOString(),
        suggestions: [
          'Tư vấn dịch vụ',
          'Tính chi phí',
          'Gói combo',
          'Hướng dẫn app'
        ]
      };
      setMessages([welcomeMessage]);
      setSuggestions(welcomeMessage.suggestions);
    }, 100);
  };

  if (!isOpen) return null;

  return (
    <div className="ai-chatbot-overlay">
      <div className="ai-chatbot-container">
        {/* Header */}
        <div className="chatbot-header">
          <div className="chatbot-header-info">
            <div className="chatbot-avatar">
              <span className="chatbot-icon">🤖</span>
              <div className="status-indicator online"></div>
            </div>
            <div className="chatbot-title">
              <h3>AI Assistant</h3>
              <p>HouseHelp Support</p>
            </div>
          </div>
          <div className="chatbot-header-actions">
            <button 
              className="chatbot-action-btn clear-btn" 
              onClick={clearChat}
              title="Xóa cuộc trò chuyện"
            >
              🗑️
            </button>
            <button 
              className="chatbot-action-btn close-btn" 
              onClick={onClose}
              title="Đóng chatbot"
            >
              ✕
            </button>
          </div>
        </div>


        {/* Messages */}
        <div className="chatbot-messages">
          {messages.map((message) => (
            <div 
              key={message.id} 
              className={`message ${message.type} ${message.isError ? 'error' : ''} ${message.isSystemMessage ? 'system' : ''}`}
            >
              <div className="message-content">
                <div className="message-text">
                  {message.content.split('\n').map((line, index) => (
                    <React.Fragment key={index}>
                      {line}
                      {index < message.content.split('\n').length - 1 && <br />}
                    </React.Fragment>
                  ))}
                </div>
                <div className="message-time">
                  {new Date(message.timestamp).toLocaleTimeString('vi-VN', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="message bot loading">
              <div className="message-content">
                <div className="typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Specialized Components */}
        {activeComponent && (
          <div className="chatbot-component-overlay">
            <div className="component-container">
              <div className="component-header">
                <h3>
                  {activeComponent === 'service_advisor' && '🎯 Tư vấn dịch vụ'}
                  {activeComponent === 'cost_calculator' && '💰 Tính toán chi phí'}
                  {activeComponent === 'complaint_handler' && '🛡️ Hỗ trợ khiếu nại'}
                  {activeComponent === 'premium_advisor' && '⭐ Gói nâng cao'}
                  {activeComponent === 'app_guide' && '📚 Hướng dẫn sử dụng'}
                  {activeComponent === 'housekeeper_orders' && '📋 Quản lý đơn hàng'}
                  {activeComponent === 'pricing_optimizer' && '💰 Tối ưu giá dịch vụ'}
                  {activeComponent === 'performance_guide' && '⭐ Cải thiện hiệu suất'}
                  {activeComponent === 'housekeeper_guide' && '📚 Hướng dẫn Housekeeper'}
                  {activeComponent === 'customer_relations' && '💬 Quan hệ khách hàng'}
                  {activeComponent === 'admin_analytics' && '📊 Phân tích dữ liệu'}
                  {activeComponent === 'user_management' && '👥 Quản lý người dùng'}
                  {activeComponent === 'system_config' && '⚙️ Cấu hình hệ thống'}
                </h3>
                <button className="close-component-btn" onClick={closeComponent}>
                  ✕
                </button>
              </div>
              
              <div className="component-content">
                {activeComponent === 'service_advisor' && (
                  <ServiceAdvisor 
                    onServiceSelect={(data) => handleComponentAction('chọn dịch vụ', data)}
                    onComboRecommend={(data) => handleComponentAction('gợi ý combo', data)}
                    userContext={{ userId: user?.id, name: user?.fullName, location: user?.address }}
                  />
                )}
                
                {activeComponent === 'cost_calculator' && (
                  <CostCalculator 
                    onCostCalculated={(data) => handleComponentAction('tính toán chi phí', data)}
                    userContext={{ userId: user?.id, name: user?.fullName, location: user?.address }}
                  />
                )}
                
                {activeComponent === 'complaint_handler' && (
                  <ComplaintHandler 
                    onComplaintSubmit={(data) => handleComponentAction('gửi khiếu nại', data)}
                    userContext={{ userId: user?.id, name: user?.fullName, email: user?.email }}
                  />
                )}
                
                {activeComponent === 'premium_advisor' && (
                  <div className="premium-advisor-placeholder">
                    <h4>🚧 Đang phát triển</h4>
                    <p>Tính năng tư vấn gói nâng cao đang được hoàn thiện...</p>
                    <button onClick={closeComponent}>Đóng</button>
                  </div>
                )}
                
                {activeComponent === 'app_guide' && (
                  <AppGuide 
                    onGuideComplete={(data) => handleComponentAction('hoàn thành hướng dẫn', data)}
                    userContext={{ userId: user?.id, name: user?.fullName }}
                  />
                )}
                
                {/* Housekeeper Components */}
                {activeComponent === 'housekeeper_orders' && (
                  <div className="role-specific-placeholder">
                    <div className="placeholder-icon">📋</div>
                    <h4>Quản lý đơn hàng</h4>
                    <p>Tính năng giúp Housekeeper quản lý đơn hàng hiệu quả:</p>
                    <ul>
                      <li>📅 Xem lịch làm việc hôm nay và tuần tới</li>
                      <li>✅ Xác nhận/từ chối đơn hàng mới</li>
                      <li>📍 Tối ưu tuyến đường di chuyển</li>
                      <li>⏰ Quản lý thời gian làm việc</li>
                      <li>💰 Theo dõi thu nhập</li>
                    </ul>
                    <button onClick={closeComponent} className="close-placeholder-btn">Đóng</button>
                  </div>
                )}
                
                {activeComponent === 'pricing_optimizer' && (
                  <div className="role-specific-placeholder">
                    <div className="placeholder-icon">💰</div>
                    <h4>Tối ưu giá dịch vụ</h4>
                    <p>Công cụ giúp Housekeeper tối ưu hóa giá cả:</p>
                    <ul>
                      <li>📊 Phân tích giá thị trường theo khu vực</li>
                      <li>⭐ Đề xuất giá dựa trên đánh giá</li>
                      <li>📈 Tối ưu giá theo thời gian cao điểm</li>
                      <li>🎯 Gợi ý gói combo hấp dẫn</li>
                      <li>💡 Chiến lược cạnh tranh</li>
                    </ul>
                    <button onClick={closeComponent} className="close-placeholder-btn">Đóng</button>
                  </div>
                )}
                
                {activeComponent === 'performance_guide' && (
                  <div className="role-specific-placeholder">
                    <div className="placeholder-icon">⭐</div>
                    <h4>Cải thiện hiệu suất</h4>
                    <p>Hướng dẫn nâng cao chất lượng dịch vụ:</p>
                    <ul>
                      <li>⭐ Cách nhận đánh giá 5 sao</li>
                      <li>💬 Kỹ năng giao tiếp với khách hàng</li>
                      <li>⚡ Tăng tốc độ làm việc</li>
                      <li>🏆 Trở thành Top Housekeeper</li>
                      <li>📈 Tăng thu nhập bền vững</li>
                    </ul>
                    <button onClick={closeComponent} className="close-placeholder-btn">Đóng</button>
                  </div>
                )}
                
                {activeComponent === 'housekeeper_guide' && (
                  <div className="role-specific-placeholder">
                    <div className="placeholder-icon">📚</div>
                    <h4>Hướng dẫn Housekeeper</h4>
                    <p>Hướng dẫn sử dụng app dành cho Housekeeper:</p>
                    <ul>
                      <li>📱 Cách sử dụng dashboard Housekeeper</li>
                      <li>📋 Quản lý profile và portfolio</li>
                      <li>💬 Chat hiệu quả với khách hàng</li>
                      <li>💳 Quản lý thanh toán và thu nhập</li>
                      <li>🔔 Cài đặt thông báo</li>
                    </ul>
                    <button onClick={closeComponent} className="close-placeholder-btn">Đóng</button>
                  </div>
                )}
                
                {activeComponent === 'customer_relations' && (
                  <div className="role-specific-placeholder">
                    <div className="placeholder-icon">💬</div>
                    <h4>Quan hệ khách hàng</h4>
                    <p>Hỗ trợ giải quyết vấn đề với khách hàng:</p>
                    <ul>
                      <li>🤝 Xử lý khiếu nại từ khách hàng</li>
                      <li>💬 Mẫu tin nhắn chuyên nghiệp</li>
                      <li>🔄 Quy trình hoàn tiền/bồi thường</li>
                      <li>📞 Khi nào cần liên hệ support</li>
                      <li>⚖️ Quyền lợi của Housekeeper</li>
                    </ul>
                    <button onClick={closeComponent} className="close-placeholder-btn">Đóng</button>
                  </div>
                )}
                
                {/* Admin Components */}
                {activeComponent === 'admin_analytics' && (
                  <div className="role-specific-placeholder">
                    <div className="placeholder-icon">📊</div>
                    <h4>Phân tích dữ liệu</h4>
                    <p>Công cụ phân tích dành cho Admin:</p>
                    <ul>
                      <li>📈 Dashboard thống kê tổng quan</li>
                      <li>👥 Phân tích hành vi người dùng</li>
                      <li>💰 Báo cáo doanh thu chi tiết</li>
                      <li>⭐ Chất lượng dịch vụ theo khu vực</li>
                      <li>🔍 Phát hiện bất thường</li>
                    </ul>
                    <button onClick={closeComponent} className="close-placeholder-btn">Đóng</button>
                  </div>
                )}
                
                {activeComponent === 'user_management' && (
                  <div className="role-specific-placeholder">
                    <div className="placeholder-icon">👥</div>
                    <h4>Quản lý người dùng</h4>
                    <p>Công cụ quản lý người dùng:</p>
                    <ul>
                      <li>✅ Xét duyệt Housekeeper mới</li>
                      <li>🚫 Khóa/mở khóa tài khoản</li>
                      <li>⭐ Quản lý xếp hạng và huy hiệu</li>
                      <li>📊 Theo dõi hoạt động người dùng</li>
                      <li>🔍 Tìm kiếm và lọc nâng cao</li>
                    </ul>
                    <button onClick={closeComponent} className="close-placeholder-btn">Đóng</button>
                  </div>
                )}
                
                {activeComponent === 'system_config' && (
                  <div className="role-specific-placeholder">
                    <div className="placeholder-icon">⚙️</div>
                    <h4>Cấu hình hệ thống</h4>
                    <p>Cài đặt và cấu hình hệ thống:</p>
                    <ul>
                      <li>💰 Cài đặt phí dịch vụ và hoa hồng</li>
                      <li>🌍 Quản lý khu vực phục vụ</li>
                      <li>📧 Template email và thông báo</li>
                      <li>🔐 Cài đặt bảo mật</li>
                      <li>🔄 Backup và khôi phục dữ liệu</li>
                    </ul>
                    <button onClick={closeComponent} className="close-placeholder-btn">Đóng</button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Suggestions */}
        {suggestions.length > 0 && (
          <div className="chatbot-suggestions">
            {suggestions.map((suggestion, index) => (
              <button
                key={index}
                className="suggestion-btn"
                onClick={() => handleSuggestionClick(suggestion)}
                disabled={isLoading}
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <div className="chatbot-input-container">
          <div className="chatbot-input-wrapper">
            <textarea
              ref={inputRef}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Nhập tin nhắn của bạn..."
              className="chatbot-input"
              rows="1"
              disabled={isLoading}
            />
            <button
              onClick={() => sendMessage()}
              disabled={!inputMessage.trim() || isLoading}
              className="send-btn"
            >
              {isLoading ? '⏳' : '📤'}
            </button>
          </div>
          <div className="chatbot-footer">
            <small>Powered by AI • HouseHelp Assistant</small>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIChatbot;
