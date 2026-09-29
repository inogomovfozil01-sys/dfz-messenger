import React, { useState } from 'react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Check, CheckCheck, Clock, AlertCircle, FileText, Download, Smile, Reply, Edit3, Trash2, Copy, Pin, Share2, CheckSquare, Square, Flag, Shield } from 'lucide-react';
import { Message, MessageType } from '@dfz/types';
import { Avatar } from '../ui/Avatar';
import { VoicePlayer } from './VoicePlayer';
import { ContextMenu, ContextMenuItem } from '../ui/ContextMenu';
import { EmojiPicker } from './EmojiPicker';
import { PollBubble } from './PollBubble';
import { LinkPreviewBubble } from './LinkPreviewBubble';
import { StarTransferBubble } from './StarTransferBubble';
import { GiftCardBubble } from './GiftCardBubble';
import { LocationBubble } from './LocationBubble';
import { useChatStore } from '../../stores/chatStore';
import { useAuthStore } from '../../stores/authStore';
import { useEconomyStore } from '../../stores/economyStore';
import { ReportModal } from '../modals/ReportModal';

const renderFormattedContent = (content: string) => {
  const regex = /(https?:\/\/[^\s]+)|(#[a-zA-Z0-9_а-яА-ЯёЁ]+)|(@[a-zA-Z0-9_]+)/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push(content.substring(lastIndex, match.index));
    }
    const token = match[0];
    if (token.startsWith('http://') || token.startsWith('https://')) {
      parts.push(
        <a
          key={match.index}
          href={token}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sky-300 hover:underline break-all"
          onClick={(e) => e.stopPropagation()}
        >
          {token}
        </a>
      );
    } else if (token.startsWith('#')) {
      parts.push(
        <span
          key={match.index}
          onClick={(e) => {
            e.stopPropagation();
            useChatStore.getState().setSearchQuery(token);
          }}
          className="text-sky-300 hover:underline cursor-pointer font-medium"
        >
          {token}
        </span>
      );
    } else if (token.startsWith('@')) {
      parts.push(
        <span
          key={match.index}
          onClick={(e) => {
            e.stopPropagation();
            useChatStore.getState().setSearchQuery(token);
          }}
          className="text-sky-300 hover:underline cursor-pointer font-medium"
        >
          {token}
        </span>
      );
    }
    lastIndex = match.index + token.length;
  }
  if (lastIndex < content.length) {
    parts.push(content.substring(lastIndex));
  }
  return parts;
};

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
  const [reportOpen,setReportOpen]=useState(false);
  const {
    activeChat,
    pinMessage,
    unpinMessage,
    openForward,
    isSelectMode,
    selectedMessageIds,
    toggleSelectMessage,
  } = useChatStore();
  const { user: currentUser } = useAuthStore();
  const { setAdminQuickActionOpen } = useEconomyStore();
  const isSystemAdmin = currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPERADMIN';

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
            onClick: () => setReportOpen(true),
          },
        ]
      : []),
    ...(isSystemAdmin && !isOutgoing
      ? [
          {
            id: 'admin_actions',
            label: 'Админ: Управление пользователем',
            icon: <Shield size={15} className="text-rose-400" />,
            onClick: () => setAdminQuickActionOpen(true, message.senderId),
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
      <ReportModal targetId={reportOpen ? message.id : null} targetType="MESSAGE" onClose={()=>setReportOpen(false)} />
      {isSelectMode && (
        <div className="flex-shrink-0">
          {isSelected ? (
            <CheckSquare size={18} className="text-[var(--accent-primary)]" />
          ) : (
            <Square size={18} className="text-dfz-text-muted" />
          )}
        </div>
      )}

      <div
        id={'msg-' + message.id}
        onContextMenu={handleContextMenu}
        className={`group relative flex gap-2.5 my-1 max-w-[88%] md:max-w-[65%] select-text animate-message-in ${
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
      ) : message.type === ('LOCATION' as any) || (message.content && message.content.startsWith('📍')) ? (
        /* Location Message */
        <div className="relative max-w-sm">
          <LocationBubble
            metadata={(message as any).metadata?.location || (message as any).metadata}
            content={message.content}
            isOutgoing={isOutgoing}
          />
          <div className="flex items-center justify-end gap-1 text-[11px] mt-1 text-dfz-text-muted select-none">
            <span>{formattedTime}</span>
            {renderStatus()}
          </div>
        </div>
      ) : (
        /* Telegram Bubble Container */
        <div
          className={`relative rounded-xl px-3.5 py-2 text-[15px] leading-[1.5] transition-colors max-w-full ${
            isOutgoing
              ? 'bg-[var(--bubble-outgoing)] text-[var(--bubble-outgoing-text)] rounded-br-[6px]'
              : 'bg-[var(--bubble-incoming)] text-[var(--bubble-incoming-text)] rounded-bl-[6px]'
          }`}
        >
          {/* Sender Name in Group/Channel for incoming */}
          {!isOutgoing && showAvatar && (
            <div className="text-[12px] font-semibold text-[var(--accent-primary)] mb-0.5 truncate">
              {message.sender?.profile?.displayName || message.sender?.username}
            </div>
          )}

          {/* Telegram Reply Quote preview */}
          {message.replyTo && (
            <div
              className={`border-l-[3px] border-[var(--accent-primary)] pl-2.5 py-0.5 mb-1.5 rounded-r bg-black/20 text-xs cursor-pointer ${
                isOutgoing ? 'bg-black/20' : 'bg-black/20'
              }`}
            >
              <div className="font-semibold text-[var(--accent-text)] text-[11px] truncate">
                {message.replyTo.senderName || 'Сообщение'}
              </div>
              <div className="truncate text-[var(--text-secondary)] text-[12px]">{message.replyTo.content}</div>
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
                    <div className="p-2 rounded-dfz-md bg-[var(--accent-primary)]/20 text-[var(--accent-primary)] flex-shrink-0">
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
              {renderFormattedContent(message.content)}
              <span className="float-right ml-2.5 mt-1.5 inline-flex items-center gap-1 select-none text-[11px] leading-none text-white/60">
                {message.isEdited && <span className="text-[10px] italic opacity-70">изм.</span>}
                <span>{formattedTime}</span>
                {isOutgoing && <span className="inline-block">{renderStatus()}</span>}
              </span>
            </div>
          )}

          {/* Safe Link Preview */}
          {detectedUrl && <LinkPreviewBubble url={detectedUrl} />}

          {/* Bot Inline Keyboard Buttons */}
          {(message as any).metadata?.inlineButtons && (
            <div className="flex flex-col gap-1.5 mt-2.5 w-full">
              {((message as any).metadata.inlineButtons as any[]).map((row: any[], rowIdx: number) => (
                <div key={rowIdx} className="flex gap-1.5 w-full">
                  {row.map((btn: any, btnIdx: number) => (
                    <button
                      key={btnIdx}
                      type="button"
                      onClick={() => {
                        if (btn.url) {
                          window.open(btn.url, '_blank');
                        } else if (btn.callbackData) {
                          useChatStore.getState().sendMessage(btn.text);
                        }
                      }}
                      className="flex-1 py-1.5 px-3 rounded-lg bg-[var(--accent-primary)]/15 hover:bg-[var(--accent-primary)]/25 text-[var(--accent-primary)] border border-[var(--accent-primary)]/30 text-xs font-semibold transition-all text-center truncate"
                    >
                      {btn.text}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          )}

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
