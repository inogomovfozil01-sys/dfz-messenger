import React, { useState } from 'react';
import { MessageSquare, Phone, Video, Ban, AlertTriangle, ShieldCheck } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Avatar } from '../ui/Avatar';
import { apiRequest } from '../../lib/api';
import { useChatStore } from '../../stores/chatStore';
import { useCallStore } from '../../stores/callStore';
import { CallType, ReportReason } from '@dfz/types';

interface UserProfileModalProps {
  userId: string | null;
  onClose: () => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({ userId, onClose }) => {
  const [profile, setProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isReporting, setIsReporting] = useState(false);
  const [reportReason, setReportReason] = useState<ReportReason>(ReportReason.SPAM);
  const [reportComment, setReportComment] = useState('');
  const [reportSuccess, setReportSuccess] = useState(false);

  const { selectChat, fetchChats } = useChatStore();
  const { startCall } = useCallStore();

  React.useEffect(() => {
    if (userId) {
      loadProfile(userId);
    }
  }, [userId]);

  const loadProfile = async (id: string) => {
    setIsLoading(true);
    const res = await apiRequest(`/api/users/profile/${id}`);
    setIsLoading(false);
    if (res.success && res.data) {
      setProfile(res.data);
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

  const handleToggleBlock = async () => {
    if (!profile) return;
    if (profile.isBlocked) {
      await apiRequest('/api/users/unblock', {
        method: 'POST',
        body: JSON.stringify({ targetUserId: profile.id }),
      });
      setProfile({ ...profile, isBlocked: false });
    } else {
      await apiRequest('/api/users/block', {
        method: 'POST',
        body: JSON.stringify({ targetUserId: profile.id }),
      });
      setProfile({ ...profile, isBlocked: true });
    }
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

  return (
    <Modal isOpen={!!userId} onClose={onClose} title="Профиль пользователя">
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
          <Avatar
            src={profile.avatarUrl}
            name={profile.displayName || profile.username}
            size="xl"
            className="mx-auto"
          />

          <div>
            <h3 className="text-base font-bold text-dfz-text">
              {profile.displayName || profile.username}
            </h3>
            <p className="text-xs text-dfz-text-muted mt-0.5">@{profile.username}</p>
            {profile.bio && (
              <p className="text-xs text-dfz-text mt-2 px-4 leading-relaxed max-w-sm mx-auto">
                {profile.bio}
              </p>
            )}
            <p className="text-[11px] text-dfz-text-muted mt-2">
              {profile.lastSeenAt ? `Был(а) в сети: ${new Date(profile.lastSeenAt).toLocaleDateString()}` : 'Не в сети'}
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-center gap-2 pt-2 border-t border-dfz-border">
            <button
              onClick={handleStartMessage}
              className="flex items-center gap-1.5 px-4 py-2 bg-dfz-accent hover:bg-dfz-accent-hover text-white text-xs font-semibold rounded-dfz-md transition-colors shadow-dfz-sm"
            >
              <MessageSquare size={15} />
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
              <Phone size={16} />
            </button>

            <button
              onClick={() => {
                onClose();
                startCall('direct', profile.id, profile.displayName || profile.username, CallType.VIDEO);
              }}
              className="p-2 bg-dfz-surface-hover hover:bg-dfz-border text-dfz-text rounded-dfz-md transition-colors"
              title="Видеозвонок"
            >
              <Video size={16} />
            </button>
          </div>

          {/* Block / Report actions */}
          <div className="flex items-center justify-center gap-4 pt-3 text-xs">
            <button
              onClick={handleToggleBlock}
              className={`flex items-center gap-1 hover:underline ${
                profile.isBlocked ? 'text-dfz-success' : 'text-dfz-danger'
              }`}
            >
              <Ban size={14} />
              <span>{profile.isBlocked ? 'Разблокировать' : 'Заблокировать'}</span>
            </button>

            <button
              onClick={() => setIsReporting(true)}
              className="flex items-center gap-1 text-dfz-text-muted hover:text-dfz-text hover:underline"
            >
              <AlertTriangle size={14} />
              <span>Пожаловаться</span>
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
};
