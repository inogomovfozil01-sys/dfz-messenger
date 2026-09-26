import React, { useState } from 'react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Check, CheckCheck, Clock, AlertCircle, FileText, Download, Smile, Reply, Edit3, Trash2, Copy, Pin, Share2, CheckSquare, Square, Flag } from 'lucide-react';
import { Message, MessageType } from '@dfz/types';
import { Avatar } from '../ui/Avatar';
import { VoicePlayer } from './VoicePlayer';
import { ContextMenu, ContextMenuItem } from '../ui/ContextMenu';
import { EmojiPicker } from './EmojiPicker';
import { PollBubble } from './PollBubble';
import { LinkPreviewBubble } from './LinkPreviewBubble';
import { StarTransferBubble } from './StarTransferBubble';
import { GiftCardBubble } from './GiftCardBubble';
import { useChatStore } from '../../stores/chatStore';

interface MessageBubbleProps {
  message: Message;
  isOutgoing: boolean;
  showAvatar?: boolean;
  onReply: (msg: Message) => void;
  onEdit: (msg: Message) => void;
  onDelete: (msgId: string) => void;
  onReact: (msgId: string, emoji: string) => void;
  onOpenImage: (url: string, name?: string) => void;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  isOutgoing,
  showAvatar = true,
  onReply,
  onEdit,
  onDelete,
  onReact,
  onOpenImage,
}) => {
  const [contextMenuPos, setContextMenuPos] = useState<{ x: number; y: number } | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const {
    activeChat,
    pinMessage,
    unpinMessage,
    openForward,
    isSelectMode,
    selectedMessageIds,
    toggleSelectMessage,
  } = useChatStore();

  const isSelected = selectedMessageIds.includes(message.id);
  const isPinned = activeChat?.pinnedMessages?.some((p) => p.id === message.id) || false;

  const formattedTime = message.createdAt
    ? format(new Date(message.createdAt), 'HH:mm', { locale: ru })
    : '';

  const detectedUrl = message.content ? (message.content.match(/https?:\/\/[^\s]+/i)?.[0] || null) : null;

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenuPos({ x: e.clientX, y: e.clientY });
  };

  const handleCopy = () => {
    if (message.content) {
      navigator.clipboard.writeText(message.content);
    }
  };

  const contextMenuItems: ContextMenuItem[] = [
    {
      id: 'reply',
      label: 'Ответить',
      icon: <Reply size={15} />,
      onClick: () => onReply(message),
    },
    {
      id: 'forward',
      label: 'Переслать',
      icon: <Share2 size={15} />,
      onClick: () => openForward(message),
    },
    {
      id: 'copy',
      label: 'Копировать текст',
      icon: <Copy size={15} />,
      onClick: handleCopy,
    },
    {
      id: 'pin',
      label: isPinned ? 'Открепить' : 'Закрепить',
      icon: <Pin size={15} />,
      onClick: () => (isPinned ? unpinMessage(message.chatId, message.id) : pinMessage(message.chatId, message.id)),
    },
    {
      id: 'select',
      label: 'Выбрать',
      icon: <CheckSquare size={15} />,
      onClick: () => toggleSelectMessage(message.id),
    },
    ...(isOutgoing && message.type === MessageType.TEXT
      ? [
          {
            id: 'edit',
            label: 'Изменить',
            icon: <Edit3 size={15} />,
            onClick: () => onEdit(message),
          },
        ]
      : []),
    ...(!isOutgoing
      ? [
          {
            id: 'report',
            label: 'Пожаловаться',
            icon: <Flag size={15} />,
            onClick: () => alert('Жалоба на сообщение отправлена модераторам'),
          },
        ]
      : []),
    {
      id: 'delete',
      label: 'Удалить',
      icon: <Trash2 size={15} />,
      danger: true,
      onClick: () => onDelete(message.id),
    },
  ];

  const renderStatus = () => {
    if (!isOutgoing) return null;
    switch (message.deliveryStatus) {
      case 'sending':
        return <Clock size={12} className="opacity-60 animate-spin" />;
      case 'sent':
        return <Check size={14} className="opacity-70" />;
      case 'delivered':
        return <CheckCheck size={14} className="opacity-70" />;
      case 'read':
        return <CheckCheck size={14} className="text-sky-300" />;
      case 'failed':
        return <AlertCircle size={14} className="text-red-400" />;
      default:
        return <Check size={14} className="opacity-70" />;
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div
      onClick={() => isSelectMode && toggleSelectMessage(message.id)}
      className={`flex items-center gap-2.5 w-full ${
        isSelectMode ? 'cursor-pointer hover:bg-white/[0.02] px-2 py-0.5 rounded transition-colors' : ''
      }`}
    >
      {isSelectMode && (
        <div className="flex-shrink-0">
          {isSelected ? (
            <CheckSquare size={18} className="text-[#2a8dd4]" />
          ) : (
            <Square size={18} className="text-dfz-text-muted" />
          )}
        </div>
      )}

      <div
        onContextMenu={handleContextMenu}
        className={`group relative flex gap-2.5 my-1 max-w-[85%] md:max-w-[70%] select-text animate-message-in ${
          isOutgoing ? 'ml-auto flex-row-reverse' : 'mr-auto'
        }`}
      >
        {/* Sender Avatar for incoming grouped messages */}
        {!isOutgoing && (
          <div className="w-8 flex-shrink-0 self-end">
            {showAvatar ? (
              <Avatar
                src={message.sender?.profile?.avatarUrl}
              name={message.sender?.profile?.displayName || message.sender?.username || 'U'}
              size="sm"
            />
          ) : (
            <div className="w-8" />
          )}
        </div>
      )}

      {/* Sticker Message */}
      {message.type === MessageType.STICKER ? (
        <div className="relative group max-w-xs select-none">
          <img
            src={message.attachments?.[0]?.url || message.content}
            alt="Стикер"
            className="w-40 h-40 object-contain hover:scale-105 transition-transform duration-200 select-none pointer-events-none"
            loading="lazy"
          />
          <div className="flex items-center justify-end gap-1 text-[10px] mt-0.5 px-2 py-0.5 rounded-full bg-black/40 text-white/90 w-fit ml-auto select-none">
            <span>{formattedTime}</span>
            {renderStatus()}
          </div>
        </div>
      ) : message.type === MessageType.VIDEO_NOTE ? (
        /* Circular Video Note Message */
        <div className="relative group max-w-xs select-none">
          <div className="w-52 h-52 rounded-full overflow-hidden border-2 border-dfz-accent shadow-md bg-black">
            <video
              src={message.attachments?.[0]?.url || message.content}
              controls
              playsInline
              loop
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex items-center justify-end gap-1 text-[10px] mt-1 px-2 py-0.5 rounded-full bg-black/40 text-white/90 w-fit ml-auto select-none">
            <span>{formattedTime}</span>
            {renderStatus()}
          </div>
        </div>
      ) : message.type === MessageType.STARS_TRANSFER ? (
        /* Star Transfer Card Message */
        <div className="relative max-w-sm">
          <StarTransferBubble
            content={message.content}
            senderName={message.sender?.profile?.displayName || message.sender?.username || 'User'}
            isSelf={isOutgoing}
          />
          <div className="flex items-center justify-end gap-1 text-[11px] mt-1 text-dfz-text-muted select-none">
            <span>{formattedTime}</span>
            {renderStatus()}
          </div>
        </div>
      ) : message.type === MessageType.GIFT ? (
        /* Gift Card Message */
        <div className="relative max-w-sm">
          <GiftCardBubble
            content={message.content}
            senderName={message.sender?.profile?.displayName || message.sender?.username || 'User'}
            isSelf={isOutgoing}
          />
          <div className="flex items-center justify-end gap-1 text-[11px] mt-1 text-dfz-text-muted select-none">
            <span>{formattedTime}</span>
            {renderStatus()}
          </div>
        </div>
      ) : message.type === MessageType.POLL && message.poll ? (
        /* Poll Message */
        <div className="relative max-w-sm">
          <PollBubble poll={message.poll} isOwnMessage={isOutgoing} />
          <div className="flex items-center justify-end gap-1 text-[11px] mt-1 text-dfz-text-muted select-none">
            <span>{formattedTime}</span>
            {renderStatus()}
          </div>
        </div>
      ) : (
        /* Telegram Bubble Container */
        <div
          className={`relative rounded-[16px] px-3.5 py-2 text-sm leading-relaxed transition-all shadow-sm max-w-[88%] sm:max-w-[72%] ${
            isOutgoing
              ? 'bg-[#2b5278] text-white rounded-br-[4px]'
              : 'bg-[#182533] text-white rounded-bl-[4px]'
          }`}
        >
          {/* Sender Name in Group/Channel for incoming */}
          {!isOutgoing && showAvatar && (
            <div className="text-[12px] font-semibold text-[#2481cc] mb-0.5 truncate">
              {message.sender?.profile?.displayName || message.sender?.username}
            </div>
          )}

          {/* Telegram Reply Quote preview */}
          {message.replyTo && (
            <div
              className={`border-l-[3px] border-[#2481cc] pl-2.5 py-0.5 mb-1.5 rounded-r bg-black/20 text-xs cursor-pointer ${
                isOutgoing ? 'bg-black/20' : 'bg-black/20'
              }`}
            >
              <div className="font-semibold text-[#6eb4f7] text-[11px] truncate">
                {message.replyTo.senderName || 'Сообщение'}
              </div>
              <div className="truncate text-white/80 text-[12px]">{message.replyTo.content}</div>
            </div>
          )}

          {/* Attachments */}
          {message.attachments && message.attachments.length > 0 && (
            <div className="space-y-2 mb-1.5">
              {message.attachments.map((att) => {
                if (att.mimeType.startsWith('image/')) {
                  return (
                    <div
                      key={att.id || att.url}
                      onClick={() => onOpenImage(att.url, att.originalName)}
                      className="relative cursor-pointer overflow-hidden rounded-dfz-md max-h-72 max-w-sm group/img"
                    >
                      <img
                        src={att.url}
                        alt={att.originalName}
                        className="w-full h-auto object-cover rounded-dfz-md transition-transform duration-200 group-hover/img:scale-[1.02]"
                      />
                    </div>
                  );
                }

                if (att.mimeType.startsWith('video/')) {
                  return (
                    <div key={att.id || att.url} className="rounded-dfz-md overflow-hidden max-w-sm">
                      <video controls src={att.url} className="w-full rounded-dfz-md" />
                    </div>
                  );
                }

                if (att.mimeType.startsWith('audio/') || message.type === MessageType.VOICE) {
                  return (
                    <VoicePlayer
                      key={att.id || att.url}
                      url={att.url}
                      duration={att.duration}
                      waveform={att.waveform}
                      isOutgoing={isOutgoing}
                    />
                  );
                }

                // Document / File
                return (
                  <div
                    key={att.id || att.url}
                    className={`flex items-center gap-3 p-2.5 rounded-dfz-md ${
                      isOutgoing ? 'bg-white/10' : 'bg-black/20 border border-white/10'
                    }`}
                  >
                    <div className="p-2 rounded-dfz-md bg-[#2481cc]/20 text-[#2481cc] flex-shrink-0">
                      <FileText size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{att.originalName}</p>
                      <p className="text-[11px] opacity-75">{formatFileSize(att.sizeBytes)}</p>
                    </div>
                    <a
                      href={att.url}
                      download={att.originalName}
                      target="_blank"
                      rel="noreferrer"
                      className="p-1.5 hover:bg-white/20 rounded-full transition-colors"
                    >
                      <Download size={16} />
                    </a>
                  </div>
                );
              })}
            </div>
          )}

          {/* Text Content with Inline Floating Timestamp */}
          {message.content && (
            <div className="whitespace-pre-wrap break-words leading-relaxed text-[13.5px]">
              {message.content}
              <span className="float-right ml-2.5 mt-1.5 inline-flex items-center gap-1 select-none text-[11px] leading-none text-white/60">
                {message.isEdited && <span className="text-[10px] italic opacity-70">изм.</span>}
                <span>{formattedTime}</span>
                {isOutgoing && <span className="inline-block">{renderStatus()}</span>}
              </span>
            </div>
          )}

          {/* Safe Link Preview */}
          {detectedUrl && <LinkPreviewBubble url={detectedUrl} />}
          {/* Reactions Pill List */}
          {message.reactions && message.reactions.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5 -mb-0.5">
              {message.reactions.map((r) => (
                <button
                  key={r.emoji}
                  type="button"
                  onClick={() => onReact(message.id, r.emoji)}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs transition-colors border ${
                    r.hasReacted
                      ? isOutgoing
                        ? 'bg-white/25 border-white text-white font-semibold'
                        : 'bg-dfz-accent-subtle border-dfz-accent text-dfz-accent font-semibold'
                      : isOutgoing
                      ? 'bg-black/20 border-white/20 text-white'
                      : 'bg-dfz-surface-hover border-dfz-border text-dfz-text'
                  }`}
                >
                  <span>{r.emoji}</span>
                  <span className="text-[10px] font-mono">{r.count}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Quick Reaction button on hover */}
      <div
        className={`absolute top-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 ${
          isOutgoing ? '-left-16' : '-right-16'
        }`}
      >
        <button
          type="button"
          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          className="p-1.5 rounded-full bg-dfz-surface border border-dfz-border text-dfz-text-muted hover:text-dfz-text shadow-dfz-sm transition-colors"
          title="Реакция"
        >
          <Smile size={14} />
        </button>
        <button
          type="button"
          onClick={() => onReply(message)}
          className="p-1.5 rounded-full bg-dfz-surface border border-dfz-border text-dfz-text-muted hover:text-dfz-text shadow-dfz-sm transition-colors"
          title="Ответить"
        >
          <Reply size={14} />
        </button>

        {showEmojiPicker && (
          <div className="absolute bottom-8 z-30">
            <EmojiPicker
              onSelect={(emoji) => {
                onReact(message.id, emoji);
                setShowEmojiPicker(false);
              }}
              onClose={() => setShowEmojiPicker(false)}
            />
          </div>
        )}
      </div>

      {/* Context Menu */}
      {contextMenuPos && (
        <ContextMenu
          x={contextMenuPos.x}
          y={contextMenuPos.y}
          items={contextMenuItems}
          onClose={() => setContextMenuPos(null)}
        />
      )}
      </div>
    </div>
  );
};
