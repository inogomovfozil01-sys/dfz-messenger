'use client';
import { useEffect, useState } from 'react';
export function AppUpdates() {
  const [worker,setWorker]=useState<ServiceWorker|null>(null);
  useEffect(()=>{
    if(!('serviceWorker' in navigator) || process.env.NODE_ENV !== 'production') return;
    navigator.serviceWorker.register('/sw.js').then(reg=>{
      if(reg.waiting) setWorker(reg.waiting);
      reg.addEventListener('updatefound',()=>{ const installing=reg.installing; installing?.addEventListener('statechange',()=>{ if(installing.state==='installed' && navigator.serviceWorker.controller) setWorker(installing); }); });
    }).catch(()=>{});
  },[]);
  if(!worker) return null;
  return <button className="fixed bottom-3 left-3 z-[100] bg-dfz-accent text-white p-3 rounded" onClick={()=>{ worker.postMessage('ACTIVATE_UPDATE'); navigator.serviceWorker.addEventListener('controllerchange',()=>location.reload(),{once:true}); }}>Обновить DFZ Messenger</button>;
}
