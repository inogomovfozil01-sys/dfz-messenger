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
  Edit2,
  Calendar,
  Phone,
  Info,
} from 'lucide-react';
import { Chat, ChatType, MemberRole } from '@dfz/types';
import { Avatar } from '../ui/Avatar';
import { useAuthStore } from '../../stores/authStore';
import { useChatStore } from '../../stores/chatStore';
import { apiRequest } from '../../lib/api';
import { EditProfileModal } from '../modals/EditProfileModal';

interface ChatInfoPanelProps {
  chat: Chat;
  onClose: () => void;
  onAddMember?: () => void;
  onOpenProfile?: (userId: string) => void;
}

type MediaTab = 'stories' | 'members' | 'media' | 'files' | 'links' | 'voice';

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
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [directUserProfile, setDirectUserProfile] = useState<any>(null);

  const isOwnerOrAdmin = chat.members?.some(
    (m) => m.userId === user?.id && (m.role === MemberRole.OWNER || m.role === MemberRole.ADMIN)
  );
  const isOwner =
    chat.ownerId === user?.id ||
    chat.members?.some((m) => m.userId === user?.id && m.role === MemberRole.OWNER);

  const otherMember =
    chat.type === ChatType.DIRECT
      ? chat.members?.find((m) => m.userId !== user?.id)
      : null;

  useEffect(() => {
    if (activeTab !== 'members' && activeTab !== 'stories') {
      loadMedia(activeTab);
    }
  }, [activeTab, chat.id]);

  useEffect(() => {
    if (otherMember) {
      apiRequest<any>(`/api/users/profile/${otherMember.userId}`).then((res) => {
        if (res.success && res.data) {
          setDirectUserProfile(res.data);
        }
      });
    }
  }, [otherMember?.userId]);

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

  const handleEditClick = () => {
    if (chat.type === ChatType.GROUP) {
      setGroupManageChat(chat);
    } else if (chat.type === ChatType.CHANNEL) {
      setChannelManageChat(chat);
    } else if (chat.type === ChatType.DIRECT && otherMember?.userId === user?.id) {
      setIsEditProfileOpen(true);
    } else if (chat.type === ChatType.DIRECT) {
      setIsEditProfileOpen(true);
    }
  };

  const handleBlockUser = async () => {
    if (!otherMember) return;
    if (confirm(`Заблокировать пользователя ${otherMember.user?.username}?`)) {
      await apiRequest('/api/users/block', {
        method: 'POST',
        body: JSON.stringify({ targetUserId: otherMember.userId }),
      });
      alert('Пользователь заблокирован');
    }
  };

  const handleReportUser = async () => {
    if (!otherMember) return;
    const reason = prompt('Укажите причину жалобы (SPAM, HARASSMENT, SCAM):', 'SPAM');
    if (reason) {
      await apiRequest('/api/moderation/reports', {
        method: 'POST',
        body: JSON.stringify({
          targetUserId: otherMember.userId,
          reason,
          comment: 'Жалоба через профиль',
        }),
      });
      alert('Жалоба отправлена модераторам DFZ');
    }
  };

  return (
    <>
      <div className="w-80 border-l border-[#292930] bg-[#18181c] flex flex-col h-full shrink-0 select-none text-dfz-text">
        {/* Telegram Exact Header Bar with Edit Pencil */}
        <div className="h-14 px-4 border-b border-[#292930] flex items-center justify-between shrink-0 bg-[#18181c]">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="p-1.5 -ml-1 rounded-full hover:bg-[#28282e] text-dfz-text-muted hover:text-dfz-text transition-colors"
              title="Закрыть"
            >
              <X size={19} />
            </button>
            <h3 className="font-bold text-sm text-dfz-text">Информация</h3>
          </div>

          {/* Edit Pencil Icon (Like Screenshot 1) */}
          {(isOwnerOrAdmin || chat.type === ChatType.DIRECT) && (
            <button
              onClick={handleEditClick}
              className="p-2 rounded-full hover:bg-[#28282e] text-dfz-text-muted hover:text-dfz-text transition-colors"
              title={chat.type === ChatType.DIRECT ? 'Изменить профиль' : 'Управление группой'}
            >
              <Edit2 size={17} />
            </button>
          )}
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto">
          {/* Centered Avatar & Title (Screenshot 1 Exact Layout) */}
          <div className="p-5 flex flex-col items-center text-center">
            <Avatar
              src={chat.avatarUrl || directUserProfile?.profile?.avatarUrl}
              name={chat.title || directUserProfile?.displayName || 'Chat'}
              size="xl"
              className="w-24 h-24 text-2xl mb-3 shadow-lg"
            />
            <h2 className="text-base font-bold text-dfz-text leading-tight">
              {chat.type === ChatType.DIRECT
                ? directUserProfile?.displayName || chat.title
                : chat.title}
            </h2>
            <span className="text-xs text-dfz-text-muted mt-0.5">
              {chat.type === ChatType.DIRECT
                ? directUserProfile?.lastSeenAt
                  ? 'в сети'
                  : 'был(а) недавно'
                : `${chat.members?.length || 1} участников`}
            </span>
          </div>

          {/* Telegram Info Card Container (Screenshot 1 & 3) */}
          <div className="px-4 pb-4 space-y-2">
            <div className="p-3.5 rounded-dfz-xl bg-[#212126] border border-[#292930] space-y-3">
              {/* Username / Link */}
              <div className="flex items-start gap-3">
                <Info size={16} className="text-dfz-text-muted mt-0.5 shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="text-xs text-dfz-text font-mono truncate">
                    {otherMember
                      ? `https://dfz.im/${otherMember.user?.username || 'user'}`
                      : chat.isPublic
                      ? `https://dfz.im/${(chat as any).slug || chat.id}`
                      : chat.description || 'Нет описания'}
                  </div>
                  <span className="text-[10px] text-dfz-text-muted">
                    {otherMember ? 'Имя пользователя' : 'Ссылка на чат'}
                  </span>
                </div>
              </div>

              {/* Bio if available */}
              {directUserProfile?.bio && (
                <div className="pt-2 border-t border-[#292930]/80">
                  <p className="text-xs text-dfz-text leading-relaxed">{directUserProfile.bio}</p>
                  <span className="text-[10px] text-dfz-text-muted">О себе</span>
                </div>
              )}

              {/* Birthday (Screenshot 1) */}
              <div className="pt-2 border-t border-[#292930]/80 flex items-start gap-3">
                <Calendar size={16} className="text-purple-400 mt-0.5 shrink-0" />
                <div>
                  <div className="text-xs text-dfz-text">
                    {(directUserProfile as any)?.birthday || '22 февраля'}
                  </div>
                  <span className="text-[10px] text-dfz-text-muted">День рождения</span>
                </div>
              </div>

              {/* Phone (Screenshot 3) */}
              {directUserProfile?.phone && (
                <div className="pt-2 border-t border-[#292930]/80 flex items-start gap-3">
                  <Phone size={16} className="text-emerald-400 mt-0.5 shrink-0" />
                  <div>
                    <div className="text-xs text-dfz-text font-mono">{directUserProfile.phone}</div>
                    <span className="text-[10px] text-dfz-text-muted">Телефон</span>
                  </div>
                </div>
              )}

              {/* Notifications Toggle Switch (Screenshot 1 & 3) */}
              <div className="pt-2 border-t border-[#292930]/80 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Bell size={16} className="text-rose-400" />
                  <span className="text-xs text-dfz-text">Уведомления</span>
                </div>

                <button
                  type="button"
                  onClick={() => toggleMuteChat(chat.id, !chat.isMuted)}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    !chat.isMuted ? 'bg-dfz-accent' : 'bg-[#2a2a32]'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      !chat.isMuted ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Segmented Media Pills (Screenshot 1: Истории | Медиа | Ссылки | Голосовые) */}
          <div className="px-4 pb-2">
            <div className="flex items-center gap-1 p-1 bg-[#212126] rounded-dfz-xl border border-[#292930] text-[11px] font-semibold overflow-x-auto no-scrollbar">
              {chat.type === ChatType.GROUP || chat.type === ChatType.CHANNEL ? (
                <>
                  <button
                    onClick={() => setActiveTab('members')}
                    className={`flex-1 py-1.5 px-2 rounded-dfz-lg transition-colors whitespace-nowrap text-center ${
                      activeTab === 'members'
                        ? 'bg-dfz-accent text-white shadow-sm'
                        : 'text-dfz-text-muted hover:text-dfz-text'
                    }`}
                  >
                    Участники
                  </button>
                  <button
                    onClick={() => setActiveTab('media')}
                    className={`flex-1 py-1.5 px-2 rounded-dfz-lg transition-colors whitespace-nowrap text-center ${
                      activeTab === 'media'
                        ? 'bg-dfz-accent text-white shadow-sm'
                        : 'text-dfz-text-muted hover:text-dfz-text'
                    }`}
                  >
                    Медиа
                  </button>
                  <button
                    onClick={() => setActiveTab('links')}
                    className={`flex-1 py-1.5 px-2 rounded-dfz-lg transition-colors whitespace-nowrap text-center ${
                      activeTab === 'links'
                        ? 'bg-dfz-accent text-white shadow-sm'
                        : 'text-dfz-text-muted hover:text-dfz-text'
                    }`}
                  >
                    Ссылки
                  </button>
                  <button
                    onClick={() => setActiveTab('files')}
                    className={`flex-1 py-1.5 px-2 rounded-dfz-lg transition-colors whitespace-nowrap text-center ${
                      activeTab === 'files'
                        ? 'bg-dfz-accent text-white shadow-sm'
                        : 'text-dfz-text-muted hover:text-dfz-text'
                    }`}
                  >
                    Файлы
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setActiveTab('stories')}
                    className={`flex-1 py-1.5 px-2 rounded-dfz-lg transition-colors whitespace-nowrap text-center ${
                      activeTab === 'stories'
                        ? 'bg-dfz-accent text-white shadow-sm'
                        : 'text-dfz-text-muted hover:text-dfz-text'
                    }`}
                  >
                    Истории
                  </button>
                  <button
                    onClick={() => setActiveTab('media')}
                    className={`flex-1 py-1.5 px-2 rounded-dfz-lg transition-colors whitespace-nowrap text-center ${
                      activeTab === 'media'
                        ? 'bg-dfz-accent text-white shadow-sm'
                        : 'text-dfz-text-muted hover:text-dfz-text'
                    }`}
                  >
                    Медиа
                  </button>
                  <button
                    onClick={() => setActiveTab('links')}
                    className={`flex-1 py-1.5 px-2 rounded-dfz-lg transition-colors whitespace-nowrap text-center ${
                      activeTab === 'links'
                        ? 'bg-dfz-accent text-white shadow-sm'
                        : 'text-dfz-text-muted hover:text-dfz-text'
                    }`}
                  >
                    Ссылки
                  </button>
                  <button
                    onClick={() => setActiveTab('voice')}
                    className={`flex-1 py-1.5 px-2 rounded-dfz-lg transition-colors whitespace-nowrap text-center ${
                      activeTab === 'voice'
                        ? 'bg-dfz-accent text-white shadow-sm'
                        : 'text-dfz-text-muted hover:text-dfz-text'
                    }`}
                  >
                    Голосовые
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Tab Content Display */}
          <div className="p-4">
            {activeTab === 'members' && (
              <div className="space-y-2">
                {chat.members?.map((m) => (
                  <div
                    key={m.userId}
                    className="flex items-center justify-between p-2 rounded-dfz-lg hover:bg-[#212126] transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Avatar
                        src={m.user?.profile?.avatarUrl}
                        name={m.user?.profile?.displayName || m.user?.username || 'U'}
                        size="sm"
                      />
                      <div className="min-w-0">
                        <span className="font-semibold text-xs text-dfz-text truncate block">
                          {m.user?.profile?.displayName || m.user?.username}
                        </span>
                        <span className="text-[10px] text-dfz-text-muted">
                          {m.role === MemberRole.OWNER
                            ? 'Владелец'
                            : m.role === MemberRole.ADMIN
                            ? 'Администратор'
                            : 'Участник'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'media' && (
              <div className="grid grid-cols-3 gap-1.5">
                {isLoadingMedia ? (
                  <div className="col-span-3 text-center py-8 text-xs text-dfz-text-muted">
                    Загрузка медиа...
                  </div>
                ) : mediaItems.length === 0 ? (
                  <div className="col-span-3 text-center py-8 text-xs text-dfz-text-muted">
                    Медиафайлов пока нет
                  </div>
                ) : (
                  mediaItems.map((item, i) => (
                    <div
                      key={i}
                      className="aspect-square bg-[#212126] rounded-dfz-md overflow-hidden border border-[#292930] hover:opacity-90 cursor-pointer"
                    >
                      <img src={item.url} alt="media" className="w-full h-full object-cover" />
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'links' && (
              <div className="space-y-2">
                {isLoadingMedia ? (
                  <div className="text-center py-8 text-xs text-dfz-text-muted">Загрузка ссылок...</div>
                ) : mediaItems.length === 0 ? (
                  <div className="text-center py-8 text-xs text-dfz-text-muted">Ссылок пока нет</div>
                ) : (
                  mediaItems.map((link, i) => (
                    <a
                      key={i}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2.5 rounded-dfz-lg bg-[#212126] border border-[#292930] flex items-center gap-2 text-xs text-dfz-text hover:text-dfz-accent transition-colors"
                    >
                      <Link2 size={14} className="shrink-0 text-dfz-accent" />
                      <span className="truncate flex-1">{link.url}</span>
                    </a>
                  ))
                )}
              </div>
            )}

            {activeTab === 'voice' && (
              <div className="space-y-2">
                {isLoadingMedia ? (
                  <div className="text-center py-8 text-xs text-dfz-text-muted">Загрузка аудио...</div>
                ) : mediaItems.length === 0 ? (
                  <div className="text-center py-8 text-xs text-dfz-text-muted">
                    Голосовых сообщений пока нет
                  </div>
                ) : (
                  mediaItems.map((item, i) => (
                    <div
                      key={i}
                      className="p-2.5 rounded-dfz-lg bg-[#212126] border border-[#292930] space-y-1"
                    >
                      <div className="flex items-center justify-between text-[11px] text-dfz-text-muted">
                        <span>Голосовая заметка</span>
                        <span>{item.createdAt ? new Date(item.createdAt).toLocaleTimeString() : ''}</span>
                      </div>
                      <audio controls src={item.url} className="w-full h-8" />
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'stories' && (
              <div className="text-center py-8 text-xs text-dfz-text-muted">
                Активных историй в данный момент нет
              </div>
            )}
          </div>

          {/* Direct Chat Danger Zone (Block / Report) */}
          {otherMember && (
            <div className="p-4 pt-0 space-y-2 border-t border-[#292930]/80 mt-4">
              <button
                onClick={handleBlockUser}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-rose-400 hover:bg-rose-500/10 rounded-dfz-lg transition-colors text-left"
              >
                <Ban size={15} />
                <span>Заблокировать пользователя</span>
              </button>

              <button
                onClick={handleReportUser}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-dfz-text-muted hover:text-dfz-text hover:bg-[#212126] rounded-dfz-lg transition-colors text-left"
              >
                <Shield size={15} />
                <span>Пожаловаться</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Edit Profile Modal */}
      <EditProfileModal
        isOpen={isEditProfileOpen}
        onClose={() => setIsEditProfileOpen(false)}
      />
    </>
  );
};
