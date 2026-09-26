import React, { useState, useEffect } from 'react';
import { Search, UserPlus, Trash2, MessageSquare, Phone, Video, Ban, ArrowLeft, Users, ShieldAlert } from 'lucide-react';
import { Avatar } from '../ui/Avatar';
import { apiRequest } from '../../lib/api';
import { useChatStore } from '../../stores/chatStore';
import { useCallStore } from '../../stores/callStore';
import { CallType } from '@dfz/types';

interface ContactsViewProps {
  onSelectUser: (userId: string) => void;
  onBack?: () => void;
}

export const ContactsView: React.FC<ContactsViewProps> = ({ onSelectUser, onBack }) => {
  const [contacts, setContacts] = useState<any[]>([]);
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'online'>('all');
  const [showAdd, setShowAdd] = useState(false);
  const [targetUsername, setTargetUsername] = useState('');
  const [addError, setAddError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [blockTargetUser, setBlockTargetUser] = useState<any>(null);

  const { selectChat, fetchChats } = useChatStore();
  const { startCall } = useCallStore();

  useEffect(() => {
    loadContacts();
  }, []);

  const loadContacts = async () => {
    setIsLoading(true);
    const res = await apiRequest<any[]>('/api/contacts');
    setIsLoading(false);
    if (res.success && res.data) {
      setContacts(res.data);
    }
  };

  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError('');

    const cleanUsername = targetUsername.trim().replace(/^@/, '');
    if (!cleanUsername) return;

    // Search user by username
    const searchRes = await apiRequest<any[]>('/api/users/search', { params: { q: cleanUsername } });
    if (!searchRes.success || !searchRes.data || searchRes.data.length === 0) {
      setAddError('Пользователь с таким именем не найден');
      return;
    }

    const target = searchRes.data.find(
      (u) => u.username.toLowerCase() === cleanUsername.toLowerCase()
    );
    if (!target) { setAddError('Точный username не найден'); return; }

    const res = await apiRequest('/api/contacts', {
      method: 'POST',
      body: JSON.stringify({ contactUserId: target.id }),
    });

    if (res.success) {
      setShowAdd(false);
      setTargetUsername('');
      loadContacts();
    } else {
      setAddError(res.error?.message || 'Не удалось добавить контакт');
    }
  };

  const handleStartChat = async (targetUserId: string) => {
    const res = await apiRequest<any>('/api/chats/direct', {
      method: 'POST',
      body: JSON.stringify({ targetUserId }),
    });
    if (res.success && res.data) {
      await fetchChats();
      await selectChat(res.data.id);
      if (onBack) onBack();
    }
  };

  const handleAudioCall = async (u: any, e: React.MouseEvent) => {
    e.stopPropagation();
    const res = await apiRequest<any>('/api/chats/direct', {
      method: 'POST',
      body: JSON.stringify({ targetUserId: u.id }),
    });
    if (res.success && res.data) {
      startCall(res.data.id, u.id, u.displayName || u.username, CallType.AUDIO);
    }
  };

  const handleVideoCall = async (u: any, e: React.MouseEvent) => {
    e.stopPropagation();
    const res = await apiRequest<any>('/api/chats/direct', {
      method: 'POST',
      body: JSON.stringify({ targetUserId: u.id }),
    });
    if (res.success && res.data) {
      startCall(res.data.id, u.id, u.displayName || u.username, CallType.VIDEO);
    }
  };

  const handleDeleteContact = async (targetUserId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Удалить контакт из записной книжки?')) {
      await apiRequest(`/api/contacts/${targetUserId}`, { method: 'DELETE' });
      loadContacts();
    }
  };

  const handleConfirmBlock = async () => {
    if (!blockTargetUser) return;
    await apiRequest('/api/users/block', {
      method: 'POST',
      body: JSON.stringify({ targetUserId: blockTargetUser.id }),
    });
    setBlockTargetUser(null);
    loadContacts();
  };

  const isUserOnline = (userObj: any) => {
    return userObj?.isOnline === true;
  };

  const filtered = contacts.filter((c) => {
    const u = c.contactUser;
    const name = (c.nickname || u?.displayName || u?.username || '').toLowerCase();
    const matchesQuery = name.includes(query.toLowerCase());
    if (!matchesQuery) return false;

    if (activeTab === 'online') {
      return isUserOnline(u);
    }
    return true;
  });

  return (
    <div className="w-full md:w-80 lg:w-96 h-full bg-dfz-surface border-r border-dfz-border flex flex-col select-none flex-shrink-0">
      {/* Header */}
      <div className="p-3 pb-2 space-y-2.5 border-b border-dfz-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="p-1 -ml-1 text-dfz-text-muted hover:text-dfz-text rounded-full hover:bg-dfz-surface-hover transition-colors"
                title="Назад к чатам"
              >
                <ArrowLeft size={18} />
              </button>
            )}
            <h2 className="text-base font-bold text-dfz-text">Контакты</h2>
          </div>
          <button
            onClick={() => setShowAdd(!showAdd)}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold bg-[#2a8dd4] hover:bg-[#2481cc] text-white rounded-dfz-md shadow-dfz-sm transition-colors"
          >
            <UserPlus size={14} />
            <span>Добавить</span>
          </button>
        </div>

        {/* Tabs: Все / В сети */}
        <div className="flex p-0.5 bg-dfz-bg rounded-dfz-md border border-dfz-border">
          <button
            onClick={() => setActiveTab('all')}
            className={`flex-1 py-1 text-xs font-medium rounded transition-colors ${
              activeTab === 'all'
                ? 'bg-dfz-surface text-dfz-text shadow-dfz-sm'
                : 'text-dfz-text-muted hover:text-dfz-text'
            }`}
          >
            Все ({contacts.length})
          </button>
          <button
            onClick={() => setActiveTab('online')}
            className={`flex-1 py-1 text-xs font-medium rounded transition-colors ${
              activeTab === 'online'
                ? 'bg-dfz-surface text-dfz-text shadow-dfz-sm'
                : 'text-dfz-text-muted hover:text-dfz-text'
            }`}
          >
            В сети ({contacts.filter((c) => isUserOnline(c.contactUser)).length})
          </button>
        </div>

        {/* Add Contact Form */}
        {showAdd && (
          <form
            onSubmit={handleAddContact}
            className="p-3 bg-dfz-bg border border-dfz-border rounded-dfz-lg space-y-2 animate-scale-in"
          >
            <h4 className="text-xs font-semibold text-dfz-text">Добавить контакт</h4>
            {addError && <p className="text-[11px] text-dfz-danger">{addError}</p>}
            <input
              type="text"
              required
              autoFocus
              value={targetUsername}
              onChange={(e) => setTargetUsername(e.target.value)}
              placeholder="Username пользователя (@username)..."
              className="w-full h-8 px-2.5 bg-dfz-surface border border-dfz-border rounded text-xs text-dfz-text focus:outline-none focus:border-dfz-border-focus"
            />
            <div className="flex justify-end gap-1.5 pt-1">
              <button
                type="button"
                onClick={() => setShowAdd(false)}
                className="px-2.5 py-1 text-[11px] text-dfz-text-muted hover:text-dfz-text"
              >
                Отмена
              </button>
              <button
                type="submit"
                className="px-3 py-1 bg-dfz-accent hover:bg-dfz-accent-hover text-white text-[11px] font-semibold rounded shadow-dfz-sm transition-colors"
              >
                Сохранить
              </button>
            </div>
          </form>
        )}

        {/* Search */}
        <div className="relative">
          <Search size={16} className="absolute left-3 top-2.5 text-dfz-text-muted" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Поиск по контактам..."
            className="w-full h-9 pl-9 pr-3 bg-dfz-bg border border-dfz-border rounded-dfz-lg text-xs text-dfz-text placeholder:text-dfz-text-muted focus:outline-none focus:border-dfz-border-focus"
          />
        </div>
      </div>

      {/* Contacts List */}
      <div className="flex-1 overflow-y-auto divide-y divide-dfz-border/40">
        {isLoading ? (
          <div className="p-6 text-center text-xs text-dfz-text-muted">Загрузка контактов...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-xs text-dfz-text-muted flex flex-col items-center justify-center">
            <Users size={32} className="text-dfz-text-muted/40 mb-2" />
            <p className="font-semibold text-dfz-text">
              {query ? 'Контакты не найдены' : 'Список контактов пуст'}
            </p>
            <p className="text-[11px] text-dfz-text-muted mt-1 max-w-xs">
              Нажмите кнопку «Добавить», чтобы найти собеседника по юзернейму
            </p>
          </div>
        ) : (
          filtered.map((c) => {
            const u = c.contactUser;
            const online = isUserOnline(u);

            return (
              <div
                key={c.id}
                onClick={() => onSelectUser(u.id)}
                className="flex items-center justify-between p-3 hover:bg-dfz-surface-hover cursor-pointer transition-colors group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar
                    src={u.avatarUrl}
                    name={c.nickname || u.displayName || u.username}
                    size="md"
                    isOnline={online}
                  />
                  <div className="truncate">
                    <p className="text-xs font-semibold text-dfz-text truncate">
                      {c.nickname || u.displayName || u.username}
                    </p>
                    <p className="text-[11px] text-dfz-text-muted truncate">
                      {online ? (
                        <span className="text-emerald-400 font-medium">в сети</span>
                      ) : (
                        `@${u.username}`
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 opacity-80 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleStartChat(u.id);
                    }}
                    className="p-1.5 rounded-full hover:bg-dfz-surface text-dfz-accent transition-colors"
                    title="Написать сообщение"
                  >
                    <MessageSquare size={15} />
                  </button>
                  <button
                    onClick={(e) => handleAudioCall(u, e)}
                    className="p-1.5 rounded-full hover:bg-dfz-surface text-dfz-text-muted hover:text-dfz-text transition-colors"
                    title="Аудиозвонок"
                  >
                    <Phone size={15} />
                  </button>
                  <button
                    onClick={(e) => handleVideoCall(u, e)}
                    className="p-1.5 rounded-full hover:bg-dfz-surface text-dfz-text-muted hover:text-dfz-text transition-colors"
                    title="Видеозвонок"
                  >
                    <Video size={15} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setBlockTargetUser(u);
                    }}
                    className="p-1.5 rounded-full hover:bg-dfz-surface text-dfz-text-muted hover:text-dfz-danger transition-colors"
                    title="Заблокировать"
                  >
                    <Ban size={15} />
                  </button>
                  <button
                    onClick={(e) => handleDeleteContact(u.id, e)}
                    className="p-1.5 rounded-full hover:bg-dfz-surface text-dfz-text-muted hover:text-dfz-danger transition-colors"
                    title="Удалить контакт"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Block Confirmation Dialog */}
      {blockTargetUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-dfz-surface border border-dfz-border rounded-dfz-xl p-5 w-full max-w-sm shadow-2xl space-y-3">
            <div className="flex items-center gap-2.5 text-dfz-danger">
              <ShieldAlert size={20} />
              <h3 className="font-bold text-sm text-dfz-text">Заблокировать контакт?</h3>
            </div>
            <p className="text-xs text-dfz-text-muted leading-relaxed">
              Заблокировать @{blockTargetUser.username}? Пользователь больше не сможет писать вам личные сообщения и звонить.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setBlockTargetUser(null)}
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
    </div>
  );
};
