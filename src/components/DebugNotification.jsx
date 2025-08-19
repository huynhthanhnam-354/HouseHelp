import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';

export default function DebugNotification() {
  const { user } = useAuth();
  const [message, setMessage] = useState('Test notification from debug');

  const testNotification = async () => {
    if (!user?.id) {
      alert('User not logged in');
      return;
    }

    try {
      const response = await fetch('http://localhost:5000/api/test-notification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          message: message
        })
      });

      const result = await response.json();
      console.log('🧪 Test notification result:', result);
      
      if (result.success) {
        alert('✅ Notification sent successfully!');
      } else {
        alert(`❌ Failed to send notification: ${result.message}\nActive users: ${result.activeUsers.join(', ')}`);
      }
    } catch (error) {
      console.error('Error testing notification:', error);
      alert('❌ Error testing notification');
    }
  };

  const showTestToast = () => {
    if (window.showToast) {
      window.showToast(message, 'test', 5000);
    } else {
      alert('Toast system not available');
    }
  };

  if (!user) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      left: '20px',
      background: '#f8f9fa',
      border: '1px solid #dee2e6',
      borderRadius: '8px',
      padding: '15px',
      minWidth: '300px',
      zIndex: 1000,
      boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
    }}>
      <h4 style={{ margin: '0 0 10px 0', fontSize: '14px' }}>🧪 Debug Notification</h4>
      <p style={{ margin: '0 0 10px 0', fontSize: '12px' }}>User ID: {user.id}</p>
      
      <input 
        type="text" 
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Test message"
        style={{
          width: '100%',
          padding: '8px',
          border: '1px solid #ccc',
          borderRadius: '4px',
          marginBottom: '10px',
          fontSize: '12px'
        }}
      />
      
      <div style={{ display: 'flex', gap: '8px' }}>
        <button 
          onClick={testNotification}
          style={{
            background: '#007bff',
            color: 'white',
            border: 'none',
            padding: '8px 12px',
            borderRadius: '4px',
            fontSize: '12px',
            cursor: 'pointer'
          }}
        >
          Test WebSocket
        </button>
        
        <button 
          onClick={showTestToast}
          style={{
            background: '#28a745',
            color: 'white',
            border: 'none',
            padding: '8px 12px',
            borderRadius: '4px',
            fontSize: '12px',
            cursor: 'pointer'
          }}
        >
          Test Toast
        </button>
      </div>
    </div>
  );
}


