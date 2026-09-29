import React, { useState, useEffect } from 'react';
import {
  Megaphone,
  Globe,
  Lock,
  Camera,
  X,
} from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Avatar } from '../ui/Avatar';
import { apiRequest } from '../../lib/api';
import { useChatStore } from '../../stores/chatStore';

interface NewChannelModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NewChannelModal: React.FC<NewChannelModalProps> = ({ isOpen, onClose }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [isPublic, setIsPublic] = useState(true);
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
      setTitle('');
      setDescription('');
      setAvatarUrl('');
      setIsPublic(true);
      setError('');
    }
  }, [isOpen]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSubmitting(true);
    setError('');

    const res = await apiRequest<any>('/api/chats/channel', {
      method: 'POST',
      body: JSON.stringify({
        title: title.trim(),
        description: description.trim() || undefined,
        avatarUrl: avatarUrl.trim() || undefined,
        isPublic,
      }),
    });

    setIsSubmitting(false);

    if (res.success && res.data) {
      await fetchChats();
      await selectChat(res.data.id);
      onClose();
    } else {
      setError(res.error?.message || 'Не удалось создать канал');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Создать канал" maxWidth="md">
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
            title="Нажмите, чтобы загрузить фото канала"
          >
            <Avatar src={avatarUrl} name={title || 'Канал'} size="lg" />
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
              <label className="text-[11px] font-semibold text-dfz-text-muted">Название канала</label>
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
              placeholder="Например: Новости IT и разработки"
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
            placeholder="О чем этот канал, тематика публикаций..."
            className="w-full p-2.5 bg-dfz-bg border border-dfz-border rounded-dfz-lg text-xs text-dfz-text focus:outline-none focus:border-dfz-accent resize-none"
          />
        </div>

        {/* Channel Type Cards */}
        <div className="space-y-2 pt-1">
          <label className="text-[11px] font-semibold text-dfz-text-muted">Тип канала</label>
          <div className="grid grid-cols-2 gap-2.5">
            <div
              onClick={() => setIsPublic(true)}
              className={`p-3 rounded-dfz-xl border cursor-pointer space-y-1 transition-colors ${
                isPublic
                  ? 'bg-dfz-surface-secondary border-dfz-accent text-dfz-text'
                  : 'bg-dfz-bg border-dfz-border text-dfz-text-muted hover:border-dfz-text-muted'
              }`}
            >
              <div className="flex items-center gap-1.5 font-semibold text-xs text-dfz-text">
                <Globe size={14} className={isPublic ? 'text-dfz-accent' : 'text-dfz-text-muted'} />
                <span>Публичный</span>
              </div>
              <p className="text-[10px] text-dfz-text-muted leading-tight">
                Канал открыт для всех и отображается в глобальном поиске.
              </p>
            </div>

            <div
              onClick={() => setIsPublic(false)}
              className={`p-3 rounded-dfz-xl border cursor-pointer space-y-1 transition-colors ${
                !isPublic
                  ? 'bg-dfz-surface-secondary border-dfz-accent text-dfz-text'
                  : 'bg-dfz-bg border-dfz-border text-dfz-text-muted hover:border-dfz-text-muted'
              }`}
            >
              <div className="flex items-center gap-1.5 font-semibold text-xs text-dfz-text">
                <Lock size={14} className={!isPublic ? 'text-dfz-accent' : 'text-dfz-text-muted'} />
                <span>Частный</span>
              </div>
              <p className="text-[10px] text-dfz-text-muted leading-tight">
                Вход доступен только по персональной пригласительной ссылке.
              </p>
            </div>
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
            {isSubmitting ? 'Создание...' : 'Создать канал'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
