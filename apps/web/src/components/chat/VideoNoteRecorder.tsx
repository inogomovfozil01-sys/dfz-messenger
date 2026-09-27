import React, { useState, useEffect, useRef } from 'react';
import { X, Check, Camera, RefreshCw } from 'lucide-react';
import { apiRequest } from '../../lib/api';

interface VideoNoteRecorderProps {
  chatId: string;
  onClose: () => void;
  onSendVideoNote: (attachment: any, duration: number) => void;
}

export const VideoNoteRecorder: React.FC<VideoNoteRecorderProps> = ({
  chatId,
  onClose,
  onSendVideoNote,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);

  // Initialize camera stream
  useEffect(() => {
    let stream: MediaStream | null = null;

    navigator.mediaDevices
      ?.getUserMedia({
        video: { width: 360, height: 360, facingMode: 'user' },
        audio: true,
      })
      .then((s) => {
        stream = s;
        mediaStreamRef.current = s;
        if (videoRef.current) {
          videoRef.current.srcObject = s;
        }

        // Start MediaRecorder
        startRecording(s);
      })
      .catch((err) => {
        setErrorMsg('Не удалось получить доступ к камере или микрофону');
      });

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (stream) stream.getTracks().forEach((t) => t.stop());
      if (mediaStreamRef.current) mediaStreamRef.current.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const startRecording = (stream: MediaStream) => {
    try {
      recordedChunksRef.current = [];
      const options = { mimeType: 'video/webm;codecs=vp8,opus' };
      const recorder = new MediaRecorder(stream, options);

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          recordedChunksRef.current.push(e.data);
        }
      };

      recorder.start(200);
      mediaRecorderRef.current = recorder;
      setIsRecording(true);

      // Start timer (max 60 seconds)
      timerRef.current = setInterval(() => {
        setSeconds((prev) => {
          if (prev >= 59) {
            stopAndSend();
            return 60;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (e: any) {
      setErrorMsg('Ошибка запуска видеозаписи: ' + e.message);
    }
  };

  const stopAndSend = async () => {
    if (!mediaRecorderRef.current || isUploading) return;

    if (timerRef.current) clearInterval(timerRef.current);

    setIsUploading(true);

    mediaRecorderRef.current.onstop = async () => {
      try {
        const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
        const file = new File([blob], `videonote_${Date.now()}.webm`, { type: 'video/webm' });

        const formData = new FormData();
        formData.append('file', file);

        const uploadRes = await apiRequest<{ url: string }>('/api/media/upload', {
          method: 'POST',
          body: formData,
        });

        if (uploadRes.success && uploadRes.data) {
          onSendVideoNote(uploadRes.data, seconds || 1);
        } else {
          throw new Error('Ошибка загрузки видеосообщения');
        }
      } catch (err: any) {
        setErrorMsg(err.message || 'Ошибка отправки видеосообщения');
      } finally {
        setIsUploading(false);
        onClose();
      }
    };

    mediaRecorderRef.current.stop();
  };

  const handleCancel = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center p-4 select-none animate-fade-in">
      {errorMsg ? (
        <div className="bg-dfz-surface border border-dfz-border rounded-dfz-xl p-6 text-center max-w-sm space-y-3">
          <p className="text-xs text-dfz-danger font-semibold">{errorMsg}</p>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-dfz-md bg-dfz-bg border border-dfz-border text-xs text-dfz-text"
          >
            Закрыть
          </button>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-6">
          {/* Round Camera Viewfinder with Progress Ring */}
          <div className="relative w-56 h-56 rounded-full overflow-hidden border-4 border-dfz-accent shadow-2xl bg-black">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover transform -scale-x-100"
            />

            {/* Live Timer Overlay */}
            <div className="absolute top-3 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full bg-black/60 backdrop-blur-sm text-white text-xs font-mono font-bold tracking-wider">
              {Math.floor(seconds / 60)}:{seconds % 60 < 10 ? '0' : ''}
              {seconds % 60}
            </div>

            {isUploading && (
              <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center text-white text-xs font-semibold gap-2">
                <RefreshCw size={24} className="animate-spin text-dfz-accent" />
                <span>Отправка видеосообщения...</span>
              </div>
            )}
          </div>

          {/* Action Buttons: Cancel / Send */}
          {!isUploading && (
            <div className="flex items-center gap-6">
              <button
                type="button"
                onClick={handleCancel}
                className="w-12 h-12 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center shadow-lg transition-transform active:scale-90"
                title="Отмена"
              >
                <X size={22} />
              </button>

              <button
                type="button"
                onClick={stopAndSend}
                className="w-14 h-14 rounded-full bg-dfz-accent hover:bg-dfz-accent-hover text-white flex items-center justify-center shadow-lg transition-transform active:scale-95 animate-pulse"
                title="Отправить видеосообщение"
              >
                <Check size={28} strokeWidth={3} />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
