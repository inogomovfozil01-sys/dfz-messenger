const fs=require('fs');
function edit(p,fn){fs.writeFileSync(p,fn(fs.readFileSync(p,'utf8').replace(/\r\n/g,'\n')))}
for(const kind of ['Group','Channel']) edit(`apps/web/src/components/modals/${kind}ManageModal.tsx`,s=>{
 s="import { InviteManager } from './InviteManager';\n"+s;
 const marker="{activeTab === 'invites' && ("; const i=s.indexOf(marker); if(i<0) throw Error('invite anchor');
 const d=s.indexOf('<div className="space-y-4">',i);
 s=s.slice(0,d)+s.slice(d).replace('<div className="space-y-4">','<div className="space-y-4">\n              <InviteManager chatId={chat.id} />');
 s=s.replaceAll('m.user?.profile?.displayName || m.user?.username','m.displayName || m.username').replaceAll('m.user?.profile?.avatarUrl','m.avatarUrl').replaceAll('m.user?.username','m.username');
 if(kind==='Group'){
 s=s.replace("      setMembers(chat.members || []);",`      setMembers(chat.members || []);
      apiRequest<any>(\x60/api/chats/\x24{chat.id}/policy\x60).then(res => { if(res.success && res.data) { setPermSendMessages(res.data.sendMessages); setPermSendMedia(res.data.sendMedia); setPermAddUsers(res.data.addMembers); setPermPinMessages(res.data.pinMessages); setPermChangeInfo(res.data.changeInfo); } });`);
 s=s.replace("onClick={() => {\n                    setStatusMessage('Разрешения участников обновлены');",`onClick={async () => {
                    const res = await apiRequest(\x60/api/chats/\x24{chat.id}/policy\x60, { method:'PUT', body:JSON.stringify({ sendMessages:permSendMessages, sendMedia:permSendMedia, sendStickers:permSendMedia, addMembers:permAddUsers, pinMessages:permPinMessages, changeInfo:permChangeInfo }) });
                    if(!res.success) { setErrorMessage(res.error?.message || 'Не удалось сохранить разрешения'); return; }
                    setStatusMessage('Разрешения участников обновлены');`);
 }
 return s;
});
edit('apps/web/src/components/modals/SettingsModal.tsx',s=>{
 s=s.replace("useState('14.2 MB')", "useState('Рассчитывается…')");
 s=s.replace('    await updateProfile({','    const saved = await updateProfile({').replace('    await updatePrivacy({','    const saved = await updatePrivacy({');
 s=s.replaceAll('    setIsSaved(true);','    if (!saved) return;\n    setIsSaved(true);');
 s=s.replace("  const handleClearCache = () => {\n    localStorage.removeItem('dfz_chat_cache');\n    sessionStorage.clear();\n    setCacheSize('0 KB');", `  const handleClearCache = async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k.startsWith('dfz-')).map(k => caches.delete(k)));
    localStorage.removeItem('dfz_chat_cache');
    const estimate = await navigator.storage?.estimate();
    setCacheSize(estimate?.usage !== undefined ? (estimate.usage / 1024 / 1024).toFixed(2) + ' MB' : 'Недоступно');`);
 s=s.replace('  const loadBlockedUsers = async () => {',`  useEffect(() => {
    if (!isOpen) return;
    navigator.storage?.estimate().then(e => setCacheSize(e.usage !== undefined ? (e.usage / 1024 / 1024).toFixed(2) + ' MB' : 'Недоступно'));
    apiRequest<any>('/api/settings').then(r => { if(r.success && r.data) { setNotifyPrivate(r.data.notifyPrivate); setNotifyGroups(r.data.notifyGroups); setNotifyChannels(r.data.notifyChannels); setNotifySound(r.data.notifySound); setNotifyPreview(r.data.notifyPreview); setChatDensity(r.data.density); setAutoDownloadWifi(r.data.autoDownloadWifi); setAutoDownloadMobile(r.data.autoDownloadMobile); } });
  }, [isOpen]);
  const saveSetting = async (key: string, value: unknown) => { await apiRequest('/api/settings', {method:'PUT', body:JSON.stringify({[key]:value})}); };
  const loadBlockedUsers = async () => {`);
 for(const name of ['NotifyPrivate','NotifyGroups','NotifyChannels','NotifySound','NotifyPreview','AutoDownloadWifi','AutoDownloadMobile']){
 const key=name[0].toLowerCase()+name.slice(1);
 s=s.replace(`onChange={(e) => set${name}(e.target.checked)}`, `onChange={(e) => { set${name}(e.target.checked); void saveSetting('${key}', e.target.checked); }}`);
 }
 s=s.replaceAll("setSelectedLang('ru')", "{ setSelectedLang('ru'); void updateProfile({language:'ru'}); }").replaceAll("setSelectedLang('en')", "{ setSelectedLang('en'); void updateProfile({language:'en'}); }").replaceAll("setSelectedLang('uz')", "{ setSelectedLang('uz'); void updateProfile({language:'uz'}); }");
 return s;
});
