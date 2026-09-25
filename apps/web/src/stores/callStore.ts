import { create } from 'zustand';
import { socketService } from '../lib/socket';
import { webrtcManager } from '../lib/webrtc';
import { CallType } from '@dfz/types';

interface IncomingCall {
  callId: string;
  chatId: string;
  callerId: string;
  callerUsername: string;
  callType: CallType;
}

interface ActiveCall {
  chatId: string;
  targetUserId: string;
  targetUsername: string;
  callType: CallType;
  durationSeconds: number;
  isConnected: boolean;
}

interface CallState {
  incomingCall: IncomingCall | null;
  activeCall: ActiveCall | null;
  isMicMuted: boolean;
  isCameraOff: boolean;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  callInterval: any;

  startCall: (chatId: string, targetUserId: string, targetUsername: string, callType: CallType) => Promise<void>;
  acceptCall: () => Promise<void>;
  rejectCall: () => void;
  endCall: () => void;
  toggleMic: () => void;
  toggleCamera: () => void;
  setupCallListeners: () => void;
}

export const useCallStore = create<CallState>((set, get) => ({
  incomingCall: null,
  activeCall: null,
  isMicMuted: false,
  isCameraOff: false,
  localStream: null,
  remoteStream: null,
  callInterval: null,

  startCall: async (chatId, targetUserId, targetUsername, callType) => {
    const socket = socketService.getSocket();

    try {
      const stream = await webrtcManager.initLocalStream(callType === CallType.VIDEO);
      set({
        localStream: stream,
        activeCall: {
          chatId,
          targetUserId,
          targetUsername,
          callType,
          durationSeconds: 0,
          isConnected: false,
        },
      });

      webrtcManager.onRemoteStream = (remoteStream) => {
        set({ remoteStream });
      };

      webrtcManager.onConnectionStateChange = (state) => {
        if (state === 'connected') {
          set((s) => (s.activeCall ? { activeCall: { ...s.activeCall, isConnected: true } } : {}));

          // Start timer
          const interval = setInterval(() => {
            set((s) => (s.activeCall ? { activeCall: { ...s.activeCall, durationSeconds: s.activeCall.durationSeconds + 1 } } : {}));
          }, 1000);
          set({ callInterval: interval });
        } else if (state === 'disconnected' || state === 'failed' || state === 'closed') {
          get().endCall();
        }
      };

      socket.emit('call:initiate', {
        chatId,
        receiverId: targetUserId,
        callType,
      });

      await webrtcManager.createOffer(targetUserId);
    } catch (err) {
      console.error('Failed to start call', err);
      get().endCall();
    }
  },

  acceptCall: async () => {
    const { incomingCall } = get();
    if (!incomingCall) return;

    const socket = socketService.getSocket();

    try {
      const stream = await webrtcManager.initLocalStream(incomingCall.callType === CallType.VIDEO);
      set({
        localStream: stream,
        activeCall: {
          chatId: incomingCall.chatId,
          targetUserId: incomingCall.callerId,
          targetUsername: incomingCall.callerUsername,
          callType: incomingCall.callType,
          durationSeconds: 0,
          isConnected: false,
        },
        incomingCall: null,
      });

      webrtcManager.onRemoteStream = (remoteStream) => {
        set({ remoteStream });
      };

      webrtcManager.onConnectionStateChange = (state) => {
        if (state === 'connected') {
          set((s) => (s.activeCall ? { activeCall: { ...s.activeCall, isConnected: true } } : {}));

          const interval = setInterval(() => {
            set((s) => (s.activeCall ? { activeCall: { ...s.activeCall, durationSeconds: s.activeCall.durationSeconds + 1 } } : {}));
          }, 1000);
          set({ callInterval: interval });
        } else if (state === 'disconnected' || state === 'failed' || state === 'closed') {
          get().endCall();
        }
      };

      socket.emit('call:accept', {
        callerId: incomingCall.callerId,
        callId: incomingCall.callId,
      });
    } catch (err) {
      console.error('Failed to accept call', err);
      get().endCall();
    }
  },

  rejectCall: () => {
    const { incomingCall } = get();
    if (incomingCall) {
      const socket = socketService.getSocket();
      socket.emit('call:reject', {
        callerId: incomingCall.callerId,
        callId: incomingCall.callId,
      });
      set({ incomingCall: null });
    }
  },

  endCall: () => {
    const { activeCall, callInterval } = get();
    if (callInterval) clearInterval(callInterval);

    if (activeCall) {
      const socket = socketService.getSocket();
      socket.emit('call:end', {
        targetUserId: activeCall.targetUserId,
      });
    }

    webrtcManager.close();
    set({
      activeCall: null,
      incomingCall: null,
      localStream: null,
      remoteStream: null,
      callInterval: null,
      isMicMuted: false,
      isCameraOff: false,
    });
  },

  toggleMic: () => {
    const { isMicMuted } = get();
    webrtcManager.toggleAudio(isMicMuted);
    set({ isMicMuted: !isMicMuted });
  },

  toggleCamera: () => {
    const { isCameraOff } = get();
    webrtcManager.toggleVideo(isCameraOff);
    set({ isCameraOff: !isCameraOff });
  },

  setupCallListeners: () => {
    const socket = socketService.getSocket();
    socket.off('call:incoming');
    socket.off('call:accepted');
    socket.off('call:rejected');
    socket.off('call:ended');
    socket.off('call:signal');

    socket.on('call:incoming', (data: IncomingCall) => {
      set({ incomingCall: data });
    });

    socket.on('call:accepted', () => {
      // Caller receives notification that call was accepted
    });

    socket.on('call:rejected', () => {
      get().endCall();
    });

    socket.on('call:ended', () => {
      get().endCall();
    });

    socket.on('call:signal', (data: { senderId: string; signal: any }) => {
      webrtcManager.handleSignal(data.signal);
    });
  },
}));
