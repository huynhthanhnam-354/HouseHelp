import io from 'socket.io-client';

class CallService {
  constructor() {
    this.socket = null;
    this.localStream = null;
    this.remoteStream = null;
    this.peerConnection = null;
    this.isCallActive = false;
    this.isInitiator = false;
    this.callListeners = [];
    
    // WebRTC configuration
    this.pcConfig = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    };
  }

  // Kết nối Socket.IO cho signaling
  connect(userId, role, userName = 'Người dùng') {
    if (this.socket) return;

    this.userId = userId; // Store userId for later use
    this.userRole = role;
    this.userName = userName;

    this.socket = io('http://localhost:5000', {
      withCredentials: true,
      transports: ['websocket', 'polling']
    });

    this.socket.emit('join', { userId, role, userName });
    
    console.log(`🔌 CallService connected for user ${userId} (${role}) - ${userName}`);

    // Lắng nghe các sự kiện call
    this.socket.on('call_offer', this.handleCallOffer.bind(this));
    this.socket.on('call_answer', this.handleCallAnswer.bind(this));
    this.socket.on('ice_candidate', this.handleIceCandidate.bind(this));
    this.socket.on('call_ended', this.handleCallEnded.bind(this));
    this.socket.on('incoming_call', this.handleIncomingCall.bind(this));
    
    // Debug: Log tất cả events nhận được
    this.socket.onAny((eventName, ...args) => {
      console.log(`📡 CallService received event: ${eventName}`, args);
    });
  }

  // Bắt đầu cuộc gọi
  async startCall(targetUserId, isVideoCall = false) {
    try {
      console.log(`🔥 Starting ${isVideoCall ? 'video' : 'voice'} call to user ${targetUserId}`);
      
      // Kiểm tra socket connection
      if (!this.socket || !this.socket.connected) {
        throw new Error('Socket not connected. Please wait and try again.');
      }

      // Kiểm tra browser support
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Your browser does not support media devices.');
      }

      this.isInitiator = true;
      this.isCallActive = true;
      this.targetUserId = targetUserId;

      // Lấy media stream với error handling tốt hơn
      try {
        this.localStream = await navigator.mediaDevices.getUserMedia({
          video: isVideoCall,
          audio: true
        });
        console.log('✅ Got local media stream');
      } catch (mediaError) {
        console.error('Media access error:', mediaError);
        if (mediaError.name === 'NotAllowedError') {
          throw new Error('Camera/microphone access denied. Please allow access and try again.');
        } else if (mediaError.name === 'NotFoundError') {
          throw new Error('No camera/microphone found. Please check your devices.');
        } else {
          throw new Error(`Media access error: ${mediaError.message}`);
        }
      }

      // Tạo peer connection
      this.createPeerConnection();

      // Thêm local stream vào peer connection
      this.localStream.getTracks().forEach(track => {
        this.peerConnection.addTrack(track, this.localStream);
      });

      // Tạo offer
      const offer = await this.peerConnection.createOffer();
      await this.peerConnection.setLocalDescription(offer);

      // Gửi offer qua socket
      this.socket.emit('call_offer', {
        targetUserId,
        offer,
        isVideoCall,
        callerId: this.userId
      });
      
      console.log('✅ Call offer sent to server');

      this.notifyListeners('call_started', { 
        targetUserId, 
        isVideoCall, 
        localStream: this.localStream 
      });

    } catch (error) {
      console.error('Error starting call:', error);
      this.endCall();
      throw error;
    }
  }

  // Trả lời cuộc gọi
  async answerCall(callData) {
    try {
      this.isCallActive = true;
      this.isInitiator = false;
      this.targetUserId = callData.callerId;

      // Lấy media stream
      console.log('🎤 Requesting microphone access...');
      this.localStream = await navigator.mediaDevices.getUserMedia({
        video: callData.isVideoCall,
        audio: true
      });
      console.log('🎤 Got local stream:', this.localStream);
      console.log('🎤 Audio tracks:', this.localStream.getAudioTracks());
      console.log('🎤 Video tracks:', this.localStream.getVideoTracks());
      
      // Check if audio track is enabled
      const audioTrack = this.localStream.getAudioTracks()[0];
      if (audioTrack) {
        console.log('🎤 Audio track enabled:', audioTrack.enabled);
        console.log('🎤 Audio track ready state:', audioTrack.readyState);
      }
      
      // Monitor local audio
      this.monitorAudioLevels(this.localStream, 'local');

      // Tạo peer connection
      this.createPeerConnection();

      // Thêm local stream
      this.localStream.getTracks().forEach(track => {
        this.peerConnection.addTrack(track, this.localStream);
      });

      // Set remote description
      await this.peerConnection.setRemoteDescription(callData.offer);

      // Tạo answer
      const answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(answer);

      // Gửi answer
      this.socket.emit('call_answer', {
        targetUserId: callData.callerId,
        answer
      });

      this.notifyListeners('call_answered', { 
        callData, 
        localStream: this.localStream 
      });

    } catch (error) {
      console.error('Error answering call:', error);
      this.endCall();
      throw error;
    }
  }

  // Từ chối cuộc gọi
  rejectCall(callerId) {
    this.socket.emit('call_rejected', { targetUserId: callerId });
    this.notifyListeners('call_rejected', { callerId });
  }

  // Kết thúc cuộc gọi
  endCall() {
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }

    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }

    if (this.isCallActive && this.targetUserId) {
      this.socket.emit('call_ended', { targetUserId: this.targetUserId });
    }

    this.isCallActive = false;
    this.isInitiator = false;
    this.remoteStream = null;
    this.targetUserId = null;

    this.notifyListeners('call_ended', {});
  }

  // Tạo peer connection
  createPeerConnection() {
    this.peerConnection = new RTCPeerConnection(this.pcConfig);

    // Xử lý ICE candidates
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate && this.targetUserId) {
        this.socket.emit('ice_candidate', {
          candidate: event.candidate,
          targetUserId: this.targetUserId
        });
        console.log('📡 ICE candidate sent to:', this.targetUserId);
      }
    };

    // Xử lý remote stream
    this.peerConnection.ontrack = (event) => {
      console.log('📺 Received remote stream:', event.streams[0]);
      console.log('📺 Remote audio tracks:', event.streams[0].getAudioTracks());
      console.log('📺 Remote video tracks:', event.streams[0].getVideoTracks());
      
      this.remoteStream = event.streams[0];
      
      // Check remote audio track
      const remoteAudioTrack = this.remoteStream.getAudioTracks()[0];
      if (remoteAudioTrack) {
        console.log('📺 Remote audio track enabled:', remoteAudioTrack.enabled);
        console.log('📺 Remote audio track ready state:', remoteAudioTrack.readyState);
      }
      
      // Test audio levels
      this.monitorAudioLevels(this.remoteStream, 'remote');
      
      this.notifyListeners('remote_stream', { 
        remoteStream: this.remoteStream 
      });
    };

    // Monitor connection state
    this.peerConnection.onconnectionstatechange = () => {
      console.log('🔗 Connection state:', this.peerConnection.connectionState);
      if (this.peerConnection.connectionState === 'connected') {
        this.notifyListeners('call_connected', {});
      }
    };

    // Monitor ICE connection state
    this.peerConnection.oniceconnectionstatechange = () => {
      console.log('🧊 ICE connection state:', this.peerConnection.iceConnectionState);
    };
  }

  // Xử lý offer nhận được
  async handleCallOffer(data) {
    console.log('📞 Received call offer:', data);
    this.notifyListeners('incoming_call', data);
  }

  // Xử lý answer nhận được
  async handleCallAnswer(data) {
    console.log('📞 Received call answer:', data);
    if (this.peerConnection) {
      try {
        await this.peerConnection.setRemoteDescription(data.answer);
        console.log('✅ Remote description set successfully');
        this.notifyListeners('call_connected', { answer: data.answer });
      } catch (error) {
        console.error('❌ Error setting remote description:', error);
      }
    }
  }

  // Xử lý ICE candidate
  async handleIceCandidate(data) {
    console.log('📡 Received ICE candidate:', data.candidate);
    if (this.peerConnection) {
      try {
        await this.peerConnection.addIceCandidate(data.candidate);
        console.log('✅ ICE candidate added successfully');
      } catch (error) {
        console.error('❌ Error adding ICE candidate:', error);
      }
    }
  }

  // Xử lý cuộc gọi kết thúc
  handleCallEnded() {
    this.endCall();
  }

  // Xử lý cuộc gọi đến
  handleIncomingCall(data) {
    console.log('📞 Received incoming call:', data);
    this.notifyListeners('incoming_call', data);
  }

  // Toggle mute audio
  toggleMute() {
    if (this.localStream) {
      const audioTrack = this.localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        this.notifyListeners('audio_toggled', { muted: !audioTrack.enabled });
        return !audioTrack.enabled;
      }
    }
    return false;
  }

  // Toggle camera
  toggleCamera() {
    if (this.localStream) {
      const videoTrack = this.localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        this.notifyListeners('video_toggled', { cameraOff: !videoTrack.enabled });
        return !videoTrack.enabled;
      }
    }
    return false;
  }

  // Thêm listener
  addListener(callback) {
    this.callListeners.push(callback);
  }

  // Xóa listener
  removeListener(callback) {
    this.callListeners = this.callListeners.filter(listener => listener !== callback);
  }

  // Monitor audio levels
  monitorAudioLevels(stream, type) {
    try {
      console.log(`🎵 Setting up audio monitoring for ${type} stream`);
      
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const analyser = audioContext.createAnalyser();
      const microphone = audioContext.createMediaStreamSource(stream);
      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      microphone.connect(analyser);
      analyser.fftSize = 256;

      let checkCount = 0;
      const checkAudioLevel = () => {
        analyser.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
        
        checkCount++;
        if (checkCount % 5 === 0) { // Log every 5 seconds
          console.log(`🎵 ${type} audio level: ${Math.round(average)} (${average > 10 ? 'ACTIVE' : 'silent'})`);
        }
        
        if (average > 10) { // Threshold for detecting audio
          console.log(`🎵 ${type} audio detected - Level: ${Math.round(average)}`);
        }
        
        setTimeout(checkAudioLevel, 1000); // Check every second
      };

      checkAudioLevel();
      
      // Simple test - play remote audio directly
      if (type === 'remote') {
        console.log('🔊 Attempting to play remote audio...');
        const audio = new Audio();
        audio.srcObject = stream;
        audio.play().then(() => {
          console.log('✅ Remote audio playback started');
        }).catch(error => {
          console.error('❌ Failed to play remote audio:', error);
        });
      }
      
    } catch (error) {
      console.error(`❌ Error monitoring ${type} audio:`, error);
    }
  }

  // Thông báo cho listeners
  notifyListeners(event, data) {
    this.callListeners.forEach(callback => {
      callback(event, data);
    });
  }

  // Ngắt kết nối
  disconnect() {
    this.endCall();
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
}

// Export singleton instance
export default new CallService();
