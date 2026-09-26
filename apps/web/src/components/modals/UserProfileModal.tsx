import React, { useState } from 'react';
import {
  MessageSquare,
  Phone,
  Video,
  Ban,
  AlertTriangle,
  Star,
  Gift,
  Shield,
  UserPlus,
  UserMinus,
  Share2,
  Check,
  ShieldAlert,
} from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Avatar } from '../ui/Avatar';
import { apiRequest } from '../../lib/api';
import { useChatStore } from '../../stores/chatStore';
import { useCallStore } from '../../stores/callStore';
import { useAuthStore } from '../../stores/authStore';
import { useEconomyStore } from '../../stores/economyStore';
import { GiftArtwork } from '../economy/GiftArtworks';
import { CallType, ReportReason, UserRole } from '@dfz/types';

interface UserProfileModalProps {
  userId: string | null;
  onClose: () => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({ userId, onClose }) => {
  const { user: currentUser } = useAuthStore();
  const { setSendGiftOpen, setSendStarsOpen, setAdminQuickActionOpen } = useEconomyStore();
  const [profile, setProfile] = useState<any>(null);
  const [userGifts, setUserGifts] = useState<any[]>([]);
  const [isContact, setIsContact] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isReporting, setIsReporting] = useState(false);
  const [reportReason, setReportReason] = useState<ReportReason>(ReportReason.SPAM);
  const [reportComment, setReportComment] = useState('');
  const [reportSuccess, setReportSuccess] = useState(false);
  const [showBlockConfirm, setShowBlockConfirm] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const { selectChat, fetchChats } = useChatStore();
  const { startCall } = useCallStore();

  React.useEffect(() => {
    if (userId) {
      loadProfile(userId);
    }
  }, [userId]);

  const loadProfile = async (id: string) => {
    setIsLoading(true);
    const res = await apiRequest<any>(`/api/users/profile/${id}`);
    const giftsRes = await apiRequest<any>(`/api/economy/gifts/user/${id}`);
    const contactsRes = await apiRequest<any[]>('/api/contacts');
    setIsLoading(false);

    if (res.success && res.data) {
      setProfile(res.data);
    }
    if (giftsRes.success && giftsRes.data?.gifts) {
      setUserGifts(giftsRes.data.gifts);
    } else {
      setUserGifts([]);
    }
    if (contactsRes.success && contactsRes.data) {
      setIsContact(contactsRes.data.some((c) => c.contactUserId === id || c.contactUser?.id === id));
    }
  };

  const handleStartMessage = async () => {
    if (!profile) return;
    const res = await apiRequest<any>('/api/chats/direct', {
      method: 'POST',
      body: JSON.stringify({ targetUserId: profile.id }),
    });
    if (res.success && res.data) {
      await fetchChats();
      await selectChat(res.data.id);
      onClose();
    }
  };

  const handleToggleContact = async () => {
    if (!profile) return;
    if (isContact) {
      await apiRequest(`/api/contacts/${profile.id}`, { method: 'DELETE' });
      setIsContact(false);
    } else {
      await apiRequest('/api/contacts', {
        method: 'POST',
        body: JSON.stringify({ contactUserId: profile.id }),
      });
      setIsContact(true);
    }
  };

  const handleConfirmBlock = async () => {
    if (!profile) return;
    await apiRequest('/api/users/block', {
      method: 'POST',
      body: JSON.stringify({ targetUserId: profile.id }),
    });
    setProfile({ ...profile, isBlocked: true });
    setShowBlockConfirm(false);
  };

  const handleUnblock = async () => {
    if (!profile) return;
    await apiRequest('/api/users/unblock', {
      method: 'POST',
      body: JSON.stringify({ targetUserId: profile.id }),
    });
    setProfile({ ...profile, isBlocked: false });
  };

