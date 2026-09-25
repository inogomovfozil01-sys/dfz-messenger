import React, { useRef, useEffect } from 'react';
import { Phone, PhoneOff, Mic, MicOff, Video, VideoOff } from 'lucide-react';
import { useCallStore } from '../../stores/callStore';
import { CallType } from '@dfz/types';
import { Avatar } from '../ui/Avatar';

export const CallOverlay: React.FC = () => {
  const {
    incomingCall,
    activeCall,
    isMicMuted,
    isCameraOff,
    localStream,
    remoteStream,
    acceptCall,
    rejectCall,
    endCall,
    toggleMic,
    toggleCamera,
  } = useCallStore();

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  // Attach local stream
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  // Attach remote stream
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  const formatDuration = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // 1. Incoming Call Prompt
  if (incomingCall && !activeCall) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in">
        <div className="bg-dfz-surface border border-dfz-border rounded-dfz-xl p-6 w-full max-w-xs text-center shadow-dfz-dropdown animate-scale-in">
          <Avatar
            name={incomingCall.callerUsername}
            size="xl"
            className="mb-3 mx-auto"
          />
          <h3 className="text-base font-bold text-dfz-text">
            {incomingCall.callerUsername}
          </h3>
          <p className="text-xs text-dfz-text-muted mt-1 mb-6">
            Входящий {incomingCall.callType === CallType.VIDEO ? 'видеозвонок' : 'аудиозвонок'}...
          </p>

          <div className="flex items-center justify-center gap-6">
            <button
              onClick={rejectCall}
              className="p-3.5 rounded-full bg-dfz-danger hover:bg-dfz-danger-hover text-white shadow-dfz-md transition-transform hover:scale-110"
              title="Отклонить"
            >
              <PhoneOff size={22} />
            </button>
            <button
              onClick={acceptCall}
              className="p-3.5 rounded-full bg-dfz-success hover:opacity-90 text-white shadow-dfz-md transition-transform hover:scale-110"
              title="Принять"
            >
              <Phone size={22} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 2. Active Call Screen
  if (activeCall) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-between p-6 bg-black/90 text-white animate-fade-in">
        {/* Call Info Header */}
        <div className="text-center z-10 pt-4">
          <h3 className="text-lg font-bold">{activeCall.targetUsername}</h3>
          <p className="text-xs font-mono text-white/70 mt-1">
            {activeCall.isConnected ? formatDuration(activeCall.durationSeconds) : 'Соединение...'}
          </p>
        </div>

        {/* Video / Audio Area */}
        <div className="relative flex-1 w-full max-w-4xl flex items-center justify-center overflow-hidden my-4 rounded-dfz-xl bg-gray-900 border border-white/10">
          {activeCall.callType === CallType.VIDEO ? (
            <>
              {/* Remote Video */}
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
              {/* Local Video Picture-in-Picture */}
              <div className="absolute bottom-4 right-4 w-36 h-48 bg-black/50 border border-white/20 rounded-dfz-lg overflow-hidden shadow-lg">
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center">
              <div className="relative flex items-center justify-center mb-4">
                <div className="absolute w-28 h-28 rounded-full bg-dfz-accent/20 animate-ping" />
                <Avatar name={activeCall.targetUsername} size="xl" />
              </div>
              <span className="text-xs text-white/60">Идет аудиозвонок</span>
            </div>
          )}
        </div>

        {/* Bottom Control Actions */}
        <div className="flex items-center gap-4 pb-6 z-10">
          <button
            onClick={toggleMic}
            className={`p-3.5 rounded-full transition-colors ${
              isMicMuted ? 'bg-dfz-danger text-white' : 'bg-white/20 hover:bg-white/30 text-white'
            }`}
            title={isMicMuted ? 'Включить микрофон' : 'Выключить микрофон'}
          >
            {isMicMuted ? <MicOff size={20} /> : <Mic size={20} />}
          </button>

          {activeCall.callType === CallType.VIDEO && (
            <button
              onClick={toggleCamera}
              className={`p-3.5 rounded-full transition-colors ${
                isCameraOff ? 'bg-dfz-danger text-white' : 'bg-white/20 hover:bg-white/30 text-white'
              }`}
              title={isCameraOff ? 'Включить камеру' : 'Выключить камеру'}
            >
              {isCameraOff ? <VideoOff size={20} /> : <Video size={20} />}
            </button>
          )}

          <button
            onClick={endCall}
            className="p-3.5 rounded-full bg-dfz-danger hover:bg-dfz-danger-hover text-white transition-transform hover:scale-110 shadow-dfz-lg"
            title="Завершить звонок"
          >
            <PhoneOff size={22} />
          </button>
        </div>
      </div>
    );
  }

  return null;
};
