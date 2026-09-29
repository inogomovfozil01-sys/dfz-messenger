'use client';

import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  X,
  Check,
  Camera,
  Globe,
  Lock,
  MessageSquare,
  Smile,
  Shield,
  ShieldCheck,
  Link2,
  Users,
  Clock,
  Trash2,
  LogOut,
  ChevronRight,
  Copy,
  RefreshCw,
  UserPlus,
  UserX,
  Search,
  Sliders,
  CheckCircle,
  AlertCircle,
  FileText,
  Share2,
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

type ManageView =
  | 'main'
  | 'type'
  | 'permissions'
  | 'admins'
  | 'members'
  | 'invites'
  | 'reactions';

export const GroupManageModal: React.FC<GroupManageModalProps> = ({
  isOpen,
  onClose,
  chat,
}) => {
  const { user } = useAuthStore();
  const { fetchChats, selectChat } = useChatStore();

  const [currentView, setCurrentView] = useState<ManageView>('main');

  // Main Info
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [isPublic, setIsPublic] = useState(false);
  const [publicHandle, setPublicHandle] = useState('');
  const [isForum, setIsForum] = useState(false);
  const [isHistoryVisible, setIsHistoryVisible] = useState(true);

  // Policy / Permissions
  const [permSendMessages, setPermSendMessages] = useState(true);
  const [permSendMedia, setPermSendMedia] = useState(true);
  const [permSendStickers, setPermSendStickers] = useState(true);
  const [permSendPolls, setPermSendPolls] = useState(true);
  const [permEmbedLinks, setPermEmbedLinks] = useState(true);
  const [permAddMembers, setPermAddMembers] = useState(true);
  const [permPinMessages, setPermPinMessages] = useState(false);
  const [permChangeInfo, setPermChangeInfo] = useState(false);
  const [permProtectedContent, setPermProtectedContent] = useState(false);
  const [slowModeSeconds, setSlowModeSeconds] = useState(0);

  // Members & Admins
  const [members, setMembers] = useState<any[]>([]);
  const [memberSearch, setMemberSearch] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [copied, setCopied] = useState(false);

  // Admin promotion sub-flow
  const [selectedMemberForAdmin, setSelectedMemberForAdmin] = useState<any | null>(null);
  const [adminCustomTitle, setAdminCustomTitle] = useState('Администратор');

  // Status & Feedback
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isOwner =
    chat?.ownerId === user?.id ||
    chat?.members?.some((m) => m.userId === user?.id && m.role === MemberRole.OWNER);

  useEffect(() => {
    if (chat && isOpen) {
      setTitle(chat.title || '');
      setDescription(chat.description || '');
      setAvatarUrl(chat.avatarUrl || '');
      setIsPublic(!!chat.isPublic);
      setPublicHandle((chat as any).publicHandle || '');
      setIsForum(!!chat.isForum);
      setInviteCode(chat.inviteCode || '');
      setMembers(chat.members || []);
      setCurrentView('main');
      setStatusMessage(null);
      setErrorMessage(null);
      setSelectedMemberForAdmin(null);

      // Load policy from API
      apiRequest<any>(`/api/chats/${chat.id}/policy`).then((res) => {
        if (res.success && res.data) {
          const p = res.data;
          if (p.sendMessages !== undefined) setPermSendMessages(p.sendMessages);
          if (p.sendMedia !== undefined) setPermSendMedia(p.sendMedia);
          if (p.sendStickers !== undefined) setPermSendStickers(p.sendStickers);
          if (p.sendPolls !== undefined) setPermSendPolls(p.sendPolls);
          if (p.embedLinks !== undefined) setPermEmbedLinks(p.embedLinks);
          if (p.addMembers !== undefined) setPermAddMembers(p.addMembers);
          if (p.pinMessages !== undefined) setPermPinMessages(p.pinMessages);
          if (p.changeInfo !== undefined) setPermChangeInfo(p.changeInfo);
          if (p.protectedContent !== undefined) setPermProtectedContent(p.protectedContent);
          if (p.slowModeSeconds !== undefined) setSlowModeSeconds(p.slowModeSeconds);
        }
      });
    }
  }, [chat, isOpen]);

  if (!isOpen || !chat) return null;

  const handleSaveAll = async () => {
    if (!title.trim()) {
      setErrorMessage('Пожалуйста, введите название группы');
      return;
    }

    setIsSaving(true);
    setStatusMessage(null);
    setErrorMessage(null);

    // 1. Update basic Chat settings
    const chatRes = await apiRequest<Chat>(`/api/chats/${chat.id}`, {
      method: 'PUT',
      body: JSON.stringify({
        title: title.trim(),
        description: description.trim() || undefined,
        avatarUrl: avatarUrl.trim() || undefined,
        isPublic,
        isForum,
      }),
    });

    // 2. Update Group Policy / Permissions
    const policyRes = await apiRequest(`/api/chats/${chat.id}/policy`, {
      method: 'PUT',
      body: JSON.stringify({
        sendMessages: permSendMessages,
        sendMedia: permSendMedia,
        sendStickers: permSendStickers,
        sendPolls: permSendPolls,
        embedLinks: permEmbedLinks,
        addMembers: permAddMembers,
        pinMessages: permPinMessages,
        changeInfo: permChangeInfo,
        protectedContent: permProtectedContent,
        slowModeSeconds,
      }),
    });

    setIsSaving(false);

    if (chatRes.success && policyRes.success) {
      setStatusMessage('Настройки сохранены');
      await fetchChats();
      setTimeout(() => {
        setStatusMessage(null);
        onClose();
      }, 700);
    } else {
      setErrorMessage(
        chatRes.error?.message || policyRes.error?.message || 'Ошибка сохранения настроек'
      );
    }
  };

  const handleCopyLink = () => {
    const link = `${window.location.origin}/join/${inviteCode}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRegenerateInvite = async () => {
    if (!confirm('Аннулировать текущую ссылку и создать новую? Предыдущая ссылка перестанет работать.')) {
      return;
    }
    const res = await apiRequest<any>(`/api/chats/${chat.id}/invite-link`, {
      method: 'POST',
    });
    if (res.success && res.data) {
      setInviteCode(res.data.inviteCode);
      setStatusMessage('Новая ссылка сгенерирована');
      setTimeout(() => setStatusMessage(null), 2500);
    }
  };

  const handlePromoteToAdmin = async (targetUser: any) => {
    const res = await apiRequest(
      `/api/chats/${chat.id}/members/${targetUser.userId || targetUser.id}/role`,
      {
        method: 'PUT',
        body: JSON.stringify({
          role: MemberRole.ADMIN,
          customTitle: adminCustomTitle.trim() || 'Администратор',
        }),
      }
    );

    if (res.success) {
      setMembers((prev) =>
        prev.map((m) =>
          m.userId === targetUser.userId || m.userId === targetUser.id
            ? { ...m, role: MemberRole.ADMIN, customTitle: adminCustomTitle.trim() || 'Администратор' }
            : m
        )
      );
      setSelectedMemberForAdmin(null);
      setStatusMessage('Администратор назначен');
      await fetchChats();
      setTimeout(() => setStatusMessage(null), 2500);
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
      setStatusMessage('Полномочия сняты');
      await fetchChats();
      setTimeout(() => setStatusMessage(null), 2500);
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
      setTimeout(() => setStatusMessage(null), 2500);
    }
  };

  const handleDeleteGroup = async () => {
    if (
      confirm(
        'ВЫ УВЕРЕНЫ, ЧТО ХОТИТЕ УДАЛИТЬ ЭТУ ГРУППУ? Это действие необратимо и удалит всю историю сообщений для всех участников.'
      )
    ) {
      const res = await apiRequest(`/api/chats/${chat.id}`, { method: 'DELETE' });
      if (res.success) {
        onClose();
        await fetchChats();
        useChatStore.setState({ activeChatId: null, activeChat: null });
      }
    }
  };

  const handleLeaveGroup = async () => {
    if (confirm('Покинуть эту группу?')) {
      await apiRequest(`/api/chats/${chat.id}/members/${user?.id}`, { method: 'DELETE' });
      onClose();
      await fetchChats();
      useChatStore.setState({ activeChatId: null, activeChat: null });
    }
  };

  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatarUrl(reader.result as string);
    };
    reader.readAsDataURL(file);

    setIsUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await apiRequest<{ url: string }>('/api/media/upload', {
        method: 'POST',
        body: formData,
      });
      if (res.success && res.data?.url) {
        setAvatarUrl(res.data.url);
      }
    } catch {
      // Keep data URI preview
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleAvatarSelect = () => {
    avatarInputRef.current?.click();
  };

  const adminsList = members.filter(
    (m) => m.role === MemberRole.OWNER || m.role === MemberRole.ADMIN
  );

  const filteredMembers = members.filter((m) => {
    const name = m.displayName || m.username || '';
    return name.toLowerCase().includes(memberSearch.toLowerCase());
  });

  const slowModeOptions = [
    { label: 'Выкл', val: 0 },
    { label: '10с', val: 10 },
    { label: '30с', val: 30 },
    { label: '1м', val: 60 },
    { label: '5м', val: 300 },
    { label: '15м', val: 900 },
    { label: '1ч', val: 3600 },
  ];

  // Title depending on current view
  const viewTitleMap: Record<ManageView, string> = {
    main: 'Управление группой',
    type: 'Тип группы',
    permissions: 'Разрешения',
    admins: 'Администраторы',
    members: 'Участники',
    invites: 'Пригласительные ссылки',
    reactions: 'Реакции',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-fade-in select-none">
      <div className="relative w-full max-w-md max-h-[92vh] bg-[#18181c] border border-[#292930] rounded-dfz-2xl shadow-2xl flex flex-col overflow-hidden text-dfz-text">
        {/* Telegram Top Bar: [← or ✕] [Title] [✓ Checkmark] */}
        <div className="h-14 px-4 border-b border-[#292930] flex items-center justify-between shrink-0 bg-[#18181c]">
          <div className="flex items-center gap-3">
            {currentView === 'main' ? (
              <button
                onClick={onClose}
                className="p-2 -ml-2 rounded-full hover:bg-[#28282e] text-dfz-text-muted hover:text-dfz-text transition-colors"
                title="Закрыть"
              >
                <X size={20} />
              </button>
            ) : (
              <button
                onClick={() => setCurrentView('main')}
                className="p-2 -ml-2 rounded-full hover:bg-[#28282e] text-dfz-text-muted hover:text-dfz-text transition-colors"
                title="Назад"
              >
                <ArrowLeft size={20} />
              </button>
            )}
            <h2 className="text-base font-bold text-dfz-text">{viewTitleMap[currentView]}</h2>
          </div>

          <button
            onClick={handleSaveAll}
            disabled={isSaving}
            className="p-2 -mr-2 rounded-full hover:bg-[#8774e1]/15 text-[#8774e1] hover:text-[#7662d8] transition-colors disabled:opacity-50"
            title="Сохранить"
          >
            {isSaving ? (
              <span className="w-5 h-5 border-2 border-[#8774e1] border-t-transparent rounded-full block animate-spin" />
            ) : (
              <Check size={22} strokeWidth={2.5} />
            )}
          </button>
        </div>

        {/* Status Alerts */}
        {statusMessage && (
          <div className="mx-4 mt-3 p-2.5 rounded-dfz-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs flex items-center gap-2">
            <Check size={14} />
            <span>{statusMessage}</span>
          </div>
        )}
        {errorMessage && (
          <div className="mx-4 mt-3 p-2.5 rounded-dfz-xl bg-[#ef5350]/10 border border-[#ef5350]/25 text-[#ef5350] text-xs flex items-center gap-2">
            <AlertCircle size={14} />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Scrollable View Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* VIEW: MAIN ROOT SCREEN (Exact Telegram Web Layout) */}
          {currentView === 'main' && (
            <div className="space-y-4 animate-fade-in">
              {/* Group Avatar & Basic Info */}
              <div className="flex flex-col items-center pt-2">
                <input
                  type="file"
                  ref={avatarInputRef}
                  onChange={handleAvatarFileChange}
                  accept="image/*"
                  className="hidden"
                />
                <div
                  onClick={handleAvatarSelect}
                  className="relative w-24 h-24 rounded-full cursor-pointer group select-none shadow-lg ring-2 ring-transparent hover:ring-[#8774e1] transition-all"
                >
                  <Avatar
                    src={avatarUrl || chat.avatarUrl}
                    name={title || chat.title}
                    size="xl"
                    className="w-24 h-24 text-2xl"
                  />
                  <div className="absolute inset-0 bg-black/45 rounded-full flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    {isUploadingAvatar ? (
                      <span className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <Camera size={26} className="text-white drop-shadow" />
                        <span className="text-[10px] text-white font-medium mt-0.5">Выбрать</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <button
                    type="button"
                    onClick={handleAvatarSelect}
                    className="text-xs text-[#8774e1] hover:underline font-semibold"
                  >
                    Выбрать фото
                  </button>
                  {avatarUrl && (
                    <button
                      type="button"
                      onClick={() => setAvatarUrl('')}
                      className="text-xs text-rose-400 hover:underline"
                    >
                      Удалить
                    </button>
                  )}
                </div>
              </div>

              {/* Title & Description Card */}
              <div className="p-3.5 rounded-dfz-xl bg-[#212126] border border-[#292930] space-y-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-dfz-text-muted">Название группы</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Название группы"
                    className="w-full h-9 px-3 rounded-dfz-lg bg-[#18181c] border border-[#292930] text-sm text-dfz-text focus:outline-none focus:border-[#8774e1]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-dfz-text-muted">Описание (необязательно)</label>
                  <textarea
                    rows={2}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Добавьте описание или правила группы..."
                    className="w-full px-3 py-2 rounded-dfz-lg bg-[#18181c] border border-[#292930] text-xs text-dfz-text placeholder:text-dfz-text-muted resize-none focus:outline-none focus:border-[#8774e1]"
                  />
                </div>
              </div>

              {/* Telegram Setting Items Card 1 */}
              <div className="rounded-dfz-xl bg-[#212126] border border-[#292930] divide-y divide-[#292930] overflow-hidden">
                {/* Group Type Row */}
                <div
                  onClick={() => setCurrentView('type')}
                  className="p-3.5 flex items-center justify-between hover:bg-[#28282e] cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {isPublic ? (
                      <Globe size={18} className="text-[#8774e1]" />
                    ) : (
                      <Lock size={18} className="text-dfz-text-muted" />
                    )}
                    <div>
                      <div className="text-xs font-semibold text-dfz-text">Тип группы</div>
                      <div className="text-[11px] text-dfz-text-muted">
                        {isPublic ? 'Публичная' : 'Частная'}
                      </div>
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-dfz-text-muted" />
                </div>

                {/* History Visibility Row */}
                <div
                  onClick={() => setIsHistoryVisible(!isHistoryVisible)}
                  className="p-3.5 flex items-center justify-between hover:bg-[#28282e] cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Clock size={18} className="text-[#8774e1]" />
                    <div>
                      <div className="text-xs font-semibold text-dfz-text">
                        История чата для новых участников
                      </div>
                      <div className="text-[11px] text-dfz-text-muted">
                        {isHistoryVisible ? 'Видна' : 'Скрыта'}
                      </div>
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-dfz-text-muted" />
                </div>

                {/* Forum / Topics Switch Row */}
                <div className="p-3.5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <MessageSquare size={18} className="text-[#8774e1]" />
                    <div>
                      <div className="text-xs font-semibold text-dfz-text">Темы</div>
                      <div className="text-[11px] text-dfz-text-muted">
                        Разделение чата на темы и ветки
                      </div>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={isForum}
                    onChange={(e) => setIsForum(e.target.checked)}
                    className="w-4 h-4 rounded text-[#8774e1] bg-[#18181c] border-[#292930] focus:ring-0 cursor-pointer"
                  />
                </div>

                {/* Reactions Row */}
                <div
                  onClick={() => setCurrentView('reactions')}
                  className="p-3.5 flex items-center justify-between hover:bg-[#28282e] cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Smile size={18} className="text-[#8774e1]" />
                    <div>
                      <div className="text-xs font-semibold text-dfz-text">Реакции</div>
                      <div className="text-[11px] text-dfz-text-muted">Все реакции</div>
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-dfz-text-muted" />
                </div>
              </div>

              {/* Telegram Setting Items Card 2 */}
              <div className="rounded-dfz-xl bg-[#212126] border border-[#292930] divide-y divide-[#292930] overflow-hidden">
                {/* Permissions */}
                <div
                  onClick={() => setCurrentView('permissions')}
                  className="p-3.5 flex items-center justify-between hover:bg-[#28282e] cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Shield size={18} className="text-[#8774e1]" />
                    <div>
                      <div className="text-xs font-semibold text-dfz-text">Разрешения</div>
                      <div className="text-[11px] text-dfz-text-muted">
                        Что могут делать участники
                      </div>
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-dfz-text-muted" />
                </div>

                {/* Invite Links */}
                <div
                  onClick={() => setCurrentView('invites')}
                  className="p-3.5 flex items-center justify-between hover:bg-[#28282e] cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Link2 size={18} className="text-[#8774e1]" />
                    <div>
                      <div className="text-xs font-semibold text-dfz-text">
                        Пригласительные ссылки
                      </div>
                      <div className="text-[11px] text-dfz-text-muted">1 ссылка</div>
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-dfz-text-muted" />
                </div>

                {/* Administrators */}
                <div
                  onClick={() => setCurrentView('admins')}
                  className="p-3.5 flex items-center justify-between hover:bg-[#28282e] cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <ShieldCheck size={18} className="text-[#8774e1]" />
                    <div>
                      <div className="text-xs font-semibold text-dfz-text">Администраторы</div>
                      <div className="text-[11px] text-dfz-text-muted">{adminsList.length}</div>
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-dfz-text-muted" />
                </div>

                {/* Members */}
                <div
                  onClick={() => setCurrentView('members')}
                  className="p-3.5 flex items-center justify-between hover:bg-[#28282e] cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Users size={18} className="text-[#8774e1]" />
                    <div>
                      <div className="text-xs font-semibold text-dfz-text">Участники</div>
                      <div className="text-[11px] text-dfz-text-muted">{members.length}</div>
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-dfz-text-muted" />
                </div>
              </div>

              {/* Danger Zone Card */}
              <div className="rounded-dfz-xl bg-[#212126] border border-[#292930] overflow-hidden">
                {isOwner ? (
                  <button
                    type="button"
                    onClick={handleDeleteGroup}
                    className="w-full p-3.5 flex items-center gap-3 hover:bg-[#ef5350]/10 text-[#ef5350] transition-colors text-left"
                  >
                    <Trash2 size={18} />
                    <span className="text-xs font-semibold">Удалить группу</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleLeaveGroup}
                    className="w-full p-3.5 flex items-center gap-3 hover:bg-[#ef5350]/10 text-[#ef5350] transition-colors text-left"
                  >
                    <LogOut size={18} />
                    <span className="text-xs font-semibold">Покинуть группу</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* VIEW: GROUP TYPE (Exact Telegram Subview) */}
          {currentView === 'type' && (
            <div className="space-y-4 animate-fade-in">
              <div className="p-3.5 rounded-dfz-xl bg-[#212126] border border-[#292930] space-y-4">
                {/* Radio: Private */}
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="groupType"
                    checked={!isPublic}
                    onChange={() => setIsPublic(false)}
                    className="mt-0.5 w-4 h-4 text-[#8774e1] bg-[#18181c] border-[#292930] focus:ring-0"
                  />
                  <div className="space-y-0.5">
                    <div className="text-xs font-semibold text-dfz-text">Частная группа</div>
                    <p className="text-[11px] text-dfz-text-muted leading-tight">
                      В частные группы можно вступить только по пригласительной ссылке.
                    </p>
                  </div>
                </label>

                {/* Radio: Public */}
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="groupType"
                    checked={isPublic}
                    onChange={() => setIsPublic(true)}
                    className="mt-0.5 w-4 h-4 text-[#8774e1] bg-[#18181c] border-[#292930] focus:ring-0"
                  />
                  <div className="space-y-0.5">
                    <div className="text-xs font-semibold text-dfz-text">Публичная группа</div>
                    <p className="text-[11px] text-dfz-text-muted leading-tight">
                      Публичные группы можно найти через поиск. Вступить может любой пользователь.
                    </p>
                  </div>
                </label>
              </div>

              {isPublic && (
                <div className="p-3.5 rounded-dfz-xl bg-[#212126] border border-[#292930] space-y-2 animate-fade-in">
                  <label className="text-[11px] font-semibold text-dfz-text-muted">
                    Постоянная ссылка группы
                  </label>
                  <div className="flex items-center gap-1.5 px-3 py-2 rounded-dfz-lg bg-[#18181c] border border-[#292930]">
                    <span className="text-xs text-dfz-text-muted font-mono">https://dfz.im/</span>
                    <input
                      type="text"
                      value={publicHandle}
                      onChange={(e) =>
                        setPublicHandle(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))
                      }
                      placeholder="link_name"
                      className="flex-1 bg-transparent text-xs text-dfz-text font-mono focus:outline-none"
                    />
                  </div>
                  <p className="text-[10px] text-dfz-text-muted">
                    По этой ссылке пользователи смогут открывать группу и вступать в нее.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* VIEW: PERMISSIONS (Exact Telegram Subview) */}
          {currentView === 'permissions' && (
            <div className="space-y-4 animate-fade-in">
              <span className="text-[11px] font-semibold text-dfz-text-muted px-1 block">
                Что могут делать участники этой группы?
              </span>

              <div className="rounded-dfz-xl bg-[#212126] border border-[#292930] divide-y divide-[#292930] overflow-hidden text-xs">
                <label className="p-3 flex items-center justify-between hover:bg-[#28282e] cursor-pointer">
                  <span>Отправка текстовых сообщений</span>
                  <input
                    type="checkbox"
                    checked={permSendMessages}
                    onChange={(e) => setPermSendMessages(e.target.checked)}
                    className="w-4 h-4 rounded text-[#8774e1] bg-[#18181c] border-[#292930] focus:ring-0"
                  />
                </label>

                <label className="p-3 flex items-center justify-between hover:bg-[#28282e] cursor-pointer">
                  <span>Отправка медиафайлов</span>
                  <input
                    type="checkbox"
                    checked={permSendMedia}
                    onChange={(e) => setPermSendMedia(e.target.checked)}
                    className="w-4 h-4 rounded text-[#8774e1] bg-[#18181c] border-[#292930] focus:ring-0"
                  />
                </label>

                <label className="p-3 flex items-center justify-between hover:bg-[#28282e] cursor-pointer">
                  <span>Отправка стикеров и GIF</span>
                  <input
                    type="checkbox"
                    checked={permSendStickers}
                    onChange={(e) => setPermSendStickers(e.target.checked)}
                    className="w-4 h-4 rounded text-[#8774e1] bg-[#18181c] border-[#292930] focus:ring-0"
                  />
                </label>

                <label className="p-3 flex items-center justify-between hover:bg-[#28282e] cursor-pointer">
                  <span>Создание опросов</span>
                  <input
                    type="checkbox"
                    checked={permSendPolls}
                    onChange={(e) => setPermSendPolls(e.target.checked)}
                    className="w-4 h-4 rounded text-[#8774e1] bg-[#18181c] border-[#292930] focus:ring-0"
                  />
                </label>

                <label className="p-3 flex items-center justify-between hover:bg-[#28282e] cursor-pointer">
                  <span>Встраивание ссылок</span>
                  <input
                    type="checkbox"
                    checked={permEmbedLinks}
                    onChange={(e) => setPermEmbedLinks(e.target.checked)}
                    className="w-4 h-4 rounded text-[#8774e1] bg-[#18181c] border-[#292930] focus:ring-0"
                  />
                </label>

                <label className="p-3 flex items-center justify-between hover:bg-[#28282e] cursor-pointer">
                  <span>Добавление участников</span>
                  <input
                    type="checkbox"
                    checked={permAddMembers}
                    onChange={(e) => setPermAddMembers(e.target.checked)}
                    className="w-4 h-4 rounded text-[#8774e1] bg-[#18181c] border-[#292930] focus:ring-0"
                  />
                </label>

                <label className="p-3 flex items-center justify-between hover:bg-[#28282e] cursor-pointer">
                  <span>Закрепление сообщений</span>
                  <input
                    type="checkbox"
                    checked={permPinMessages}
                    onChange={(e) => setPermPinMessages(e.target.checked)}
                    className="w-4 h-4 rounded text-[#8774e1] bg-[#18181c] border-[#292930] focus:ring-0"
                  />
                </label>

                <label className="p-3 flex items-center justify-between hover:bg-[#28282e] cursor-pointer">
                  <span>Изменение профиля группы</span>
                  <input
                    type="checkbox"
                    checked={permChangeInfo}
                    onChange={(e) => setPermChangeInfo(e.target.checked)}
                    className="w-4 h-4 rounded text-[#8774e1] bg-[#18181c] border-[#292930] focus:ring-0"
                  />
                </label>

                <label className="p-3 flex items-center justify-between hover:bg-[#28282e] cursor-pointer">
                  <div className="space-y-0.5">
                    <div>Запрет копирования и пересылки</div>
                    <div className="text-[10px] text-dfz-text-muted">
                      Участники не смогут скопировать или переслать сообщения
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={permProtectedContent}
                    onChange={(e) => setPermProtectedContent(e.target.checked)}
                    className="w-4 h-4 rounded text-[#8774e1] bg-[#18181c] border-[#292930] focus:ring-0"
                  />
                </label>
              </div>

              {/* Slow Mode Section */}
              <div className="p-3.5 rounded-dfz-xl bg-[#212126] border border-[#292930] space-y-2.5">
                <div>
                  <div className="text-xs font-semibold text-dfz-text">Медленный режим</div>
                  <p className="text-[11px] text-dfz-text-muted">
                    Участники смогут отправлять сообщения только через заданный интервал времени.
                  </p>
                </div>

                <div className="grid grid-cols-7 gap-1 pt-1">
                  {slowModeOptions.map((opt) => (
                    <button
                      key={opt.val}
                      type="button"
                      onClick={() => setSlowModeSeconds(opt.val)}
                      className={`py-1.5 rounded-dfz-md text-[11px] font-semibold transition-all ${
                        slowModeSeconds === opt.val
                          ? 'bg-[#8774e1] text-white shadow-sm'
                          : 'bg-[#18181c] text-dfz-text-muted hover:text-dfz-text border border-[#292930]'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* VIEW: ADMINS (Exact Telegram Subview) */}
          {currentView === 'admins' && (
            <div className="space-y-4 animate-fade-in">
              <span className="text-[11px] font-semibold text-dfz-text-muted px-1 block">
                Администраторы с правами управления группой
              </span>

              <div className="rounded-dfz-xl bg-[#212126] border border-[#292930] divide-y divide-[#292930] overflow-hidden">
                {adminsList.map((m) => {
                  const isCurrent = m.userId === user?.id;
                  const isOwnerMember = m.role === MemberRole.OWNER;
                  return (
                    <div
                      key={m.userId}
                      className="p-3 flex items-center justify-between hover:bg-[#28282e] transition-colors"
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
                            {isOwnerMember ? (
                              <span className="px-1.5 py-0.2 rounded-full bg-[#f5c542]/20 text-[10px] font-bold text-[#f5c542]">
                                Владелец
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.2 rounded-full bg-[#8774e1]/20 text-[10px] font-semibold text-[#8774e1]">
                                {m.customTitle || 'Админ'}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-dfz-text-muted">@{m.username}</div>
                        </div>
                      </div>

                      {isOwner && !isOwnerMember && (
                        <button
                          type="button"
                          onClick={() => handleDemoteAdmin(m.userId)}
                          className="px-2.5 py-1 text-[11px] rounded-dfz-md text-[#ef5350] hover:bg-[#ef5350]/10 border border-[#ef5350]/20 transition-colors"
                        >
                          Снять права
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              {isOwner && (
                <button
                  type="button"
                  onClick={() => setCurrentView('members')}
                  className="w-full py-2.5 px-3 rounded-dfz-xl bg-[#212126] hover:bg-[#28282e] border border-[#292930] text-xs font-semibold text-[#8774e1] flex items-center justify-center gap-2 transition-colors"
                >
                  <UserPlus size={15} />
                  <span>Добавить администратора</span>
                </button>
              )}
            </div>
          )}

          {/* VIEW: MEMBERS (Exact Telegram Subview) */}
          {currentView === 'members' && (
            <div className="space-y-3 animate-fade-in">
              <div className="relative">
                <Search
                  size={15}
                  className="absolute left-3 top-2.5 text-dfz-text-muted pointer-events-none"
                />
                <input
                  type="text"
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                  placeholder="Поиск по участникам..."
                  className="w-full h-9 pl-9 pr-3 rounded-dfz-xl bg-[#212126] border border-[#292930] text-xs text-dfz-text focus:outline-none focus:border-[#8774e1]"
                />
              </div>

              <div className="rounded-dfz-xl bg-[#212126] border border-[#292930] divide-y divide-[#292930] overflow-hidden max-h-72 overflow-y-auto">
                {filteredMembers.map((m) => {
                  const isCurrent = m.userId === user?.id;
                  const isMemberAdmin = m.role === MemberRole.ADMIN || m.role === MemberRole.OWNER;
                  return (
                    <div
                      key={m.userId}
                      className="p-3 flex items-center justify-between hover:bg-[#28282e] transition-colors"
                    >
                      <div className="flex items-center gap-3">
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
                            type="button"
                            onClick={() => setSelectedMemberForAdmin(m)}
                            className="p-1.5 text-xs text-[#8774e1] hover:bg-[#8774e1]/10 rounded-dfz-md transition-colors"
                            title="Сделать администратором"
                          >
                            <Shield size={15} />
                          </button>
                        )}
                        {isOwner && !isCurrent && m.role !== MemberRole.OWNER && (
                          <button
                            type="button"
                            onClick={() => handleRemoveMember(m.userId)}
                            className="p-1.5 text-xs text-[#ef5350] hover:bg-[#ef5350]/10 rounded-dfz-md transition-colors"
                            title="Исключить из группы"
                          >
                            <UserX size={15} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Subdialog to promote member to admin */}
              {selectedMemberForAdmin && (
                <div className="p-3.5 rounded-dfz-xl bg-[#212126] border border-[#8774e1]/40 space-y-2.5 animate-scale-in">
                  <div className="font-semibold text-xs text-[#8774e1]">
                    Назначить {selectedMemberForAdmin.displayName || selectedMemberForAdmin.username}{' '}
                    администратором
                  </div>
                  <input
                    type="text"
                    value={adminCustomTitle}
                    onChange={(e) => setAdminCustomTitle(e.target.value)}
                    placeholder="Должность / титул (например: Модератор)"
                    className="w-full h-8 px-2.5 rounded-dfz-lg bg-[#18181c] border border-[#292930] text-xs text-dfz-text focus:outline-none focus:border-[#8774e1]"
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
                      className="px-3 py-1 text-xs font-semibold bg-[#8774e1] hover:bg-[#7662d8] text-white rounded-dfz-md"
                    >
                      Подтвердить
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* VIEW: INVITE LINKS (Exact Telegram Subview) */}
          {currentView === 'invites' && (
            <div className="space-y-4 animate-fade-in">
              <div className="p-3.5 rounded-dfz-xl bg-[#212126] border border-[#292930] space-y-2">
                <span className="text-[11px] font-semibold text-dfz-text-muted">
                  Основная ссылка
                </span>
                <div className="flex items-center gap-2 p-2 bg-[#18181c] border border-[#292930] rounded-dfz-lg">
                  <span className="flex-1 font-mono text-xs text-[#8774e1] truncate">
                    {window.location.origin}/join/{inviteCode}
                  </span>
                  <button
                    onClick={handleCopyLink}
                    className="p-1.5 rounded-dfz-md hover:bg-[#28282e] text-dfz-text-muted hover:text-dfz-text transition-colors"
                    title="Копировать"
                  >
                    {copied ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
                  </button>
                </div>
              </div>

              {isOwner && (
                <button
                  type="button"
                  onClick={handleRegenerateInvite}
                  className="w-full py-2.5 px-3 rounded-dfz-xl bg-[#212126] hover:bg-[#28282e] border border-[#292930] text-xs font-semibold text-dfz-text flex items-center justify-center gap-2 transition-colors"
                >
                  <RefreshCw size={14} />
                  <span>Аннулировать и создать новую ссылку</span>
                </button>
              )}
            </div>
          )}

          {/* VIEW: REACTIONS (Exact Telegram Subview) */}
          {currentView === 'reactions' && (
            <div className="space-y-4 animate-fade-in">
              <div className="p-3.5 rounded-dfz-xl bg-[#212126] border border-[#292930] space-y-3">
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-xs font-semibold text-dfz-text">Все реакции</span>
                  <input
                    type="radio"
                    name="reactions"
                    checked={true}
                    readOnly
                    className="w-4 h-4 text-[#8774e1] bg-[#18181c] border-[#292930] focus:ring-0"
                  />
                </label>
                <div className="flex flex-wrap gap-2 pt-2 border-t border-[#292930]">
                  {['👍', '👎', '❤️', '🔥', '🥰', '👏', '😁', '🤔', '🤯', '😱', '🎉', '🤩', '🙏', '🕊'].map(
                    (emoji) => (
                      <span
                        key={emoji}
                        className="w-8 h-8 rounded-dfz-lg bg-[#18181c] flex items-center justify-center text-base"
                      >
                        {emoji}
                      </span>
                    )
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
