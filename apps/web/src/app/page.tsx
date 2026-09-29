'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../stores/authStore';
import { useChatStore } from '../stores/chatStore';
import { useCallStore } from '../stores/callStore';
import { useStoriesStore } from '../stores/storiesStore';
import { useEconomyStore } from '../stores/economyStore';
import { TelegramDrawer } from '../components/layout/TelegramDrawer';
import { ChatList } from '../components/layout/ChatList';
import { ChatHeader } from '../components/chat/ChatHeader';
import { ChatSearchResults } from '../components/chat/ChatSearchResults';
import { MessageList } from '../components/chat/MessageList';
import { MessageComposer } from '../components/chat/MessageComposer';
import { ChatInfoPanel } from '../components/chat/ChatInfoPanel';
import { ContactsView } from '../components/modals/ContactsView';
import { NewChatModal } from '../components/modals/NewChatModal';
import { NewGroupModal } from '../components/modals/NewGroupModal';
import { NewChannelModal } from '../components/modals/NewChannelModal';
import { SettingsModal } from '../components/modals/SettingsModal';
import { UserProfileModal } from '../components/modals/UserProfileModal';
import { CallOverlay } from '../components/modals/CallOverlay';
import { CallsHistoryModal } from '../components/modals/CallsHistoryModal';
import { GroupManageModal } from '../components/modals/GroupManageModal';
import { ChannelManageModal } from '../components/modals/ChannelManageModal';
import { ForwardModal } from '../components/chat/ForwardModal';
import { StoryViewerModal } from '../components/stories/StoryViewerModal';
import { StoryCreatorModal } from '../components/stories/StoryCreatorModal';
import { StoryAnalyticsModal } from '../components/stories/StoryAnalyticsModal';
import { MyStarsModal } from '../components/economy/MyStarsModal';
import { GiftStoreModal } from '../components/economy/GiftStoreModal';
import { CollectibleViewerModal } from '../components/economy/CollectibleViewerModal';
import { PremiumModal } from '../components/economy/PremiumModal';
import { AdminQuickActionsModal } from '../components/economy/AdminQuickActionsModal';
import Link from 'next/link';
import { apiRequest } from '../lib/api';
import { Modal } from '../components/ui/Modal';
import { BrandMark } from '../components/ui/BrandMark';
import { ShieldCheck, MessageSquare, WifiOff, Users, Phone, Bookmark, Settings, Plus, Shield } from 'lucide-react';

