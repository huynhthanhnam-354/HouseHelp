import React, { useRef, useEffect, useState } from 'react';
import CallService from '../../services/CallService';
import './CallWindow.css';

const CallWindow = ({ 
  isOpen, 
  onClose, 
  callData, 
  isIncoming = false,
  onAnswer,
  onReject 
}) => {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [callStatus, setCallStatus] = useState('connecting'); // connecting, connected, ended

  useEffect(() => {
    if (!isOpen) return;

    const handleCallEvent = (event, data) => {
      switch (event) {
        case 'call_started':
        case 'call_answered':
        case 'call_connected':
          if (localVideoRef.current && data.localStream) {
            localVideoRef.current.srcObject = data.localStream;
          }
          setCallStatus('connected');
          break;
          
        case 'remote_stream':
          if (remoteVideoRef.current && data.remoteStream) {
            remoteVideoRef.current.srcObject = data.remoteStream;
          }
          break;
          
        case 'call_ended':
          setCallStatus('ended');
          setTimeout(() => {
            onClose();
          }, 2000);
          break;
          
        case 'audio_toggled':
          setIsMuted(data.muted);
          break;
          
        case 'video_toggled':
          setIsCameraOff(data.cameraOff);
          break;
      }
    };

    CallService.addListener(handleCallEvent);

    return () => {
      CallService.removeListener(handleCallEvent);
    };
  }, [isOpen, onClose]);

  const handleEndCall = () => {
    CallService.endCall();
    onClose();
  };

  const handleToggleMute = () => {
    CallService.toggleMute();
  };

  const handleToggleCamera = () => {
    CallService.toggleCamera();
  };

  const handleAnswer = () => {
    if (onAnswer) {
      onAnswer(callData);
    }
  };

  const handleReject = () => {
    if (onReject) {
      onReject();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="call-window-overlay">
      <div className="call-window">
        <div className="call-header">
          <div className="call-info">
            <h3>{callData?.callerName || callData?.targetUserName || 'Cuộc gọi'}</h3>
            <span className={`call-status ${callStatus}`}>
              {callStatus === 'connecting' && 'Đang kết nối...'}
              {callStatus === 'connected' && 'Đã kết nối'}
              {callStatus === 'ended' && 'Cuộc gọi đã kết thúc'}
            </span>
          </div>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="call-content">
          {callData?.isVideoCall ? (
            <div className="video-container">
              <video 
                ref={remoteVideoRef}
                className="remote-video"
                autoPlay
                playsInline
              />
              <video 
                ref={localVideoRef}
                className="local-video"
                autoPlay
                playsInline
                muted
              />
            </div>
          ) : (
            <div className="audio-call">
              <div className="avatar-container">
                <div className="avatar">
                  {(callData?.callerName || callData?.targetUserName || 'U')[0]}
                </div>
                <div className="sound-waves">
                  <div className="wave"></div>
                  <div className="wave"></div>
                  <div className="wave"></div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="call-controls">
          {isIncoming && callStatus === 'connecting' ? (
            <div className="incoming-controls">
              <button className="answer-btn" onClick={handleAnswer}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M6.62,10.79C8.06,13.62 10.38,15.94 13.21,17.38L15.41,15.18C15.69,14.9 16.08,14.82 16.43,14.93C17.55,15.3 18.75,15.5 20,15.5A1,1 0 0,1 21,16.5V20A1,1 0 0,1 20,21A17,17 0 0,1 3,4A1,1 0 0,1 4,3H7.5A1,1 0 0,1 8.5,4C8.5,5.25 8.7,6.45 9.07,7.57C9.18,7.92 9.1,8.31 8.82,8.59L6.62,10.79Z"/>
                </svg>
              </button>
              <button className="reject-btn" onClick={handleReject}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12,9C10.89,9 10,8.1 10,7C10,5.89 10.89,5 12,5C13.11,5 14,5.89 14,7C14,8.1 13.11,9 12,9M12,20C7.59,20 4,16.41 4,12C4,11.71 4.32,11.39 4.61,11.39C5.11,11.39 5.5,11.8 5.5,12.3C5.5,15.65 8.35,18.5 11.7,18.5C15.15,18.5 18,15.65 18,12.3C18,11.8 18.4,11.39 18.9,11.39C19.19,11.39 19.5,11.71 19.5,12C19.5,16.41 15.91,20 12,20Z"/>
                </svg>
              </button>
            </div>
          ) : (
            <div className="active-controls">
              <button 
                className={`control-btn ${isMuted ? 'active' : ''}`}
                onClick={handleToggleMute}
                title={isMuted ? 'Bật mic' : 'Tắt mic'}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  {isMuted ? (
                    <path d="M19,11C19,12.19 18.66,13.3 18.1,14.28L16.87,13.05C17.14,12.43 17.3,11.74 17.3,11H19M15,11.16L9,5.18V5A3,3 0 0,1 12,2A3,3 0 0,1 15,5V11L15,11.16M4.27,3L21,19.73L19.73,21L15.54,16.81C14.77,17.27 13.91,17.58 13,17.72V21H11V17.72C7.72,17.23 5,14.41 5,11H6.7C6.7,14 9.24,16.1 12,16.1C12.81,16.1 13.6,15.91 14.31,15.58L12.65,13.92L12,14A3,3 0 0,1 9,11V10.28L3,4.27L4.27,3Z"/>
                  ) : (
                    <path d="M12,2A3,3 0 0,1 15,5V11A3,3 0 0,1 12,14A3,3 0 0,1 9,11V5A3,3 0 0,1 12,2M19,11C19,14.53 16.39,17.44 13,17.93V21H11V17.93C7.61,17.44 5,14.53 5,11H7A5,5 0 0,0 12,16A5,5 0 0,0 17,11H19Z"/>
                  )}
                </svg>
              </button>

              {callData?.isVideoCall && (
                <button 
                  className={`control-btn ${isCameraOff ? 'active' : ''}`}
                  onClick={handleToggleCamera}
                  title={isCameraOff ? 'Bật camera' : 'Tắt camera'}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    {isCameraOff ? (
                      <path d="M3.27,2L2,3.27L4.73,6H4A1,1 0 0,0 3,7V17A1,1 0 0,0 4,18H16C16.21,18 16.39,17.92 16.54,17.82L19.73,21L21,19.73L3.27,2M21,6.5L17,10.5V7A1,1 0 0,0 16,6H9.82L21,17.18V6.5Z"/>
                    ) : (
                      <path d="M17,10.5V7A1,1 0 0,0 16,6H4A1,1 0 0,0 3,7V17A1,1 0 0,0 4,18H16A1,1 0 0,0 17,17V13.5L21,17.5V6.5L17,10.5Z"/>
                    )}
                  </svg>
                </button>
              )}

              <button className="end-call-btn" onClick={handleEndCall}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12,9C10.89,9 10,8.1 10,7C10,5.89 10.89,5 12,5C13.11,5 14,5.89 14,7C14,8.1 13.11,9 12,9M12,20C7.59,20 4,16.41 4,12C4,11.71 4.32,11.39 4.61,11.39C5.11,11.39 5.5,11.8 5.5,12.3C5.5,15.65 8.35,18.5 11.7,18.5C15.15,18.5 18,15.65 18,12.3C18,11.8 18.4,11.39 18.9,11.39C19.19,11.39 19.5,11.71 19.5,12C19.5,16.41 15.91,20 12,20Z"/>
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CallWindow;
