import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { apiRequest } from '../../lib/api';
import { useChatStore } from '../../stores/chatStore';

interface NewGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NewGroupModal: React.FC<NewGroupModalProps> = ({ isOpen, onClose }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const { selectChat, fetchChats } = useChatStore();

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
      }),
    });

    setIsSubmitting(false);

    if (res.success && res.data) {
      await fetchChats();
      await selectChat(res.data.id);
      setTitle('');
      setDescription('');
      onClose();
    } else {
      setError(res.error?.message || 'Failed to create group');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Создать группу">
      <form onSubmit={handleCreate} className="space-y-4">
        {error && (
          <div className="p-2.5 rounded-dfz-md bg-dfz-danger/10 border border-dfz-danger/20 text-dfz-danger text-xs">
            {error}
          </div>
        )}

        <div className="space-y-1">
          <label className="text-xs font-semibold text-dfz-text-muted">Название группы</label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Например: Команда разработки"
            className="w-full h-9 px-3 bg-dfz-bg border border-dfz-border rounded-dfz-lg text-xs text-dfz-text focus:outline-none focus:border-dfz-border-focus"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-semibold text-dfz-text-muted">Описание (необязательно)</label>
          <textarea
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="О чем эта группа..."
            className="w-full p-2.5 bg-dfz-bg border border-dfz-border rounded-dfz-lg text-xs text-dfz-text focus:outline-none focus:border-dfz-border-focus resize-none"
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-dfz-text-muted hover:text-dfz-text hover:bg-dfz-surface-hover rounded-dfz-md transition-colors"
          >
            Отмена
          </button>
          <button
            type="submit"
            disabled={isSubmitting || !title.trim()}
            className="px-4 py-2 text-xs font-semibold bg-dfz-accent hover:bg-dfz-accent-hover text-white rounded-dfz-md transition-colors shadow-dfz-sm disabled:opacity-50"
          >
            {isSubmitting ? 'Создание...' : 'Создать'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
