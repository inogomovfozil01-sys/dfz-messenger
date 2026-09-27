import React, { useState, useEffect } from 'react';
import {
  X,
  Copy,
  Check,
  UserPlus,
  LogOut,
  Bell,
  BellOff,
  ShieldCheck,
  Image as ImageIcon,
  FileText,
  Link2,
  Mic,
  Search,
  Trash2,
  Settings,
  MoreVertical,
  User,
  Ban,
  Shield,
  ExternalLink,
} from 'lucide-react';
import { Chat, ChatType, MemberRole } from '@dfz/types';
import { Avatar } from '../ui/Avatar';
import { useAuthStore } from '../../stores/authStore';
import { useChatStore } from '../../stores/chatStore';
import { apiRequest } from '../../lib/api';

interface ChatInfoPanelProps {
  chat: Chat;
  onClose: () => void;
  onAddMember?: () => void;
  onOpenProfile?: (userId: string) => void;
}

type MediaTab = 'members' | 'media' | 'files' | 'links' | 'voice';

export const ChatInfoPanel: React.FC<ChatInfoPanelProps> = ({
  chat,
  onClose,
  onAddMember,
  onOpenProfile,
}) => {
  const { user } = useAuthStore();
  const {
    toggleMuteChat,
    toggleSearchInChat,
    clearChatHistory,
    deleteChat,
    setGroupManageChat,
    setChannelManageChat,
  } = useChatStore();

  const [activeTab, setActiveTab] = useState<MediaTab>(
    chat.type === ChatType.DIRECT ? 'media' : 'members'
  );
  const [copied, setCopied] = useState(false);
  const [mediaItems, setMediaItems] = useState<any[]>([]);
  const [isLoadingMedia, setIsLoadingMedia] = useState(false);
  const [selectedMember, setSelectedMember] = useState<any>(null);

  const isOwnerOrAdmin = chat.members?.some(
    (m) => m.userId === user?.id && (m.role === MemberRole.OWNER || m.role === MemberRole.ADMIN)
  );
  const isOwner = chat.ownerId === user?.id || chat.members?.some((m) => m.userId === user?.id && m.role === MemberRole.OWNER);
  const otherMember =
    chat.type === ChatType.DIRECT
      ? chat.members?.find((m) => m.userId !== user?.id)
      : null;

  useEffect(() => {
    if (activeTab !== 'members') {
      loadMedia(activeTab);
    }
  }, [activeTab, chat.id]);

  const loadMedia = async (category: string) => {
    setIsLoadingMedia(true);
    const res = await apiRequest<any[]>(`/api/chats/${chat.id}/media?category=${category}`);
    setIsLoadingMedia(false);
    if (res.success && res.data) {
      setMediaItems(res.data);
    } else {
      setMediaItems([]);
    }
  };

  const handleCopyLink = () => {
    if (chat.inviteCode) {
      const link = `${window.location.origin}/join/${chat.inviteCode}`;
      navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handlePromoteDemote = async (targetUserId: string, currentRole: MemberRole) => {
    const nextRole = currentRole === MemberRole.ADMIN ? MemberRole.MEMBER : MemberRole.ADMIN;
    await apiRequest(`/api/chats/${chat.id}/members/${targetUserId}/role`, {
      method: 'PUT',
      body: JSON.stringify({ role: nextRole }),
    });
    setSelectedMember(null);
  };

  const handleRemoveMember = async (targetUserId: string) => {
    if (confirm('Исключить этого участника из группы?')) {
      await apiRequest(`/api/chats/${chat.id}/members/${targetUserId}`, {
        method: 'DELETE',
      });
      setSelectedMember(null);
    }
  };

  return (
    <div className="w-80 sm:w-88 h-full bg-dfz-surface border-l border-dfz-border flex flex-col flex-shrink-0 select-none z-20 animate-slide-up">
      {/* Header */}
      <div className="flex items-center justify-between h-14 px-4 border-b border-dfz-border">
        <h3 className="text-sm font-semibold text-dfz-text">Информация</h3>
        <div className="flex items-center gap-1">
          {isOwnerOrAdmin && chat.type === ChatType.GROUP && (
            <button
              onClick={() => setGroupManageChat(chat)}
              className="p-1.5 rounded-full text-dfz-text-muted hover:text-dfz-text hover:bg-dfz-surface-hover transition-colors"
              title="Настройки группы"
            >
              <Settings size={17} />
            </button>
          )}
          {isOwnerOrAdmin && chat.type === ChatType.CHANNEL && (
            <button
              onClick={() => setChannelManageChat(chat)}
              className="p-1.5 rounded-full text-dfz-text-muted hover:text-dfz-text hover:bg-dfz-surface-hover transition-colors"
              title="Настройки канала"
            >
              <Settings size={17} />
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-dfz-text-muted hover:text-dfz-text hover:bg-dfz-surface-hover transition-colors"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Profile / Chat Hero */}
        <div className="p-4 flex flex-col items-center text-center border-b border-dfz-border/60">
          <Avatar src={chat.avatarUrl} name={chat.title || 'Chat'} size="xl" className="mb-3" />
          <h2 className="text-base font-bold text-dfz-text leading-tight">{chat.title}</h2>
          {chat.description && (
            <p className="text-xs text-dfz-text-muted mt-1.5 leading-relaxed max-w-xs">
              {chat.description}
            </p>
          )}

          {/* Quick Actions Bar */}
          <div className="flex items-center justify-center gap-3 mt-4 pt-3 border-t border-dfz-border/40 w-full">
            <button
              onClick={() => toggleMuteChat(chat.id, !chat.isMuted)}
              className="flex flex-col items-center gap-1 text-[11px] text-dfz-text-muted hover:text-dfz-text transition-colors"
            >
              <div className="p-2 rounded-full bg-dfz-bg border border-dfz-border">
                {chat.isMuted ? <BellOff size={16} /> : <Bell size={16} />}
              </div>
              <span>{chat.isMuted ? 'Вкл. звук' : 'Без звука'}</span>
            </button>

            <button
              onClick={toggleSearchInChat}
              className="flex flex-col items-center gap-1 text-[11px] text-dfz-text-muted hover:text-dfz-text transition-colors"
            >
              <div className="p-2 rounded-full bg-dfz-bg border border-dfz-border">
                <Search size={16} />
              </div>
              <span>Поиск</span>
            </button>

            {otherMember && onOpenProfile && (
              <button
                onClick={() => onOpenProfile(otherMember.userId)}
                className="flex flex-col items-center gap-1 text-[11px] text-dfz-text-muted hover:text-dfz-text transition-colors"
                title="Открыть профиль"
              >
                <div className="p-2 rounded-full bg-dfz-bg border border-dfz-border text-[var(--accent-primary)]">
                  <User size={16} />
                </div>
                <span>Профиль</span>
              </button>
            )}

            {chat.inviteCode && (
              <button
                onClick={handleCopyLink}
                className="flex flex-col items-center gap-1 text-[11px] text-dfz-text-muted hover:text-dfz-text transition-colors"
              >
                <div className="p-2 rounded-full bg-dfz-bg border border-dfz-border text-[var(--accent-primary)]">
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                </div>
                <span>{copied ? 'Скопировано' : 'Ссылка'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Media / Files / Links / Members Tabs */}
        <div className="flex border-b border-dfz-border/80 px-2 bg-dfz-bg/50">
          {(chat.type === ChatType.GROUP || chat.type === ChatType.CHANNEL) && (
            <button
              onClick={() => setActiveTab('members')}
              className={`flex-1 py-2.5 text-xs font-semibold border-b-2 text-center transition-colors ${
                activeTab === 'members'
                  ? 'border-[var(--accent-primary)] text-[var(--accent-primary)]'
                  : 'border-transparent text-dfz-text-muted hover:text-dfz-text'
              }`}
            >
              Участники
            </button>
          )}
          <button
            onClick={() => setActiveTab('media')}
            className={`flex-1 py-2.5 text-xs font-semibold border-b-2 text-center transition-colors ${
              activeTab === 'media'
                ? 'border-[var(--accent-primary)] text-[var(--accent-primary)]'
                : 'border-transparent text-dfz-text-muted hover:text-dfz-text'
            }`}
          >
            Медиа
          </button>
          <button
            onClick={() => setActiveTab('files')}
            className={`flex-1 py-2.5 text-xs font-semibold border-b-2 text-center transition-colors ${
              activeTab === 'files'
                ? 'border-[var(--accent-primary)] text-[var(--accent-primary)]'
                : 'border-transparent text-dfz-text-muted hover:text-dfz-text'
            }`}
          >
            Файлы
          </button>
          <button
            onClick={() => setActiveTab('links')}
            className={`flex-1 py-2.5 text-xs font-semibold border-b-2 text-center transition-colors ${
              activeTab === 'links'
                ? 'border-[var(--accent-primary)] text-[var(--accent-primary)]'
                : 'border-transparent text-dfz-text-muted hover:text-dfz-text'
            }`}
          >
            Ссылки
          </button>
          <button
            onClick={() => setActiveTab('voice')}
            className={`flex-1 py-2.5 text-xs font-semibold border-b-2 text-center transition-colors ${
              activeTab === 'voice'
                ? 'border-[var(--accent-primary)] text-[var(--accent-primary)]'
                : 'border-transparent text-dfz-text-muted hover:text-dfz-text'
            }`}
          >
            Голосовые
          </button>
        </div>

        {/* Tab Contents */}
        <div className="p-3">
          {activeTab === 'members' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-semibold text-dfz-text-muted">
                  Всего: {chat.members?.length || 0}
                </span>
                {isOwnerOrAdmin && onAddMember && (
                  <button
                    onClick={onAddMember}
                    className="flex items-center gap-1 text-xs text-[var(--accent-primary)] hover:underline font-semibold"
                  >
                    <UserPlus size={13} />
                    <span>Добавить</span>
                  </button>
                )}
              </div>

              <div className="space-y-1">
                {chat.members?.map((m) => (
                  <div
                    key={m.id || m.userId}
                    className="relative flex items-center justify-between p-2 rounded-dfz-md hover:bg-dfz-surface-hover transition-colors group"
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

                    <div className="flex items-center gap-1.5">
                      {m.role !== MemberRole.MEMBER && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[var(--accent-primary)]/15 text-[var(--accent-primary)]">
                          <ShieldCheck size={10} />
                          {m.role === MemberRole.OWNER ? 'Создатель' : 'Админ'}
                        </span>
                      )}

                      {isOwner && m.userId !== user?.id && (
                        <button
                          onClick={() => setSelectedMember(selectedMember?.id === m.id ? null : m)}
                          className="p-1 rounded text-dfz-text-muted hover:text-dfz-text opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <MoreVertical size={14} />
                        </button>
                      )}
                    </div>

                    {/* Member actions dropdown */}
                    {selectedMember?.id === m.id && (
                      <div className="absolute right-2 top-10 w-44 bg-dfz-bg border border-dfz-border rounded-dfz-lg shadow-xl py-1 z-30 text-xs animate-scale-in">
                        <button
                          onClick={() => handlePromoteDemote(m.userId, m.role)}
                          className="w-full text-left px-3 py-1.5 hover:bg-dfz-surface-hover text-dfz-text flex items-center gap-2"
                        >
                          <Shield size={13} />
                          <span>{m.role === MemberRole.ADMIN ? 'Снять админа' : 'Назначить админом'}</span>
                        </button>
                        <button
                          onClick={() => handleRemoveMember(m.userId)}
                          className="w-full text-left px-3 py-1.5 hover:bg-dfz-surface-hover text-dfz-danger flex items-center gap-2"
                        >
                          <Trash2 size={13} />
                          <span>Исключить</span>
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'media' && (
            <div>
              {isLoadingMedia ? (
                <div className="p-6 text-center text-xs text-dfz-text-muted">Загрузка медиа...</div>
              ) : mediaItems.length === 0 ? (
                <div className="p-8 text-center text-xs text-dfz-text-muted">Нет медиафайлов</div>
              ) : (
                <div className="grid grid-cols-3 gap-1.5">
                  {mediaItems.map((item) => (
                    <a
                      key={item.id}
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="aspect-square rounded-dfz-sm overflow-hidden bg-dfz-bg border border-dfz-border group relative"
                    >
                      <img
                        src={item.thumbnailUrl || item.url}
                        alt={item.originalName}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    </a>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'files' && (
            <div className="space-y-1.5">
              {isLoadingMedia ? (
                <div className="p-6 text-center text-xs text-dfz-text-muted">Загрузка файлов...</div>
              ) : mediaItems.length === 0 ? (
                <div className="p-8 text-center text-xs text-dfz-text-muted">Нет прикрепленных файлов</div>
              ) : (
                mediaItems.map((item) => (
                  <a
                    key={item.id}
                    href={item.url}
                    download={item.originalName}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-2 rounded-dfz-md bg-dfz-bg hover:bg-dfz-surface-hover border border-dfz-border text-xs transition-colors"
                  >
                    <div className="flex items-center gap-2.5 truncate mr-2">
                      <FileText size={16} className="text-[var(--accent-primary)] flex-shrink-0" />
                      <span className="truncate text-dfz-text">{item.originalName}</span>
                    </div>
                    <span className="text-[10px] text-dfz-text-muted flex-shrink-0">
                      {(item.sizeBytes / 1024).toFixed(0)} KB
                    </span>
                  </a>
                ))
              )}
            </div>
          )}

          {activeTab === 'links' && (
            <div className="space-y-1.5">
              {isLoadingMedia ? (
                <div className="p-6 text-center text-xs text-dfz-text-muted">Загрузка ссылок...</div>
              ) : mediaItems.length === 0 ? (
                <div className="p-8 text-center text-xs text-dfz-text-muted">Нет ссылок</div>
              ) : (
                mediaItems.map((item) => (
                  <div
                    key={item.id}
                    className="p-2.5 rounded-dfz-md bg-dfz-bg border border-dfz-border text-xs"
                  >
                    <p className="text-dfz-text text-[11px] truncate select-all">{item.content}</p>
                    <span className="text-[10px] text-dfz-text-muted mt-1 block">
                      {new Date(item.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'voice' && (
            <div className="space-y-2">
              {isLoadingMedia ? (
                <div className="p-6 text-center text-xs text-dfz-text-muted">Загрузка аудио...</div>
              ) : mediaItems.length === 0 ? (
                <div className="p-8 text-center text-xs text-dfz-text-muted">Нет голосовых сообщений</div>
              ) : (
                mediaItems.map((item) => (
                  <div
                    key={item.id}
                    className="p-2.5 rounded-dfz-md bg-dfz-bg border border-dfz-border text-xs flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <Mic size={15} className="text-[var(--accent-primary)] flex-shrink-0" />
                      <span className="truncate text-dfz-text text-[11px]">Голосовое</span>
                    </div>
                    <span className="text-[10px] text-dfz-text-muted flex-shrink-0">
                      {new Date(item.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Danger zone actions */}
        <div className="p-4 border-t border-dfz-border/60 space-y-2">
          {chat.type === ChatType.DIRECT && otherMember && (
            <>
              <button
                onClick={async () => {
                  if (confirm(`Заблокировать @${otherMember.username || 'пользователя'}?`)) {
                    const res = await apiRequest('/api/contacts/block', {
                      method: 'POST',
                      body: JSON.stringify({ targetUserId: otherMember.userId }),
                    });
                    if (res.success) {
                      alert('Пользователь заблокирован');
                    } else {
                      alert(res.error?.message || 'Не удалось заблокировать');
                    }
                  }
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-dfz-md hover:bg-dfz-danger/10 text-dfz-danger text-xs font-semibold transition-colors text-left"
              >
                <Ban size={15} />
                <span>Заблокировать</span>
              </button>

              <button
                onClick={async () => {
                  const reason = prompt('Укажите причину жалобы (Спам, Мошенничество, Оскорбления, Другое):');
                  if (!reason) return;
                  const res = await apiRequest('/api/moderation/report', {
                    method: 'POST',
                    body: JSON.stringify({
                      targetType: 'USER',
                      targetId: otherMember.userId,
                      reason: 'OTHER',
                      description: reason,
                    }),
                  });
                  if (res.success) {
                    alert('Жалоба успешно отправлена модераторам');
                  } else {
                    alert(res.error?.message || 'Ошибка отправки жалобы');
                  }
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-dfz-md hover:bg-dfz-surface text-dfz-text-muted hover:text-dfz-text text-xs font-semibold transition-colors text-left"
              >
                <Shield size={15} />
                <span>Пожаловаться</span>
              </button>
            </>
          )}

          <button
            onClick={() => {
              if (confirm('Очистить историю сообщений для вас?')) {
                clearChatHistory(chat.id);
              }
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-dfz-md hover:bg-dfz-danger/10 text-dfz-danger text-xs font-semibold transition-colors text-left"
          >
            <Trash2 size={15} />
            <span>Очистить историю</span>
          </button>

          <button
            onClick={() => {
              if (confirm('Вы действительно хотите удалить этот чат?')) {
                deleteChat(chat.id);
                onClose();
              }
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-dfz-md hover:bg-dfz-danger/10 text-dfz-danger text-xs font-semibold transition-colors text-left"
          >
            <LogOut size={15} />
            <span>{chat.type === ChatType.DIRECT ? 'Удалить диалог' : 'Покинуть чат'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
