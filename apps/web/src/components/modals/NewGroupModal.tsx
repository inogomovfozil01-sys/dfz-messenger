import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  Check,
  Camera,
  X,
  UserPlus,
} from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Avatar } from '../ui/Avatar';
import { apiRequest } from '../../lib/api';
import { useChatStore } from '../../stores/chatStore';

interface NewGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NewGroupModal: React.FC<NewGroupModalProps> = ({ isOpen, onClose }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [contacts, setContacts] = useState<any[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const { selectChat, fetchChats } = useChatStore();

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
      // Fallback to data URI
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadContacts();
      setTitle('');
      setDescription('');
      setAvatarUrl('');
      setSelectedUserIds([]);
      setError('');
    }
  }, [isOpen]);

  const loadContacts = async () => {
    const res = await apiRequest<any[]>('/api/contacts');
    if (res.success && res.data) {
      setContacts(res.data);
    }
  };

  const toggleSelectUser = (id: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(id) ? prev.filter((uid) => uid !== id) : [...prev, id]
    );
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSubmitting(true);
    setError('');

    const res = await apiRequest<any>('/api/chats/group', {
      method: 'POST',
      body: JSON.stringify({
        title: title.trim(),
        description: description.trim() || undefined,
        avatarUrl: avatarUrl.trim() || undefined,
        memberIds: selectedUserIds.length > 0 ? selectedUserIds : undefined,
      }),
    });

    setIsSubmitting(false);

    if (res.success && res.data) {
      await fetchChats();
      await selectChat(res.data.id);
      onClose();
    } else {
      setError(res.error?.message || 'Не удалось создать группу');
    }
  };

  const filteredContacts = contacts.filter((c) => {
    const u = c.contactUser || c;
    const name = u.profile?.displayName || u.username || '';
    return name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Создать группу" maxWidth="md">
      <form onSubmit={handleCreate} className="space-y-4 select-none text-xs text-dfz-text">
        {error && (
          <div className="p-2.5 rounded-dfz-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
            {error}
          </div>
        )}

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleAvatarFileChange}
          accept="image/*"
          className="hidden"
        />

        <div className="flex items-center gap-3">
          <div
            onClick={() => fileInputRef.current?.click()}
            className="relative cursor-pointer group flex-shrink-0"
            title="Нажмите, чтобы загрузить фото группы"
          >
            <Avatar src={avatarUrl} name={title || 'Группа'} size="lg" />
            <div className="absolute inset-0 bg-black/40 group-hover:bg-black/60 rounded-full flex items-center justify-center transition-colors">
              {isUploadingAvatar ? (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Camera size={18} className="text-white drop-shadow" />
              )}
            </div>
          </div>
          <div className="flex-1 space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-semibold text-dfz-text-muted">Название группы</label>
              {avatarUrl && (
                <button
                  type="button"
                  onClick={() => setAvatarUrl('')}
                  className="text-[10px] text-rose-400 hover:underline"
                >
                  Удалить фото
                </button>
              )}
            </div>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Например: Команда разработки"
              className="w-full h-9 px-3 bg-dfz-bg border border-dfz-border rounded-dfz-lg text-xs text-dfz-text focus:outline-none focus:border-dfz-accent"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-dfz-text-muted">Описание (необязательно)</label>
          <textarea
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="О чем эта группа..."
            className="w-full p-2.5 bg-dfz-bg border border-dfz-border rounded-dfz-lg text-xs text-dfz-text focus:outline-none focus:border-dfz-accent resize-none"
          />
        </div>

        {/* Member Selection */}
        <div className="space-y-2 pt-2 border-t border-dfz-border">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-semibold text-dfz-text-muted">
              Добавить участников ({selectedUserIds.length})
            </label>
            {selectedUserIds.length > 0 && (
              <button
                type="button"
                onClick={() => setSelectedUserIds([])}
                className="text-[10px] text-dfz-accent hover:underline"
              >
                Снять выбор
              </button>
            )}
          </div>

          <div className="relative flex items-center">
            <Search size={13} className="absolute left-2.5 text-dfz-text-muted pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Поиск по контактам..."
              className="w-full h-8 pl-8 pr-3 bg-dfz-bg border border-dfz-border rounded-dfz-lg text-xs text-dfz-text focus:outline-none focus:border-dfz-accent"
            />
          </div>

          <div className="max-h-40 overflow-y-auto space-y-1 pr-1">
            {filteredContacts.length === 0 ? (
              <p className="text-center py-4 text-[11px] text-dfz-text-muted">Контакты не найдены</p>
            ) : (
              filteredContacts.map((c) => {
                const u = c.contactUser || c;
                const isSelected = selectedUserIds.includes(u.id);
                return (
                  <div
                    key={u.id}
                    onClick={() => toggleSelectUser(u.id)}
                    className={`flex items-center justify-between p-2 rounded-dfz-lg cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-dfz-accent/15 border border-dfz-accent/30'
                        : 'hover:bg-dfz-surface-secondary border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Avatar src={u.profile?.avatarUrl} name={u.profile?.displayName || u.username} size="sm" />
                      <div>
                        <div className="font-semibold text-xs text-dfz-text">
                          {u.profile?.displayName || u.username}
                        </div>
                        <div className="text-[10px] text-dfz-text-muted">@{u.username}</div>
                      </div>
                    </div>

                    <div
                      className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                        isSelected
                          ? 'bg-dfz-accent border-dfz-accent text-white'
                          : 'border-dfz-border bg-dfz-bg'
                      }`}
                    >
                      {isSelected && <Check size={11} />}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-dfz-border">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-dfz-text-muted hover:text-dfz-text hover:bg-dfz-surface-secondary rounded-dfz-lg transition-colors"
          >
            Отмена
          </button>
          <button
            type="submit"
            disabled={isSubmitting || !title.trim()}
            className="px-4 py-2 text-xs font-semibold bg-dfz-accent hover:bg-dfz-accent-hover text-white rounded-dfz-lg transition-colors shadow-md disabled:opacity-50"
          >
            {isSubmitting ? 'Создание...' : 'Создать группу'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
