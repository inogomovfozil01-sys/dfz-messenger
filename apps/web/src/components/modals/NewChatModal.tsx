import React, { useState } from 'react';
import { Search } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Avatar } from '../ui/Avatar';
import { apiRequest } from '../../lib/api';
import { useChatStore } from '../../stores/chatStore';

interface NewChatModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NewChatModal: React.FC<NewChatModalProps> = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const { selectChat, fetchChats } = useChatStore();

  const handleSearch = async (q: string) => {
    setQuery(q);
    if (!q.trim()) {
      setUsers([]);
      return;
    }

    setIsSearching(true);
    const res = await apiRequest<any[]>('/api/users/search', { params: { q: q.trim() } });
    setIsSearching(false);
    if (res.success && res.data) {
      setUsers(res.data);
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
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Новый диалог">
      <div className="space-y-4">
        {/* Search input */}
        <div className="relative">
          <Search size={16} className="absolute left-3 top-2.5 text-dfz-text-muted" />
          <input
            type="text"
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Поиск по имени или username..."
            className="w-full h-9 pl-9 pr-3 bg-dfz-bg border border-dfz-border rounded-dfz-lg text-xs text-dfz-text placeholder:text-dfz-text-muted focus:outline-none focus:border-dfz-border-focus"
          />
        </div>

        {/* Results */}
        <div className="max-h-60 overflow-y-auto space-y-1">
          {isSearching ? (
            <div className="p-4 text-center text-xs text-dfz-text-muted">Поиск пользователей...</div>
          ) : users.length === 0 ? (
            <div className="p-4 text-center text-xs text-dfz-text-muted">
              {query ? 'Пользователи не найдены' : 'Введите имя или username для начала поиска'}
            </div>
          ) : (
            users.map((u) => (
              <div
                key={u.id}
                onClick={() => handleStartChat(u.id)}
                className="flex items-center gap-3 p-2.5 rounded-dfz-md hover:bg-dfz-surface-hover cursor-pointer transition-colors"
              >
                <Avatar src={u.avatarUrl} name={u.displayName || u.username} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-dfz-text truncate">
                    {u.displayName || u.username}
                  </p>
                  <p className="text-[11px] text-dfz-text-muted truncate">@{u.username}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </Modal>
  );
};
