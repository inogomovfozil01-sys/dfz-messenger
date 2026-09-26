import React, { useState, useEffect, useRef } from 'react';
import { X, Eye, Trash2, Send, Heart, Flame, Laugh, Volume2, VolumeX, ChevronLeft, ChevronRight } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';
import { useStoriesStore } from '../../stores/storiesStore';
import { useAuthStore } from '../../stores/authStore';
import { useChatStore } from '../../stores/chatStore';
import { Avatar } from '../ui/Avatar';
import { apiRequest } from '../../lib/api';

const STORY_DURATION = 5000; // 5 seconds per story

export const StoryViewerModal: React.FC = () => {
  const { user } = useAuthStore();
  const {
    isViewerOpen,
    activeFeedItem,
    activeStoryIndex,
    closeViewer,
    nextStory,
    prevStory,
    reactToStory,
    deleteStory,
    openAnalytics,
  } = useStoriesStore();

  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [isSendingReply, setIsSendingReply] = useState(false);
  const [replySentSuccess, setReplySentSuccess] = useState(false);
  const [isMuted, setIsMuted] = useState(true);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const timerRef = useRef<any>(null);
  const startTimeRef = useRef<number>(Date.now());
  const pausedAtRef = useRef<number>(0);

  const currentStory = activeFeedItem?.stories[activeStoryIndex];
  const isOwnStory = currentStory?.authorId === user?.id;

  // Reset progress and timer on story index or feed item change
  useEffect(() => {
    if (!isViewerOpen || !currentStory) return;

    setProgress(0);
    setIsPaused(false);
    startTimeRef.current = Date.now();
    pausedAtRef.current = 0;

    if (timerRef.current) clearInterval(timerRef.current);

    timerRef.current = setInterval(() => {
      if (isPaused) return;

      const elapsed = Date.now() - startTimeRef.current;
      const pct = Math.min((elapsed / STORY_DURATION) * 100, 100);
      setProgress(pct);

      if (pct >= 100) {
        clearInterval(timerRef.current);
        nextStory();
      }
    }, 50);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isViewerOpen, activeFeedItem?.user.id, activeStoryIndex, isPaused]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isViewerOpen) return;
      if (e.key === 'Escape') closeViewer();
      if (e.key === 'ArrowRight') nextStory();
      if (e.key === 'ArrowLeft') prevStory();
      if (e.key === ' ') setIsPaused((p) => !p);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isViewerOpen]);

  const handlePointerDown = () => {
    setIsPaused(true);
    pausedAtRef.current = Date.now() - startTimeRef.current;
    if (videoRef.current) videoRef.current.pause();
  };

  const handlePointerUp = () => {
    setIsPaused(false);
    startTimeRef.current = Date.now() - pausedAtRef.current;
    if (videoRef.current) videoRef.current.play();
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !currentStory || isSendingReply) return;

    setIsSendingReply(true);
    try {
      // 1. Create or get direct chat with author
      const chatRes = await apiRequest<{ id: string }>('/api/chats/direct', {
        method: 'POST',
        body: JSON.stringify({ targetUserId: currentStory.authorId }),
      });

      if (chatRes.success && chatRes.data) {
        // 2. Send reply message referencing story
        await apiRequest('/api/messages', {
          method: 'POST',
          body: JSON.stringify({
            chatId: chatRes.data.id,
            content: `Ответ на историю: ${replyText}`,
          }),
        });

        setReplyText('');
        setReplySentSuccess(true);
        setTimeout(() => setReplySentSuccess(false), 2000);
      }
    } finally {
      setIsSendingReply(false);
    }
  };

  const handleQuickReaction = (emoji: string) => {
    if (!currentStory) return;
    reactToStory(currentStory.id, emoji);
  };

  if (!isViewerOpen || !activeFeedItem || !currentStory) {
    return null;
  }

  const authorDisplayName = activeFeedItem.user.profile?.displayName || activeFeedItem.user.username;
  const timeAgo = formatDistanceToNow(new Date(currentStory.createdAt), { addSuffix: true, locale: ru });

  return (
    <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex items-center justify-center select-none overflow-hidden animate-fade-in">
      {/* Desktop Navigation Arrows */}
      <button
        type="button"
        onClick={prevStory}
        className="hidden md:flex absolute left-8 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white items-center justify-center transition-transform active:scale-90 z-20"
      >
        <ChevronLeft size={28} />
      </button>

      <button
        type="button"
        onClick={nextStory}
        className="hidden md:flex absolute right-8 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white items-center justify-center transition-transform active:scale-90 z-20"
      >
        <ChevronRight size={28} />
      </button>

      {/* Main Story Container (Mobile-first aspect ratio: 9/16 max-w-sm) */}
      <div
        className="relative w-full h-full md:h-[90vh] md:max-w-md md:rounded-dfz-2xl bg-black overflow-hidden flex flex-col justify-between shadow-2xl"
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
      >
        {/* Top Overlay: Progress Segments & Header */}
        <div className="relative z-30 p-3 pt-4 bg-gradient-to-b from-black/80 via-black/40 to-transparent">
          {/* Progress Segment Bars */}
          <div className="flex items-center gap-1.5 mb-3">
            {activeFeedItem.stories.map((st, idx) => {
              let fillPct = 0;
              if (idx < activeStoryIndex) fillPct = 100;
              else if (idx === activeStoryIndex) fillPct = progress;

              return (
                <div key={st.id} className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-white transition-all duration-75 ease-linear"
                    style={{ width: `${fillPct}%` }}
                  />
                </div>
              );
            })}
          </div>

          {/* Header Row: User Info, Time, Actions */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Avatar
                src={activeFeedItem.user.profile?.avatarUrl}
                name={authorDisplayName}
                size="sm"
              />
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-white leading-tight">
                  {authorDisplayName}
                </span>
                <span className="text-[10px] text-white/70 font-mono leading-tight">
                  {timeAgo}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2" onPointerDown={(e) => e.stopPropagation()}>
              {/* If video: Mute toggle */}
              {currentStory.mediaType === 'VIDEO' && (
                <button
                  type="button"
                  onClick={() => setIsMuted(!isMuted)}
                  className="p-1.5 rounded-full bg-black/40 text-white/90 hover:text-white"
                >
                  {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                </button>
              )}

              {/* If own story: delete button */}
              {isOwnStory && (
                <button
                  type="button"
                  onClick={() => {
                    if (confirm('Удалить эту историю?')) {
                      deleteStory(currentStory.id);
                    }
                  }}
                  className="p-1.5 rounded-full bg-black/40 text-dfz-danger/90 hover:text-dfz-danger"
                  title="Удалить историю"
                >
                  <Trash2 size={16} />
                </button>
              )}

              {/* Close Button */}
              <button
                type="button"
                onClick={closeViewer}
                className="p-1.5 rounded-full bg-black/40 text-white hover:bg-black/60 transition-colors"
              >
                <X size={18} />
              </button>
            </div>
          </div>
        </div>

        {/* Middle Media Area & Tap Navigation Zones */}
        <div className="absolute inset-0 z-10 flex items-center justify-center">
          {/* Left tap zone: 25% */}
          <div
            className="absolute left-0 top-0 bottom-0 w-1/4 z-20 cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              prevStory();
            }}
          />

          {/* Right tap zone: 75% */}
          <div
            className="absolute right-0 top-0 bottom-0 w-3/4 z-20 cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              nextStory();
            }}
          />

          {/* Media Content */}
          {currentStory.mediaType === 'IMAGE' && (
            <img
              src={currentStory.mediaUrl}
              alt="Story"
              className="w-full h-full object-cover md:object-contain select-none pointer-events-none"
            />
          )}

          {currentStory.mediaType === 'VIDEO' && (
            <video
              ref={videoRef}
              src={currentStory.mediaUrl}
              autoPlay
              playsInline
              loop
              muted={isMuted}
              className="w-full h-full object-cover md:object-contain pointer-events-none"
            />
          )}

          {currentStory.mediaType === 'TEXT' && (
            <div
              className="w-full h-full flex items-center justify-center p-8 text-center text-white"
              style={{
                background: currentStory.textOverlay?.bgColor || 'linear-gradient(135deg, #6366f1, #a855f7, #ec4899)',
              }}
            >
              <p
                className="font-bold text-xl md:text-2xl leading-relaxed drop-shadow-md select-text"
                style={{ color: currentStory.textOverlay?.textColor || '#ffffff' }}
              >
                {currentStory.textOverlay?.text || currentStory.caption}
              </p>
            </div>
          )}
        </div>

        {/* Bottom Overlay: Caption & Interactive Controls */}
        <div
          className="relative z-30 p-3 pb-4 bg-gradient-to-t from-black/90 via-black/50 to-transparent space-y-2.5"
          onPointerDown={(e) => e.stopPropagation()}
        >
          {/* Caption text (if image/video has caption) */}
          {currentStory.caption && currentStory.mediaType !== 'TEXT' && (
            <div className="bg-black/40 backdrop-blur-sm px-3 py-1.5 rounded-dfz-md border border-white/10 text-xs text-white/95 leading-snug">
              {currentStory.caption}
            </div>
          )}

          {/* Own story controls: Views button */}
          {isOwnStory ? (
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => openAnalytics(currentStory.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/15 hover:bg-white/25 text-white text-xs font-semibold backdrop-blur-sm transition-colors"
              >
                <Eye size={15} />
                <span>{currentStory.viewCount || 0} просмотров</span>
              </button>

              <div className="text-[11px] text-white/60 font-mono">
                Истекает через 24 ч.
              </div>
            </div>
          ) : (
            /* Other user's story controls: Reactions & Reply Input */
            <div className="space-y-2">
              {/* Quick Reaction Bar */}
              <div className="flex items-center justify-around py-1">
                {['🔥', '❤️', '😂', '😮', '😢', '👏'].map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => handleQuickReaction(emoji)}
                    className="text-2xl hover:scale-130 active:scale-95 transition-transform"
                  >
                    {emoji}
                  </button>
                ))}
              </div>

              {/* Reply Form */}
              <form onSubmit={handleSendReply} className="flex items-center gap-2">
                <input
                  type="text"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Ответить на историю..."
                  className="flex-1 h-9 px-3.5 rounded-full bg-white/15 border border-white/20 text-white placeholder:text-white/60 text-xs focus:outline-none focus:bg-white/25 focus:border-white/40 transition-colors backdrop-blur-sm"
                />
                <button
                  type="submit"
                  disabled={!replyText.trim() || isSendingReply}
                  className="w-9 h-9 rounded-full bg-dfz-accent text-white flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed hover:bg-dfz-accent-hover transition-colors shadow-dfz-sm"
                >
                  <Send size={15} />
                </button>
              </form>

              {replySentSuccess && (
                <div className="text-center text-[11px] text-dfz-success font-semibold animate-fade-in">
                  ✓ Ответ отправлен в чат
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
