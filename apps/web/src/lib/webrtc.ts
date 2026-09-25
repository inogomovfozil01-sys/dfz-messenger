import { socketService } from './socket';

const DEFAULT_STUN_SERVERS: RTCIceServer[] = [
  { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] },
];

export class WebRTCManager {
  private peerConnection: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private targetUserId: string | null = null;

  public onRemoteStream?: (stream: MediaStream) => void;
  public onConnectionStateChange?: (state: RTCPeerConnectionState) => void;

  async initLocalStream(video: boolean = false): Promise<MediaStream> {
    this.localStream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: video ? { width: { ideal: 1280 }, height: { ideal: 720 } } : false,
    });
    return this.localStream;
  }

  createPeerConnection(targetUserId: string): RTCPeerConnection {
    this.targetUserId = targetUserId;
    const socket = socketService.getSocket();

    const stunEnv = process.env.NEXT_PUBLIC_STUN_SERVERS;
    const iceServers = stunEnv
      ? stunEnv.split(',').map(u => ({ urls: u.trim() }))
      : DEFAULT_STUN_SERVERS;

    this.peerConnection = new RTCPeerConnection({
      iceServers,
    });

    // Add local tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        this.peerConnection?.addTrack(track, this.localStream!);
      });
    }

    // Remote track listener
    this.peerConnection.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        this.onRemoteStream?.(event.streams[0]);
      }
    };

    // ICE candidate listener
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate && this.targetUserId) {
        socket.emit('call:signal', {
          targetUserId: this.targetUserId,
          signal: { candidate: event.candidate },
        });
      }
    };

    // Connection state
    this.peerConnection.onconnectionstatechange = () => {
      if (this.peerConnection) {
        this.onConnectionStateChange?.(this.peerConnection.connectionState);
      }
    };

    return this.peerConnection;
  }

  async createOffer(targetUserId: string) {
    const pc = this.createPeerConnection(targetUserId);
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    const socket = socketService.getSocket();
    socket.emit('call:signal', {
      targetUserId,
      signal: { sdp: offer },
    });
  }

  async handleSignal(signal: any) {
    if (!this.peerConnection) return;

    if (signal.sdp) {
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(signal.sdp));
      if (signal.sdp.type === 'offer') {
        const answer = await this.peerConnection.createAnswer();
        await this.peerConnection.setLocalDescription(answer);

        if (this.targetUserId) {
          const socket = socketService.getSocket();
          socket.emit('call:signal', {
            targetUserId: this.targetUserId,
            signal: { sdp: answer },
          });
        }
      }
    } else if (signal.candidate) {
      try {
        await this.peerConnection.addIceCandidate(new RTCIceCandidate(signal.candidate));
      } catch (err) {
        console.error('Error adding ICE candidate', err);
      }
    }
  }

  toggleAudio(enabled: boolean) {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach(track => {
        track.enabled = enabled;
      });
    }
  }

  toggleVideo(enabled: boolean) {
    if (this.localStream) {
      this.localStream.getVideoTracks().forEach(track => {
        track.enabled = enabled;
      });
    }
  }

  close() {
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }
    this.targetUserId = null;
  }
}

export const webrtcManager = new WebRTCManager();
