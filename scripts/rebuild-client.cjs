const fs = require('fs');
const edit = (p, fn) => fs.writeFileSync(p, fn(fs.readFileSync(p, 'utf8').replace(/\r\n/g, '\n')));
const rep = (s,a,b) => { if (!s.includes(a)) throw Error('Missing '+a.slice(0,60)); return s.replace(a,b); };
edit('apps/web/src/stores/chatStore.ts', s => {
 s = "import { useAuthStore } from './authStore';\n" + s;
 s = s.replace("'channels' | 'unread'", "'channels' | 'unread' | 'archive'");
 s = rep(s, '      activeChatId: chatId,', '      activeChatId: chatId,\n      activeChat: null,\n      isSearchingInChat: false,\n      isInfoPanelOpen: false,');
 s = rep(s, '    if (chatRes.success && chatRes.data) {', '    if (get().activeChatId !== chatId) return;\n    if (chatRes.success && chatRes.data) {');
 s = s.replace("senderId: 'me',", "senderId: useAuthStore.getState().user!.id,");
 s = rep(s, '            m.id === tempId ? { ...res.data!, deliveryStatus: \'sent\' } : m\n          ),', "            m.id === tempId ? { ...res.data!, deliveryStatus: 'sent' } : m\n          ).filter((m, i, all) => all.findIndex(x => x.id === m.id) === i),");
 s = rep(s, 'const unreadIds = msgs.map((m) => m.id);', "const unreadIds = msgs.filter(m => !m.id.startsWith('temp_') && m.senderId !== useAuthStore.getState().user?.id).slice(-200).map(m => m.id);");
 s = rep(s, '    const updatedMsgs = exists ? currentMsgs : [...currentMsgs, message];', '    const updatedMsgs = exists ? currentMsgs : [...currentMsgs, message];');
 s = rep(s, "unreadCount: isCurrent ? 0 : (c.unreadCount || 0) + 1,", "unreadCount: isCurrent ? 0 : (c.unreadCount || 0) + (exists || message.senderId === useAuthStore.getState().user?.id ? 0 : 1),");
 s = rep(s, "    socket.off('message:new');", "    socket.off('message:edited');\n    socket.off('message:deleted');\n    socket.on('message:edited', message => get().onMessageEdited(message));\n    socket.on('message:deleted', data => get().onMessageDeleted(data));\n    socket.off('message:new');");
 s = rep(s, '      get().onMessageReceived(msg);', '      const message = (msg as any).message || msg;\n      if (!message?.id || !message.chatId) return;\n      get().onMessageReceived(message);\n      if (message.chatId === get().activeChatId && document.visibilityState === \'visible\') void get().markAsRead(message.chatId);');
 s = rep(s, "        if (action === 'add') {", "        if (action === 'add' && reactions[rIndex]?.users.some(u => u.id === userId)) return m;\n        if (action === 'add') {");
 s = s.replaceAll('hasReacted: true,', 'hasReacted: userId === useAuthStore.getState().user?.id || !!reactions[rIndex]?.hasReacted,');
 s = rep(s, '                hasReacted: false,', '                hasReacted: userId === useAuthStore.getState().user?.id ? false : reactions[rIndex].hasReacted,');
 s = rep(s, '    socket.off(\'poll:updated\');', `    socket.off('poll:updated');
    socket.off('connect', reconnectChats);
    socket.on('connect', reconnectChats);`);
 s = 'function reconnectChats() { const state = useChatStore.getState(); void state.fetchChats(); if (state.activeChatId) void state.selectChat(state.activeChatId); }\n' + s;
 return s;
});
edit('apps/web/src/components/layout/ChatList.tsx', s => {
 s = rep(s, "  const folders: { id: FolderFilter;", "  const folders: { id: FolderFilter;");
 s = rep(s, "    {\n      id: 'personal',", "    { id: 'unread', label: 'Непрочитанные' },\n    { id: 'archive', label: 'Архив' },\n    {\n      id: 'personal',");
 s = rep(s, "        // Folder filter", "        if (activeFolder === 'archive') return !!chat.isArchived;\n        if (activeFolder === 'unread') return !chat.isArchived && !!chat.unreadCount;\n        // Folder filter");
 return s;
});
edit('apps/web/src/components/modals/ContactsView.tsx', s => {
 s = rep(s, ') || searchRes.data[0];', ");\n    if (!target) { setAddError('Точный username не найден'); return; }");
 const start = s.indexOf('    if (!userObj?.lastSeenAt)'); const end = s.indexOf('\n  };',start);
 s = s.slice(0,start) + '    return userObj?.isOnline === true;' + s.slice(end);
 return s;
});
edit('apps/web/src/components/chat/ChatHeader.tsx', s => s.replace("return otherMember?.lastSeenAt ? 'В сети' : 'Не в сети';", "return (otherMember as any)?.isOnline ? 'В сети' : otherMember?.lastSeenAt ? `Был(а) ${new Date(otherMember.lastSeenAt).toLocaleString('ru')}` : 'Статус скрыт';"));
edit('apps/web/src/app/page.tsx', s => {
 s = s.replace('onToggleSearch={() => {}}', 'onToggleSearch={() => useChatStore.getState().toggleSearchInChat()}');
 s = s.replace('Сообщения и звонки защищены протоколом сквозного шифрования', 'DFZ Messenger · Личные сообщения, группы и каналы');
 s = s.replaceAll('bg-[#0e1621]', 'bg-dfz-bg').replace('TelegramMessengerPage', 'MessengerPage');
 s = rep(s, '    // Network status listeners', `    const shortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); document.querySelector<HTMLInputElement>('[data-global-search]')?.focus(); }
    };
    window.addEventListener('keydown', shortcut);
    setIsOffline(!navigator.onLine);
    // Network status listeners`);
 s = rep(s, "      window.removeEventListener('online', handleOnline);", "      window.removeEventListener('keydown', shortcut);\n      window.removeEventListener('online', handleOnline);");
 return s;
});
edit('apps/web/src/components/layout/ChatList.tsx', s => rep(s, 'value={searchQuery}', 'data-global-search\n              value={searchQuery}'));
edit('apps/web/src/app/layout.tsx', s => s.replace('  maximumScale: 1,\n  userScalable: false,\n','').replace(/<link rel="icon"[^\n]+/, '<link rel="icon" href="/icon.svg" />'));
