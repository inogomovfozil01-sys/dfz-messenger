import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Trash2, Send } from 'lucide-react';

interface VoiceRecorderProps {
  onSend: (audioBlob: Blob, durationSeconds: number) => void;
  onCancel: () => void;
}

export const VoiceRecorder: React.FC<VoiceRecorderProps> = ({ onSend, onCancel }) => {
  const [seconds, setSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);

  useEffect(() => {
    let stream: MediaStream | null = null;

    const startRecording = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        chunksRef.current = [];

        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) {
            chunksRef.current.push(e.data);
          }
        };

        mediaRecorder.start(100);

        timerRef.current = setInterval(() => {
          setSeconds((s) => s + 1);
        }, 1000);
      } catch (err) {
        console.error('Microphone access denied or unavailable', err);
        onCancel();
      }
    };

    startRecording();

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (stream) stream.getTracks().forEach((track) => track.stop());
    };
  }, [onCancel]);

  const handleStopAndSend = () => {
    if (!mediaRecorderRef.current) return;

    mediaRecorderRef.current.onstop = () => {
      const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
      onSend(audioBlob, seconds);
    };

    mediaRecorderRef.current.stop();
  };

  const formatTime = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex items-center justify-between w-full h-11 px-3 bg-dfz-surface border border-dfz-border rounded-dfz-xl animate-fade-in">
      <div className="flex items-center gap-3">
        <span className="relative flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-dfz-danger opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-dfz-danger"></span>
        </span>
        <span className="text-xs font-mono font-semibold text-dfz-danger">
          {formatTime(seconds)}
        </span>
        <span className="text-xs text-dfz-text-muted hidden sm:inline">
          Запись голосового сообщения...
        </span>
      </div>

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={onCancel}
          className="p-2 text-dfz-text-muted hover:text-dfz-danger hover:bg-dfz-surface-hover rounded-full transition-colors"
          title="Отменить"
        >
          <Trash2 size={16} />
        </button>

        <button
          type="button"
          onClick={handleStopAndSend}
          className="p-2 bg-dfz-accent hover:bg-dfz-accent-hover text-white rounded-full transition-colors shadow-dfz-sm"
          title="Отправить"
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
};