  const handleShareProfile = () => {
    if (!profile) return;
    const shareUrl = `${window.location.origin}/@${profile.username}`;
    navigator.clipboard.writeText(shareUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    const res = await apiRequest('/api/moderation/report', {
      method: 'POST',
      body: JSON.stringify({
        targetType: 'USER',
        targetId: profile.id,
        reason: reportReason,
        comment: reportComment,
      }),
    });
    if (res.success) {
      setReportSuccess(true);
      setTimeout(() => {
        setIsReporting(false);
        setReportSuccess(false);
      }, 1500);
    }
  };

  if (!userId) return null;

  const isSelf = currentUser?.id === profile?.id;
  const isCurrentUserAdmin =
    currentUser?.role === UserRole.ADMIN || currentUser?.role === UserRole.SUPERADMIN;

  return (
    <Modal isOpen={!!userId} onClose={onClose} title="Профиль пользователя" maxWidth="md">
      {isLoading || !profile ? (
        <div className="p-8 text-center text-xs text-dfz-text-muted">Загрузка профиля...</div>
      ) : isReporting ? (
        <form onSubmit={handleSubmitReport} className="space-y-4">
          <h4 className="text-sm font-semibold text-dfz-text">Пожаловаться на пользователя</h4>
          {reportSuccess ? (
            <div className="p-3 bg-dfz-success/15 border border-dfz-success/30 rounded-dfz-md text-xs text-dfz-success">
              Жалоба успешно отправлена модераторам
            </div>
          ) : (
            <>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-dfz-text-muted">Причина</label>
                <select
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value as ReportReason)}
                  className="w-full h-9 px-3 bg-dfz-bg border border-dfz-border rounded-dfz-lg text-xs text-dfz-text focus:outline-none"
                >
                  <option value={ReportReason.SPAM}>Спам или реклама</option>
                  <option value={ReportReason.HARASSMENT}>Оскорбления или преследование</option>
                  <option value={ReportReason.SCAM}>Мошенничество или обман</option>
                  <option value={ReportReason.ILLEGAL_CONTENT}>Запрещенный контент</option>
                  <option value={ReportReason.OTHER}>Другое</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-dfz-text-muted">Комментарий</label>
                <textarea
                  rows={3}
                  value={reportComment}
                  onChange={(e) => setReportComment(e.target.value)}
                  placeholder="Дополнительные детали..."
                  className="w-full p-2.5 bg-dfz-bg border border-dfz-border rounded-dfz-lg text-xs text-dfz-text resize-none focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsReporting(false)}
                  className="px-3 py-1.5 text-xs text-dfz-text-muted hover:text-dfz-text"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-dfz-danger text-white text-xs font-semibold rounded-dfz-md shadow-dfz-sm"
                >
                  Отправить
                </button>
              </div>
            </>
          )}
        </form>
      ) : (
        <div className="space-y-5 text-center">
          {/* User Hero */}
          <div className="relative inline-block mx-auto">
            <Avatar
              src={profile.avatarUrl}
              name={profile.displayName || profile.username}
              size="xl"
            />
          </div>

          <div>
            <div className="flex items-center justify-center gap-1.5 flex-wrap">
              <h3 className="text-base font-bold text-dfz-text">
                {profile.displayName || profile.username}
              </h3>
              {profile.isPremium && (
                <span
                  title="DFZ Premium"
                  className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-[10px] font-bold text-cyan-400"
                >
                  <span>◆</span>
                  <span>PREMIUM</span>
                </span>
              )}
              {(profile.role === UserRole.ADMIN || profile.role === UserRole.SUPERADMIN) && (
                <span
                  title="Команда DFZ"
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-rose-500/15 border border-rose-500/30 text-[10px] font-bold text-rose-400"
                >
                  <Shield size={10} />
                  <span>{profile.role === UserRole.SUPERADMIN ? 'SUPERADMIN' : 'ADMIN'}</span>
                </span>
              )}
            </div>
            <p className="text-xs text-dfz-text-muted mt-0.5">@{profile.username}</p>
            {profile.bio && (
              <p className="text-xs text-dfz-text mt-2 px-4 leading-relaxed max-w-sm mx-auto">
                {profile.bio}
              </p>
            )}
            <p className="text-[11px] text-dfz-text-muted mt-2">
              {profile.lastSeenAt
                ? `Был(а) в сети: ${new Date(profile.lastSeenAt).toLocaleDateString()}`
                : 'Не в сети'}
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-center gap-2 pt-2 border-t border-dfz-border flex-wrap">
            {!isSelf && (
              <>
                <button
                  onClick={handleStartMessage}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#2a8dd4] hover:bg-[#2481cc] text-white text-xs font-semibold rounded-dfz-md transition-colors shadow-dfz-sm"
                >
                  <MessageSquare size={14} />
                  <span>Сообщение</span>
                </button>

                <button
                  onClick={() => {
                    onClose();
                    startCall('direct', profile.id, profile.displayName || profile.username, CallType.AUDIO);
                  }}
                  className="p-2 bg-dfz-surface-hover hover:bg-dfz-border text-dfz-text rounded-dfz-md transition-colors"
                  title="Аудиозвонок"
                >
                  <Phone size={15} />
                </button>

                <button
                  onClick={() => {
                    onClose();
                    startCall('direct', profile.id, profile.displayName || profile.username, CallType.VIDEO);
                  }}
                  className="p-2 bg-dfz-surface-hover hover:bg-dfz-border text-dfz-text rounded-dfz-md transition-colors"
                  title="Видеозвонок"
                >
                  <Video size={15} />
                </button>

                <button
                  onClick={handleToggleContact}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-dfz-md border transition-colors ${
                    isContact
                      ? 'bg-dfz-surface text-dfz-text-muted border-dfz-border hover:text-dfz-danger'
                      : 'bg-dfz-surface-hover text-dfz-text border-dfz-border hover:bg-dfz-border'
                  }`}
                  title={isContact ? 'Удалить из контактов' : 'Добавить в контакты'}
                >
                  {isContact ? <UserMinus size={14} /> : <UserPlus size={14} />}
                  <span>{isContact ? 'В контактах' : 'В контакт'}</span>
                </button>

                <button
                  onClick={handleShareProfile}
                  className="p-2 bg-dfz-surface-hover hover:bg-dfz-border text-dfz-text rounded-dfz-md transition-colors"
                  title="Поделиться профилем"
                >
                  {copiedLink ? <Check size={15} className="text-emerald-400" /> : <Share2 size={15} />}
                </button>

                <button
                  onClick={() => {
                    onClose();
                    setSendStarsOpen(true, profile);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-400 text-xs font-semibold rounded-dfz-md transition-colors"
                  title="Отправить Stars"
                >
                  <Star size={13} className="fill-amber-400" />
                  <span>Stars</span>
                </button>

                <button
                  onClick={() => {
                    onClose();
                    setSendGiftOpen(true, null, profile);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/30 text-purple-400 text-xs font-semibold rounded-dfz-md transition-colors"
                  title="Подарить подарок"
                >
                  <Gift size={13} />
                  <span>Подарок</span>
                </button>

                {isCurrentUserAdmin && (
                  <button
                    onClick={() => {
                      onClose();
                      setAdminQuickActionOpen(true, profile.id);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-400 text-xs font-semibold rounded-dfz-md transition-colors"
                    title="Админские действия"
                  >
                    <Shield size={13} />
                    <span>Admin</span>
                  </button>
                )}
              </>
            )}
          </div>

          {/* User Gifts Collection */}
          {userGifts.length > 0 && (
            <div className="pt-3 border-t border-dfz-border text-left">
              <div className="flex items-center justify-between mb-2.5 px-1">
                <h4 className="text-xs font-bold text-dfz-text flex items-center gap-1.5">
                  <Gift size={14} className="text-purple-400" />
                  <span>Подарки ({userGifts.length})</span>
                </h4>
              </div>
              <div className="grid grid-cols-4 gap-2 max-h-40 overflow-y-auto pr-1">
                {userGifts.map((giftInstance: any) => (
                  <div
                    key={giftInstance.id}
                    className="p-2 rounded-dfz-lg bg-dfz-surface/60 border border-dfz-border/50 flex flex-col items-center text-center hover:border-purple-500/40 transition-colors"
                  >
                    <div className="w-10 h-10 mb-1 flex items-center justify-center">
                      <GiftArtwork
                        artworkKey={giftInstance.gift?.artworkKey || 'neon_rose'}
                        rarity={giftInstance.gift?.rarity || 'COMMON'}
                        size={36}
                      />
                    </div>
                    <span className="text-[11px] font-semibold text-dfz-text truncate w-full">
                      {giftInstance.gift?.name || 'Подарок'}
                    </span>
                    {giftInstance.serialNumber && (
                      <span className="text-[9px] font-mono text-purple-400 font-bold">
                        #{String(giftInstance.serialNumber).padStart(4, '0')}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Block / Report actions */}
          {!isSelf && (
            <div className="flex items-center justify-center gap-4 pt-2 text-xs">
              {profile.isBlocked ? (
                <button
                  onClick={handleUnblock}
                  className="flex items-center gap-1 text-emerald-400 hover:underline"
                >
                  <Ban size={14} />
                  <span>Разблокировать пользователя</span>
                </button>
              ) : (
                <button
                  onClick={() => setShowBlockConfirm(true)}
                  className="flex items-center gap-1 text-dfz-danger hover:underline"
                >
                  <Ban size={14} />
                  <span>Заблокировать</span>
                </button>
              )}

              <button
                onClick={() => setIsReporting(true)}
                className="flex items-center gap-1 text-dfz-text-muted hover:text-dfz-text hover:underline"
              >
                <AlertTriangle size={14} />
                <span>Пожаловаться</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Block Confirmation Modal */}
      {showBlockConfirm && profile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-dfz-surface border border-dfz-border rounded-dfz-xl p-5 w-full max-w-sm shadow-2xl space-y-3 text-left">
            <div className="flex items-center gap-2.5 text-dfz-danger">
              <ShieldAlert size={20} />
              <h3 className="font-bold text-sm text-dfz-text">Заблокировать @{profile.username}?</h3>
            </div>
            <p className="text-xs text-dfz-text-muted leading-relaxed">
              Пользователь больше не сможет отправлять вам личные сообщения, совершать звонки или видеть ваше присутствие.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowBlockConfirm(false)}
                className="px-3 py-1.5 text-xs text-dfz-text-muted hover:text-dfz-text rounded-dfz-md"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={handleConfirmBlock}
                className="px-3.5 py-1.5 text-xs font-semibold bg-dfz-danger hover:bg-dfz-danger-hover text-white rounded-dfz-md transition-colors"
              >
                Заблокировать
              </button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
};
