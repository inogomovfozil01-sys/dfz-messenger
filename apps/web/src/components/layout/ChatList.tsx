import React, { useState, useMemo } from 'react';
import { format, isToday, isYesterday } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Search, Plus, Pin, BellOff, MessageSquare, Users, Radio } from 'lucide-react';
import { Chat, ChatType } from '@dfz/types';
import { Avatar } from '../ui/Avatar';
import { Badge } from '../ui/Badge';
import { Skeleton } from '../ui/Skeleton';
import { ContextMenu, ContextMenuItem } from '../ui/ContextMenu';
import { useChatStore, FolderFilter } from '../../stores/chatStore';

interface ChatListProps {
  onNewChat: () => void;
  onNewGroup: () => void;
  onNewChannel: () => void;
}

export const ChatList: React.FC<ChatListProps> = ({
  onNewChat,
  onNewGroup,
  onNewChannel,
}) => {
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

  const [showPlusMenu, setShowPlusMenu] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; chat: Chat } | null>(null);

  const folders: { id: FolderFilter; label: string }[] = [
    { id: 'all', label: 'Все' },
    { id: 'personal', label: 'Личные' },
    { id: 'groups', label: 'Группы' },
    { id: 'channels', label: 'Каналы' },
    { id: 'unread', label: 'Новые' },
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
        if (activeFolder === 'unread') return (chat.unreadCount || 0) > 0;
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
    <div className="w-full md:w-80 lg:w-96 h-full bg-dfz-surface border-r border-dfz-border flex flex-col select-none flex-shrink-0">
      {/* Top Header & Search */}
      <div className="p-3 pb-2 space-y-2.5 border-b border-dfz-border">
        <div className="flex items-center justify-between">
          <h1 className="text-base font-bold text-dfz-text tracking-tight">DFZ Messenger</h1>
          {/* New Chat Dropdown Button */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowPlusMenu(!showPlusMenu)}
              className="p-1.5 rounded-dfz-md bg-dfz-accent text-white hover:bg-dfz-accent-hover shadow-dfz-sm transition-colors"
              title="Создать чат"
            >
              <Plus size={18} />
            </button>

            {showPlusMenu && (
              <div
                className="absolute right-0 top-9 w-44 bg-dfz-surface border border-dfz-border rounded-dfz-lg shadow-dfz-dropdown py-1 z-40 animate-scale-in"
                onClick={() => setShowPlusMenu(false)}
              >
                <button
                  type="button"
                  onClick={onNewChat}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-dfz-text hover:bg-dfz-surface-hover text-left"
                >
                  <MessageSquare size={16} className="text-dfz-accent" />
                  <span>Новый диалог</span>
                </button>
                <button
                  type="button"
                  onClick={onNewGroup}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-dfz-text hover:bg-dfz-surface-hover text-left"
                >
                  <Users size={16} className="text-dfz-accent" />
                  <span>Новая группа</span>
                </button>
                <button
                  type="button"
                  onClick={onNewChannel}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-dfz-text hover:bg-dfz-surface-hover text-left"
                >
                  <Radio size={16} className="text-dfz-accent" />
                  <span>Новый канал</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Search Input */}
        <div className="relative flex items-center">
          <Search size={16} className="absolute left-3 text-dfz-text-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Поиск..."
            className="w-full h-9 pl-9 pr-3 bg-dfz-bg border border-dfz-border rounded-dfz-lg text-xs text-dfz-text placeholder:text-dfz-text-muted focus:outline-none focus:border-dfz-border-focus transition-colors"
          />
        </div>

        {/* Folders Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-0.5 no-scrollbar">
          {folders.map((f) => {
            const isActive = activeFolder === f.id;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => setActiveFolder(f.id)}
                className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                  isActive
                    ? 'bg-dfz-accent text-white shadow-dfz-sm'
                    : 'text-dfz-text-muted hover:text-dfz-text hover:bg-dfz-surface-hover'
                }`}
              >
                {f.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Chat List Body */}
      <div className="flex-1 overflow-y-auto divide-y divide-dfz-border/40">
        {isLoadingChats && chats.length === 0 ? (
          <div className="p-3 space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="w-12 h-12 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="w-28 h-4 rounded" />
                  <Skeleton className="w-44 h-3 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredChats.length === 0 ? (
          <div className="p-8 text-center text-xs text-dfz-text-muted">
            Чаты не найдены
          </div>
        ) : (
          filteredChats.map((chat) => {
            const isActive = chat.id === activeChatId;
            const typing = typingUsers[chat.id];

            return (
              <div
                key={chat.id}
                onClick={() => selectChat(chat.id)}
                onContextMenu={(e) => handleChatContextMenu(e, chat)}
                className={`flex items-center gap-3 p-3 cursor-pointer transition-colors ${
                  isActive
                    ? 'bg-dfz-accent/15 border-l-4 border-dfz-accent'
                    : 'hover:bg-dfz-surface-hover'
                }`}
              >
                {/* Chat Avatar */}
                <Avatar
                  src={chat.avatarUrl}
                  name={chat.title || 'Chat'}
                  size="md"
                  isOnline={chat.type === ChatType.DIRECT && chat.members?.some((m) => !!m.lastSeenAt)}
                />

                {/* Info & Last message snippet */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1 mb-0.5">
                    <span className="text-xs font-semibold text-dfz-text truncate">
                      {chat.title || 'Чат'}
                    </span>
                    <span className="text-[11px] text-dfz-text-muted flex-shrink-0 font-mono">
                      {formatChatTimestamp(chat.lastMessage?.createdAt || chat.updatedAt)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs text-dfz-text-muted truncate">
                      {typing && typing.length > 0 ? (
                        <span className="text-dfz-accent italic">
                          {typing.join(', ')} печатает...
                        </span>
                      ) : chat.lastMessage ? (
                        <span>
                          {chat.lastMessage.senderName && chat.type !== ChatType.DIRECT && (
                            <span className="font-medium text-dfz-text">
                              {chat.lastMessage.senderName}:{' '}
                            </span>
                          )}
                          {chat.lastMessage.content || 'Файл'}
                        </span>
                      ) : (
                        <span className="italic opacity-60">Нет сообщений</span>
                      )}
                    </p>

                    {/* Indicators (Pin, Mute, Unread) */}
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {chat.isMuted && (
                        <BellOff size={13} className="text-dfz-text-muted" />
                      )}
                      {chat.isPinned && (
                        <Pin size={13} className="text-dfz-accent rotate-45" />
                      )}
                      {(chat.unreadCount || 0) > 0 && (
                        <Badge variant="accent">{chat.unreadCount}</Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
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
