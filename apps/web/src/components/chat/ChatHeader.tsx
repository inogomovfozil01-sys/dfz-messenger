import React from 'react';
import { ArrowLeft, Phone, Video, Search, MoreVertical, Info } from 'lucide-react';
import { Chat, ChatType, CallType } from '@dfz/types';
import { Avatar } from '../ui/Avatar';
import { useCallStore } from '../../stores/callStore';
import { useAuthStore } from '../../stores/authStore';

interface ChatHeaderProps {
  chat: Chat;
  onBackMobile: () => void;
  onToggleInfo: () => void;
  onToggleSearch: () => void;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  chat,
  onBackMobile,
  onToggleInfo,
  onToggleSearch,
}) => {
  const { user } = useAuthStore();
  const { startCall } = useCallStore();

  const otherMember =
    chat.type === ChatType.DIRECT
      ? chat.members.find((m) => m.userId !== user?.id)
      : null;

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

  const renderSubtitle = () => {
    if (chat.type === ChatType.DIRECT) {
      return otherMember?.lastSeenAt ? 'В сети' : 'Не в сети';
    }
    if (chat.type === ChatType.GROUP) {
      return `${chat.members?.length || 1} участников`;
    }
    if (chat.type === ChatType.CHANNEL) {
      return `${chat.members?.length || 1} подписчиков`;
    }
    return 'Личное пространство';
  };

  return (
    <div className="flex items-center justify-between h-14 px-3 sm:px-4 bg-dfz-surface border-b border-dfz-border select-none z-10 flex-shrink-0">
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

        {/* Chat Title & Status */}
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
      <div className="flex items-center gap-1">
        {/* In-chat search */}
        <button
          type="button"
          onClick={onToggleSearch}
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
      </div>
    </div>
  );
};
