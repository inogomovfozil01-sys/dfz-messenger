import React from 'react';
import { MessageSquare, Users, Phone, Bookmark, Archive, Settings, Shield, Moon, Sun } from 'lucide-react';
import { Avatar } from '../ui/Avatar';
import { useAuthStore } from '../../stores/authStore';
import { useChatStore } from '../../stores/chatStore';
import { UserRole } from '@dfz/types';

interface LeftSidebarProps {
  currentTab: 'chats' | 'contacts' | 'calls' | 'saved' | 'archive';
  onSelectTab: (tab: 'chats' | 'contacts' | 'calls' | 'saved' | 'archive') => void;
  onOpenSettings: () => void;
  onOpenProfile: () => void;
}

export const LeftSidebar: React.FC<LeftSidebarProps> = ({
  currentTab,
  onSelectTab,
  onOpenSettings,
  onOpenProfile,
}) => {
  const { user, profile } = useAuthStore();
  const { chats } = useChatStore();

  const totalUnread = chats.reduce((acc, c) => acc + (c.unreadCount || 0), 0);
  const isAdmin = user?.role === UserRole.ADMIN || user?.role === UserRole.SUPERADMIN;

  const toggleTheme = () => {
    const html = document.documentElement;
    if (html.classList.contains('light')) {
      html.classList.remove('light');
      html.classList.add('dark');
    } else {
      html.classList.remove('dark');
      html.classList.add('light');
    }
  };

  const navItems = [
    {
      id: 'chats',
      label: 'Чаты',
      icon: <MessageSquare size={20} />,
      badge: totalUnread > 0 ? totalUnread : undefined,
    },
    {
      id: 'contacts',
      label: 'Контакты',
      icon: <Users size={20} />,
    },
    {
      id: 'calls',
      label: 'Звонки',
      icon: <Phone size={20} />,
    },
    {
      id: 'saved',
      label: 'Избранное',
      icon: <Bookmark size={20} />,
    },
    {
      id: 'archive',
      label: 'Архив',
      icon: <Archive size={20} />,
    },
  ];

  return (
    <div className="w-16 h-full bg-dfz-surface border-r border-dfz-border flex flex-col items-center justify-between py-4 select-none flex-shrink-0 z-30">
      {/* Top Section: User Avatar */}
      <div className="flex flex-col items-center gap-6">
        <button
          type="button"
          onClick={onOpenProfile}
          className="relative transition-transform hover:scale-105"
          title={`${profile?.displayName || user?.username} (Профиль)`}
        >
          <Avatar
            src={profile?.avatarUrl}
            name={profile?.displayName || user?.username || 'U'}
            size="md"
            isOnline={true}
          />
        </button>

        {/* Navigation Items */}
        <nav className="flex flex-col items-center gap-2">
          {navItems.map((item) => {
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectTab(item.id as any)}
                className={`relative p-2.5 rounded-dfz-xl transition-all ${
                  isActive
                    ? 'bg-dfz-accent text-white shadow-dfz-sm'
                    : 'text-dfz-text-muted hover:text-dfz-text hover:bg-dfz-surface-hover'
                }`}
                title={item.label}
              >
                {item.icon}
                {item.badge !== undefined && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-dfz-danger text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-dfz-surface">
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Section: Theme, Admin & Settings */}
      <div className="flex flex-col items-center gap-2">
        {/* Theme Toggle */}
        <button
          type="button"
          onClick={toggleTheme}
          className="p-2.5 rounded-dfz-xl text-dfz-text-muted hover:text-dfz-text hover:bg-dfz-surface-hover transition-colors"
          title="Сменить тему"
        >
          <Moon size={20} className="hidden dark:block" />
          <Sun size={20} className="block dark:hidden" />
        </button>

        {/* Admin Link if authorized */}
        {isAdmin && (
          <a
            href="/admin"
            className="p-2.5 rounded-dfz-xl text-dfz-text-muted hover:text-dfz-accent hover:bg-dfz-surface-hover transition-colors"
            title="Панель администратора"
          >
            <Shield size={20} />
          </a>
        )}

        {/* Settings button */}
        <button
          type="button"
          onClick={onOpenSettings}
          className="p-2.5 rounded-dfz-xl text-dfz-text-muted hover:text-dfz-text hover:bg-dfz-surface-hover transition-colors"
          title="Настройки"
        >
          <Settings size={20} />
        </button>
      </div>
    </div>
  );
};
