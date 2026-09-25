'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../stores/authStore';
import { useChatStore } from '../stores/chatStore';
import { useCallStore } from '../stores/callStore';
import { LeftSidebar } from '../components/layout/LeftSidebar';
import { ChatList } from '../components/layout/ChatList';
import { ChatHeader } from '../components/chat/ChatHeader';
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
import { socketService } from '../lib/socket';
import { ShieldCheck, MessageSquare, WifiOff } from 'lucide-react';

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
  } = useChatStore();
  const { setupCallListeners } = useCallStore();

  const [currentNavTab, setCurrentNavTab] = useState<'chats' | 'contacts' | 'calls' | 'saved' | 'archive'>('chats');
  const [isNewChatOpen, setIsNewChatOpen] = useState(false);
  const [isNewGroupOpen, setIsNewGroupOpen] = useState(false);
  const [isNewChannelOpen, setIsNewChannelOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [inspectedUserId, setInspectedUserId] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(false);

  // Check Auth on Mount
  useEffect(() => {
    checkAuth().then((isAuth) => {
      if (!isAuth) {
        router.push('/login');
      } else {
        fetchChats();
        setupSocketListeners();
        setupCallListeners();
      }
    });

    // Network status listeners
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Handle "Saved Messages" click
  const handleNavSelect = async (tab: 'chats' | 'contacts' | 'calls' | 'saved' | 'archive') => {
    setCurrentNavTab(tab);
    if (tab === 'saved') {
      const savedChat = chats.find((c) => c.type === 'SAVED');
      if (savedChat) {
        await selectChat(savedChat.id);
        setCurrentNavTab('chats');
      }
    }
  };

  if (isLoading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-dfz-bg text-dfz-text select-none">
        <div className="w-14 h-14 rounded-dfz-xl bg-dfz-accent flex items-center justify-center text-white shadow-dfz-md mb-4 animate-bounce">
          <ShieldCheck size={32} />
        </div>
        <h2 className="text-base font-bold tracking-tight">DFZ Messenger</h2>
        <p className="text-xs text-dfz-text-muted mt-1">Загрузка безопасного сеанса...</p>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return null;
  }

  return (
    <div className="flex h-screen w-screen bg-dfz-bg text-dfz-text overflow-hidden font-sans">
      {/* Network Offline Alert Bar */}
      {isOffline && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-dfz-danger text-white text-xs py-1 px-4 text-center flex items-center justify-center gap-2 font-medium">
          <WifiOff size={14} />
          <span>Подключение к сети прервано. Попытка восстановить соединение...</span>
        </div>
      )}

      {/* 1. Left Icon Sidebar (Desktop always, hidden on mobile in active chat) */}
      <div className={`h-full ${activeChatId ? 'hidden md:flex' : 'flex'}`}>
        <LeftSidebar
          currentTab={currentNavTab}
          onSelectTab={handleNavSelect}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onOpenProfile={() => setInspectedUserId(user.id)}
        />
      </div>

      {/* 2. Chat List OR Contacts View */}
      <div
        className={`h-full ${
          activeChatId ? 'hidden md:flex' : 'flex w-full md:w-auto'
        }`}
      >
        {currentNavTab === 'contacts' ? (
          <ContactsView onSelectUser={(id) => setInspectedUserId(id)} />
        ) : (
          <ChatList
            onNewChat={() => setIsNewChatOpen(true)}
            onNewGroup={() => setIsNewGroupOpen(true)}
            onNewChannel={() => setIsNewChannelOpen(true)}
          />
        )}
      </div>

      {/* 3. Active Chat Area (or Empty Placeholder) */}
      <div
        className={`flex-1 h-full flex flex-col bg-dfz-bg ${
          activeChatId ? 'flex' : 'hidden md:flex'
        }`}
      >
        {activeChat ? (
          <div className="flex-1 flex flex-col h-full overflow-hidden">
            <ChatHeader
              chat={activeChat}
              onBackMobile={() => useChatStore.setState({ activeChatId: null, activeChat: null })}
              onToggleInfo={toggleInfoPanel}
              onToggleSearch={() => {}}
            />
            <MessageList chatId={activeChat.id} />
            <MessageComposer chatId={activeChat.id} />
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-dfz-text-muted select-none">
            <div className="w-16 h-16 rounded-full bg-dfz-surface border border-dfz-border flex items-center justify-center text-dfz-accent mb-4 shadow-dfz-sm">
              <MessageSquare size={28} />
            </div>
            <h3 className="text-base font-bold text-dfz-text">Выберите чат для начала общения</h3>
            <p className="text-xs text-dfz-text-muted mt-1 max-w-sm">
              Отправляйте текстовые и голосовые сообщения, файлы, делитесь медиа или звоните через WebRTC.
            </p>
          </div>
        )}
      </div>

      {/* 4. Chat Info Panel (Right Drawer) */}
      {isInfoPanelOpen && activeChat && (
        <ChatInfoPanel
          chat={activeChat}
          onClose={toggleInfoPanel}
          onAddMember={() => setIsNewChatOpen(true)}
        />
      )}

      {/* Modals & Dialogs */}
      <NewChatModal isOpen={isNewChatOpen} onClose={() => setIsNewChatOpen(false)} />
      <NewGroupModal isOpen={isNewGroupOpen} onClose={() => setIsNewGroupOpen(false)} />
      <NewChannelModal isOpen={isNewChannelOpen} onClose={() => setIsNewChannelOpen(false)} />
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
      <UserProfileModal userId={inspectedUserId} onClose={() => setInspectedUserId(null)} />
      <CallOverlay />
    </div>
  );
}
