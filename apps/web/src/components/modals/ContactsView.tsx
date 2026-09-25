import React, { useState, useEffect } from 'react';
import { Search, UserPlus, Trash2, MessageSquare, Phone } from 'lucide-react';
import { Avatar } from '../ui/Avatar';
import { apiRequest } from '../../lib/api';
import { useChatStore } from '../../stores/chatStore';

interface ContactsViewProps {
  onSelectUser: (userId: string) => void;
}

export const ContactsView: React.FC<ContactsViewProps> = ({ onSelectUser }) => {
  const [contacts, setContacts] = useState<any[]>([]);
  const [query, setQuery] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [targetUsername, setTargetUsername] = useState('');
  const [addError, setAddError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { selectChat, fetchChats } = useChatStore();

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

    // Search user by username
    const searchRes = await apiRequest<any[]>('/api/users/search', { params: { q: targetUsername.trim() } });
    if (!searchRes.success || !searchRes.data || searchRes.data.length === 0) {
      setAddError('Пользователь с таким username не найден');
      return;
    }

    const target = searchRes.data.find(
      (u) => u.username.toLowerCase() === targetUsername.trim().toLowerCase()
    ) || searchRes.data[0];

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
    }
  };

  const handleDeleteContact = async (targetUserId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await apiRequest(`/api/contacts/${targetUserId}`, { method: 'DELETE' });
    loadContacts();
  };

  const filtered = contacts.filter((c) => {
    const name = c.nickname || c.contactUser?.displayName || c.contactUser?.username || '';
    return name.toLowerCase().includes(query.toLowerCase());
  });

  return (
    <div className="w-full md:w-80 lg:w-96 h-full bg-dfz-surface border-r border-dfz-border flex flex-col select-none flex-shrink-0">
      {/* Header */}
      <div className="p-3 pb-2 space-y-2.5 border-b border-dfz-border">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-dfz-text">Контакты</h2>
          <button
            onClick={() => setShowAdd(!showAdd)}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-dfz-accent text-white rounded-dfz-md hover:bg-dfz-accent-hover shadow-dfz-sm transition-colors"
          >
            <UserPlus size={14} />
            <span>Добавить</span>
          </button>
        </div>

        {/* Add Contact Form */}
        {showAdd && (
          <form onSubmit={handleAddContact} className="p-2.5 bg-dfz-bg border border-dfz-border rounded-dfz-lg space-y-2 animate-scale-in">
            <h4 className="text-xs font-semibold text-dfz-text">Новый контакт</h4>
            {addError && <p className="text-[11px] text-dfz-danger">{addError}</p>}
            <input
              type="text"
              required
              value={targetUsername}
              onChange={(e) => setTargetUsername(e.target.value)}
              placeholder="Username пользователя..."
              className="w-full h-8 px-2.5 bg-dfz-surface border border-dfz-border rounded text-xs text-dfz-text focus:outline-none"
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
                className="px-3 py-1 bg-dfz-accent text-white text-[11px] font-semibold rounded shadow-dfz-sm"
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
            placeholder="Поиск контактов..."
            className="w-full h-9 pl-9 pr-3 bg-dfz-bg border border-dfz-border rounded-dfz-lg text-xs text-dfz-text placeholder:text-dfz-text-muted focus:outline-none"
          />
        </div>
      </div>

      {/* Contacts List */}
      <div className="flex-1 overflow-y-auto divide-y divide-dfz-border/40">
        {isLoading ? (
          <div className="p-6 text-center text-xs text-dfz-text-muted">Загрузка...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-xs text-dfz-text-muted">
            {query ? 'Контакты не найдены' : 'Список контактов пуст'}
          </div>
        ) : (
          filtered.map((c) => {
            const u = c.contactUser;
            return (
              <div
                key={c.id}
                onClick={() => onSelectUser(u.id)}
                className="flex items-center justify-between p-3 hover:bg-dfz-surface-hover cursor-pointer transition-colors group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar src={u.avatarUrl} name={c.nickname || u.displayName || u.username} size="md" />
                  <div className="truncate">
                    <p className="text-xs font-semibold text-dfz-text truncate">
                      {c.nickname || u.displayName || u.username}
                    </p>
                    <p className="text-[11px] text-dfz-text-muted truncate">@{u.username}</p>
                  </div>
                </div>

                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleStartChat(u.id);
                    }}
                    className="p-1.5 rounded-full hover:bg-dfz-surface text-dfz-accent transition-colors"
                    title="Написать"
                  >
                    <MessageSquare size={16} />
                  </button>
                  <button
                    onClick={(e) => handleDeleteContact(u.id, e)}
                    className="p-1.5 rounded-full hover:bg-dfz-surface text-dfz-danger transition-colors"
                    title="Удалить контакт"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
