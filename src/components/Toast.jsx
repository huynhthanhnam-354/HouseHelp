import React, { useState, useEffect } from 'react';
import './Toast.css';

export default function Toast({ message, type = 'info', duration = 4000, onClose }) {
  const [isVisible, setIsVisible] = useState(true);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    // Show animation
    setTimeout(() => setIsAnimating(true), 10);

    // Auto hide after duration
    const timer = setTimeout(() => {
      handleClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration]);

  const handleClose = () => {
    setIsAnimating(false);
    setTimeout(() => {
      setIsVisible(false);
      if (onClose) onClose();
    }, 300);
  };

  if (!isVisible) return null;

  const getIcon = () => {
    switch (type) {
      case 'success':
        return '✅';
      case 'error':
        return '❌';
      case 'warning':
        return '⚠️';
      case 'booking_confirmed':
        return '✅';
      case 'booking_rejected':
        return '❌';
      case 'new_booking':
        return '📅';
      default:
        return 'ℹ️';
    }
  };

  const getTypeClass = () => {
    switch (type) {
      case 'success':
      case 'booking_confirmed':
        return 'toast-success';
      case 'error':
      case 'booking_rejected':
        return 'toast-error';
      case 'warning':
        return 'toast-warning';
      case 'new_booking':
        return 'toast-booking';
      default:
        return 'toast-info';
    }
  };

  return (
    <div className={`toast ${getTypeClass()} ${isAnimating ? 'toast-show' : 'toast-hide'}`}>
      <div className="toast-icon">
        {getIcon()}
      </div>
      <div className="toast-content">
        <div className="toast-message">{message}</div>
      </div>
      <button className="toast-close" onClick={handleClose}>
        ×
      </button>
    </div>
  );
}


