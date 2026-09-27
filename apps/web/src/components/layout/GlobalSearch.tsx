import { useEffect, useState } from 'react';
import { apiRequest } from '../../lib/api';
import { useChatStore } from '../../stores/chatStore';
import { jumpToMessage } from '../chat/ChatSearchResults';
export function GlobalSearch({query}:{query:string}) {
  const [results,setResults]=useState<any>(null),[error,setError]=useState('');
  useEffect(()=>{let active=true;setResults(null);setError('');const timer=setTimeout(()=>{apiRequest<any>('/api/search/global',{params:{q:query}}).then(r=>{if(!active)return;if(r.success)setResults(r.data);else setError(r.error?.message || 'Поиск недоступен');});},250);return()=>{active=false;clearTimeout(timer);};},[query]);
  const open = async (chatId:string,messageId?:string)=>{ if(messageId) await jumpToMessage(chatId,messageId); else await useChatStore.getState().selectChat(chatId); useChatStore.getState().setSearchQuery(''); };
  return <div className="p-3 space-y-3 text-sm max-h-[50dvh] overflow-y-auto border-b border-dfz-border">
    {error && <p role="alert">{error}</p>}{!results && !error && <p className="text-dfz-text-muted">Поиск…</p>}
    {results && ['users','chats','messages'].map((key,index)=><section key={key}><h3 className="text-xs uppercase tracking-wider text-dfz-text-muted mb-2">{['Пользователи','Группы и каналы','Сообщения'][index]}</h3>{!results[key]?.length && <p className="text-xs text-dfz-text-muted">Ничего не найдено</p>}{results[key]?.map((item:any)=><button key={item.id} className="block w-full text-left p-2 rounded hover:bg-dfz-surface-hover truncate" onClick={async()=>{if(key==='users'){const r=await apiRequest<any>('/api/chats/direct',{method:'POST',body:JSON.stringify({targetUserId:item.id})});if(r.success){await useChatStore.getState().fetchChats();await open(r.data.id);}else setError(r.error?.message || 'Недоступно');}else await open(item.chatId || item.id,key==='messages'?item.id:undefined);}}>{item.displayName || item.title || item.content}<span className="block text-xs text-dfz-text-muted">{item.username ? '@'+item.username : item.chatTitle}</span></button>)}</section>)}
  </div>;
}
