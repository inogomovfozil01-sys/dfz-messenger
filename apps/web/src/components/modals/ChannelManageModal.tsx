import { InviteManager } from './InviteManager';
import React, { useState, useEffect } from 'react';
import {
  X,
  Radio,
  Shield,
  Link2,
  Lock,
  Globe,
  Trash2,
  Camera,
  Check,
  Copy,
  RefreshCw,
  LogOut,
  ChevronRight,
  ShieldAlert,
  Sliders,
  UserCheck,
  UserX,
  UserPlus,
  Megaphone,
} from 'lucide-react';
import { Chat, MemberRole } from '@dfz/types';
import { Avatar } from '../ui/Avatar';
import { apiRequest } from '../../lib/api';
import { useAuthStore } from '../../stores/authStore';
import { useChatStore } from '../../stores/chatStore';

interface ChannelManageModalProps {
  isOpen: boolean;
  onClose: () => void;
  chat: Chat | null;
}

type TabType = 'general' | 'admins' | 'subscribers' | 'invites';

export const ChannelManageModal: React.FC<ChannelManageModalProps> = ({
  isOpen,
  onClose,
  chat,
}) => {
  const { user } = useAuthStore();
  const { fetchChats } = useChatStore();

  const [activeTab, setActiveTab] = useState<TabType>('general');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [signMessages, setSignMessages] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Members / Subscribers list
  const [subscribers, setSubscribers] = useState<any[]>([]);
  const [subscriberSearch, setSubscriberSearch] = useState('');
  const [selectedSubForAdmin, setSelectedSubForAdmin] = useState<any | null>(null);
  const [adminTitle, setAdminTitle] = useState('');

  const isOwner = chat?.ownerId === user?.id || chat?.members?.some((m) => m.userId === user?.id && m.role === MemberRole.OWNER);

  useEffect(() => {
    if (chat && isOpen) {
      setTitle(chat.title || '');
      setDescription(chat.description || '');
      setAvatarUrl(chat.avatarUrl || '');
      setIsPublic(chat.isPublic ?? true);
      setInviteCode(chat.inviteCode || '');
      setSubscribers(chat.members || []);
      setStatusMessage(null);
      setErrorMessage(null);
      setSelectedSubForAdmin(null);
    }
  }, [chat, isOpen]);

  if (!isOpen || !chat) return null;

  const handleSaveGeneral = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSaving(true);
    setStatusMessage(null);
    setErrorMessage(null);

    const res = await apiRequest<Chat>(`/api/chats/${chat.id}`, {
      method: 'PUT',
      body: JSON.stringify({
        title: title.trim(),
        description: description.trim() || undefined,
        avatarUrl: avatarUrl.trim() || undefined,
        isPublic,
      }),
    });

    setIsSaving(false);

    if (res.success && res.data) {
      setStatusMessage('Настройки канала успешно обновлены');
      await fetchChats();
      setTimeout(() => setStatusMessage(null), 3000);
    } else {
      setErrorMessage(res.error?.message || 'Не удалось сохранить настройки канала');
    }
  };

  const handleCopyLink = () => {
    const link = `${window.location.origin}/join/${inviteCode}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRegenerateInvite = async () => {
    if (!confirm('Аннулировать текущую ссылку и создать новую?')) return;
    const res = await apiRequest<any>(`/api/chats/${chat.id}/invite-link`, {
      method: 'POST',
    });
    if (res.success && res.data) {
      setInviteCode(res.data.inviteCode);
      setStatusMessage('Новая ссылка сгенерирована');
      setTimeout(() => setStatusMessage(null), 3000);
    }
  };

  const handlePromoteToAdmin = async (targetUser: any) => {
    const res = await apiRequest(`/api/chats/${chat.id}/members/${targetUser.userId || targetUser.id}/role`, {
      method: 'PUT',
      body: JSON.stringify({
        role: MemberRole.ADMIN,
        customTitle: adminTitle.trim() || 'Администратор канала',
      }),
    });

    if (res.success) {
      setSubscribers((prev) =>
        prev.map((m) =>
          (m.userId === targetUser.userId || m.userId === targetUser.id)
            ? { ...m, role: MemberRole.ADMIN, customTitle: adminTitle.trim() || 'Администратор канала' }
            : m
        )
      );
      setSelectedSubForAdmin(null);
      setAdminTitle('');
      setStatusMessage(`Пользователь ${targetUser.user?.profile?.displayName || targetUser.user?.username} назначен администратором`);
      await fetchChats();
    }
  };

  const handleDemoteAdmin = async (targetUserId: string) => {
    if (!confirm('Снять полномочия администратора?')) return;
    const res = await apiRequest(`/api/chats/${chat.id}/members/${targetUserId}/role`, {
      method: 'PUT',
      body: JSON.stringify({
        role: MemberRole.MEMBER,
        customTitle: null,
      }),
    });
    if (res.success) {
      setSubscribers((prev) =>
        prev.map((m) =>
          m.userId === targetUserId ? { ...m, role: MemberRole.MEMBER, customTitle: null } : m
        )
      );
      setStatusMessage('Администратор переведен в подписчики');
      await fetchChats();
    }
  };

  const handleRemoveSubscriber = async (targetUserId: string) => {
    if (!confirm('Удалить этого подписчика из канала?')) return;
    const res = await apiRequest(`/api/chats/${chat.id}/members/${targetUserId}`, {
      method: 'DELETE',
    });
    if (res.success) {
      setSubscribers((prev) => prev.filter((m) => m.userId !== targetUserId));
      setStatusMessage('Подписчик удален');
      await fetchChats();
    }
  };

  const handleDeleteChannel = async () => {
    if (confirm('ВЫ УВЕРЕНЫ, ЧТО ХОТИТЕ УДАЛИТЬ КАНАЛ? Это действие необратимо и удалит все публикации.')) {
      const res = await apiRequest(`/api/chats/${chat.id}`, { method: 'DELETE' });
      if (res.success) {
        onClose();
        await fetchChats();
        useChatStore.setState({ activeChatId: null, activeChat: null });
      }
    }
  };

  const filteredSubscribers = subscribers.filter((m) => {
    const name = m.displayName || m.username || '';
    return name.toLowerCase().includes(subscriberSearch.toLowerCase());
  });

  const adminsList = subscribers.filter(
    (m) => m.role === MemberRole.OWNER || m.role === MemberRole.ADMIN
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 select-none">
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      <div className="relative z-10 w-full max-w-lg max-h-[90vh] bg-dfz-surface border border-dfz-border rounded-dfz-2xl shadow-2xl flex flex-col overflow-hidden animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-dfz-border bg-dfz-surface-secondary">
          <div className="flex items-center gap-2.5">
            <Megaphone size={18} className="text-dfz-accent" />
            <h3 className="text-sm font-bold text-dfz-text">Управление каналом</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-dfz-text-muted hover:text-dfz-text hover:bg-dfz-surface transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-dfz-border bg-dfz-surface px-3 gap-1 overflow-x-auto">
          <button
            onClick={() => setActiveTab('general')}
            className={`px-3 py-2 text-xs font-semibold border-b-2 whitespace-nowrap transition-colors ${
              activeTab === 'general'
                ? 'border-dfz-accent text-dfz-accent'
                : 'border-transparent text-dfz-text-muted hover:text-dfz-text'
            }`}
          >
            Информация
          </button>
          <button
            onClick={() => setActiveTab('admins')}
            className={`px-3 py-2 text-xs font-semibold border-b-2 whitespace-nowrap transition-colors ${
              activeTab === 'admins'
                ? 'border-dfz-accent text-dfz-accent'
                : 'border-transparent text-dfz-text-muted hover:text-dfz-text'
            }`}
          >
            Администраторы ({adminsList.length})
          </button>
          <button
            onClick={() => setActiveTab('subscribers')}
            className={`px-3 py-2 text-xs font-semibold border-b-2 whitespace-nowrap transition-colors ${
              activeTab === 'subscribers'
                ? 'border-dfz-accent text-dfz-accent'
                : 'border-transparent text-dfz-text-muted hover:text-dfz-text'
            }`}
          >
            Подписчики ({subscribers.length})
          </button>
          <button
            onClick={() => setActiveTab('invites')}
            className={`px-3 py-2 text-xs font-semibold border-b-2 whitespace-nowrap transition-colors ${
              activeTab === 'invites'
                ? 'border-dfz-accent text-dfz-accent'
                : 'border-transparent text-dfz-text-muted hover:text-dfz-text'
            }`}
          >
            Ссылка-приглашение
          </button>
        </div>

        {/* Status Alerts */}
        {statusMessage && (
          <div className="mx-5 mt-3 p-2.5 rounded-dfz-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
            <Check size={14} />
            <span>{statusMessage}</span>
          </div>
        )}
        {errorMessage && (
          <div className="mx-5 mt-3 p-2.5 rounded-dfz-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
            <ShieldAlert size={14} />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 text-xs text-dfz-text space-y-4">
          {/* TAB 1: GENERAL */}
          {activeTab === 'general' && (
            <form onSubmit={handleSaveGeneral} className="space-y-4">
              <div className="flex items-center gap-4">
                <Avatar src={avatarUrl || chat.avatarUrl} name={title || chat.title} size="xl" />
                <div className="flex-1 space-y-1">
                  <label className="text-[11px] font-semibold text-dfz-text-muted">URL Аватара канала</label>
                  <input
                    type="url"
                    value={avatarUrl}
                    onChange={(e) => setAvatarUrl(e.target.value)}
                    placeholder="https://... (прямая ссылка на картинку)"
                    className="w-full h-8 px-2.5 bg-dfz-bg border border-dfz-border rounded-dfz-lg text-xs text-dfz-text focus:outline-none focus:border-dfz-accent font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-dfz-text-muted">Название канала</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full h-9 px-3 bg-dfz-bg border border-dfz-border rounded-dfz-lg text-xs text-dfz-text focus:outline-none focus:border-dfz-accent"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-dfz-text-muted">Описание канала</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="О чем этот канал, контактная информация..."
                  className="w-full p-2.5 bg-dfz-bg border border-dfz-border rounded-dfz-lg text-xs text-dfz-text focus:outline-none focus:border-dfz-accent resize-none"
                />
              </div>

              <div className="p-3 rounded-dfz-xl bg-dfz-surface-secondary border border-dfz-border space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {isPublic ? <Globe size={16} className="text-dfz-accent" /> : <Lock size={16} className="text-dfz-text-muted" />}
                    <div>
                      <div className="font-semibold text-xs text-dfz-text">Тип канала</div>
                      <div className="text-[11px] text-dfz-text-muted">
                        {isPublic ? 'Публичный (может найти любой в глобальном поиске)' : 'Частный (доступ только по ссылке-приглашению)'}
                      </div>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={isPublic}
                    onChange={(e) => setIsPublic(e.target.checked)}
                    className="w-4 h-4 rounded text-dfz-accent bg-dfz-bg border-dfz-border"
                  />
                </div>

                <div className="border-t border-dfz-border/40 pt-2 flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-xs text-dfz-text">Подписывать сообщения</div>
                    <div className="text-[11px] text-dfz-text-muted">
                      Добавлять имя автора к опубликованным постам
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={signMessages}
                    onChange={(e) => setSignMessages(e.target.checked)}
                    className="w-4 h-4 rounded text-dfz-accent bg-dfz-bg border-dfz-border"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2 bg-dfz-accent hover:bg-dfz-accent-hover text-white rounded-dfz-lg font-semibold text-xs shadow-md transition-colors disabled:opacity-50"
                >
                  {isSaving ? 'Сохранение...' : 'Сохранить изменения'}
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: ADMINS */}
          {activeTab === 'admins' && (
            <div className="space-y-4">
              <span className="text-[11px] text-dfz-text-muted">
                Администраторы могут публиковать посты и управлять каналом
              </span>

              <div className="space-y-1.5">
                {adminsList.map((m) => {
                  const isOwnerMember = m.role === MemberRole.OWNER;
                  return (
                    <div
                      key={m.userId}
                      className="flex items-center justify-between p-2.5 rounded-dfz-xl bg-dfz-surface-secondary border border-dfz-border"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar
                          src={m.avatarUrl}
                          name={m.displayName || m.username}
                          size="md"
                        />
                        <div>
                          <div className="font-semibold text-xs text-dfz-text flex items-center gap-1.5">
                            <span>{m.displayName || m.username}</span>
                            {isOwnerMember && (
                              <span className="px-1.5 py-0.2 rounded-full bg-amber-500/20 text-[10px] font-bold text-amber-400">
                                Владелец
                              </span>
                            )}
                            {!isOwnerMember && (
                              <span className="px-1.5 py-0.2 rounded-full bg-cyan-500/20 text-[10px] font-semibold text-cyan-400">
                                {m.customTitle || 'Администратор'}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-dfz-text-muted">@{m.username}</div>
                        </div>
                      </div>

                      {isOwner && !isOwnerMember && (
                        <button
                          onClick={() => handleDemoteAdmin(m.userId)}
                          className="px-2.5 py-1 text-[11px] rounded-dfz-md text-rose-400 hover:bg-rose-500/10 border border-rose-500/20 transition-colors"
                        >
                          Снять права
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: SUBSCRIBERS */}
          {activeTab === 'subscribers' && (
            <div className="space-y-3">
              <input
                type="text"
                value={subscriberSearch}
                onChange={(e) => setSubscriberSearch(e.target.value)}
                placeholder="Поиск по подписчикам..."
                className="w-full h-8 px-3 bg-dfz-bg border border-dfz-border rounded-dfz-lg text-xs text-dfz-text focus:outline-none focus:border-dfz-accent"
              />

              <div className="space-y-1.5 max-h-60 overflow-y-auto">
                {filteredSubscribers.map((m) => {
                  const isCurrent = m.userId === user?.id;
                  const isMemberAdmin = m.role === MemberRole.ADMIN || m.role === MemberRole.OWNER;
                  return (
                    <div
                      key={m.userId}
                      className="flex items-center justify-between p-2 rounded-dfz-xl hover:bg-dfz-surface-secondary border border-transparent hover:border-dfz-border transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <Avatar
                          src={m.avatarUrl}
                          name={m.displayName || m.username}
                          size="sm"
                        />
                        <div>
                          <div className="font-semibold text-xs text-dfz-text">
                            {m.displayName || m.username}
                          </div>
                          <div className="text-[10px] text-dfz-text-muted">@{m.username}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {isOwner && !isMemberAdmin && (
                          <button
                            onClick={() => setSelectedSubForAdmin(m)}
                            className="p-1.5 text-xs text-cyan-400 hover:bg-cyan-500/10 rounded-dfz-md transition-colors"
                            title="Сделать администратором"
                          >
                            <Shield size={14} />
                          </button>
                        )}
                        {isOwner && !isCurrent && m.role !== MemberRole.OWNER && (
                          <button
                            onClick={() => handleRemoveSubscriber(m.userId)}
                            className="p-1.5 text-xs text-rose-400 hover:bg-rose-500/10 rounded-dfz-md transition-colors"
                            title="Удалить из канала"
                          >
                            <UserX size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Sub-dialog: Promote selected subscriber to admin */}
              {selectedSubForAdmin && (
                <div className="p-3 bg-dfz-bg border border-dfz-accent/40 rounded-dfz-xl space-y-2 animate-fade-in">
                  <div className="font-semibold text-xs text-dfz-accent">
                    Назначить {selectedSubForAdmin.user?.profile?.displayName || selectedSubForAdmin.user?.username} админом канала
                  </div>
                  <input
                    type="text"
                    value={adminTitle}
                    onChange={(e) => setAdminTitle(e.target.value)}
                    placeholder="Должность (например: Редактор новостей)"
                    className="w-full h-8 px-2.5 bg-dfz-surface border border-dfz-border rounded-dfz-lg text-xs text-dfz-text focus:outline-none"
                  />
                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setSelectedSubForAdmin(null)}
                      className="px-3 py-1 text-xs text-dfz-text-muted hover:text-dfz-text"
                    >
                      Отмена
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePromoteToAdmin(selectedSubForAdmin)}
                      className="px-3 py-1 text-xs font-semibold bg-dfz-accent hover:bg-dfz-accent-hover text-white rounded-dfz-md"
                    >
                      Подтвердить
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: INVITES */}
          {activeTab === 'invites' && (
            <div className="space-y-4">
              <InviteManager chatId={chat.id} />
              <div className="space-y-1">
                <span className="text-[11px] font-semibold text-dfz-text-muted">
                  Ссылка-приглашение канала
                </span>
                <div className="flex items-center gap-2 p-2 bg-dfz-bg border border-dfz-border rounded-dfz-xl">
                  <span className="flex-1 font-mono text-xs text-dfz-accent truncate">
                    {window.location.origin}/join/{inviteCode}
                  </span>
                  <button
                    onClick={handleCopyLink}
                    className="p-1.5 rounded-dfz-lg hover:bg-dfz-surface text-dfz-text-muted hover:text-dfz-text transition-colors"
                    title="Копировать ссылку"
                  >
                    {copied ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
                  </button>
                </div>
              </div>

              {isOwner && (
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleRegenerateInvite}
                    className="w-full py-2 px-3 flex items-center justify-center gap-2 rounded-dfz-xl border border-dfz-border hover:bg-dfz-surface-secondary text-dfz-text transition-colors"
                  >
                    <RefreshCw size={14} />
                    <span>Сбросить и сгенерировать новую ссылку</span>
                  </button>
                </div>
              )}

              {/* Danger Zone */}
              <div className="pt-6 border-t border-dfz-border/80 space-y-2">
                <div className="font-semibold text-xs text-rose-400">Опасная зона</div>
                {isOwner ? (
                  <button
                    type="button"
                    onClick={handleDeleteChannel}
                    className="w-full py-2.5 px-4 rounded-dfz-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 font-semibold text-xs flex items-center justify-center gap-2 transition-colors"
                  >
                    <Trash2 size={15} />
                    <span>Удалить канал навсегда</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={async () => {
                      if (confirm('Отписаться и покинуть канал?')) {
                        await apiRequest(`/api/chats/${chat.id}/members/${user?.id}`, { method: 'DELETE' });
                        onClose();
                        await fetchChats();
                        useChatStore.setState({ activeChatId: null, activeChat: null });
                      }
                    }}
                    className="w-full py-2.5 px-4 rounded-dfz-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 font-semibold text-xs flex items-center justify-center gap-2 transition-colors"
                  >
                    <LogOut size={15} />
                    <span>Покинуть канал</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
