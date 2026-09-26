import React from 'react';
import { MessageSquare, Phone, Users, Sparkles, Settings } from 'lucide-react';
import { useChatStore } from '../../stores/chatStore';
import { useStoriesStore } from '../../stores/storiesStore';

interface MobileBottomNavProps {
  currentTab: 'chats' | 'contacts' | 'calls' | 'saved' | 'archive' | 'stories';
  onSelectTab: (tab: any) => void;
  onOpenSettings: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  currentTab,
  onSelectTab,
  onOpenSettings,
}) => {
  const { chats, activeChatId } = useChatStore();
  const { openCreator } = useStoriesStore();

  // Hide bottom nav when viewing an active chat on mobile to give 100% viewport to the conversation
  if (activeChatId) return null;

  const totalUnread = chats.reduce((acc, c) => acc + (c.unreadCount || 0), 0);

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-dfz-surface/95 backdrop-blur-md border-t border-dfz-border pb-[env(safe-area-inset-bottom,0px)] shadow-lg select-none">
      <div className="flex items-center justify-around h-14 px-2">
        {/* Chats */}
        <button
          type="button"
          onClick={() => onSelectTab('chats')}
          className={`flex-1 flex flex-col items-center justify-center py-1 transition-colors relative ${
            currentTab === 'chats' ? 'text-dfz-accent font-semibold' : 'text-dfz-text-muted hover:text-dfz-text'
          }`}
        >
          <div className="relative">
            <MessageSquare size={20} />
            {totalUnread > 0 && (
              <span className="absolute -top-1.5 -right-2.5 px-1 min-w-[16px] h-4 rounded-full bg-dfz-accent text-white text-[10px] font-bold flex items-center justify-center border border-dfz-surface">
                {totalUnread > 99 ? '99+' : totalUnread}
              </span>
            )}
          </div>
          <span className="text-[10px] mt-0.5">Чаты</span>
        </button>

        {/* Calls */}
        <button
          type="button"
          onClick={() => onSelectTab('calls')}
          className={`flex-1 flex flex-col items-center justify-center py-1 transition-colors ${
            currentTab === 'calls' ? 'text-dfz-accent font-semibold' : 'text-dfz-text-muted hover:text-dfz-text'
          }`}
        >
          <Phone size={20} />
          <span className="text-[10px] mt-0.5">Звонки</span>
        </button>

        {/* Stories / Add Story */}
        <button
          type="button"
          onClick={() => openCreator()}
          className="flex-1 flex flex-col items-center justify-center py-1 transition-colors group"
        >
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-dfz-accent via-purple-500 to-pink-500 text-white flex items-center justify-center shadow-dfz-sm group-active:scale-90 transition-transform">
            <Sparkles size={16} />
          </div>
          <span className="text-[10px] mt-0.5 font-medium text-dfz-text">История</span>
        </button>

        {/* Contacts */}
        <button
          type="button"
          onClick={() => onSelectTab('contacts')}
          className={`flex-1 flex flex-col items-center justify-center py-1 transition-colors ${
            currentTab === 'contacts' ? 'text-dfz-accent font-semibold' : 'text-dfz-text-muted hover:text-dfz-text'
          }`}
        >
          <Users size={20} />
          <span className="text-[10px] mt-0.5">Контакты</span>
        </button>

        {/* Settings */}
        <button
          type="button"
          onClick={onOpenSettings}
          className="flex-1 flex flex-col items-center justify-center py-1 text-dfz-text-muted hover:text-dfz-text transition-colors"
        >
          <Settings size={20} />
          <span className="text-[10px] mt-0.5">Настройки</span>
        </button>
      </div>
    </nav>
  );
};
