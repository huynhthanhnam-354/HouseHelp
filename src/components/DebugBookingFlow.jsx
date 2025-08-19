import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';

export default function DebugBookingFlow() {
  const { user } = useAuth();
  const [result, setResult] = useState('');
  const [testBookingId, setTestBookingId] = useState('');

  const createTestBooking = async () => {
    if (!user?.id) {
      setResult('Chưa đăng nhập');
      return;
    }

    // Create a test booking
    const bookingData = {
      customerId: user.id, // Current user as customer
      housekeeperId: user.role === 'customer' ? 2 : 4, // Default housekeeper or customer
      service: 'Dọn dẹp nhà cửa',
      date: new Date().toISOString().split('T')[0],
      time: '14:00',
      duration: 2,
      location: 'Test Location',
      notes: 'Test booking for notification debugging',
      totalPrice: 50,
      customerName: user.fullName,
      customerEmail: user.email,
      customerPhone: user.phone || '0123456789',
      housekeeperName: 'Test Housekeeper'
    };

    try {
      const response = await fetch('http://localhost:5000/api/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bookingData)
      });

      const result = await response.json();
      setTestBookingId(result.id);
      setResult(`✅ Created test booking ID: ${result.id}\n\n${JSON.stringify(result, null, 2)}`);
    } catch (error) {
      setResult('❌ Error creating booking: ' + error.message);
    }
  };

  const confirmTestBooking = async () => {
    if (!testBookingId) {
      setResult('Chưa có test booking ID');
      return;
    }

    try {
      const response = await fetch(`http://localhost:5000/api/bookings/${testBookingId}/confirm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      const result = await response.json();
      setResult(`✅ Confirmed booking ${testBookingId}\n\n${JSON.stringify(result, null, 2)}`);
    } catch (error) {
      setResult('❌ Error confirming booking: ' + error.message);
    }
  };

  const rejectTestBooking = async () => {
    if (!testBookingId) {
      setResult('Chưa có test booking ID');
      return;
    }

    try {
      const response = await fetch(`http://localhost:5000/api/bookings/${testBookingId}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      const result = await response.json();
      setResult(`❌ Rejected booking ${testBookingId}\n\n${JSON.stringify(result, null, 2)}`);
    } catch (error) {
      setResult('❌ Error rejecting booking: ' + error.message);
    }
  };

  const checkBookingStatus = async () => {
    if (!testBookingId) {
      setResult('Chưa có test booking ID');
      return;
    }

    try {
      const response = await fetch(`http://localhost:5000/api/bookings/${testBookingId}/status`);
      const result = await response.json();
      setResult(`📊 Booking ${testBookingId} status:\n\n${JSON.stringify(result, null, 2)}`);
    } catch (error) {
      setResult('❌ Error checking status: ' + error.message);
    }
  };

  // Only show for development
  if (process.env.NODE_ENV === 'production') {
    return null;
  }

  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      left: '20px',
      background: 'white',
      border: '2px solid #FF9800',
      borderRadius: '8px',
      padding: '15px',
      zIndex: 9998,
      maxWidth: '300px',
      fontSize: '12px',
      maxHeight: '60vh',
      overflow: 'auto'
    }}>
      <h4 style={{ margin: '0 0 10px', color: '#FF9800' }}>🧪 Debug Booking Flow</h4>
      
      <div style={{ marginBottom: '10px' }}>
        <input
          type="text"
          placeholder="Booking ID (auto-filled)"
          value={testBookingId}
          onChange={(e) => setTestBookingId(e.target.value)}
          style={{
            width: '100%',
            padding: '5px',
            border: '1px solid #ddd',
            borderRadius: '4px',
            fontSize: '12px'
          }}
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginBottom: '10px' }}>
        <button
          onClick={createTestBooking}
          style={{
            padding: '5px',
            background: '#4285F4',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontSize: '10px',
            cursor: 'pointer'
          }}
        >
          1. 📝 Create Test Booking
        </button>
        
        <button
          onClick={confirmTestBooking}
          disabled={!testBookingId}
          style={{
            padding: '5px',
            background: testBookingId ? '#34A853' : '#ccc',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontSize: '10px',
            cursor: testBookingId ? 'pointer' : 'not-allowed'
          }}
        >
          2. ✅ Confirm Booking
        </button>
        
        <button
          onClick={rejectTestBooking}
          disabled={!testBookingId}
          style={{
            padding: '5px',
            background: testBookingId ? '#EA4335' : '#ccc',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontSize: '10px',
            cursor: testBookingId ? 'pointer' : 'not-allowed'
          }}
        >
          3. ❌ Reject Booking
        </button>
        
        <button
          onClick={checkBookingStatus}
          disabled={!testBookingId}
          style={{
            padding: '5px',
            background: testBookingId ? '#FF9800' : '#ccc',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontSize: '10px',
            cursor: testBookingId ? 'pointer' : 'not-allowed'
          }}
        >
          📊 Check Status
        </button>
      </div>

      {result && (
        <div style={{
          background: '#f5f5f5',
          padding: '8px',
          borderRadius: '4px',
          fontSize: '10px',
          maxHeight: '200px',
          overflow: 'auto',
          whiteSpace: 'pre-wrap'
        }}>
          {result}
        </div>
      )}

      <div style={{ marginTop: '8px', fontSize: '10px', color: '#666' }}>
        Role: {user?.role} | ID: {user?.id}
      </div>
    </div>
  );
}

