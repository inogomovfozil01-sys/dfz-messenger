import React, { useState } from 'react';
import { X, Copy, Check, UserPlus, LogOut, Bell, BellOff, ShieldCheck } from 'lucide-react';
import { Chat, ChatType, MemberRole } from '@dfz/types';
import { Avatar } from '../ui/Avatar';
import { useAuthStore } from '../../stores/authStore';
import { useChatStore } from '../../stores/chatStore';

interface ChatInfoPanelProps {
  chat: Chat;
  onClose: () => void;
  onAddMember?: () => void;
}

export const ChatInfoPanel: React.FC<ChatInfoPanelProps> = ({
  chat,
  onClose,
  onAddMember,
}) => {
  const { user } = useAuthStore();
  const { toggleMuteChat } = useChatStore();
  const [copied, setCopied] = useState(false);

  const handleCopyLink = () => {
    if (chat.inviteCode) {
      const link = `${window.location.origin}/join/${chat.inviteCode}`;
      navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const isOwnerOrAdmin = chat.members?.some(
    (m) => m.userId === user?.id && (m.role === MemberRole.OWNER || m.role === MemberRole.ADMIN)
  );

  return (
    <div className="w-80 h-full bg-dfz-surface border-l border-dfz-border flex flex-col flex-shrink-0 animate-slide-up select-none z-20">
      {/* Header */}
      <div className="flex items-center justify-between h-14 px-4 border-b border-dfz-border">
        <h3 className="text-sm font-semibold text-dfz-text">Информация</h3>
        <button
          onClick={onClose}
          className="p-1 rounded-dfz-md text-dfz-text-muted hover:text-dfz-text hover:bg-dfz-surface-hover transition-colors"
        >
          <X size={18} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Profile / Chat Hero */}
        <div className="flex flex-col items-center text-center">
          <Avatar src={chat.avatarUrl} name={chat.title || 'Chat'} size="xl" className="mb-3" />
          <h2 className="text-base font-semibold text-dfz-text leading-tight">{chat.title}</h2>
          {chat.description && (
            <p className="text-xs text-dfz-text-muted mt-1 leading-relaxed max-w-xs">
              {chat.description}
            </p>
          )}
        </div>

        {/* Quick Toggles */}
        <div className="bg-dfz-bg border border-dfz-border rounded-dfz-lg overflow-hidden">
          <button
            onClick={() => toggleMuteChat(chat.id, !chat.isMuted)}
            className="w-full flex items-center justify-between p-3 text-xs font-medium text-dfz-text hover:bg-dfz-surface-hover transition-colors"
          >
            <div className="flex items-center gap-2.5">
              {chat.isMuted ? <BellOff size={16} /> : <Bell size={16} />}
              <span>{chat.isMuted ? 'Включить уведомления' : 'Без звука'}</span>
            </div>
            <span className="text-[11px] text-dfz-text-muted font-normal">
              {chat.isMuted ? 'Выкл' : 'Вкл'}
            </span>
          </button>
        </div>

        {/* Invite link if group or channel */}
        {chat.inviteCode && (
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-dfz-text-muted">Ссылка для приглашения</label>
            <div className="flex items-center justify-between p-2.5 bg-dfz-bg border border-dfz-border rounded-dfz-lg text-xs">
              <span className="truncate text-dfz-text-muted select-all">
                {window.location.origin}/join/{chat.inviteCode}
              </span>
              <button
                onClick={handleCopyLink}
                className="p-1 text-dfz-accent hover:text-dfz-accent-hover transition-colors flex-shrink-0"
                title="Копировать"
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
              </button>
            </div>
          </div>
        )}

        {/* Members list (if Group or Channel) */}
        {(chat.type === ChatType.GROUP || chat.type === ChatType.CHANNEL) && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-dfz-text-muted">
                Участники ({chat.members?.length || 0})
              </span>
              {isOwnerOrAdmin && onAddMember && (
                <button
                  onClick={onAddMember}
                  className="flex items-center gap-1 text-xs text-dfz-accent hover:text-dfz-accent-hover font-medium"
                >
                  <UserPlus size={14} />
                  <span>Добавить</span>
                </button>
              )}
            </div>

            <div className="space-y-1">
              {chat.members?.map((m) => (
                <div
                  key={m.id || m.userId}
                  className="flex items-center justify-between p-2 rounded-dfz-md hover:bg-dfz-surface-hover transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Avatar
                      src={m.avatarUrl}
                      name={m.displayName || m.username || 'Member'}
                      size="sm"
                    />
                    <div className="truncate">
                      <p className="text-xs font-medium text-dfz-text truncate">
                        {m.displayName || m.username}
                      </p>
                      <p className="text-[11px] text-dfz-text-muted truncate">
                        @{m.username}
                      </p>
                    </div>
                  </div>

                  {/* Role Badge */}
                  {m.role !== MemberRole.MEMBER && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-dfz-accent/15 text-dfz-accent">
                      <ShieldCheck size={10} />
                      {m.role === MemberRole.OWNER ? 'Владелец' : 'Админ'}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
