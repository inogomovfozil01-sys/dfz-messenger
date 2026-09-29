'use client';

import React, { useEffect, useState, useMemo } from 'react';
import {
  Search,
  MessageSquare,
  Users,
  Radio,
  Clock,
  Sparkles,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { apiRequest } from '../../lib/api';
import { useChatStore } from '../../stores/chatStore';
import { jumpToMessage } from '../chat/ChatSearchResults';
import { Avatar } from '../ui/Avatar';
import { format, isToday, isYesterday } from 'date-fns';
import { ru } from 'date-fns/locale';

interface GlobalSearchProps {
  query: string;
}

type SearchTab = 'all' | 'chats' | 'channels' | 'users' | 'messages';

export function GlobalSearch({ query }: GlobalSearchProps) {
  const [activeTab, setActiveTab] = useState<SearchTab>('all');
  const [results, setResults] = useState<{
    chats?: any[];
    users?: any[];
    messages?: any[];
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const { selectChat, fetchChats, setSearchQuery } = useChatStore();

  useEffect(() => {
    let active = true;
    if (!query.trim()) {
      setResults(null);
      return;
    }

    setIsLoading(true);
    setError('');

    const timer = setTimeout(() => {
      apiRequest<any>('/api/search/global', { params: { q: query } })
        .then((r) => {
          if (!active) return;
          if (r.success) {
            setResults(r.data);
          } else {
            setError(r.error?.message || 'Поиск недоступен');
          }
        })
        .catch(() => {
          if (active) setError('Ошибка при поиске');
        })
        .finally(() => {
          if (active) setIsLoading(false);
        });
    }, 200);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [query]);

  const handleOpenUser = async (user: any) => {
    const res = await apiRequest<any>('/api/chats/direct', {
      method: 'POST',
      body: JSON.stringify({ targetUserId: user.id }),
    });
    if (res.success && res.data) {
      await fetchChats();
      await selectChat(res.data.id);
      setSearchQuery('');
    }
  };

  const handleOpenChat = async (chatId: string) => {
    await selectChat(chatId);
    setSearchQuery('');
  };

  const handleOpenMessage = async (chatId: string, messageId: string) => {
    await jumpToMessage(chatId, messageId);
    setSearchQuery('');
  };

  const formatMsgDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      if (isToday(d)) return format(d, 'HH:mm');
      if (isYesterday(d)) return 'Вчера';
      return format(d, 'd MMM', { locale: ru });
    } catch {
      return '';
    }
  };

  const highlightMatch = (text: string, highlight: string) => {
    if (!highlight.trim() || !text) return text;
    const parts = text.split(new RegExp(`(${highlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
    return (
      <>
        {parts.map((part, i) =>
          part.toLowerCase() === highlight.toLowerCase() ? (
            <span key={i} className="text-[var(--accent-primary)] font-bold">
              {part}
            </span>
          ) : (
            part
          )
        )}
      </>
    );
  };

  const usersList = results?.users || [];
  const chatsList = (results?.chats || []).filter((c) => c.type !== 'CHANNEL');
  const channelsList = (results?.chats || []).filter((c) => c.type === 'CHANNEL');
  const messagesList = results?.messages || [];

  const totalCount = usersList.length + chatsList.length + channelsList.length + messagesList.length;

  const tabs: { id: SearchTab; label: string; count?: number }[] = [
    { id: 'all', label: 'Все', count: totalCount },
    { id: 'chats', label: 'Чаты', count: chatsList.length },
    { id: 'channels', label: 'Каналы', count: channelsList.length },
    { id: 'users', label: 'Люди', count: usersList.length },
    { id: 'messages', label: 'Сообщения', count: messagesList.length },
  ];

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[var(--bg-surface)] select-none">
      {/* Search Category Filter Tabs */}
      <div className="flex items-center gap-1 px-3 py-2 border-b border-[var(--border-subtle)] overflow-x-auto no-scrollbar flex-shrink-0 bg-[var(--bg-surface)]">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                isActive
                  ? 'bg-[var(--accent-primary)] text-white shadow-sm'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)]'
              }`}
            >
              <span>{tab.label}</span>
              {tab.count !== undefined && tab.count > 0 && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    isActive ? 'bg-white/20 text-white' : 'bg-[var(--bg-surface-secondary)] text-[var(--text-secondary)]'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Results Content Body */}
      <div className="flex-1 overflow-y-auto p-2 space-y-4">
        {isLoading && (
          <div className="py-8 text-center text-xs text-[var(--text-secondary)] flex flex-col items-center gap-2">
            <span className="w-5 h-5 border-2 border-[var(--accent-primary)] border-t-transparent rounded-full animate-spin" />
            <span>Поиск…</span>
          </div>
        )}

        {error && (
          <div className="p-4 text-center text-xs text-rose-400">
            {error}
          </div>
        )}

        {!isLoading && results && totalCount === 0 && (
          <div className="py-12 text-center text-xs text-[var(--text-secondary)]">
            <Search size={28} className="mx-auto mb-2 opacity-40" />
            <p className="font-semibold text-sm text-[var(--text-primary)] mb-1">Ничего не найдено</p>
            <p>По запросу «{query}» совпадений нет</p>
          </div>
        )}

        {/* 1. Users Section */}
        {(activeTab === 'all' || activeTab === 'users') && usersList.length > 0 && (
          <section className="space-y-1">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] px-3 py-1">
              Люди и контакты
            </h4>
            {usersList.map((u) => (
              <button
                key={u.id}
                type="button"
                onClick={() => handleOpenUser(u)}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-[var(--bg-surface-hover)] transition-colors text-left group"
              >
                <Avatar
                  src={u.profile?.avatarUrl}
                  name={u.profile?.displayName || u.username}
                  size="md"
                />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-[var(--text-primary)] truncate flex items-center gap-1">
                    <span>{highlightMatch(u.profile?.displayName || u.username, query)}</span>
                    {u.isPremium && (
                      <span className="text-[10px] text-[var(--accent-primary)]">★</span>
                    )}
                  </div>
                  <div className="text-xs text-[var(--text-secondary)] font-mono truncate">
                    @{highlightMatch(u.username, query)}
                  </div>
                </div>
              </button>
            ))}
          </section>
        )}

        {/* 2. Chats / Groups Section */}
        {(activeTab === 'all' || activeTab === 'chats') && chatsList.length > 0 && (
          <section className="space-y-1">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] px-3 py-1">
              Группы и беседы
            </h4>
            {chatsList.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => handleOpenChat(c.id)}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-[var(--bg-surface-hover)] transition-colors text-left group"
              >
                <Avatar
                  src={c.avatarUrl}
                  name={c.title || 'Group'}
                  size="md"
                />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-[var(--text-primary)] truncate flex items-center gap-1.5">
                    <Users size={14} className="text-[var(--text-tertiary)] flex-shrink-0" />
                    <span>{highlightMatch(c.title, query)}</span>
                  </div>
                  <div className="text-xs text-[var(--text-secondary)] truncate">
                    {c.members?.length || 1} участников
                  </div>
                </div>
              </button>
            ))}
          </section>
        )}

        {/* 3. Channels Section */}
        {(activeTab === 'all' || activeTab === 'channels') && channelsList.length > 0 && (
          <section className="space-y-1">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] px-3 py-1">
              Каналы
            </h4>
            {channelsList.map((ch) => (
              <button
                key={ch.id}
                type="button"
                onClick={() => handleOpenChat(ch.id)}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-[var(--bg-surface-hover)] transition-colors text-left group"
              >
                <Avatar
                  src={ch.avatarUrl}
                  name={ch.title || 'Channel'}
                  size="md"
                />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-[var(--text-primary)] truncate flex items-center gap-1.5">
                    <Radio size={14} className="text-[var(--accent-primary)] flex-shrink-0" />
                    <span>{highlightMatch(ch.title, query)}</span>
                  </div>
                  <div className="text-xs text-[var(--text-secondary)] truncate">
                    {ch.members?.length || 1} подписчиков
                  </div>
                </div>
              </button>
            ))}
          </section>
        )}

        {/* 4. Messages Section */}
        {(activeTab === 'all' || activeTab === 'messages') && messagesList.length > 0 && (
          <section className="space-y-1">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] px-3 py-1">
              Найденные сообщения
            </h4>
            {messagesList.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => handleOpenMessage(m.chatId, m.id)}
                className="w-full flex items-start gap-3 px-3 py-2.5 rounded-xl hover:bg-[var(--bg-surface-hover)] transition-colors text-left group"
              >
                <div className="w-10 h-10 rounded-full bg-[var(--bg-surface-secondary)] flex items-center justify-center text-[var(--accent-primary)] flex-shrink-0 mt-0.5">
                  <MessageSquare size={17} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1 mb-0.5">
                    <span className="text-xs font-semibold text-[var(--text-primary)] truncate">
                      {m.chat?.title || m.sender?.profile?.displayName || 'Чат'}
                    </span>
                    <span className="text-[10px] text-[var(--text-tertiary)] flex-shrink-0">
                      {formatMsgDate(m.createdAt)}
                    </span>
                  </div>
                  <div className="text-xs text-[var(--text-secondary)] line-clamp-2 leading-relaxed">
                    {highlightMatch(m.content || 'Файл', query)}
                  </div>
                </div>
              </button>
            ))}
          </section>
        )}
      </div>
    </div>
  );
}
