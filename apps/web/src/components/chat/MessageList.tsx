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
      <div className="flex-1 p-4 space-y-4 overflow-y-auto">
        <Skeleton className="w-48 h-10 rounded-dfz-xl" />
        <Skeleton className="w-64 h-14 rounded-dfz-xl ml-auto" />
        <Skeleton className="w-56 h-10 rounded-dfz-xl" />
        <Skeleton className="w-72 h-16 rounded-dfz-xl ml-auto" />
      </div>
    );
  }

  if (chatMessages.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-dfz-text-muted select-none">
        <div className="w-16 h-16 rounded-full bg-dfz-surface border border-dfz-border flex items-center justify-center text-2xl mb-3 shadow-dfz-sm">
          <MessageSquare size={26} />
        </div>
        <h4 className="text-base font-semibold text-dfz-text mb-1">Здесь пока нет сообщений</h4>
        <p className="text-xs max-w-xs">
          Напишите первое сообщение, отправьте файл или запишите голосовую заметку.
        </p>
      </div>
    );
  }

  return (
    <div
      ref={scrollContainerRef}
      onScroll={handleScroll}
      className="flex-1 p-4 overflow-y-auto overflow-x-hidden flex flex-col"
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
        <div className="py-2 text-center text-xs text-dfz-text-muted">
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
              <div className="flex items-center justify-center my-3 select-none">
                <span className="px-3 py-1 bg-dfz-surface/90 border border-dfz-border rounded-full text-[11px] font-medium text-dfz-text-muted shadow-dfz-sm">
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
        <div className="flex items-center gap-2 text-xs text-dfz-text-muted px-2 py-1 mt-1 animate-pulse">
          <span className="inline-block w-2 h-2 rounded-full bg-dfz-accent" />
          <span>
            {currentTyping.join(', ')} {currentTyping.length > 1 ? 'печатают' : 'печатает'}...
          </span>
        </div>
      )}

      <div ref={bottomAnchorRef} />
      {hasNewMessages && <button className="sticky bottom-2 self-end flex items-center gap-2 rounded-full px-3 py-2 bg-dfz-accent text-white shadow-lg" onClick={() => { bottomAnchorRef.current?.scrollIntoView({ behavior: 'smooth' }); setHasNewMessages(false); }}><ArrowDown size={16} />Новые сообщения</button>}
    </div>
  );
};
