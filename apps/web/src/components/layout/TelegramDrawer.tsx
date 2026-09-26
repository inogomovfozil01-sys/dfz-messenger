import React, { useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  User,
  Star,
  Sparkles,
  Gift,
  Bookmark,
  Users,
  Phone,
  Settings,
  Shield,
  Moon,
  Sun,
  LogOut,
  ChevronRight,
  ShieldCheck,
  UsersRound,
  Megaphone,
  CirclePlay,
} from 'lucide-react';
import { Avatar } from '../ui/Avatar';
import { useAuthStore } from '../../stores/authStore';
import { useEconomyStore } from '../../stores/economyStore';
import { UserRole } from '@dfz/types';

interface TelegramDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenProfile: () => void;
  onOpenSettings: () => void;
  onOpenContacts: () => void;
  onOpenCalls: () => void;
  onOpenSavedMessages: () => void;
  onNewGroup?: () => void;
  onNewChannel?: () => void;
  onOpenStories?: () => void;
}

export const TelegramDrawer: React.FC<TelegramDrawerProps> = ({
  isOpen,
  onClose,
  onOpenProfile,
  onOpenSettings,
  onOpenContacts,
  onOpenCalls,
  onOpenSavedMessages,
  onNewGroup,
  onNewChannel,
  onOpenStories,
}) => {
  const drawerRef = useRef<HTMLDivElement>(null);
  const { user, profile, logout } = useAuthStore();
  const { starBalance, isUnlimitedStars, setStarsOpen, setGiftStoreOpen, setPremiumOpen } =
    useEconomyStore();

  const isAdmin = user?.role === UserRole.ADMIN || user?.role === UserRole.SUPERADMIN;
  const isPremium = user?.isPremium || (isAdmin && true);

  // Close on Escape or click outside
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

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

  if (!isOpen || !user) return null;

  return (
    <div className="fixed inset-0 z-50 flex select-none">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity animate-fade-in"
      />

      {/* Drawer Card */}
      <div
        ref={drawerRef}
        className="relative z-10 w-80 max-w-[85vw] h-full bg-dfz-surface border-r border-dfz-border shadow-2xl flex flex-col justify-between animate-slide-up sm:animate-none"
        style={{ animationDuration: '0.2s' }}
      >
        {/* Top Header Card */}
        <div className="p-4 bg-gradient-to-b from-[#2481cc]/20 via-dfz-surface to-dfz-surface border-b border-dfz-border/80">
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={() => {
                onClose();
                onOpenProfile();
              }}
              className="relative transition-transform hover:scale-105"
            >
              <Avatar
                src={profile?.avatarUrl}
                name={profile?.displayName || user.username}
                size="lg"
                isOnline={true}
              />
            </button>

            {/* Quick Dark/Light Theme Button */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-full hover:bg-dfz-surface-hover text-dfz-text-muted hover:text-dfz-text transition-colors"
              title="Переключить тему"
            >
              <Moon size={18} className="hidden dark:block" />
              <Sun size={18} className="block dark:hidden" />
            </button>
          </div>

          <div
            onClick={() => {
              onClose();
              onOpenProfile();
            }}
            className="cursor-pointer group"
          >
            <div className="flex items-center gap-1.5 flex-wrap">
              <h3 className="font-bold text-sm text-dfz-text group-hover:text-dfz-accent transition-colors truncate">
                {profile?.displayName || user.username}
              </h3>
              {isPremium && (
                <span
                  title="DFZ Premium"
                  className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-[10px] font-bold text-cyan-400"
                >
                  <span>◆</span>
                </span>
              )}
              {isAdmin && (
                <span
                  title="Администратор"
                  className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full bg-rose-500/15 border border-rose-500/30 text-[10px] font-bold text-rose-400"
                >
                  <ShieldCheck size={11} />
                </span>
              )}
            </div>
            <p className="text-xs text-dfz-text-muted mt-0.5">@{user.username}</p>
          </div>

          {/* Quick Stars Badge Pill */}
          <button
            onClick={() => {
              onClose();
              setStarsOpen(true, 'balance');
            }}
            className="mt-3 w-full py-2 px-3 rounded-dfz-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 flex items-center justify-between text-xs font-semibold transition-all"
          >
            <div className="flex items-center gap-2">
              <span className="text-amber-400 font-bold">★</span>
              <span className="font-mono text-xs font-bold text-amber-300">
                {isUnlimitedStars ? '★ ∞' : `★ ${starBalance.toLocaleString()} Stars`}
              </span>
            </div>
            <span className="text-[11px] text-amber-400/80 flex items-center">
              Кошелек <ChevronRight size={13} />
            </span>
          </button>
        </div>

        {/* Navigation List */}
        <div className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5 text-xs font-medium text-dfz-text">
          <button
            onClick={() => {
              onClose();
              onOpenProfile();
            }}
            className="w-full flex items-center gap-3.5 px-3 py-2.5 rounded-dfz-xl hover:bg-dfz-surface-hover transition-colors text-left"
          >
            <User size={18} className="text-dfz-text-muted" />
            <span className="flex-1">Мой профиль</span>
          </button>

          {onNewGroup && (
            <button
              onClick={() => {
                onClose();
                onNewGroup();
              }}
              className="w-full flex items-center gap-3.5 px-3 py-2.5 rounded-dfz-xl hover:bg-dfz-surface-hover transition-colors text-left"
            >
              <UsersRound size={18} className="text-dfz-text-muted" />
              <span className="flex-1">Создать группу</span>
            </button>
          )}

          {onNewChannel && (
            <button
              onClick={() => {
                onClose();
                onNewChannel();
              }}
              className="w-full flex items-center gap-3.5 px-3 py-2.5 rounded-dfz-xl hover:bg-dfz-surface-hover transition-colors text-left"
            >
              <Megaphone size={18} className="text-dfz-text-muted" />
              <span className="flex-1">Создать канал</span>
            </button>
          )}

          <button
            onClick={() => {
              onClose();
              onOpenContacts();
            }}
            className="w-full flex items-center gap-3.5 px-3 py-2.5 rounded-dfz-xl hover:bg-dfz-surface-hover transition-colors text-left"
          >
            <Users size={18} className="text-dfz-text-muted" />
            <span className="flex-1">Контакты</span>
          </button>

          <button
            onClick={() => {
              onClose();
              onOpenCalls();
            }}
            className="w-full flex items-center gap-3.5 px-3 py-2.5 rounded-dfz-xl hover:bg-dfz-surface-hover transition-colors text-left"
          >
            <Phone size={18} className="text-dfz-text-muted" />
            <span className="flex-1">Звонки</span>
          </button>

          <button
            onClick={() => {
              onClose();
              onOpenSavedMessages();
            }}
            className="w-full flex items-center gap-3.5 px-3 py-2.5 rounded-dfz-xl hover:bg-dfz-surface-hover transition-colors text-left"
          >
            <Bookmark size={18} className="text-[#2481cc]" />
            <span className="flex-1">Избранное</span>
          </button>

          {onOpenStories && (
            <button
              onClick={() => {
                onClose();
                onOpenStories();
              }}
              className="w-full flex items-center gap-3.5 px-3 py-2.5 rounded-dfz-xl hover:bg-dfz-surface-hover transition-colors text-left"
            >
              <CirclePlay size={18} className="text-cyan-400" />
              <span className="flex-1">Истории</span>
            </button>
          )}

          <div className="my-1 border-t border-dfz-border/60" />

          <button
            onClick={() => {
              onClose();
              setStarsOpen(true, 'balance');
            }}
            className="w-full flex items-center gap-3.5 px-3 py-2.5 rounded-dfz-xl hover:bg-dfz-surface-hover transition-colors text-left text-amber-400"
          >
            <Star size={18} className="fill-amber-400" />
            <span className="flex-1 font-semibold text-dfz-text">DFZ Stars</span>
            <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-[10px] font-mono font-bold text-amber-400">
              {isUnlimitedStars ? '∞' : starBalance.toLocaleString()}
            </span>
          </button>

          <button
            onClick={() => {
              onClose();
              setPremiumOpen(true);
            }}
            className="w-full flex items-center gap-3.5 px-3 py-2.5 rounded-dfz-xl hover:bg-dfz-surface-hover transition-colors text-left"
          >
            <Sparkles size={18} className="text-cyan-400" />
            <span className="flex-1">DFZ Premium</span>
            {isPremium && (
              <span className="px-1.5 py-0.5 rounded-full bg-cyan-500/20 text-[10px] font-bold text-cyan-400">
                Активен
              </span>
            )}
          </button>

          <button
            onClick={() => {
              onClose();
              setGiftStoreOpen(true);
            }}
            className="w-full flex items-center gap-3.5 px-3 py-2.5 rounded-dfz-xl hover:bg-dfz-surface-hover transition-colors text-left"
          >
            <Gift size={18} className="text-purple-400" />
            <span className="flex-1">Магазин подарков</span>
          </button>

          <button
            onClick={() => {
              onClose();
              onOpenSettings();
            }}
            className="w-full flex items-center gap-3.5 px-3 py-2.5 rounded-dfz-xl hover:bg-dfz-surface-hover transition-colors text-left"
          >
            <Settings size={18} className="text-dfz-text-muted" />
            <span className="flex-1">Настройки</span>
          </button>

          {isAdmin && (
            <Link
              href="/admin"
              onClick={onClose}
              className="w-full flex items-center gap-3.5 px-3 py-2.5 rounded-dfz-xl hover:bg-dfz-surface-hover text-rose-400 transition-colors text-left font-semibold"
            >
              <Shield size={18} />
              <span className="flex-1">Панель администратора</span>
              <span className="px-1.5 py-0.5 rounded-full bg-rose-500/20 text-[10px] font-bold text-rose-400">
                PRO
              </span>
            </Link>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-dfz-border/80 flex items-center justify-between text-xs text-dfz-text-muted">
          <button
            onClick={() => {
              onClose();
              logout();
            }}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-dfz-lg text-dfz-danger hover:bg-dfz-danger/10 transition-colors"
          >
            <LogOut size={16} />
            <span>Выйти</span>
          </button>
          <span className="text-[11px] text-dfz-text-muted/60 font-mono">DFZ v2.4</span>
        </div>
      </div>
    </div>
  );
};
