import React, { useState, useEffect } from 'react';
import {
  X,
  Phone,
  Video,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneMissed,
  Search,
  RefreshCw,
  Clock,
  ShieldAlert,
} from 'lucide-react';
import { CallType } from '@dfz/types';
import { Avatar } from '../ui/Avatar';
import { apiRequest } from '../../lib/api';
import { useAuthStore } from '../../stores/authStore';
import { useCallStore } from '../../stores/callStore';
import { useChatStore } from '../../stores/chatStore';

interface CallsHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CallsHistoryModal: React.FC<CallsHistoryModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { user } = useAuthStore();
  const { startCall } = useCallStore();
  const { selectChat, fetchChats } = useChatStore();

  const [activeTab, setActiveTab] = useState<'all' | 'missed'>('all');
  const [calls, setCalls] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadCalls(activeTab);
    }
  }, [isOpen, activeTab]);

  const loadCalls = async (tab: 'all' | 'missed') => {
    setIsLoading(true);
    const query = tab === 'missed' ? '?type=missed' : '';
    const res = await apiRequest<any[]>(`/api/calls${query}`);
    setIsLoading(false);
    if (res.success && res.data) {
      setCalls(res.data);
    } else {
      setCalls([]);
    }
  };

  if (!isOpen || !user) return null;

  const handleStartCall = async (targetUser: any, callType: CallType, e: React.MouseEvent) => {
    e.stopPropagation();
    onClose();
    const res = await apiRequest<any>('/api/chats/direct', {
      method: 'POST',
      body: JSON.stringify({ targetUserId: targetUser.id }),
    });
    if (res.success && res.data) {
      await selectChat(res.data.id);
      startCall(res.data.id, targetUser.id, targetUser.profile?.displayName || targetUser.username, callType);
    }
  };

  const handleOpenChat = async (targetUser: any) => {
    onClose();
    const res = await apiRequest<any>('/api/chats/direct', {
      method: 'POST',
      body: JSON.stringify({ targetUserId: targetUser.id }),
    });
    if (res.success && res.data) {
      await fetchChats();
      await selectChat(res.data.id);
    }
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds || seconds <= 0) return null;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (isToday) return `Сегодня, ${time}`;
    return `${d.toLocaleDateString([], { day: 'numeric', month: 'short' })}, ${time}`;
  };

  const filteredCalls = calls.filter((c) => {
    const isOutgoing = c.callerId === user.id;
    const peer = isOutgoing ? c.receiver : c.caller;
    const name = peer?.profile?.displayName || peer?.username || '';
    return name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 select-none">
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      <div className="relative z-10 w-full max-w-md max-h-[85vh] bg-dfz-surface border border-dfz-border rounded-dfz-2xl shadow-2xl flex flex-col overflow-hidden animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-dfz-border bg-dfz-surface-secondary">
          <div className="flex items-center gap-2.5">
            <Phone size={18} className="text-dfz-accent" />
            <h3 className="text-sm font-bold text-dfz-text">Журнал звонков</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-dfz-text-muted hover:text-dfz-text hover:bg-dfz-surface transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-dfz-border bg-dfz-surface px-4 pt-1 gap-2">
          <button
            onClick={() => setActiveTab('all')}
            className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'all'
                ? 'border-dfz-accent text-dfz-accent'
                : 'border-transparent text-dfz-text-muted hover:text-dfz-text'
            }`}
          >
            Все звонки
          </button>
          <button
            onClick={() => setActiveTab('missed')}
            className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'missed'
                ? 'border-dfz-accent text-dfz-accent'
                : 'border-transparent text-dfz-text-muted hover:text-dfz-text'
            }`}
          >
            Пропущенные
          </button>
        </div>

        {/* Search */}
        <div className="p-3 border-b border-dfz-border/60 bg-dfz-surface">
          <div className="relative flex items-center">
            <Search size={14} className="absolute left-3 text-dfz-text-muted pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Поиск по звонкам..."
              className="w-full h-8 pl-8 pr-3 bg-dfz-bg border border-dfz-border rounded-dfz-lg text-xs text-dfz-text placeholder:text-dfz-text-muted focus:outline-none focus:border-dfz-accent"
            />
          </div>
        </div>

        {/* Call List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {isLoading ? (
            <div className="flex items-center justify-center p-8 text-xs text-dfz-text-muted">
              <RefreshCw size={16} className="animate-spin mr-2" />
              <span>Загрузка звонков...</span>
            </div>
          ) : filteredCalls.length === 0 ? (
            <div className="text-center py-12 px-4 space-y-2">
              <Phone size={28} className="mx-auto text-dfz-text-muted/40" />
              <div className="text-xs font-medium text-dfz-text">Нет недавних звонков</div>
              <p className="text-[11px] text-dfz-text-muted">
                {activeTab === 'missed'
                  ? 'У вас нет пропущенных входящих звонков'
                  : 'Здесь будут отображаться входящие и исходящие аудио и видео звонки'}
              </p>
            </div>
          ) : (
            filteredCalls.map((call) => {
              const isOutgoing = call.callerId === user.id;
              const peer = isOutgoing ? call.receiver : call.caller;
              const isMissed = !isOutgoing && (call.status === 'MISSED' || call.status === 'REJECTED');
              const isVideo = call.callType === CallType.VIDEO;
              const duration = formatDuration(call.durationSeconds);

              return (
                <div
                  key={call.id}
                  onClick={() => handleOpenChat(peer)}
                  className="flex items-center justify-between p-2.5 rounded-dfz-xl hover:bg-dfz-surface-secondary border border-transparent hover:border-dfz-border transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                    <Avatar
                      src={peer?.profile?.avatarUrl}
                      name={peer?.profile?.displayName || peer?.username || 'User'}
                      size="md"
                    />

                    <div>
                      <div className="flex items-center gap-1.5 font-semibold text-xs text-dfz-text">
                        <span>{peer?.profile?.displayName || peer?.username || 'Пользователь'}</span>
                        {isVideo && (
                          <span className="p-0.5 rounded bg-dfz-surface text-[10px] text-dfz-text-muted" title="Видеозвонок">
                            <Video size={11} />
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 text-[11px] mt-0.5">
                        {isOutgoing ? (
                          <PhoneOutgoing size={13} className="text-[#2a8dd4]" />
                        ) : isMissed ? (
                          <PhoneMissed size={13} className="text-rose-400" />
                        ) : (
                          <PhoneIncoming size={13} className="text-emerald-400" />
                        )}

                        <span className={isMissed ? 'text-rose-400 font-medium' : 'text-dfz-text-muted'}>
                          {isMissed ? 'Пропущенный' : isOutgoing ? 'Исходящий' : 'Входящий'}
                        </span>

                        {duration && (
                          <span className="text-dfz-text-muted/70">
                            • {duration}
                          </span>
                        )}

                        <span className="text-dfz-text-muted/60">
                          • {formatDate(call.startedAt || call.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Redial buttons */}
                  <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => handleStartCall(peer, CallType.AUDIO, e)}
                      className="p-2 rounded-full hover:bg-dfz-accent/15 text-dfz-text-muted hover:text-dfz-accent transition-colors"
                      title="Позвонить"
                    >
                      <Phone size={15} />
                    </button>
                    <button
                      onClick={(e) => handleStartCall(peer, CallType.VIDEO, e)}
                      className="p-2 rounded-full hover:bg-dfz-accent/15 text-dfz-text-muted hover:text-dfz-accent transition-colors"
                      title="Видеозвонок"
                    >
                      <Video size={15} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
