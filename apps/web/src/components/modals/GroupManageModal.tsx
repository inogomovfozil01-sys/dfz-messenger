import React, { useState, useEffect } from 'react';
import {
  X,
  Users,
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
} from 'lucide-react';
import { Chat, MemberRole } from '@dfz/types';
import { Avatar } from '../ui/Avatar';
import { apiRequest } from '../../lib/api';
import { useAuthStore } from '../../stores/authStore';
import { useChatStore } from '../../stores/chatStore';

interface GroupManageModalProps {
  isOpen: boolean;
  onClose: () => void;
  chat: Chat | null;
}

type TabType = 'general' | 'permissions' | 'admins' | 'members' | 'invites';

export const GroupManageModal: React.FC<GroupManageModalProps> = ({
  isOpen,
  onClose,
  chat,
}) => {
  const { user } = useAuthStore();
  const { fetchChats, selectChat } = useChatStore();

  const [activeTab, setActiveTab] = useState<TabType>('general');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [isForum, setIsForum] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Permissions state
  const [permSendMessages, setPermSendMessages] = useState(true);
  const [permSendMedia, setPermSendMedia] = useState(true);
  const [permAddUsers, setPermAddUsers] = useState(true);
  const [permPinMessages, setPermPinMessages] = useState(false);
  const [permChangeInfo, setPermChangeInfo] = useState(false);

  // Members list & management
  const [members, setMembers] = useState<any[]>([]);
  const [memberSearch, setMemberSearch] = useState('');
  const [selectedMemberForAdmin, setSelectedMemberForAdmin] = useState<any | null>(null);
  const [adminTitle, setAdminTitle] = useState('');

  const isOwner = chat?.ownerId === user?.id || chat?.members?.some((m) => m.userId === user?.id && m.role === MemberRole.OWNER);

  useEffect(() => {
    if (chat && isOpen) {
      setTitle(chat.title || '');
      setDescription(chat.description || '');
      setAvatarUrl(chat.avatarUrl || '');
      setIsPublic(!!chat.isPublic);
      setIsForum(!!chat.isForum);
      setInviteCode(chat.inviteCode || '');
      setMembers(chat.members || []);
      setStatusMessage(null);
      setErrorMessage(null);
      setSelectedMemberForAdmin(null);
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
        isForum,
      }),
    });

    setIsSaving(false);

    if (res.success && res.data) {
      setStatusMessage('Настройки группы успешно сохранены');
      await fetchChats();
      setTimeout(() => setStatusMessage(null), 3000);
    } else {
      setErrorMessage(res.error?.message || 'Не удалось сохранить настройки');
    }
  };

  const handleCopyLink = () => {
    const link = `${window.location.origin}/join/${inviteCode}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRegenerateInvite = async () => {
    if (!confirm('Аннулировать текущую ссылку и создать новую? Старая ссылка перестанет работать.')) {
      return;
    }
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
        customTitle: adminTitle.trim() || 'Администратор',
      }),
    });

    if (res.success) {
      setMembers((prev) =>
        prev.map((m) =>
          (m.userId === targetUser.userId || m.userId === targetUser.id)
            ? { ...m, role: MemberRole.ADMIN, customTitle: adminTitle.trim() || 'Администратор' }
            : m
        )
      );
      setSelectedMemberForAdmin(null);
      setAdminTitle('');
      setStatusMessage(`Пользователь ${targetUser.user?.profile?.displayName || targetUser.user?.username} назначен администратором`);
      await fetchChats();
    }
  };

  const handleDemoteAdmin = async (targetUserId: string) => {
    if (!confirm('Снять полномочия администратора с этого пользователя?')) return;
    const res = await apiRequest(`/api/chats/${chat.id}/members/${targetUserId}/role`, {
      method: 'PUT',
      body: JSON.stringify({
        role: MemberRole.MEMBER,
        customTitle: null,
      }),
    });
    if (res.success) {
      setMembers((prev) =>
        prev.map((m) =>
          m.userId === targetUserId ? { ...m, role: MemberRole.MEMBER, customTitle: null } : m
        )
      );
      setStatusMessage('Администратор переведен в статус участника');
      await fetchChats();
    }
  };

  const handleRemoveMember = async (targetUserId: string) => {
    if (!confirm('Исключить этого участника из группы?')) return;
    const res = await apiRequest(`/api/chats/${chat.id}/members/${targetUserId}`, {
      method: 'DELETE',
    });
    if (res.success) {
      setMembers((prev) => prev.filter((m) => m.userId !== targetUserId));
      setStatusMessage('Участник исключен');
      await fetchChats();
    }
  };

  const handleDeleteGroup = async () => {
    if (confirm('ВЫ УВЕРЕНЫ, ЧТО ХОТИТЕ УДАЛИТЬ ЭТУ ГРУППУ? Это действие необратимо и удалит всю историю для всех участников.')) {
      const res = await apiRequest(`/api/chats/${chat.id}`, { method: 'DELETE' });
      if (res.success) {
        onClose();
        await fetchChats();
        useChatStore.setState({ activeChatId: null, activeChat: null });
      }
    }
  };

  const filteredMembers = members.filter((m) => {
    const name = m.user?.profile?.displayName || m.user?.username || '';
    return name.toLowerCase().includes(memberSearch.toLowerCase());
  });

  const adminsList = members.filter(
    (m) => m.role === MemberRole.OWNER || m.role === MemberRole.ADMIN
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 select-none">
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      <div className="relative z-10 w-full max-w-lg max-h-[90vh] bg-dfz-surface border border-dfz-border rounded-dfz-2xl shadow-2xl flex flex-col overflow-hidden animate-slide-up">
        {/* Top Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-dfz-border bg-dfz-surface-secondary">
          <div className="flex items-center gap-2.5">
            <Sliders size={18} className="text-dfz-accent" />
            <h3 className="text-sm font-bold text-dfz-text">Управление группой</h3>
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
            onClick={() => setActiveTab('permissions')}
            className={`px-3 py-2 text-xs font-semibold border-b-2 whitespace-nowrap transition-colors ${
              activeTab === 'permissions'
                ? 'border-dfz-accent text-dfz-accent'
                : 'border-transparent text-dfz-text-muted hover:text-dfz-text'
            }`}
          >
            Разрешения
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
            onClick={() => setActiveTab('members')}
            className={`px-3 py-2 text-xs font-semibold border-b-2 whitespace-nowrap transition-colors ${
              activeTab === 'members'
                ? 'border-dfz-accent text-dfz-accent'
                : 'border-transparent text-dfz-text-muted hover:text-dfz-text'
            }`}
          >
            Участники ({members.length})
          </button>
          <button
            onClick={() => setActiveTab('invites')}
            className={`px-3 py-2 text-xs font-semibold border-b-2 whitespace-nowrap transition-colors ${
              activeTab === 'invites'
                ? 'border-dfz-accent text-dfz-accent'
                : 'border-transparent text-dfz-text-muted hover:text-dfz-text'
            }`}
          >
            Приглашения
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

        {/* Tab Body */}
        <div className="flex-1 overflow-y-auto p-5 text-xs text-dfz-text space-y-4">
          {/* TAB 1: GENERAL */}
          {activeTab === 'general' && (
            <form onSubmit={handleSaveGeneral} className="space-y-4">
              <div className="flex items-center gap-4">
                <Avatar src={avatarUrl || chat.avatarUrl} name={title || chat.title} size="xl" />
                <div className="flex-1 space-y-1">
                  <label className="text-[11px] font-semibold text-dfz-text-muted">URL Аватара группы</label>
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
                <label className="text-[11px] font-semibold text-dfz-text-muted">Название группы</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full h-9 px-3 bg-dfz-bg border border-dfz-border rounded-dfz-lg text-xs text-dfz-text focus:outline-none focus:border-dfz-accent"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-dfz-text-muted">Описание</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Добавьте описание или правила группы..."
                  className="w-full p-2.5 bg-dfz-bg border border-dfz-border rounded-dfz-lg text-xs text-dfz-text focus:outline-none focus:border-dfz-accent resize-none"
                />
              </div>

              <div className="p-3 rounded-dfz-xl bg-dfz-surface-secondary border border-dfz-border space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {isPublic ? <Globe size={16} className="text-dfz-accent" /> : <Lock size={16} className="text-dfz-text-muted" />}
                    <div>
                      <div className="font-semibold text-xs text-dfz-text">Тип группы</div>
                      <div className="text-[11px] text-dfz-text-muted">
                        {isPublic ? 'Публичная (видна в поиске)' : 'Частная (вход только по ссылке)'}
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
                    <div className="font-semibold text-xs text-dfz-text">Темы / Форум</div>
                    <div className="text-[11px] text-dfz-text-muted">
                      Разделение группы на ветки и разделы по темам
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={isForum}
                    onChange={(e) => setIsForum(e.target.checked)}
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

          {/* TAB 2: PERMISSIONS */}
          {activeTab === 'permissions' && (
            <div className="space-y-3">
              <p className="text-[11px] text-dfz-text-muted">
                Укажите, какие действия разрешены обычным участникам группы:
              </p>

              <div className="space-y-2 p-3 bg-dfz-surface-secondary border border-dfz-border rounded-dfz-xl">
                <label className="flex items-center justify-between p-2 rounded-dfz-lg hover:bg-dfz-surface cursor-pointer">
                  <span>Отправка текстовых сообщений</span>
                  <input
                    type="checkbox"
                    checked={permSendMessages}
                    onChange={(e) => setPermSendMessages(e.target.checked)}
                    className="w-4 h-4 rounded text-dfz-accent bg-dfz-bg border-dfz-border"
                  />
                </label>

                <label className="flex items-center justify-between p-2 rounded-dfz-lg hover:bg-dfz-surface cursor-pointer">
                  <span>Отправка медиа, стикеров и файлов</span>
                  <input
                    type="checkbox"
                    checked={permSendMedia}
                    onChange={(e) => setPermSendMedia(e.target.checked)}
                    className="w-4 h-4 rounded text-dfz-accent bg-dfz-bg border-dfz-border"
                  />
                </label>

                <label className="flex items-center justify-between p-2 rounded-dfz-lg hover:bg-dfz-surface cursor-pointer">
                  <span>Добавление новых участников</span>
                  <input
                    type="checkbox"
                    checked={permAddUsers}
                    onChange={(e) => setPermAddUsers(e.target.checked)}
                    className="w-4 h-4 rounded text-dfz-accent bg-dfz-bg border-dfz-border"
                  />
                </label>

                <label className="flex items-center justify-between p-2 rounded-dfz-lg hover:bg-dfz-surface cursor-pointer">
                  <span>Закрепление сообщений</span>
                  <input
                    type="checkbox"
                    checked={permPinMessages}
                    onChange={(e) => setPermPinMessages(e.target.checked)}
                    className="w-4 h-4 rounded text-dfz-accent bg-dfz-bg border-dfz-border"
                  />
                </label>

                <label className="flex items-center justify-between p-2 rounded-dfz-lg hover:bg-dfz-surface cursor-pointer">
                  <span>Изменение информации о группе</span>
                  <input
                    type="checkbox"
                    checked={permChangeInfo}
                    onChange={(e) => setPermChangeInfo(e.target.checked)}
                    className="w-4 h-4 rounded text-dfz-accent bg-dfz-bg border-dfz-border"
                  />
                </label>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setStatusMessage('Разрешения участников обновлены');
                    setTimeout(() => setStatusMessage(null), 3000);
                  }}
                  className="px-4 py-2 bg-dfz-accent hover:bg-dfz-accent-hover text-white rounded-dfz-lg font-semibold text-xs shadow-md transition-colors"
                >
                  Применить разрешения
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: ADMINS */}
          {activeTab === 'admins' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-dfz-text-muted">
                  Список администраторов с правами управления группой
                </span>
              </div>

              <div className="space-y-1.5">
                {adminsList.map((m) => {
                  const isCurrent = m.userId === user?.id;
                  const isOwnerMember = m.role === MemberRole.OWNER;
                  return (
                    <div
                      key={m.userId}
                      className="flex items-center justify-between p-2.5 rounded-dfz-xl bg-dfz-surface-secondary border border-dfz-border"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar
                          src={m.user?.profile?.avatarUrl}
                          name={m.user?.profile?.displayName || m.user?.username}
                          size="md"
                        />
                        <div>
                          <div className="font-semibold text-xs text-dfz-text flex items-center gap-1.5">
                            <span>{m.user?.profile?.displayName || m.user?.username}</span>
                            {isOwnerMember && (
                              <span className="px-1.5 py-0.2 rounded-full bg-amber-500/20 text-[10px] font-bold text-amber-400">
                                Владелец
                              </span>
                            )}
                            {!isOwnerMember && (
                              <span className="px-1.5 py-0.2 rounded-full bg-cyan-500/20 text-[10px] font-semibold text-cyan-400">
                                {m.customTitle || 'Админ'}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-dfz-text-muted">@{m.user?.username}</div>
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

              {/* Add admin modal prompt if owner */}
              {isOwner && (
                <div className="pt-2 border-t border-dfz-border space-y-2">
                  <div className="font-semibold text-xs text-dfz-text">
                    Назначить нового администратора
                  </div>
                  <div className="text-[11px] text-dfz-text-muted">
                    Выберите участника из списка во вкладке «Участники» для наделения правами.
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: MEMBERS */}
          {activeTab === 'members' && (
            <div className="space-y-3">
              <input
                type="text"
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
                placeholder="Поиск по участникам..."
                className="w-full h-8 px-3 bg-dfz-bg border border-dfz-border rounded-dfz-lg text-xs text-dfz-text focus:outline-none focus:border-dfz-accent"
              />

              <div className="space-y-1.5 max-h-60 overflow-y-auto">
                {filteredMembers.map((m) => {
                  const isCurrent = m.userId === user?.id;
                  const isMemberAdmin = m.role === MemberRole.ADMIN || m.role === MemberRole.OWNER;
                  return (
                    <div
                      key={m.userId}
                      className="flex items-center justify-between p-2 rounded-dfz-xl hover:bg-dfz-surface-secondary border border-transparent hover:border-dfz-border transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <Avatar
                          src={m.user?.profile?.avatarUrl}
                          name={m.user?.profile?.displayName || m.user?.username}
                          size="sm"
                        />
                        <div>
                          <div className="font-semibold text-xs text-dfz-text">
                            {m.user?.profile?.displayName || m.user?.username}
                          </div>
                          <div className="text-[10px] text-dfz-text-muted">@{m.user?.username}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {isOwner && !isMemberAdmin && (
                          <button
                            onClick={() => setSelectedMemberForAdmin(m)}
                            className="p-1.5 text-xs text-cyan-400 hover:bg-cyan-500/10 rounded-dfz-md transition-colors"
                            title="Сделать администратором"
                          >
                            <Shield size={14} />
                          </button>
                        )}
                        {isOwner && !isCurrent && m.role !== MemberRole.OWNER && (
                          <button
                            onClick={() => handleRemoveMember(m.userId)}
                            className="p-1.5 text-xs text-rose-400 hover:bg-rose-500/10 rounded-dfz-md transition-colors"
                            title="Исключить из группы"
                          >
                            <UserX size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Sub-dialog: Promote selected member to admin */}
              {selectedMemberForAdmin && (
                <div className="p-3 bg-dfz-bg border border-dfz-accent/40 rounded-dfz-xl space-y-2 animate-fade-in">
                  <div className="font-semibold text-xs text-dfz-accent">
                    Назначить {selectedMemberForAdmin.user?.profile?.displayName || selectedMemberForAdmin.user?.username} админом
                  </div>
                  <input
                    type="text"
                    value={adminTitle}
                    onChange={(e) => setAdminTitle(e.target.value)}
                    placeholder="Должность / титул (например: Модератор)"
                    className="w-full h-8 px-2.5 bg-dfz-surface border border-dfz-border rounded-dfz-lg text-xs text-dfz-text focus:outline-none"
                  />
                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setSelectedMemberForAdmin(null)}
                      className="px-3 py-1 text-xs text-dfz-text-muted hover:text-dfz-text"
                    >
                      Отмена
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePromoteToAdmin(selectedMemberForAdmin)}
                      className="px-3 py-1 text-xs font-semibold bg-dfz-accent hover:bg-dfz-accent-hover text-white rounded-dfz-md"
                    >
                      Подтвердить
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 5: INVITES */}
          {activeTab === 'invites' && (
            <div className="space-y-4">
              <div className="space-y-1">
                <span className="text-[11px] font-semibold text-dfz-text-muted">
                  Пригласительная ссылка группы
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
                    <span>Аннулировать и создать новую ссылку</span>
                  </button>
                </div>
              )}

              {/* Danger Zone */}
              <div className="pt-6 border-t border-dfz-border/80 space-y-2">
                <div className="font-semibold text-xs text-rose-400">Опасная зона</div>
                {isOwner ? (
                  <button
                    type="button"
                    onClick={handleDeleteGroup}
                    className="w-full py-2.5 px-4 rounded-dfz-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 font-semibold text-xs flex items-center justify-center gap-2 transition-colors"
                  >
                    <Trash2 size={15} />
                    <span>Удалить группу навсегда</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={async () => {
                      if (confirm('Покинуть эту группу?')) {
                        await apiRequest(`/api/chats/${chat.id}/members/${user?.id}`, { method: 'DELETE' });
                        onClose();
                        await fetchChats();
                        useChatStore.setState({ activeChatId: null, activeChat: null });
                      }
                    }}
                    className="w-full py-2.5 px-4 rounded-dfz-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 font-semibold text-xs flex items-center justify-center gap-2 transition-colors"
                  >
                    <LogOut size={15} />
                    <span>Покинуть группу</span>
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
