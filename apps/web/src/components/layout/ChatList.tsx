import React, { useState, useMemo } from 'react';
import { format, isToday, isYesterday } from 'date-fns';
import { ru } from 'date-fns/locale';
import {
  Menu,
  Search,
  X,
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
    typingUsers,
  } = useChatStore();

  const [isFabOpen, setIsFabOpen] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; chat: Chat } | null>(null);

  const folders: { id: FolderFilter; label: string; count?: number }[] = [
    {
      id: 'all',
      label: 'Все',
      count: chats.reduce((sum, c) => sum + (c.unreadCount || 0), 0),
    },
    {
      id: 'personal',
      label: 'Личные',
      count: chats
        .filter((c) => c.type === ChatType.DIRECT)
        .reduce((sum, c) => sum + (c.unreadCount || 0), 0),
    },
    {
      id: 'groups',
      label: 'Группы',
      count: chats
        .filter((c) => c.type === ChatType.GROUP)
        .reduce((sum, c) => sum + (c.unreadCount || 0), 0),
    },
    {
      id: 'channels',
      label: 'Каналы',
      count: chats
        .filter((c) => c.type === ChatType.CHANNEL)
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

        // Folder filter
        if (activeFolder === 'personal') return chat.type === ChatType.DIRECT;
        if (activeFolder === 'groups') return chat.type === ChatType.GROUP;
        if (activeFolder === 'channels') return chat.type === ChatType.CHANNEL;
        return true;
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
    return format(date, 'd MMM', { locale: ru });
  };

  const handleChatContextMenu = (e: React.MouseEvent, chat: Chat) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, chat });
  };

  const contextMenuItems: ContextMenuItem[] = contextMenu
    ? [
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
      ]
    : [];

  return (
    <div className="w-full md:w-[380px] lg:w-[410px] h-full bg-dfz-surface border-r border-dfz-border flex flex-col select-none flex-shrink-0 relative overflow-hidden">
      {/* Telegram Top Header: Hamburger Menu + Search */}
      <div className="p-2.5 pb-1 space-y-2 border-b border-dfz-border/80">
        <div className="flex items-center gap-2">
          {/* Hamburger Menu Button */}
          <button
            type="button"
            onClick={onOpenMenu}
            className="p-2 rounded-full text-dfz-text-muted hover:text-dfz-text hover:bg-dfz-surface-hover transition-colors flex-shrink-0"
            title="Главное меню"
          >
            <Menu size={22} />
          </button>

          {/* Telegram Rounded Search Input */}
          <div className="relative flex-1 flex items-center">
            <Search size={16} className="absolute left-3.5 text-dfz-text-muted pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Поиск"
              className="w-full h-9 pl-10 pr-8 bg-dfz-bg border border-dfz-border/60 rounded-full text-xs text-dfz-text placeholder:text-dfz-text-muted focus:outline-none focus:border-[#2481cc] transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 p-1 rounded-full text-dfz-text-muted hover:text-dfz-text"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Telegram Folder Tabs with Unread Count Badges */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 no-scrollbar pt-1">
          {folders.map((f) => {
            const isActive = activeFolder === f.id;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => setActiveFolder(f.id)}
                className={`relative px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-[#2481cc] text-white shadow-sm'
                    : 'text-dfz-text-muted hover:text-dfz-text hover:bg-dfz-surface-hover'
                }`}
              >
                <span>{f.label}</span>
                {f.count !== undefined && f.count > 0 && (
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                      isActive ? 'bg-white/25 text-white' : 'bg-[#2481cc] text-white'
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
                className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors relative ${
                  isActive
                    ? 'bg-[#2b5278] text-white'
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
                    chat.members?.some((m) => m.userId !== user?.id && !!m.lastSeenAt)
                  }
                />

                {/* Content preview */}
                <div className="flex-1 min-w-0 pr-1">
                  {/* Top Line: Title + Timestamp */}
                  <div className="flex items-center justify-between gap-1 mb-0.5">
                    <div className="flex items-center gap-1.5 min-w-0 truncate">
                      {chat.type === ChatType.CHANNEL && (
                        <Radio size={14} className="text-[#2481cc] flex-shrink-0" />
                      )}
                      {chat.type === ChatType.GROUP && (
                        <Users size={14} className="text-dfz-text-muted flex-shrink-0" />
                      )}
                      <span className="text-xs font-bold truncate">
                        {chat.title || 'Чат'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 flex-shrink-0">
                      {isLastMessageMine && (
                        <span className="text-[#6eb4f7]">
                          <CheckCheck size={14} />
                        </span>
                      )}
                      <span
                        className={`text-[11px] font-mono ${
                          isActive ? 'text-white/80' : 'text-dfz-text-muted'
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
                        isActive ? 'text-white/90' : 'text-dfz-text-muted'
                      }`}
                    >
                      {typing && typing.length > 0 ? (
                        <span className="text-[#2481cc] font-medium italic animate-pulse">
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
                          className={isActive ? 'text-white/70' : 'text-dfz-text-muted'}
                        />
                      )}
                      {chat.isPinned && (
                        <Pin
                          size={13}
                          className="text-[#2481cc] rotate-45"
                        />
                      )}
                      {(chat.unreadCount || 0) > 0 && (
                        <span
                          className={`min-w-[20px] h-5 px-1.5 rounded-full flex items-center justify-center text-[11px] font-bold ${
                            chat.isMuted
                              ? 'bg-dfz-border text-dfz-text-muted'
                              : 'bg-[#2481cc] text-white'
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

      {/* Telegram Floating Action Button (FAB) (✏️ Pencil Button) */}
      <div className="absolute bottom-5 right-5 z-20">
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsFabOpen(!isFabOpen)}
            className="w-13 h-13 p-3.5 rounded-full bg-[#2481cc] hover:bg-[#1c74b8] text-white shadow-xl flex items-center justify-center transition-all hover:scale-105 active:scale-95"
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
              <div className="absolute right-0 bottom-16 w-52 bg-dfz-surface border border-dfz-border rounded-dfz-xl shadow-2xl py-1.5 z-40 animate-scale-in text-xs font-semibold text-dfz-text">
                <button
                  type="button"
                  onClick={() => {
                    setIsFabOpen(false);
                    onNewChat();
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-dfz-surface-hover text-left transition-colors"
                >
                  <MessageSquare size={17} className="text-[#2481cc]" />
                  <span>Новый диалог</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsFabOpen(false);
                    onNewGroup();
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-dfz-surface-hover text-left transition-colors"
                >
                  <Users size={17} className="text-[#2481cc]" />
                  <span>Создать группу</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsFabOpen(false);
                    onNewChannel();
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-dfz-surface-hover text-left transition-colors"
                >
                  <Radio size={17} className="text-[#2481cc]" />
                  <span>Создать канал</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>

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
