import React from 'react';
import './CallButton.css';

const CallButton = ({ onVoiceCall, onVideoCall, disabled = false, otherUser }) => {
  return (
    <div className="call-buttons">
      <button 
        className="call-btn voice-call"
        onClick={onVoiceCall}
        disabled={disabled}
        title={`Gọi điện cho ${otherUser?.fullName || 'người này'}`}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M6.62,10.79C8.06,13.62 10.38,15.94 13.21,17.38L15.41,15.18C15.69,14.9 16.08,14.82 16.43,14.93C17.55,15.3 18.75,15.5 20,15.5A1,1 0 0,1 21,16.5V20A1,1 0 0,1 20,21A17,17 0 0,1 3,4A1,1 0 0,1 4,3H7.5A1,1 0 0,1 8.5,4C8.5,5.25 8.7,6.45 9.07,7.57C9.18,7.92 9.1,8.31 8.82,8.59L6.62,10.79Z"/>
        </svg>
      </button>
      
      <button 
        className="call-btn video-call"
        onClick={onVideoCall}
        disabled={disabled}
        title={`Video call với ${otherUser?.fullName || 'người này'}`}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M17,10.5V7A1,1 0 0,0 16,6H4A1,1 0 0,0 3,7V17A1,1 0 0,0 4,18H16A1,1 0 0,0 17,17V13.5L21,17.5V6.5L17,10.5Z"/>
        </svg>
      </button>
    </div>
  );
};

export default CallButton;
