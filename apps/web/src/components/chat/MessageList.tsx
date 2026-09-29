import React, { useRef, useEffect, useState } from 'react';
import { format, isToday, isYesterday } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Message } from '@dfz/types';
import { useAuthStore } from '../../stores/authStore';
import { useChatStore } from '../../stores/chatStore';
import { MessageBubble } from './MessageBubble';
import { MediaLightbox } from './MediaLightbox';
import { Skeleton } from '../ui/Skeleton';
import { ArrowDown, MessageSquare } from 'lucide-react';

interface MessageListProps {
  chatId: string;
}

export const MessageList: React.FC<MessageListProps> = ({ chatId }) => {
  const { user } = useAuthStore();
  const {
    messages,
    hasMore,
    fetchMessages,
    isLoadingMessages,
    setReplyTo,
    setEditingMessage,
    deleteMessage,
    addReaction,
    typingUsers,
  } = useChatStore();

  const chatMessages = messages[chatId] || [];
  const currentTyping = typingUsers[chatId] || [];

  const [previewImage, setPreviewImage] = useState<{ url: string; name?: string } | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const bottomAnchorRef = useRef<HTMLDivElement>(null);
  const isInitialScrollRef = useRef(true);
  const nearBottom = useRef(true);
  const loadingOlder = useRef(false);
  const [hasNewMessages, setHasNewMessages] = useState(false);
  const lastMessageId = chatMessages.at(-1)?.id;

  useEffect(() => { isInitialScrollRef.current = true; nearBottom.current = true; setHasNewMessages(false); }, [chatId]);

  // Auto-scroll to bottom on initial load and on new messages
  useEffect(() => {
    if (bottomAnchorRef.current && (isInitialScrollRef.current || nearBottom.current)) {
      bottomAnchorRef.current.scrollIntoView({
        behavior: isInitialScrollRef.current ? 'auto' : 'smooth',
      });
      isInitialScrollRef.current = false;
    } else if (lastMessageId) setHasNewMessages(true);
  }, [lastMessageId]);

  // Infinite scroll up listener
  const handleScroll = () => {
    const el = scrollContainerRef.current;
    if (!el) return;

    nearBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 96;
    if (nearBottom.current) setHasNewMessages(false);
    if (el.scrollTop < 40 && hasMore[chatId] && !isLoadingMessages && !loadingOlder.current) {
      loadingOlder.current = true;
      const prevHeight = el.scrollHeight;
      fetchMessages(chatId).then(() => {
        // Maintain scroll position after prepending older messages
        requestAnimationFrame(() => {
          if (el) el.scrollTop = el.scrollHeight - prevHeight;
          loadingOlder.current = false;
        });
      });
    }
  };

  const formatDateSeparator = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isToday(date)) return 'Сегодня';
    if (isYesterday(date)) return 'Вчера';
    return format(date, 'd MMMM yyyy', { locale: ru });
  };

  if (isLoadingMessages && chatMessages.length === 0) {
    return (
      <div className="tg-wallpaper flex-1 p-4 sm:px-7 space-y-4 overflow-y-auto">
        <Skeleton className="w-48 h-10 rounded-[18px]" />
        <Skeleton className="w-64 h-14 rounded-[18px] ml-auto" />
        <Skeleton className="w-56 h-10 rounded-[18px]" />
        <Skeleton className="w-72 h-16 rounded-[18px] ml-auto" />
      </div>
    );
  }

  if (chatMessages.length === 0) {
    return (
      <div className="tg-wallpaper flex-1 flex flex-col items-center justify-center p-6 text-center text-[var(--text-secondary)] select-none">
        <div className="w-14 h-14 rounded-full bg-black/40 backdrop-blur-md border border-white/5 flex items-center justify-center text-[var(--accent-primary)] mb-3 shadow-sm">
          <MessageSquare size={24} />
        </div>
        <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-1">Здесь пока нет сообщений</h4>
        <p className="text-xs text-[var(--text-secondary)] max-w-xs">
          Напишите первое сообщение, отправьте файл или запишите голосовую заметку.
        </p>
      </div>
    );
  }

  return (
    <div
      ref={scrollContainerRef}
      onScroll={handleScroll}
      className="dfz-chat-canvas tg-wallpaper flex-1 p-4 sm:px-7 overflow-y-auto overflow-x-hidden flex flex-col"
    >
      {/* Lightbox for full image preview */}
      {previewImage && (
        <MediaLightbox
          url={previewImage.url}
          name={previewImage.name}
          onClose={() => setPreviewImage(null)}
        />
      )}

      {/* Loading older indicator */}
      {hasMore[chatId] && (
        <div className="py-2 text-center text-xs text-[var(--text-secondary)]">
          Загрузка предыдущих сообщений...
        </div>
      )}

      {/* Render messages with date separators and consecutive grouping */}
      {chatMessages.map((msg, index) => {
        const isOutgoing = msg.senderId === user?.id;
        const prevMsg = chatMessages[index - 1];

        // Check if date changed
        const showDateSeparator =
          !prevMsg ||
          new Date(prevMsg.createdAt).toDateString() !== new Date(msg.createdAt).toDateString();

        // Check if grouped with previous message (same sender within 3 mins)
        const isConsecutive =
          prevMsg &&
          prevMsg.senderId === msg.senderId &&
          !showDateSeparator &&
          Math.abs(new Date(msg.createdAt).getTime() - new Date(prevMsg.createdAt).getTime()) <
            3 * 60 * 1000;

        return (
          <div key={msg.id} id={`message-${msg.id}`} className="scroll-mt-4">
            {showDateSeparator && (
              <div className="flex items-center justify-center my-3 select-none sticky top-2 z-10">
                <span className="tg-date-pill shadow-sm">
                  {formatDateSeparator(msg.createdAt)}
                </span>
              </div>
            )}

            <MessageBubble
              message={msg}
              isOutgoing={isOutgoing}
              showAvatar={!isConsecutive}
              onReply={(m) => setReplyTo(m)}
              onEdit={(m) => setEditingMessage(m)}
              onDelete={(id) => deleteMessage(id)}
              onReact={(id, emoji) => addReaction(id, emoji)}
              onOpenImage={(url, name) => setPreviewImage({ url, name })}
            />
          </div>
        );
      })}

      {/* Typing indicator bubble */}
      {currentTyping.length > 0 && (
        <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)] px-2 py-1 mt-1 animate-pulse">
          <span className="inline-block w-2 h-2 rounded-full bg-[var(--accent-primary)]" />
          <span>
            {currentTyping.join(', ')} {currentTyping.length > 1 ? 'печатают' : 'печатает'}...
          </span>
        </div>
      )}

      <div ref={bottomAnchorRef} />
      {hasNewMessages && (
        <button
          type="button"
          className="sticky bottom-4 self-center sm:self-end flex items-center gap-2 rounded-full px-4 py-2 bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] text-white shadow-lg text-xs font-medium transition-all"
          onClick={() => {
            bottomAnchorRef.current?.scrollIntoView({ behavior: 'smooth' });
            setHasNewMessages(false);
          }}
        >
          <ArrowDown size={14} />
          <span>Новые сообщения</span>
        </button>
      )}
    </div>
  );
};
