import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause } from 'lucide-react';

interface VoicePlayerProps {
  url: string;
  duration?: number | null;
  waveform?: number[] | null;
  isOutgoing?: boolean;
}

export const VoicePlayer: React.FC<VoicePlayerProps> = ({
  url,
  duration = 0,
  waveform,
  isOutgoing = false,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState<1 | 1.5 | 2>(1);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [measuredDuration,setMeasuredDuration] = useState(0);

  const defaultWaveform = waveform && waveform.length ? waveform : Array(24).fill(20);

  const totalDuration = measuredDuration || duration || 0;

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('ended', onEnded);
    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('ended', onEnded);
    };
  }, []);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      void audio.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
    }
  };

  const cycleSpeed = () => {
    const nextSpeed = playbackSpeed === 1 ? 1.5 : playbackSpeed === 1.5 ? 2 : 1;
    setPlaybackSpeed(nextSpeed);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextSpeed;
    }
  };

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const progressPercent = totalDuration > 0 ? (currentTime / totalDuration) * 100 : 0;

  return (
    <div className="flex items-center gap-2.5 py-1 min-w-[200px] max-w-[280px]">
      <audio ref={audioRef} src={url} preload="metadata" onLoadedMetadata={() => { const d=audioRef.current?.duration; if(d && Number.isFinite(d)) setMeasuredDuration(d); }} />

      {/* Play/Pause Button */}
      <button
        type="button"
        onClick={togglePlay}
        className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors flex-shrink-0 ${
          isOutgoing
            ? 'bg-white/20 text-white hover:bg-white/30'
            : 'bg-dfz-accent text-white hover:bg-dfz-accent-hover'
        }`}
      >
        {isPlaying ? <Pause size={16} /> : <Play size={16} className="ml-0.5" />}
      </button>

      {/* Waveform & Time */}
      <div className="flex-1 flex flex-col justify-center gap-1">
        <div className="flex items-center gap-[2px] h-6 cursor-pointer" role="slider" aria-label="Позиция воспроизведения" aria-valuemin={0} aria-valuemax={totalDuration} aria-valuenow={currentTime} tabIndex={0} onKeyDown={e=>{ if(audioRef.current && ['ArrowLeft','ArrowRight'].includes(e.key)) audioRef.current.currentTime=Math.max(0,Math.min(totalDuration,currentTime+(e.key==='ArrowRight'?5:-5))); }} onClick={e=>{ if(audioRef.current && totalDuration) { const rect=e.currentTarget.getBoundingClientRect(); audioRef.current.currentTime=(e.clientX-rect.left)/rect.width*totalDuration; } }}>
          {defaultWaveform.map((bar, index) => {
            const barPercent = (index / defaultWaveform.length) * 100;
            const isFilled = barPercent <= progressPercent;
            return (
              <div
                key={index}
                style={{ height: `${Math.max(15, bar)}%` }}
                className={`w-[3px] rounded-full transition-colors ${
                  isFilled
                    ? isOutgoing
                      ? 'bg-white'
                      : 'bg-dfz-accent'
                    : isOutgoing
                    ? 'bg-white/40'
                    : 'bg-dfz-border'
                }`}
              />
            );
          })}
        </div>

        <div className="flex items-center justify-between text-[11px] font-mono opacity-80">
          <span>{formatSeconds(isPlaying ? currentTime : totalDuration)}</span>
          <button
            type="button"
            onClick={cycleSpeed}
            className={`px-1 rounded text-[10px] font-bold ${
              isOutgoing ? 'hover:bg-white/10' : 'hover:bg-dfz-surface-hover'
            }`}
          >
            {playbackSpeed}x
          </button>
        </div>
      </div>
    </div>
  );
};
