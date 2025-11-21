import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import AIChatbot from './AIChatbot';
import './ChatbotButton.css';

const ChatbotButton = () => {
  const [isChatbotOpen, setIsChatbotOpen] = useState(false);
  const { user } = useAuth();
  const [hasNewMessage, setHasNewMessage] = useState(false);

  const toggleChatbot = () => {
    setIsChatbotOpen(!isChatbotOpen);
    if (!isChatbotOpen) {
      setHasNewMessage(false);
    }
  };

  const closeChatbot = () => {
    setIsChatbotOpen(false);
  };

  // Create unique key to force re-render when user changes
  const chatbotKey = `chatbot-${user?.id || 'guest'}-${user?.role || 'customer'}`;

  return (
    <>
      {/* Floating Chatbot Button */}
      <div className={`chatbot-floating-btn ${isChatbotOpen ? 'active' : ''}`}>
        <button 
          className="chatbot-btn" 
          onClick={toggleChatbot}
          aria-label="Mở AI Assistant"
        >
          {isChatbotOpen ? (
            <span className="close-icon">✕</span>
          ) : (
            <>
              <span className="bot-icon">🤖</span>
              {hasNewMessage && <div className="notification-dot"></div>}
            </>
          )}
        </button>
        
        {!isChatbotOpen && (
          <div className="chatbot-tooltip">
            <div className="tooltip-content">
              <strong>AI Assistant</strong>
              <p>Tư vấn dịch vụ • Dự toán chi phí • Hỗ trợ 24/7</p>
            </div>
          </div>
        )}
      </div>

      {/* Chatbot Component */}
      <AIChatbot 
        key={chatbotKey}
        isOpen={isChatbotOpen} 
        onClose={closeChatbot}
      />
    </>
  );
};

export default ChatbotButton;
