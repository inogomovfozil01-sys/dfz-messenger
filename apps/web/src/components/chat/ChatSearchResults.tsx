'use client';
import { useState } from 'react';
import { Search } from 'lucide-react';
import { useChatStore } from '../../stores/chatStore';

export async function jumpToMessage(chatId: string, messageId: string) {
  if (useChatStore.getState().activeChatId !== chatId) await useChatStore.getState().selectChat(chatId);
  let state = useChatStore.getState();
  while (!state.messages[chatId]?.some(m => m.id === messageId) && state.hasMore[chatId]) {
    const cursor = state.nextCursor[chatId];
    await state.fetchMessages(chatId);
    state = useChatStore.getState();
    if (state.activeChatId !== chatId || cursor === state.nextCursor[chatId]) return false;
  }
  await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
  const element = document.getElementById(`message-${messageId}`);
  element?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  element?.animate([{ background: 'rgba(42,141,212,.3)' }, { background: 'transparent' }], { duration: 1500 });
  return !!element;
}

export function ChatSearchResults() {
  const { activeChatId, isSearchingInChat, inChatSearchQuery, inChatSearchResults } = useChatStore();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  if (!isSearchingInChat || !inChatSearchQuery) return null;
  return <div className="max-h-[35dvh] overflow-y-auto bg-dfz-surface border-b border-dfz-border" aria-label="Результаты поиска">
    {!inChatSearchResults.length && <p className="p-4 text-sm text-dfz-text-muted">Сообщения не найдены</p>}
    {inChatSearchResults.map(result => <button key={result.id} disabled={!!loadingId} onClick={async () => { if (!activeChatId) return; setLoadingId(result.id); try { await jumpToMessage(activeChatId, result.id); } finally { setLoadingId(null); } }} className="w-full text-left p-3 flex gap-3 hover:bg-dfz-surface-hover border-b border-dfz-border">
      <Search size={16} className="shrink-0 mt-1 text-dfz-accent" />
      <span className="min-w-0"><span className="text-xs text-dfz-text-muted">{result.senderName} · {new Date(result.createdAt).toLocaleDateString('ru')}</span><span className="block truncate text-sm">{loadingId === result.id ? 'Открываем сообщение…' : result.content}</span></span>
    </button>)}
  </div>;
}
