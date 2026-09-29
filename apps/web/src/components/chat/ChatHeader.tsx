import React, { useState } from 'react';
import {
  ArrowLeft,
  Phone,
  Video,
  Search,
  MoreVertical,
  Info,
  Pin,
  X,
  Trash2,
  Share2,
  ChevronDown,
  Bell,
  BellOff,
  Settings,
} from 'lucide-react';
import { Chat, ChatType, CallType, MemberRole } from '@dfz/types';
import { Avatar } from '../ui/Avatar';
import { useCallStore } from '../../stores/callStore';
import { useAuthStore } from '../../stores/authStore';
import { useChatStore } from '../../stores/chatStore';

interface ChatHeaderProps {
  chat: Chat;
  onBackMobile: () => void;
  onToggleInfo: () => void;
  onToggleSearch?: () => void;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  chat,
  onBackMobile,
  onToggleInfo,
}) => {
  const { user } = useAuthStore();
  const { startCall } = useCallStore();
  const {
    isSearchingInChat,
    inChatSearchQuery,
    inChatSearchResults,
    toggleSearchInChat,
    searchInChat,
    unpinMessage,
    isSelectMode,
    selectedMessageIds,
    clearSelectedMessages,
    bulkDeleteMessages,
    toggleMuteChat,
    clearChatHistory,
    deleteChat,
    setGroupManageChat,
    setChannelManageChat,
  } = useChatStore();

  const [activePinIndex, setActivePinIndex] = useState(0);
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  const otherMember =
    chat.type === ChatType.DIRECT
      ? chat.members.find((m) => m.userId !== user?.id)
      : null;

  const isOwnerOrAdmin = chat.members?.some(
    (m) => m.userId === user?.id && (m.role === MemberRole.OWNER || m.role === MemberRole.ADMIN)
  );

  const pinnedList = chat.pinnedMessages || [];
  const currentPinned = pinnedList[activePinIndex % (pinnedList.length || 1)];

  const handleStartAudioCall = () => {
    if (otherMember) {
      startCall(
        chat.id,
        otherMember.userId,
        otherMember.displayName || otherMember.username || 'User',
        CallType.AUDIO
      );
    }
  };

  const handleStartVideoCall = () => {
    if (otherMember) {
      startCall(
        chat.id,
        otherMember.userId,
        otherMember.displayName || otherMember.username || 'User',
        CallType.VIDEO
      );
    }
  };

  const connectionStatus = useChatStore((s) => s.connectionStatus);

  const handleCyclePin = () => {
    if (currentPinned) {
      const el = document.getElementById('msg-' + currentPinned.id);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
    if (pinnedList.length > 1) {
      setActivePinIndex((prev) => (prev + 1) % pinnedList.length);
    }
  };

  const handleUnpin = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentPinned) {
      unpinMessage(chat.id, currentPinned.id);
    }
  };

  const renderSubtitle = () => {
    if (connectionStatus === 'connecting') return 'Подключение...';
    if (connectionStatus === 'updating') return 'Обновление...';
    if (connectionStatus === 'offline') return 'Ожидание сети...';

    if (chat.type === ChatType.DIRECT) {
      if ((chat as any).isBot) return 'бот';
      return (otherMember as any)?.isOnline ? 'В сети' : otherMember?.lastSeenAt ? `Был(а) ${new Date(otherMember.lastSeenAt).toLocaleString('ru')}` : 'Статус скрыт';
    }
    if (chat.type === ChatType.GROUP) {
      return `${chat.members?.length || 1} участников`;
    }
    if (chat.type === ChatType.CHANNEL) {
      return `${chat.members?.length || 1} подписчиков`;
    }
    return 'Личное облако';
  };

  // If in multi-select mode, render select bar
  if (isSelectMode) {
    return (
      <div className="flex items-center justify-between h-14 px-4 bg-[#19232e] border-b border-dfz-border select-none z-10 flex-shrink-0 animate-fade-in">
        <div className="flex items-center gap-3">
          <button
            onClick={clearSelectedMessages}
            className="p-1 text-dfz-text-muted hover:text-dfz-text rounded-full hover:bg-dfz-surface transition-colors"
            title="Отмена"
          >
            <X size={18} />
          </button>
          <span className="text-xs font-semibold text-dfz-text">
            Выбрано: {selectedMessageIds.length}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button className="text-xs p-2" onClick={() => { const state=useChatStore.getState(); const selected=(state.messages[chat.id] || []).filter(m=>selectedMessageIds.includes(m.id)); void navigator.clipboard.writeText(selected.map(m=>m.content).join('\n')); }}>Копировать</button>
          <button className="text-xs p-2" onClick={() => { const state=useChatStore.getState(); const selected=(state.messages[chat.id] || []).find(m=>selectedMessageIds.includes(m.id)); if(selected) state.openForward(selected); }}><Share2 size={16} /></button>
          <button
            onClick={bulkDeleteMessages}
            disabled={selectedMessageIds.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-dfz-md bg-dfz-danger/15 text-dfz-danger hover:bg-dfz-danger/25 text-xs font-semibold transition-colors disabled:opacity-40"
          >
            <Trash2 size={14} />
            <span>Удалить</span>
          </button>
        </div>
      </div>
    );
  }

  // If searching in chat, render in-chat search bar
  if (isSearchingInChat) {
    return (
      <div className="flex items-center justify-between h-[58px] px-3 sm:px-4 bg-[var(--bg-surface)] border-b border-[var(--border-subtle)] select-none z-10 flex-shrink-0 animate-fade-in">
        <div className="flex items-center gap-2 flex-1 min-w-0 mr-3">
          <Search size={16} className="text-[var(--text-tertiary)] flex-shrink-0" />
          <input
            type="text"
            autoFocus
            value={inChatSearchQuery}
            onChange={(e) => searchInChat(e.target.value)}
            placeholder="Поиск сообщений в этом чате..."
            className="w-full h-8 px-2 bg-transparent text-xs text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {inChatSearchQuery && (
            <span className="text-[11px] text-[var(--text-secondary)] font-medium">
              Найдено: {inChatSearchResults.length}
            </span>
          )}
          <button
            onClick={toggleSearchInChat}
            className="p-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-full hover:bg-[var(--bg-surface-hover)] transition-colors"
            title="Закрыть поиск"
          >
            <X size={18} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col bg-[var(--bg-surface)] border-b border-[var(--border-subtle)] select-none z-10 flex-shrink-0">
      <div className="flex items-center justify-between h-[58px] px-3 sm:px-4">
        <div className="flex items-center gap-3 min-w-0">
          {/* Mobile Back Button */}
          <button
            type="button"
            onClick={onBackMobile}
            className="p-1.5 -ml-1 text-dfz-text-muted hover:text-dfz-text rounded-full hover:bg-dfz-surface-hover md:hidden transition-colors"
            title="Назад"
          >
            <ArrowLeft size={20} />
          </button>

          {/* Chat Avatar */}
          <div onClick={onToggleInfo} className="cursor-pointer">
            <Avatar
              src={chat.avatarUrl}
              name={chat.title || 'Chat'}
              size="md"
              isOnline={chat.type === ChatType.DIRECT && !!otherMember?.lastSeenAt}
            />
          </div>

          {/* Chat Title & Subtitle */}
          <div onClick={onToggleInfo} className="flex-1 min-w-0 cursor-pointer">
            <h2 className="text-sm font-semibold text-dfz-text truncate leading-tight">
              {chat.title || 'Чат'}
            </h2>
            <p className="text-xs text-dfz-text-muted truncate leading-tight mt-0.5">
              {renderSubtitle()}
            </p>
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-1 relative">
          {/* In-chat search */}
          <button
            type="button"
            onClick={toggleSearchInChat}
            className="p-2 text-dfz-text-muted hover:text-dfz-text hover:bg-dfz-surface-hover rounded-full transition-colors"
            title="Поиск в чате"
          >
            <Search size={18} />
          </button>

          {/* Audio & Video Calls (available for 1-to-1 chats) */}
          {chat.type === ChatType.DIRECT && (
            <>
              <button
                type="button"
                onClick={handleStartAudioCall}
                className="p-2 text-dfz-text-muted hover:text-dfz-text hover:bg-dfz-surface-hover rounded-full transition-colors"
                title="Аудиозвонок"
              >
                <Phone size={18} />
              </button>
              <button
                type="button"
                onClick={handleStartVideoCall}
                className="p-2 text-dfz-text-muted hover:text-dfz-text hover:bg-dfz-surface-hover rounded-full transition-colors"
                title="Видеозвонок"
              >
                <Video size={18} />
              </button>
            </>
          )}

          {/* Info panel toggle */}
          <button
            type="button"
            onClick={onToggleInfo}
            className="p-2 text-dfz-text-muted hover:text-dfz-text hover:bg-dfz-surface-hover rounded-full transition-colors"
            title="Информация о чате"
          >
            <Info size={18} />
          </button>

          {/* More Menu Dropdown Toggle */}
          <button
            type="button"
            onClick={() => setShowMoreMenu(!showMoreMenu)}
            className="p-2 text-dfz-text-muted hover:text-dfz-text hover:bg-dfz-surface-hover rounded-full transition-colors"
            title="Ещё"
          >
            <MoreVertical size={18} />
          </button>

          {/* Dropdown Menu */}
          {showMoreMenu && (
            <div
              className="absolute right-0 top-12 w-48 bg-dfz-surface border border-dfz-border rounded-dfz-lg shadow-dfz-dropdown py-1.5 z-50 text-xs font-medium text-dfz-text animate-scale-in"
              onMouseLeave={() => setShowMoreMenu(false)}
            >
              <button
                onClick={() => {
                  setShowMoreMenu(false);
                  toggleMuteChat(chat.id, !chat.isMuted);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-dfz-surface-hover text-left transition-colors"
              >
                {chat.isMuted ? <Bell size={15} /> : <BellOff size={15} />}
                <span>{chat.isMuted ? 'Включить звук' : 'Без звука'}</span>
              </button>

              <button
                onClick={() => {
                  setShowMoreMenu(false);
                  toggleSearchInChat();
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-dfz-surface-hover text-left transition-colors"
              >
                <Search size={15} />
                <span>Поиск сообщений</span>
              </button>

              {/* Group / Channel Settings for Owner/Admin */}
              {isOwnerOrAdmin && chat.type === ChatType.GROUP && (
                <button
                  onClick={() => {
                    setShowMoreMenu(false);
                    setGroupManageChat(chat);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-dfz-surface-hover text-left transition-colors"
                >
                  <Settings size={15} />
                  <span>Управление группой</span>
                </button>
              )}

              {isOwnerOrAdmin && chat.type === ChatType.CHANNEL && (
                <button
                  onClick={() => {
                    setShowMoreMenu(false);
                    setChannelManageChat(chat);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-dfz-surface-hover text-left transition-colors"
                >
                  <Settings size={15} />
                  <span>Управление каналом</span>
                </button>
              )}

              <div className="my-1 border-t border-dfz-border/50" />

              <button
                onClick={() => {
                  setShowMoreMenu(false);
                  if (confirm('Очистить историю сообщений?')) {
                    clearChatHistory(chat.id);
                  }
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-dfz-surface-hover text-left text-dfz-danger transition-colors"
              >
                <Trash2 size={15} />
                <span>Очистить историю</span>
              </button>

              <button
                onClick={() => {
                  setShowMoreMenu(false);
                  if (confirm('Удалить чат?')) {
                    deleteChat(chat.id);
                  }
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-dfz-surface-hover text-left text-dfz-danger transition-colors"
              >
                <Trash2 size={15} />
                <span>Удалить чат</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Pinned Messages Bar (if any pinned messages exist) */}
      {pinnedList.length > 0 && currentPinned && (
        <div
          onClick={handleCyclePin}
          className="flex items-center justify-between px-3 sm:px-4 py-1.5 bg-[#19232e]/80 hover:bg-[#19232e] border-t border-dfz-border/60 text-xs cursor-pointer transition-colors"
        >
          <div className="flex items-center gap-2 min-w-0">
            <Pin size={13} className="text-[var(--accent-primary)] flex-shrink-0" />
            <div className="truncate">
              <span className="font-semibold text-dfz-text">
                Закрепленное сообщение{' '}
                {pinnedList.length > 1 && (
                  <span className="text-[10px] text-dfz-text-muted">
                    ({activePinIndex + 1} из {pinnedList.length})
                  </span>
                )}
                :
              </span>{' '}
              <span className="text-dfz-text-muted truncate">{currentPinned.content || 'Медиа'}</span>
            </div>
          </div>

          <button
            onClick={handleUnpin}
            className="p-1 text-dfz-text-muted hover:text-dfz-text rounded-full hover:bg-dfz-surface transition-colors flex-shrink-0"
            title="Открепить"
          >
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
};
