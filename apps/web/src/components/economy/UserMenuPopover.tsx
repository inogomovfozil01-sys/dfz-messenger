import React, { useRef, useEffect } from 'react';
import Link from 'next/link';
import {
  User,
  Star,
  Gift,
  Bookmark,
  Settings,
  Shield,
  Sparkles,
  Camera,
  LogOut,
} from 'lucide-react';
import { Avatar } from '../ui/Avatar';
import { useAuthStore } from '../../stores/authStore';
import { useEconomyStore } from '../../stores/economyStore';
import { useStoriesStore } from '../../stores/storiesStore';
import { UserRole } from '@dfz/types';

interface UserMenuPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenProfile: () => void;
  onOpenSettings: () => void;
}

export const UserMenuPopover: React.FC<UserMenuPopoverProps> = ({
  isOpen,
  onClose,
  onOpenProfile,
  onOpenSettings,
}) => {
  const popoverRef = useRef<HTMLDivElement>(null);
  const { user, profile, logout } = useAuthStore();
  const { starBalance, isUnlimitedStars, setStarsOpen, setGiftStoreOpen, setPremiumOpen } =
    useEconomyStore();
  const { openCreator } = useStoriesStore();

  const isAdmin = user?.role === UserRole.ADMIN || user?.role === UserRole.SUPERADMIN;
  const isPremium = user?.isPremium || (isAdmin && true);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  if (!isOpen || !user) return null;

  return (
    <div
      ref={popoverRef}
      className="absolute top-14 left-3 w-72 bg-dfz-surface/95 backdrop-blur-xl border border-dfz-border/80 rounded-dfz-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150 select-none text-dfz-text"
    >
      {/* User Header */}
      <div className="p-4 border-b border-dfz-border/60 bg-gradient-to-br from-dfz-surface-hover/40 to-transparent">
        <div className="flex items-center gap-3">
          <Avatar
            src={profile?.avatarUrl}
            name={profile?.displayName || user.username}
            size="lg"
            isOnline={true}
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <h4 className="font-bold text-sm truncate text-dfz-text">
                {profile?.displayName || user.username}
              </h4>
              {isPremium && (
                <span
                  className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-gradient-to-r from-violet-500 to-cyan-500 text-white shadow-sm flex items-center gap-0.5"
                  title="DFZ Premium"
                >
                  ◆
                </span>
              )}
            </div>
            <p className="text-xs text-dfz-text-muted truncate">@{user.username}</p>
          </div>
        </div>

        {/* Stars Balance Pill */}
        <button
          onClick={() => {
            onClose();
            setStarsOpen(true, 'balance');
          }}
          className="mt-3 w-full py-2 px-3 rounded-dfz-xl bg-amber-500/10 hover:bg-amber-500/15 border border-amber-500/20 text-amber-400 flex items-center justify-between text-xs font-semibold transition-all group"
        >
          <div className="flex items-center gap-2">
            <span className="text-base text-amber-400">★</span>
            <span className="font-mono text-sm font-bold text-amber-300">
              {isUnlimitedStars ? '★ ∞' : `★ ${starBalance.toLocaleString()}`}
            </span>
          </div>
          <span className="text-[11px] text-amber-400/80 group-hover:text-amber-300 flex items-center gap-1">
            {isUnlimitedStars ? 'Безлимит' : 'Мои Stars'} →
          </span>
        </button>
      </div>

      {/* Navigation List */}
      <div className="p-1.5 space-y-0.5 text-xs font-medium">
        <button
          onClick={() => {
            onClose();
            onOpenProfile();
          }}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-dfz-xl hover:bg-dfz-surface-hover text-dfz-text transition-colors"
        >
          <User size={16} className="text-dfz-text-muted" />
          <span>Мой профиль</span>
        </button>

        <button
          onClick={() => {
            onClose();
            openCreator();
          }}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-dfz-xl hover:bg-dfz-surface-hover text-dfz-text transition-colors"
        >
          <Camera size={16} className="text-pink-400" />
          <span>Опубликовать историю</span>
        </button>

        <button
          onClick={() => {
            onClose();
            setGiftStoreOpen(true);
          }}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-dfz-xl hover:bg-dfz-surface-hover text-dfz-text transition-colors"
        >
          <Gift size={16} className="text-purple-400" />
          <span>Магазин подарков</span>
        </button>

        <button
          onClick={() => {
            onClose();
            setPremiumOpen(true);
          }}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-dfz-xl hover:bg-dfz-surface-hover text-dfz-text transition-colors"
        >
          <Sparkles size={16} className="text-cyan-400" />
          <div className="flex items-center justify-between flex-1">
            <span>DFZ Premium</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-cyan-500/10 text-cyan-400 font-bold">
              ◆
            </span>
          </div>
        </button>

        <button
          onClick={() => {
            onClose();
            onOpenSettings();
          }}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-dfz-xl hover:bg-dfz-surface-hover text-dfz-text transition-colors"
        >
          <Settings size={16} className="text-dfz-text-muted" />
          <span>Настройки</span>
        </button>

        {/* Administration Section for Admin/SuperAdmin */}
        {isAdmin && (
          <>
            <div className="my-1.5 border-t border-dfz-border/60" />
            <Link
              href="/admin"
              onClick={onClose}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-dfz-xl bg-dfz-accent/10 hover:bg-dfz-accent/20 text-dfz-accent font-semibold transition-colors"
            >
              <Shield size={16} />
              <div className="flex items-center justify-between flex-1">
                <span>Панель управления</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-dfz-accent text-white font-bold uppercase tracking-wider">
                  Admin
                </span>
              </div>
            </Link>
          </>
        )}

        <div className="my-1.5 border-t border-dfz-border/60" />

        <button
          onClick={() => {
            onClose();
            logout();
          }}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-dfz-xl hover:bg-dfz-danger/10 text-dfz-danger transition-colors"
        >
          <LogOut size={16} />
          <span>Выйти из аккаунта</span>
        </button>
      </div>
    </div>
  );
};
