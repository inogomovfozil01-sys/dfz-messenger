import { useState } from 'react';
import { Modal } from '../ui/Modal';
import { apiRequest } from '../../lib/api';
export function ReportModal({ targetId, targetType, onClose }: {targetId:string|null; targetType:'USER'|'MESSAGE'|'CHAT'; onClose:()=>void}) {
  const [reason,setReason]=useState('SPAM'),[comment,setComment]=useState(''),[status,setStatus]=useState(''),[busy,setBusy]=useState(false);
  return <Modal isOpen={!!targetId} onClose={onClose} title="Пожаловаться"><form className="space-y-3" onSubmit={async e=>{e.preventDefault();setBusy(true);const res=await apiRequest('/api/moderation/report',{method:'POST',body:JSON.stringify({targetType,targetId,reason,comment})});setBusy(false);setStatus(res.success?'Жалоба отправлена модераторам':res.error?.message || 'Не удалось отправить жалобу');}}>
    <label className="block text-sm">Причина<select className="block w-full bg-dfz-bg rounded p-2 mt-1" value={reason} onChange={e=>setReason(e.target.value)}>{[['SPAM','Спам'],['SCAM','Мошенничество'],['HARASSMENT','Преследование'],['ILLEGAL_CONTENT','Незаконный контент'],['OTHER','Другое']].map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label>
    <textarea aria-label="Комментарий" maxLength={500} className="w-full bg-dfz-bg p-2 rounded" value={comment} onChange={e=>setComment(e.target.value)} placeholder="Что произошло?" />
    {status && <p role="status" className="text-sm">{status}</p>}
    <button disabled={busy} className="bg-dfz-accent rounded px-4 py-2 text-white">Отправить жалобу</button>
  </form></Modal>;
}
