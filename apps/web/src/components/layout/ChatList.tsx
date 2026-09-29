import React, { useState, useMemo } from 'react';
import { format, isToday, isYesterday } from 'date-fns';
import { ru } from 'date-fns/locale';
import {
  Menu,
  Search,
  X,
  ArrowLeft,
  Edit2,
  Pin,
  BellOff,
  MessageSquare,
  Users,
  Radio,
  Check,
  CheckCheck,
} from 'lucide-react';
import { Chat, ChatType } from '@dfz/types';
import { Avatar } from '../ui/Avatar';
import { Skeleton } from '../ui/Skeleton';
import { ContextMenu, ContextMenuItem } from '../ui/ContextMenu';
import { useChatStore, FolderFilter } from '../../stores/chatStore';
import { useAuthStore } from '../../stores/authStore';
import { StoriesStrip } from '../stories/StoriesStrip';
import { GlobalSearch } from './GlobalSearch';
import { BrandMark } from '../ui/BrandMark';

interface ChatListProps {
  onOpenMenu: () => void;
  onNewChat: () => void;
  onNewGroup: () => void;
  onNewChannel: () => void;
}

export const ChatList: React.FC<ChatListProps> = ({
  onOpenMenu,
  onNewChat,
  onNewGroup,
  onNewChannel,
}) => {
  const { user } = useAuthStore();
  const {
    chats,
    activeChatId,
    selectChat,
    activeFolder,
    setActiveFolder,
    searchQuery,
    setSearchQuery,
    isLoadingChats,
    togglePinChat,
    toggleMuteChat,
    toggleArchiveChat,
    clearChatHistory,
    deleteChat,
    markAsRead,
    typingUsers,
  } = useChatStore();

  const [isFabOpen, setIsFabOpen] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; chat: Chat } | null>(null);

  const folders: { id: FolderFilter; label: string; count?: number }[] = [
    {
      id: 'all',
      label: 'Все',
      count: chats.filter((c) => !c.isArchived).reduce((sum, c) => sum + (c.unreadCount || 0), 0),
    },
    { id: 'unread', label: 'Непрочитанные' },
    { id: 'archive', label: 'Архив' },
    {
      id: 'personal',
      label: 'Личные',
      count: chats
        .filter((c) => !c.isArchived && c.type === ChatType.DIRECT)
        .reduce((sum, c) => sum + (c.unreadCount || 0), 0),
    },
    {
      id: 'groups',
      label: 'Группы',
      count: chats
        .filter((c) => !c.isArchived && c.type === ChatType.GROUP)
        .reduce((sum, c) => sum + (c.unreadCount || 0), 0),
    },
    {
      id: 'channels',
      label: 'Каналы',
      count: chats
        .filter((c) => !c.isArchived && c.type === ChatType.CHANNEL)
        .reduce((sum, c) => sum + (c.unreadCount || 0), 0),
    },
  ];

  // Filter & sort chats
  const filteredChats = useMemo(() => {
    return chats
      .filter((chat) => {
        // Search filter
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchTitle = chat.title?.toLowerCase().includes(q);
          const matchMsg = chat.lastMessage?.content?.toLowerCase().includes(q);
          if (!matchTitle && !matchMsg) return false;
        }

        if (activeFolder === 'archive') return !!chat.isArchived;
        if (activeFolder === 'unread') return !chat.isArchived && !!chat.unreadCount;
        // Folder filter
        if (activeFolder === 'personal') return !chat.isArchived && chat.type === ChatType.DIRECT;
        if (activeFolder === 'groups') return !chat.isArchived && chat.type === ChatType.GROUP;
        if (activeFolder === 'channels') return !chat.isArchived && chat.type === ChatType.CHANNEL;
        return !chat.isArchived;
      })
      .sort((a, b) => {
        // Pinned first
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      });
  }, [chats, activeFolder, searchQuery]);

  const formatChatTimestamp = (dateStr?: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isToday(date)) return format(date, 'HH:mm', { locale: ru });
    if (isYesterday(date)) return 'Вчера';
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 7 && diffDays >= 1) {
      return format(date, 'EEEEEE', { locale: ru });
    }
    return format(date, 'd MMM', { locale: ru });
  };

  const handleChatContextMenu = (e: React.MouseEvent, chat: Chat) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, chat });
  };

  const contextMenuItems: ContextMenuItem[] = contextMenu
    ? [
        {
          id: 'read',
          label:
            contextMenu.chat.unreadCount && contextMenu.chat.unreadCount > 0
              ? 'Пометить как прочитанное'
              : 'Пометить как прочитанное',
          icon: <Check size={15} />,
          onClick: () => markAsRead(contextMenu.chat.id),
        },
        {
          id: 'pin',
          label: contextMenu.chat.isPinned ? 'Открепить' : 'Закрепить',
          icon: <Pin size={15} />,
          onClick: () => togglePinChat(contextMenu.chat.id, !contextMenu.chat.isPinned),
        },
        {
          id: 'mute',
          label: contextMenu.chat.isMuted ? 'Включить звук' : 'Без звука',
          icon: <BellOff size={15} />,
          onClick: () => toggleMuteChat(contextMenu.chat.id, !contextMenu.chat.isMuted),
        },
        {
          id: 'archive',
          label: contextMenu.chat.isArchived ? 'Извлечь из архива' : 'В архив',
          icon: <Radio size={15} />,
          onClick: () => toggleArchiveChat(contextMenu.chat.id, !contextMenu.chat.isArchived),
        },
        {
          id: 'clear',
          label: 'Очистить историю',
          icon: <X size={15} />,
          onClick: () => {
            if (confirm('Очистить историю сообщений?')) {
              clearChatHistory(contextMenu.chat.id);
            }
          },
        },
        {
          id: 'delete',
          label: contextMenu.chat.type === ChatType.DIRECT ? 'Удалить чат' : 'Покинуть чат',
          icon: <X size={15} />,
          danger: true,
          onClick: () => {
            if (confirm('Удалить этот чат?')) {
              deleteChat(contextMenu.chat.id);
            }
          },
        },
      ]
    : [];

  return (
    <div className="dfz-chat-list w-full md:w-[380px] lg:w-[420px] h-full bg-[var(--bg-surface)] border-r border-[var(--border-subtle)] flex flex-col select-none flex-shrink-0 relative overflow-hidden">
      {/* Telegram Web Top Bar: Hamburger Menu + Search */}
      <div className="p-2.5 pb-1.5 space-y-2 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)]">
        <div className="flex items-center gap-2">
          {/* Hamburger Menu Button */}
          <button
            type="button"
            onClick={onOpenMenu}
            className="w-10 h-10 rounded-full flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] transition-colors flex-shrink-0"
            title="Главное меню"
          >
            <Menu size={22} />
          </button>

          {/* Telegram Rounded Search Input */}
          <div className="relative flex-1 flex items-center">
            {searchQuery ? (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute left-3 p-1 rounded-full text-[var(--accent-primary)] hover:text-[var(--accent-hover)] transition-colors z-10"
                title="Назад"
              >
                <ArrowLeft size={16} />
              </button>
            ) : (
              <Search size={16} className="absolute left-3.5 text-[var(--text-tertiary)] pointer-events-none" />
            )}
            <input
              type="text"
              data-global-search
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Поиск пользователей и сообщений"
              placeholder="Поиск"
              className="w-full h-10 pl-10 pr-8 bg-[var(--bg-surface-secondary)] border border-transparent focus:border-[var(--accent-primary)] rounded-full text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 p-1 rounded-full text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Telegram Folder Tabs with Unread Count Badges */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 no-scrollbar pt-0.5">
          {folders.map((f) => {
            const isActive = activeFolder === f.id;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => setActiveFolder(f.id)}
                className={`relative px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-[var(--accent-primary)] text-white shadow-sm'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)]'
                }`}
              >
                <span>{f.label}</span>
                {f.count !== undefined && f.count > 0 && (
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                      isActive ? 'bg-white/25 text-white' : 'bg-[var(--accent-primary)] text-white'
                    }`}
                  >
                    {f.count > 99 ? '99+' : f.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {searchQuery.trim() ? (
        <GlobalSearch query={searchQuery} />
      ) : (
        <>
          {/* 24-hour Stories Strip */}
          <StoriesStrip />

          {/* Telegram Chat List Body */}
          <div className="flex-1 overflow-y-auto">
        {isLoadingChats && chats.length === 0 ? (
          <div className="p-3 space-y-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="flex items-center gap-3 px-2">
                <Skeleton className="w-12 h-12 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="w-32 h-4 rounded" />
                  <Skeleton className="w-48 h-3 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredChats.length === 0 ? (
          <div className="p-12 text-center text-xs text-dfz-text-muted">
            Чаты не найдены
          </div>
        ) : (
          filteredChats.map((chat) => {
            const isActive = chat.id === activeChatId;
            const typing = typingUsers[chat.id];
            const isLastMessageMine =
              chat.lastMessage?.senderId === user?.id ||
              chat.lastMessage?.senderName === user?.username;

            return (
              <div
                key={chat.id}
                onClick={() => selectChat(chat.id)}
                onContextMenu={(e) => handleChatContextMenu(e, chat)}
                role="button" tabIndex={0} aria-current={isActive} onKeyDown={e => { if(e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectChat(chat.id); } }}
                className={`dfz-chat-row flex items-center gap-3 px-3 py-3 cursor-pointer transition-colors relative ${
                  isActive
                    ? 'bg-[var(--bg-surface-active)] text-dfz-text'
                    : 'hover:bg-dfz-surface-hover/80 text-dfz-text'
                }`}
              >
                {/* 52px Telegram Avatar with Online Badge */}
                <Avatar
                  src={chat.avatarUrl}
                  name={chat.title || 'Chat'}
                  size="md"
                  isOnline={
                    chat.type === ChatType.DIRECT &&
                    chat.members?.some((m) => m.userId !== user?.id && !!(m as any).isOnline)
                  }
                />

                {/* Content preview */}
                <div className="flex-1 min-w-0 pr-1">
                  {/* Top Line: Title + Timestamp */}
                  <div className="flex items-center justify-between gap-1 mb-0.5">
                    <div className="flex items-center gap-1.5 min-w-0 truncate">
                      {chat.type === ChatType.CHANNEL && (
                        <Radio size={14} className="text-[var(--accent-primary)] flex-shrink-0" />
                      )}
                      {chat.type === ChatType.GROUP && (
                        <Users size={14} className="text-dfz-text-muted flex-shrink-0" />
                      )}
                      <span className="text-sm font-semibold truncate">
                        {chat.title || 'Чат'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 flex-shrink-0">
                      {isLastMessageMine && (
                        <span className="text-[var(--accent-text)]">
                          <Check size={14} />
                        </span>
                      )}
                      <span
                        className={`text-[11px] font-mono ${
                          'text-dfz-text-muted'
                        }`}
                      >
                        {formatChatTimestamp(chat.lastMessage?.createdAt || chat.updatedAt)}
                      </span>
                    </div>
                  </div>

                  {/* Bottom Line: Sender + Message preview + Status Badges */}
                  <div className="flex items-center justify-between gap-2">
                    <p
                      className={`text-xs truncate ${
                        'text-dfz-text-muted'
                      }`}
                    >
                      {typing && typing.length > 0 ? (
                        <span className="text-[var(--accent-primary)] font-medium italic animate-pulse">
                          {typing.join(', ')} печатает...
                        </span>
                      ) : chat.lastMessage ? (
                        <span>
                          {isLastMessageMine ? (
                            <span className="font-semibold text-dfz-text mr-1">Вы:</span>
                          ) : (
                            chat.lastMessage.senderName &&
                            chat.type !== ChatType.DIRECT && (
                              <span className="font-semibold text-dfz-text mr-1">
                                {chat.lastMessage.senderName}:
                              </span>
                            )
                          )}
                          {chat.lastMessage.type === 'GIFT'
                            ? '🎁 Подарок'
                            : chat.lastMessage.type === 'STARS_TRANSFER'
                            ? '⭐️ Перевод Stars'
                            : chat.lastMessage.type === 'VOICE'
                            ? '🎤 Голосовое сообщение'
                            : chat.lastMessage.type === 'STICKER'
                            ? '🖼️ Стикер'
                            : chat.lastMessage.type === 'POLL'
                            ? '📊 Опрос'
                            : chat.lastMessage.content || 'Файл'}
                        </span>
                      ) : (
                        <span className="italic opacity-60">Нет сообщений</span>
                      )}
                    </p>

                    {/* Right Badges: Pin, Mute, Unread Count */}
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {chat.isMuted && (
                        <BellOff
                          size={13}
                          className={'text-dfz-text-muted'}
                        />
                      )}
                      {chat.isPinned && (
                        <Pin
                          size={13}
                          className="text-[var(--accent-primary)] rotate-45"
                        />
                      )}
                      {(chat.unreadCount || 0) > 0 && (
                        <span
                          className={`min-w-[20px] h-5 px-1.5 rounded-full flex items-center justify-center text-[11px] font-bold ${
                            chat.isMuted
                              ? 'bg-dfz-border text-dfz-text-muted'
                              : 'bg-[var(--accent-primary)] text-white'
                          }`}
                        >
                          {chat.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </>
  )}

      {/* Telegram Floating Action Button (FAB) (✏️ Pencil Button) */}
      {!searchQuery.trim() && (
        <div className="absolute bottom-5 right-5 z-20">
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsFabOpen(!isFabOpen)}
              className="w-13 h-13 p-3.5 rounded-full bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] text-white shadow-xl flex items-center justify-center transition-all hover:scale-105 active:scale-95"
              title="Создать чат"
            >
              <Edit2 size={22} />
            </button>

            {/* Telegram FAB Popup Menu */}
            {isFabOpen && (
              <>
                <div
                  onClick={() => setIsFabOpen(false)}
                  className="fixed inset-0 z-30"
                />
                <div className="absolute right-0 bottom-16 w-52 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl shadow-2xl py-1.5 z-40 animate-scale-in text-xs font-semibold text-[var(--text-primary)]">
                  <button
                    type="button"
                    onClick={() => {
                      setIsFabOpen(false);
                      onNewChat();
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[var(--bg-surface-hover)] text-left transition-colors"
                  >
                    <MessageSquare size={17} className="text-[var(--accent-primary)]" />
                    <span>Новый диалог</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsFabOpen(false);
                      onNewGroup();
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[var(--bg-surface-hover)] text-left transition-colors"
                  >
                    <Users size={17} className="text-[var(--accent-primary)]" />
                    <span>Создать группу</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsFabOpen(false);
                      onNewChannel();
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[var(--bg-surface-hover)] text-left transition-colors"
                  >
                    <Radio size={17} className="text-[var(--accent-primary)]" />
                    <span>Создать канал</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Context Menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={contextMenuItems}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  );
};
