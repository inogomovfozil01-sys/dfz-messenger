'use client';
import { useEffect, useState } from 'react';
import { apiRequest } from '../../lib/api';

export function InviteManager({ chatId }: { chatId: string }) {
  const [invites,setInvites] = useState<any[]>([]), [requests,setRequests] = useState<any[]>([]), [actions,setActions] = useState<any[]>([]);
  const [name,setName] = useState('Приглашение'), [expires,setExpires] = useState(''), [limit,setLimit] = useState(''), [approval,setApproval] = useState(false), [error,setError] = useState('');
  const load = async () => {
    const [i,r,a] = await Promise.all([apiRequest<any[]>(`/api/chats/${chatId}/invites`), apiRequest<any[]>(`/api/chats/${chatId}/join-requests`), apiRequest<any[]>(`/api/chats/${chatId}/recent-actions`)]);
    if(i.success) setInvites(i.data || []); if(r.success) setRequests(r.data || []); if(a.success) setActions(a.data || []);
  };
  useEffect(() => { void load(); },[chatId]);
  const mutate = async (path: string, method: string, body?: unknown) => {
    setError(''); const res = await apiRequest(path, { method, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
    if (!res.success) setError(res.error?.message || 'Не удалось выполнить действие'); else await load();
  };
  return <section className="space-y-3 border-t border-dfz-border pt-4">
    <h4 className="font-semibold">Приглашения с ограничениями</h4>
    {error && <p role="alert" className="text-dfz-danger">{error}</p>}
    <form className="space-y-2" onSubmit={async e => { e.preventDefault(); await mutate(`/api/chats/${chatId}/invites`, 'POST', { name, ...(expires && { expiresAt:new Date(expires).toISOString() }), ...(limit && { usageLimit:Number(limit) }), approvalRequired:approval }); }}>
      <label className="block">Название<input className="w-full bg-dfz-bg border border-dfz-border p-2 rounded mt-1" value={name} maxLength={80} required onChange={e => setName(e.target.value)} /></label>
      <label className="block">Действует до<input className="w-full bg-dfz-bg p-2 rounded mt-1" type="datetime-local" value={expires} onChange={e => setExpires(e.target.value)} /></label>
      <label className="block">Лимит использований<input className="w-full bg-dfz-bg p-2 rounded mt-1" type="number" min={1} max={100000} value={limit} placeholder="Без лимита" onChange={e => setLimit(e.target.value)} /></label>
      <label className="flex gap-2"><input type="checkbox" checked={approval} onChange={e => setApproval(e.target.checked)} />Одобрять заявки вручную</label>
      <button className="bg-dfz-accent text-white rounded px-3 py-2">Создать ссылку</button>
    </form>
    {!invites.length && <p className="text-dfz-text-muted">Ссылок пока нет</p>}
    {invites.map(i => <div key={i.id} className="border-b border-dfz-border py-2 space-y-1"><div>{i.name} · {i.usedCount} / {i.usageLimit || '∞'} {i.revokedAt && '· Отозвана'}</div><div className="flex gap-3"><button disabled={!!i.revokedAt} onClick={() => navigator.clipboard.writeText(`${location.origin}/?invite=${i.code}`).catch(() => setError('Не удалось скопировать ссылку'))}>Копировать</button><button disabled={!!i.revokedAt} className="text-dfz-danger" onClick={() => mutate(`/api/chats/${chatId}/invites/${i.id}`, 'DELETE')}>Отозвать</button></div></div>)}
    <h4 className="font-semibold pt-3">Заявки на вступление</h4>
    {!requests.length && <p className="text-dfz-text-muted">Новых заявок нет</p>}
    {requests.map(r => <div key={r.id} className="flex items-center justify-between gap-2"><span>@{r.user?.username || r.userId}</span><button onClick={() => mutate(`/api/chats/${chatId}/join-requests/${r.id}`, 'PUT', {approve:true})}>Принять</button><button onClick={() => mutate(`/api/chats/${chatId}/join-requests/${r.id}`, 'PUT', {approve:false})}>Отклонить</button></div>)}
    <h4 className="font-semibold pt-3">Последние действия</h4>
    {!actions.length && <p className="text-dfz-text-muted">Журнал пока пуст</p>}
    {actions.map(a => <p key={a.id} className="text-dfz-text-muted">{new Date(a.createdAt).toLocaleString('ru')} · {a.action}</p>)}
  </section>;
}
