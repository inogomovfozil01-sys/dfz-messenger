import React, { useState } from 'react';
import { Search, Share2, Bookmark, Users, Radio, Check } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Avatar } from '../ui/Avatar';
import { useChatStore } from '../../stores/chatStore';
import { ChatType } from '@dfz/types';

export const ForwardModal: React.FC = () => {
  const { chats, isForwardOpen, forwardingMessage, closeForward, forwardToChat } = useChatStore();
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const [isForwarding, setIsForwarding] = useState(false);
  const [forwardedChatId, setForwardedChatId] = useState<string | null>(null);

  if (!isForwardOpen || !forwardingMessage) return null;

  const filtered = chats.filter((c) => {
    const title = c.title || '';
    return title.toLowerCase().includes(query.toLowerCase());
  });

  const handleSelectChat = async (chatId: string) => {
    setIsForwarding(true);
    setError('');
    const success = await forwardToChat(chatId);
    if (!success) setError('Не удалось переслать сообщение. Проверьте права доступа и повторите.');
    setIsForwarding(false);
  };

  const getChatIcon = (type: ChatType) => {
    switch (type) {
      case ChatType.SAVED:
        return <Bookmark size={14} className="text-[var(--accent-primary)]" />;
      case ChatType.GROUP:
        return <Users size={14} className="text-purple-400" />;
      case ChatType.CHANNEL:
        return <Radio size={14} className="text-cyan-400" />;
      default:
        return null;
    }
  };

  return (
    <Modal isOpen={isForwardOpen} onClose={closeForward} title="Переслать сообщение" maxWidth="sm">
      <div className="space-y-3 select-none">
        {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
        {/* Preview of forwarded message snippet */}
        <div className="p-2.5 bg-dfz-bg border-l-2 border-[var(--accent-primary)] rounded-dfz-md text-xs text-dfz-text-muted">
          <p className="font-semibold text-dfz-text text-[11px] mb-0.5">Пересылаемое сообщение</p>
          <p className="truncate text-dfz-text-muted">
            {forwardingMessage.content || 'Вложение или медиафайл'}
          </p>
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={15} className="absolute left-3 top-2.5 text-dfz-text-muted" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Поиск чатов для пересылки..."
            className="w-full h-9 pl-9 pr-3 bg-dfz-bg border border-dfz-border rounded-dfz-lg text-xs text-dfz-text placeholder:text-dfz-text-muted focus:outline-none focus:border-dfz-border-focus"
          />
        </div>

        {/* Chats list */}
        <div className="max-h-64 overflow-y-auto divide-y divide-dfz-border/40">
          {filtered.length === 0 ? (
            <div className="p-6 text-center text-xs text-dfz-text-muted">Чаты не найдены</div>
          ) : (
            filtered.map((chat) => {
              const isDone = forwardedChatId === chat.id;

              return (
                <div
                  key={chat.id}
                  onClick={() => !isForwarding && handleSelectChat(chat.id)}
                  className="flex items-center justify-between p-2.5 hover:bg-dfz-surface-hover cursor-pointer rounded-dfz-md transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar src={chat.avatarUrl} name={chat.title || 'Chat'} size="md" />
                    <div className="truncate">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold text-dfz-text truncate">
                          {chat.title}
                        </span>
                        {getChatIcon(chat.type)}
                      </div>
                      <p className="text-[11px] text-dfz-text-muted truncate">
                        {chat.type === ChatType.DIRECT
                          ? 'Личный диалог'
                          : chat.type === ChatType.GROUP
                          ? 'Группа'
                          : chat.type === ChatType.CHANNEL
                          ? 'Канал'
                          : 'Избранное'}
                      </p>
                    </div>
                  </div>

                  <div className="flex-shrink-0">
                    {isDone ? (
                      <span className="p-1 rounded-full bg-emerald-500/20 text-emerald-400">
                        <Check size={16} />
                      </span>
                    ) : (
                      <span className="p-1 text-dfz-text-muted hover:text-[var(--accent-primary)]">
                        <Share2 size={16} />
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </Modal>
  );
};
