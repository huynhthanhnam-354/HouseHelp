import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import ConversationsList from '../components/Chat/ConversationsList';
import ChatWindow from '../components/Chat/ChatWindow';
import './ChatPage.css';

const ChatPage = () => {
  const { user } = useAuth();
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Handle window resize for mobile detection
  React.useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleSelectConversation = async (conversation) => {
    console.log('🔍 Selected conversation:', conversation);
    console.log('🔍 BookingId type:', typeof conversation.bookingId, conversation.bookingId);
    
    // Đánh dấu đã đọc ngay khi click vào conversation
    if (user?.id) {
      try {
        await fetch(`http://localhost:5000/api/bookings/${conversation.bookingId}/mark-read`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ userId: user.id })
        });
        console.log('✅ Conversation marked as read on selection');
        // Trigger refresh để cập nhật unread count ngay lập tức
        setRefreshTrigger(prev => prev + 1);
      } catch (error) {
        console.error('Error marking conversation as read:', error);
      }
    }

    setSelectedConversation({
      bookingId: conversation.bookingId,
      otherUser: {
        id: conversation.otherUserId,
        fullName: conversation.otherUserName,
        role: conversation.otherUserRole
      },
      service: conversation.service,
      bookingStatus: conversation.bookingStatus
    });
  };

  const handleCloseChat = () => {
    setSelectedConversation(null);
  };

  return (
    <div className="chat-page">
      <div className="chat-container">
               <div className={`chat-sidebar ${isMobile && selectedConversation ? 'hidden' : ''}`}>
                 <ConversationsList 
                   onSelectConversation={handleSelectConversation} 
                   refreshTrigger={refreshTrigger}
                 />
               </div>
        
        <div className={`chat-main ${isMobile && selectedConversation ? 'active' : ''}`}>
          {selectedConversation ? (
            <div className="chat-window-container">
              <div className="chat-window-header">
                <button 
                  className="back-to-conversations"
                  onClick={handleCloseChat}
                >
                  ← Quay lại
                </button>
                <div className="chat-info">
                  <h3>{selectedConversation.otherUser.fullName}</h3>
                  <p>📋 {selectedConversation.service}</p>
                </div>
              </div>
              <div className="chat-window-wrapper">
                <ChatWindow
                  bookingId={selectedConversation.bookingId}
                  otherUser={selectedConversation.otherUser}
                  onClose={handleCloseChat}
                />
              </div>
            </div>
          ) : (
            <div className="chat-placeholder">
              <div className="placeholder-content">
                <div className="placeholder-icon">💬</div>
                <h2>Chọn một cuộc trò chuyện</h2>
                <p>Chọn một cuộc trò chuyện từ danh sách bên trái để bắt đầu nhắn tin.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatPage;