export default function MessengerPage() {
  const router = useRouter();
  const { user, profile, isAuthenticated, isLoading, checkAuth } = useAuthStore();
  const {
    chats,
    activeChat,
    activeChatId,
    selectChat,
    fetchChats,
    isInfoPanelOpen,
    toggleInfoPanel,
    setupSocketListeners,
    activeGroupManageChat,
    setGroupManageChat,
    activeChannelManageChat,
    setChannelManageChat,
  } = useChatStore();
  const { setupCallListeners } = useCallStore();
  const { toastMessage } = useEconomyStore();

  const [isTelegramDrawerOpen, setIsTelegramDrawerOpen] = useState(false);
  const [currentView, setCurrentView] = useState<'chats' | 'contacts'>('chats');
  const [isNewChatOpen, setIsNewChatOpen] = useState(false);
  const [isNewGroupOpen, setIsNewGroupOpen] = useState(false);
  const [isNewChannelOpen, setIsNewChannelOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCallsOpen, setIsCallsOpen] = useState(false);
  const [inspectedUserId, setInspectedUserId] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [inviteStatus, setInviteStatus] = useState('');

  useEffect(() => {
    const theme = profile?.theme || 'dark';
    const system = window.matchMedia('(prefers-color-scheme: light)');
    const apply = () => {
      document.documentElement.classList.remove('light', 'dark', 'dim');
      document.documentElement.classList.add(theme === 'system' ? system.matches ? 'light' : 'dark' : theme);
    };
    apply();
    system.addEventListener('change', apply);
    return () => system.removeEventListener('change', apply);
  }, [profile?.theme]);

  useEffect(() => {
    let cancelled = false;
    if (user) apiRequest('/api/settings').then(result => {
      if (!cancelled && result.success) document.documentElement.dataset.density = result.data.density;
    });
    return () => { cancelled = true; };
  }, [user?.id]);

  // Check Auth on Mount
  useEffect(() => {
    checkAuth().then((isAuth) => {
      if (!isAuth) {
        router.push('/login');
      } else {
        const params = new URLSearchParams(window.location.search);
        setInviteCode(params.get('invite'));
        setInspectedUserId(params.get('profile'));
        fetchChats();
        setupSocketListeners();
        setupCallListeners();
        useStoriesStore.getState().setupStoriesSocket();
        useEconomyStore.getState().setupEconomySocket();
      }
    });

    const shortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); document.querySelector<HTMLInputElement>('[data-global-search]')?.focus(); }
    };
    window.addEventListener('keydown', shortcut);
    setIsOffline(!navigator.onLine);
    // Network status listeners
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('keydown', shortcut);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Handle "Saved Messages" click in Telegram Drawer
  const handleOpenSavedMessages = async () => {
    let savedChat = chats.find((c) => c.type === 'SAVED');
    if (!savedChat && user) {
      const res = await apiRequest<any>('/api/chats/direct', {
        method: 'POST',
        body: JSON.stringify({ targetUserId: user.id }),
      });
      if (res.success && res.data) {
        await fetchChats();
        savedChat = res.data;
      }
    }
    if (savedChat) {
      await selectChat(savedChat.id);
      setCurrentView('chats');
    }
  };

  if (isLoading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-dfz-bg text-white select-none">
        <BrandMark className="w-16 h-16 mb-4 animate-pulse" />
        <h2 className="text-base font-bold tracking-tight">DFZ Messenger</h2>
        <p className="text-xs text-[var(--text-secondary)] mt-1 font-medium">Загружаем ваши чаты…</p>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return null;
  }

  return (
    <div className="flex h-[100dvh] w-screen bg-dfz-bg text-dfz-text overflow-hidden font-sans select-none">
      <nav aria-label="Основная навигация" className="dfz-rail hidden md:flex flex-col items-center gap-3 shrink-0">
        <BrandMark className="w-11 h-11 mb-7" />
        <button title="Сообщения" aria-label="Сообщения" aria-current={currentView === 'chats' ? 'page' : undefined} onClick={() => setCurrentView('chats')}><MessageSquare size={22}/></button>
        <button title="Контакты" aria-label="Контакты" aria-current={currentView === 'contacts' ? 'page' : undefined} onClick={() => setCurrentView('contacts')}><Users size={22}/></button>
        <button title="Звонки" aria-label="Звонки" onClick={() => setIsCallsOpen(true)}><Phone size={21}/></button>
        <button title="Избранное" aria-label="Избранное" onClick={handleOpenSavedMessages}><Bookmark size={21}/></button>
        <div className="flex-1"/>
        {(user.role === 'ADMIN' || user.role === 'SUPERADMIN') && (
          <Link
            href="/admin"
            title="Панель администратора"
            aria-label="Панель администратора"
            className="w-9 h-9 rounded-full flex items-center justify-center text-rose-400 hover:bg-rose-500/15 transition-colors border border-rose-500/30"
          >
            <Shield size={20} />
          </Link>
        )}
        <button title="Настройки" aria-label="Настройки" onClick={() => setIsSettingsOpen(true)}><Settings size={22}/></button>
        <button title="Мой профиль" aria-label="Мой профиль" onClick={() => setInspectedUserId(user.id)}><span className="w-9 h-9 grid place-items-center rounded-full bg-dfz-surface-active text-sm font-semibold text-dfz-text">{(profile?.displayName || user.username).slice(0,2).toUpperCase()}</span></button>
      </nav>
      {/* Network Offline Alert Bar */}
      {isOffline && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-[#e53935] text-white text-xs py-1 px-4 text-center flex items-center justify-center gap-2 font-medium shadow-md">
          <WifiOff size={14} />
          <span>Подключение к сети прервано. Попытка восстановить связь...</span>
        </div>
      )}

      {/* 1. Telegram Chat List Column (full width on mobile if no active chat) */}
      <div
        className={`h-full ${
          activeChatId ? 'hidden md:flex' : 'flex w-full md:w-auto'
        }`}
      >
        {currentView === 'contacts' ? (
          <ContactsView
            onSelectUser={(id) => setInspectedUserId(id)}
            onBack={() => setCurrentView('chats')}
          />
        ) : (
          <ChatList
            onOpenMenu={() => setIsTelegramDrawerOpen(true)}
            onNewChat={() => setIsNewChatOpen(true)}
            onNewGroup={() => setIsNewGroupOpen(true)}
            onNewChannel={() => setIsNewChannelOpen(true)}
          />
        )}
      </div>

      {/* 2. Telegram Main Chat Area (full width on mobile if chat is active) */}
      <div
        className={`flex-1 h-full flex flex-col bg-dfz-bg relative overflow-hidden ${
          activeChatId ? 'flex' : 'hidden md:flex'
        }`}
      >
        {activeChat ? (
          <div className="flex-1 flex flex-col h-full overflow-hidden">
            {/* Telegram Chat Header */}
            <ChatHeader
              chat={activeChat}
              onBackMobile={() => useChatStore.setState({ activeChatId: null, activeChat: null })}
              onToggleInfo={toggleInfoPanel}
              onToggleSearch={() => useChatStore.getState().toggleSearchInChat()}
            />

            {/* Telegram Wallpaper Message Canvas */}
            <ChatSearchResults />
            <MessageList chatId={activeChat.id} />

            {/* Telegram Message Composer */}
            <MessageComposer chatId={activeChat.id} />
          </div>
        ) : (
          /* Telegram Classic Empty State */
          <div className="dfz-chat-canvas flex-1 flex flex-col items-center justify-center p-8 text-center select-none">
            <BrandMark className="w-24 h-24 mb-7 shadow-dfz-lg" />
            <p className="text-[10px] uppercase tracking-[.25em] text-dfz-text-muted mb-3">DFZ MESSENGER</p>
            <h2 className="text-3xl font-semibold tracking-tight">Ближе к своим.</h2>
            <p className="text-sm text-dfz-text-muted mt-3 max-w-xs leading-relaxed">Личные разговоры, общие идеи и важные сообщения — в одном месте.</p>
            <button onClick={() => setIsNewChatOpen(true)} className="mt-7 px-5 py-3 rounded-xl bg-dfz-accent hover:bg-dfz-accent-hover text-white text-sm font-medium flex items-center gap-2"><Plus size={17}/>Начать разговор</button>
            <p className="text-xs text-dfz-text-subtle mt-10">Выберите чат слева или найдите человека по имени</p>
          </div>
        )}
      </div>

      {/* 3. Telegram Right Info Panel (Sliding Drawer) */}
      {isInfoPanelOpen && activeChat && (
        <ChatInfoPanel
          chat={activeChat}
          onClose={toggleInfoPanel}
          onAddMember={() => setIsNewChatOpen(true)}
        />
      )}

      {/* Telegram Sliding Drawer Menu (☰ Hamburger Menu) */}
      <TelegramDrawer
        isOpen={isTelegramDrawerOpen}
        onClose={() => setIsTelegramDrawerOpen(false)}
        onOpenProfile={() => setInspectedUserId(user.id)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenContacts={() => setCurrentView('contacts')}
        onOpenCalls={() => setIsCallsOpen(true)}
        onOpenSavedMessages={handleOpenSavedMessages}
        onNewGroup={() => setIsNewGroupOpen(true)}
        onNewChannel={() => setIsNewChannelOpen(true)}
        onOpenStories={() => useStoriesStore.getState().openCreator()}
      />

      {/* Dialogs and Modals */}
      <Modal isOpen={!!inviteCode} onClose={() => setInviteCode(null)} title="Приглашение">
        <p className="text-sm text-dfz-text-muted mb-4">Присоединиться к беседе по приглашению?</p>
        {inviteStatus && <p role="status" className="text-sm mb-3">{inviteStatus}</p>}
        <button className="bg-dfz-accent text-white px-4 py-2 rounded" onClick={async () => {
          const res = await apiRequest<any>(`/api/invites/${encodeURIComponent(inviteCode!)}/join`, {method:'POST'});
          if(!res.success) { setInviteStatus(res.error?.message || 'Приглашение недоступно'); return; }
          if(res.data?.status === 'PENDING') { setInviteStatus('Заявка отправлена администратору'); return; }
          await fetchChats(); await selectChat(res.data.chatId); setInviteCode(null);
        }}>Присоединиться</button>
      </Modal>
      <NewChatModal isOpen={isNewChatOpen} onClose={() => setIsNewChatOpen(false)} />
      <NewGroupModal isOpen={isNewGroupOpen} onClose={() => setIsNewGroupOpen(false)} />
      <NewChannelModal isOpen={isNewChannelOpen} onClose={() => setIsNewChannelOpen(false)} />
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
      <CallsHistoryModal isOpen={isCallsOpen} onClose={() => setIsCallsOpen(false)} />
      <UserProfileModal userId={inspectedUserId} onClose={() => setInspectedUserId(null)} />
      <CallOverlay />

      {/* Group & Channel Management Modals */}
      <GroupManageModal
        isOpen={!!activeGroupManageChat}
        onClose={() => setGroupManageChat(null)}
        chat={activeGroupManageChat}
      />
      <ChannelManageModal
        isOpen={!!activeChannelManageChat}
        onClose={() => setChannelManageChat(null)}
        chat={activeChannelManageChat}
      />

      {/* Forward Modal */}
      <ForwardModal />

      {/* Stories Modals */}
      <StoryViewerModal />
      <StoryCreatorModal />
      <StoryAnalyticsModal />

      {/* Economy Modals */}
      <MyStarsModal />
      <GiftStoreModal />
      <CollectibleViewerModal />
      <PremiumModal />
      <AdminQuickActionsModal />

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 animate-bounce p-3 px-4 rounded-full bg-[#17212b] border border-[var(--accent-primary)]/40 shadow-2xl flex items-center gap-2.5 text-xs font-semibold text-white">
          <span className="text-amber-400 font-bold">★</span>
          <span>{toastMessage.text}</span>
        </div>
      )}
    </div>
  );
}
