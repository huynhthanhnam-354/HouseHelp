import React, { useState, useEffect } from 'react';
import Toast from './Toast';

let toastId = 0;

const ToastContainer = () => {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    // Global function to add toast
    window.showToast = (message, type = 'info', duration = 4000) => {
      const id = ++toastId;
      const newToast = { id, message, type, duration };
      
      setToasts(prev => [...prev, newToast]);
    };

    return () => {
      delete window.showToast;
    };
  }, []);

  const removeToast = (id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  return (
    <div className="toast-container">
      {toasts.map((toast, index) => (
        <div 
          key={toast.id} 
          style={{ 
            position: 'fixed',
            top: `${20 + index * 70}px`,
            right: '20px',
            zIndex: 1000 + index
          }}
        >
          <Toast
            message={toast.message}
            type={toast.type}
            duration={toast.duration}
            onClose={() => removeToast(toast.id)}
          />
        </div>
      ))}
    </div>
  );
};

export default ToastContainer;


