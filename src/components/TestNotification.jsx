import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';

export default function TestNotification() {
  const { user } = useAuth();
  const [testMessage, setTestMessage] = useState('');
  const [testResult, setTestResult] = useState('');
  const [activeUsers, setActiveUsers] = useState([]);
  const [isExpanded, setIsExpanded] = useState(false);

  const testNotificationToCustomer = async () => {
    if (!testMessage.trim()) {
      setTestResult('Vui lòng nhập tin nhắn test');
      return;
    }

    try {
      const response = await fetch('http://localhost:5000/api/test-notification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: 4, // Test với customer ID 4
          message: testMessage
        })
      });

      const result = await response.json();
      setTestResult(JSON.stringify(result, null, 2));
    } catch (error) {
      setTestResult('Lỗi: ' + error.message);
    }
  };

  const testNotificationToCurrentUser = async () => {
    if (!user?.id) {
      setTestResult('Chưa đăng nhập');
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
          message: testMessage || 'Test notification to current user'
        })
      });

      const result = await response.json();
      setTestResult(JSON.stringify(result, null, 2));
    } catch (error) {
      setTestResult('Lỗi: ' + error.message);
    }
  };

  const fetchActiveUsers = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/debug/active-users');
      const result = await response.json();
      setActiveUsers(result.activeUsers || []);
      setTestResult(`Active Users: ${result.totalActiveUsers}\nUnique Sockets: ${result.uniqueSocketIds}\n\n` + JSON.stringify(result, null, 2));
    } catch (error) {
      setTestResult('Lỗi khi lấy active users: ' + error.message);
    }
  };

  const checkDatabaseStructure = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/debug/db-structure');
      const result = await response.json();
      setTestResult('Database Structure:\n\n' + JSON.stringify(result, null, 2));
    } catch (error) {
      setTestResult('Lỗi khi lấy database structure: ' + error.message);
    }
  };

  // Auto-refresh active users every 5 seconds
  useEffect(() => {
    if (isExpanded) {
      const interval = setInterval(fetchActiveUsers, 5000);
      fetchActiveUsers(); // Initial fetch
      return () => clearInterval(interval);
    }
  }, [isExpanded]);

  // Only show for development environment
  if (process.env.NODE_ENV === 'production') {
    return null;
  }

  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      background: 'white',
      border: '2px solid #4285F4',
      borderRadius: '8px',
      padding: '15px',
      zIndex: 9999,
      maxWidth: isExpanded ? '400px' : '300px',
      fontSize: '12px',
      maxHeight: isExpanded ? '70vh' : 'auto',
      overflow: 'auto'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <h4 style={{ margin: 0, color: '#4285F4' }}>🧪 Debug Notification</h4>
        <button 
          onClick={() => setIsExpanded(!isExpanded)}
          style={{
            background: 'none',
            border: 'none',
            fontSize: '16px',
            cursor: 'pointer'
          }}
        >
          {isExpanded ? '📖' : '📑'}
        </button>
      </div>
      
      <div style={{ marginBottom: '10px' }}>
        <input
          type="text"
          placeholder="Test message"
          value={testMessage}
          onChange={(e) => setTestMessage(e.target.value)}
          style={{
            width: '100%',
            padding: '5px',
            border: '1px solid #ddd',
            borderRadius: '4px',
            fontSize: '12px'
          }}
        />
      </div>

      <div style={{ display: 'flex', gap: '5px', marginBottom: '10px', flexWrap: 'wrap' }}>
        <button
          onClick={testNotificationToCustomer}
          style={{
            flex: '1 1 45%',
            padding: '5px',
            background: '#4285F4',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontSize: '10px',
            cursor: 'pointer'
          }}
        >
          Test Customer #4
        </button>
        <button
          onClick={testNotificationToCurrentUser}
          style={{
            flex: '1 1 45%',
            padding: '5px',
            background: '#34A853',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontSize: '10px',
            cursor: 'pointer'
          }}
        >
          Test Current User
        </button>
        {isExpanded && (
          <>
            <button
              onClick={fetchActiveUsers}
              style={{
                flex: '1 1 48%',
                padding: '5px',
                background: '#FF9800',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                fontSize: '10px',
                cursor: 'pointer',
                marginTop: '5px'
              }}
            >
              🔍 Active Users
            </button>
            <button
              onClick={checkDatabaseStructure}
              style={{
                flex: '1 1 48%',
                padding: '5px',
                background: '#9C27B0',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                fontSize: '10px',
                cursor: 'pointer',
                marginTop: '5px'
              }}
            >
              🗄️ DB Structure
            </button>
          </>
        )}
      </div>

      {testResult && (
        <div style={{
          background: '#f5f5f5',
          padding: '8px',
          borderRadius: '4px',
          fontSize: '10px',
          maxHeight: '100px',
          overflow: 'auto',
          whiteSpace: 'pre-wrap'
        }}>
          {testResult}
        </div>
      )}

      <div style={{ marginTop: '8px', fontSize: '10px', color: '#666' }}>
        Current User: {user?.id} ({user?.role})
      </div>

      {isExpanded && activeUsers.length > 0 && (
        <div style={{ marginTop: '10px' }}>
          <h5 style={{ margin: '0 0 5px', color: '#4285F4' }}>🟢 Active Users ({activeUsers.filter((u, i, arr) => arr.findIndex(x => x.value.userId === u.value.userId) === i).length}):</h5>
          <div style={{ 
            background: '#f0f0f0', 
            padding: '5px', 
            borderRadius: '4px', 
            fontSize: '10px',
            maxHeight: '150px',
            overflow: 'auto'
          }}>
            {activeUsers
              .filter((u, i, arr) => arr.findIndex(x => x.value.userId === u.value.userId) === i)
              .map((u, i) => (
                <div key={i} style={{ 
                  padding: '2px 0', 
                  borderBottom: '1px solid #ddd',
                  color: u.value.userId === user?.id ? '#4285F4' : '#333'
                }}>
                  <strong>User {u.value.userId}</strong> ({u.value.role})
                  {u.value.userId === user?.id && ' 👈 YOU'}
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
