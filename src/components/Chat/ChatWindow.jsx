import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../hooks/useAuth';
import io from 'socket.io-client';
import './ChatWindow.css';

const ChatWindow = ({ bookingId, otherUser, onClose }) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);
  const socketRef = useRef(null);

  // Scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Scroll to bottom when new messages arrive (but allow manual scroll up)
  useEffect(() => {
    // Only auto-scroll if user is near bottom
    const messagesContainer = messagesEndRef.current?.parentElement;
    if (messagesContainer) {
      const isNearBottom = messagesContainer.scrollHeight - messagesContainer.scrollTop - messagesContainer.clientHeight < 100;
      if (isNearBottom) {
        scrollToBottom();
      }
    }
  }, [messages]);

  // Fetch existing messages
  useEffect(() => {
    const fetchMessages = async () => {
      try {
        setLoading(true);
        const response = await fetch(`http://localhost:5000/api/bookings/${bookingId}/messages`);
        if (response.ok) {
          const data = await response.json();
          setMessages(data);
        }
      } catch (error) {
        console.error('Error fetching messages:', error);
      } finally {
        setLoading(false);
      }
    };

    if (bookingId) {
      fetchMessages();
    }
  }, [bookingId]);

  // Setup WebSocket for real-time messages
  useEffect(() => {
    if (!user?.id || !bookingId) return;

    socketRef.current = io('http://localhost:5000', {
      withCredentials: true,
      transports: ['websocket', 'polling']
    });
    
    // Join user to their room
    socketRef.current.emit('join', { 
      userId: user.id, 
      role: user.role 
    });
    
    socketRef.current.on('connect', () => {
      console.log('✅ WebSocket connected');
    });

    socketRef.current.on('connect_error', (error) => {
      console.error('❌ WebSocket connection error:', error);
    });
    
    socketRef.current.on('new_message', (data) => {
      console.log('🔔 Received new message:', data);
      if (data.bookingId === parseInt(bookingId)) {
        // Add new message to the list
        const newMsg = {
          id: data.id || Date.now(),
          bookingId: data.bookingId,
          senderId: data.senderId,
          receiverId: data.receiverId,
          message: data.message,
          messageType: data.messageType || 'text',
          createdAt: data.timestamp || new Date().toISOString(),
          senderName: data.senderName
        };
        
        setMessages(prev => {
          // Check if message already exists by ID (more reliable)
          const existsById = prev.some(msg => msg.id === newMsg.id);
          
          // Also check for recent similar messages (fallback)
          const existsByContent = prev.some(msg => 
            msg.message === newMsg.message && 
            msg.senderId === newMsg.senderId &&
            Math.abs(new Date(msg.createdAt) - new Date(newMsg.createdAt)) < 3000
          );
          
          if (!existsById && !existsByContent) {
            console.log('✅ Adding new message to chat via WebSocket');
            return [...prev, newMsg];
          } else {
            console.log('⚠️ Duplicate message detected, skipping');
            return prev;
          }
        });
      }
    });

    // Listen for message deletion
    socketRef.current.on('message_deleted', (data) => {
      console.log('🗑️ Message deleted:', data);
      // Remove deleted message from UI
      setMessages(prev => prev.filter(msg => msg.id !== data.messageId));
    });

    // Listen for conversation deletion
    socketRef.current.on('conversation_deleted', (data) => {
      console.log('🗑️ Conversation deleted:', data);
      if (data.bookingId === parseInt(bookingId)) {
        // Clear all messages if current conversation is deleted
        setMessages([]);
        // Optionally close the chat window or show a message
        if (onClose) {
          onClose();
        }
      }
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [bookingId, user?.id, user?.role]);

  const handleDeleteMessage = async (messageId) => {
    try {
      const response = await fetch(`http://localhost:5000/api/messages/${messageId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: user.id })
      });

      if (response.ok) {
        console.log('✅ Message deleted successfully');
        // WebSocket sẽ tự động cập nhật UI
      } else {
        const error = await response.json();
        console.error('❌ Failed to delete message:', error.error);
        alert(error.error || 'Không thể xóa tin nhắn');
      }
    } catch (error) {
      console.error('Error deleting message:', error);
      alert('Lỗi khi xóa tin nhắn');
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    const messageText = newMessage.trim();
    setSending(true);
    
    // Optimistically add message to UI immediately
    const optimisticMessage = {
      id: Date.now(),
      bookingId: parseInt(bookingId),
      senderId: user.id,
      receiverId: otherUser.id,
      message: messageText,
      messageType: 'text',
      createdAt: new Date().toISOString(),
      senderName: user.fullName,
      sending: true // Mark as sending
    };
    
    setMessages(prev => [...prev, optimisticMessage]);
    setNewMessage(''); // Clear input immediately
    
    try {
      const response = await fetch(`http://localhost:5000/api/bookings/${bookingId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          senderId: user.id,
          receiverId: otherUser.id,
          message: messageText,
          messageType: 'text'
        }),
      });

      if (response.ok) {
        const sentMessage = await response.json();
        
        // Replace optimistic message with real message from server
        setMessages(prev => prev.map(msg => 
          msg.id === optimisticMessage.id 
            ? {
                ...sentMessage,
                id: sentMessage.id,
                sending: false
              }
            : msg
        ));
        
        console.log('✅ Message sent successfully');
      } else {
        console.error('Failed to send message');
        // Remove failed message
        setMessages(prev => prev.filter(msg => msg.id !== optimisticMessage.id));
        setNewMessage(messageText); // Restore message to input
      }
    } catch (error) {
      console.error('Error sending message:', error);
      // Remove failed message
      setMessages(prev => prev.filter(msg => msg.id !== optimisticMessage.id));
      setNewMessage(messageText); // Restore message to input
    } finally {
      setSending(false);
    }
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('vi-VN', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Hôm nay';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Hôm qua';
    } else {
      return date.toLocaleDateString('vi-VN');
    }
  };

  const groupMessagesByDate = (messages) => {
    const groups = {};
    messages.forEach(message => {
      const date = new Date(message.createdAt).toDateString();
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(message);
    });
    return groups;
  };

  const messageGroups = groupMessagesByDate(messages);

  return (
    <div className="chat-window">
      <div 
        className="chat-messages"
        tabIndex={0}
        onKeyDown={(e) => {
          const container = e.currentTarget;
          if (e.key === 'ArrowUp') {
            container.scrollTop -= 50;
          } else if (e.key === 'ArrowDown') {
            container.scrollTop += 50;
          } else if (e.key === 'PageUp') {
            container.scrollTop -= container.clientHeight;
          } else if (e.key === 'PageDown') {
            container.scrollTop += container.clientHeight;
          }
        }}
      >
        {loading ? (
          <div className="chat-loading">
            <div className="loading-spinner"></div>
            <p>Đang tải tin nhắn...</p>
          </div>
        ) : (
          Object.entries(messageGroups).map(([date, dayMessages]) => (
            <div key={date}>
              <div className="date-separator">
                <span>{formatDate(dayMessages[0].createdAt)}</span>
              </div>
              {dayMessages.map((message, index) => (
                <div
                  key={message.id || `msg-${index}`}
                  className={`message ${message.senderId === user.id ? 'sent' : 'received'} ${message.sending ? 'sending' : ''}`}
                >
                  <div className="message-content">
                    <p>{String(message.message || '')}</p>
                    <div className="message-footer">
                      <span className="message-time">
                        {formatTime(message.createdAt)}
                        {message.sending && <span className="sending-indicator"> ⏳</span>}
                      </span>
                      {message.senderId === user.id && !message.sending && (
                        <button
                          className="delete-message-btn"
                          onClick={() => handleDeleteMessage(message.id)}
                          title="Xóa tin nhắn"
                        >
                          🗑️
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <form className="chat-input-form" onSubmit={handleSendMessage}>
        <div className="chat-input-container">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Nhập tin nhắn..."
            className="chat-input"
            disabled={sending}
          />
          <button
            type="submit"
            className="chat-send-btn"
            disabled={!newMessage.trim() || sending}
          >
            {sending ? '...' : '➤'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ChatWindow;
