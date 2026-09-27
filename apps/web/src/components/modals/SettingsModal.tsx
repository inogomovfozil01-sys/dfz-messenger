import React, { useState, useEffect } from 'react';
import {
  User,
  Shield,
  Lock,
  Laptop,
  Palette,
  LogOut,
  Check,
  X,
  Star,
  Sparkles,
  ShieldCheck,
  Bell,
  Folder,
  HardDrive,
  Globe,
  ChevronRight,
  ArrowLeft,
  Search,
  UserX,
  Trash2,
  Key,
  Volume2,
  Eye,
  Smartphone,
} from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Avatar } from '../ui/Avatar';
import { useAuthStore } from '../../stores/authStore';
import { useEconomyStore } from '../../stores/economyStore';
import { apiRequest } from '../../lib/api';
import { PrivacyVisibility, UserRole } from '@dfz/types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type MainTab =
  | 'profile'
  | 'privacy'
  | 'blocked'
  | 'security'
  | 'notifications'
  | 'appearance'
  | 'folders'
  | 'storage'
  | 'language';

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { user, profile, updateProfile, updatePrivacy, logout } = useAuthStore();
  const { setStarsOpen, setPremiumOpen } = useEconomyStore();

  const [activeTab, setActiveTab] = useState<MainTab>('profile');
  const isAdmin = user?.role === UserRole.ADMIN || user?.role === UserRole.SUPERADMIN;

  // Profile Form states
  const [displayName, setDisplayName] = useState(profile?.displayName || '');
  const [bio, setBio] = useState(profile?.bio || '');
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatarUrl || '');
  const [isSaved, setIsSaved] = useState(false);

  // Privacy states
  const [lastSeen, setLastSeen] = useState<PrivacyVisibility>(
    profile?.lastSeenVisibility || PrivacyVisibility.EVERYONE
  );
  const [callVis, setCallVis] = useState<PrivacyVisibility>(
    profile?.callVisibility || PrivacyVisibility.EVERYONE
  );
  const [photoVis, setPhotoVis] = useState<PrivacyVisibility>(
    (profile as any)?.photoVisibility || PrivacyVisibility.EVERYONE
  );
  const [groupVis, setGroupVis] = useState<PrivacyVisibility>(
    (profile as any)?.groupAddVisibility || PrivacyVisibility.EVERYONE
  );

  // Blocked users
  const [blockedUsers, setBlockedUsers] = useState<any[]>([]);
  const [blockedSearch, setBlockedSearch] = useState('');
  const [isLoadingBlocked, setIsLoadingBlocked] = useState(false);

  // Sessions state
  const [sessions, setSessions] = useState<any[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);

  // Password state
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [passMessage, setPassMessage] = useState('');
  const [passError, setPassError] = useState('');

  // Notifications state
  const [notifyPrivate, setNotifyPrivate] = useState(true);
  const [notifyGroups, setNotifyGroups] = useState(true);
  const [notifyChannels, setNotifyChannels] = useState(false);
  const [notifySound, setNotifySound] = useState(true);
  const [notifyPreview, setNotifyPreview] = useState(true);

  // Appearance state
  const [appTheme, setAppTheme] = useState<'dark' | 'dim' | 'light'>('dark');
  const [themeError, setThemeError] = useState('');
  const [themeSaving, setThemeSaving] = useState(false);
  useEffect(() => { if (profile?.theme && ['dark','dim','light'].includes(profile.theme)) setAppTheme(profile.theme as 'dark' | 'dim' | 'light'); }, [profile?.theme]);
  const [chatDensity, setChatDensity] = useState<'compact' | 'comfortable'>('comfortable');

  // Storage state
  const [cacheSize, setCacheSize] = useState('Рассчитывается…');
  const [cacheCleared, setCacheCleared] = useState(false);
  const [autoDownloadWifi, setAutoDownloadWifi] = useState(true);
  const [autoDownloadMobile, setAutoDownloadMobile] = useState(false);

  // Language state
  const [selectedLang, setSelectedLang] = useState<'ru' | 'en' | 'uz'>('ru');

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.displayName || '');
      setBio(profile.bio || '');
      setAvatarUrl(profile.avatarUrl || '');
      setLastSeen(profile.lastSeenVisibility || PrivacyVisibility.EVERYONE);
      setCallVis(profile.callVisibility || PrivacyVisibility.EVERYONE);
      setPhotoVis((profile as any)?.photoVisibility || PrivacyVisibility.EVERYONE);
      setGroupVis((profile as any)?.groupAddVisibility || PrivacyVisibility.EVERYONE);
    }
  }, [profile]);

  useEffect(() => {
    if (isOpen) {
      if (activeTab === 'security') {
        loadSessions();
      } else if (activeTab === 'blocked' || activeTab === 'privacy') {
        loadBlockedUsers();
      }
    }
  }, [activeTab, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    navigator.storage?.estimate().then(e => setCacheSize(e.usage !== undefined ? (e.usage / 1024 / 1024).toFixed(2) + ' MB' : 'Недоступно'));
    apiRequest<any>('/api/settings').then(r => { if(r.success && r.data) { setNotifyPrivate(r.data.notifyPrivate); setNotifyGroups(r.data.notifyGroups); setNotifyChannels(r.data.notifyChannels); setNotifySound(r.data.notifySound); setNotifyPreview(r.data.notifyPreview); setChatDensity(r.data.density); setAutoDownloadWifi(r.data.autoDownloadWifi); setAutoDownloadMobile(r.data.autoDownloadMobile); } });
  }, [isOpen]);
  const saveSetting = async (key: string, value: unknown) => { await apiRequest('/api/settings', {method:'PUT', body:JSON.stringify({[key]:value})}); };
  const loadBlockedUsers = async () => {
    setIsLoadingBlocked(true);
    const res = await apiRequest<any[]>('/api/users/blocked');
    setIsLoadingBlocked(false);
    if (res.success && res.data) {
      setBlockedUsers(res.data);
    }
  };

  const handleUnblockUser = async (targetUserId: string) => {
    const res = await apiRequest('/api/users/unblock', {
      method: 'POST',
      body: JSON.stringify({ targetUserId }),
    });
    if (res.success) {
      setBlockedUsers((prev) => prev.filter((u) => u.id !== targetUserId));
    }
  };

  const loadSessions = async () => {
    setIsLoadingSessions(true);
    const res = await apiRequest<any[]>('/api/auth/sessions');
    setIsLoadingSessions(false);
    if (res.success && res.data) {
      setSessions(res.data);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const saved = await updateProfile({
      displayName: displayName.trim(),
      bio: bio.trim() || null,
      avatarUrl: avatarUrl.trim() || null,
    });
    if (!saved) return;
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const handleSavePrivacy = async () => {
    const saved = await updatePrivacy({
      lastSeenVisibility: lastSeen,
      callVisibility: callVis,
      photoVisibility: photoVis,
      groupAddVisibility: groupVis,
    } as any);
    if (!saved) return;
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const handleTerminateOtherSessions = async () => {
    if (!confirm('Завершить все сессии, кроме текущей?')) return;
    await apiRequest('/api/auth/sessions/others', { method: 'POST' });
    await loadSessions();
  };

  const handleTerminateSession = async (id: string) => {
    await apiRequest(`/api/auth/sessions/${id}`, { method: 'DELETE' });
    await loadSessions();
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassMessage('');
    setPassError('');

    if (newPass !== confirmPass) {
      setPassError('Новые пароли не совпадают');
      return;
    }
    if (newPass.length < 6) {
      setPassError('Пароль должен содержать минимум 6 символов');
      return;
    }

    const res = await apiRequest('/api/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword: currentPass, newPassword: newPass }),
    });

    if (res.success) {
      setPassMessage('Пароль успешно обновлен');
      setCurrentPass('');
      setNewPass('');
      setConfirmPass('');
    } else {
      setPassError(res.error?.message || 'Ошибка смены пароля');
    }
  };

  const handleClearCache = async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k.startsWith('dfz-')).map(k => caches.delete(k)));
    localStorage.removeItem('dfz_chat_cache');
    const estimate = await navigator.storage?.estimate();
    setCacheSize(estimate?.usage !== undefined ? (estimate.usage / 1024 / 1024).toFixed(2) + ' MB' : 'Недоступно');
    setCacheCleared(true);
    setTimeout(() => setCacheCleared(false), 3000);
  };

  const filteredBlockedUsers = blockedUsers.filter((u) => {
    const name = u.displayName || u.username || '';
    return name.toLowerCase().includes(blockedSearch.toLowerCase());
  });

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Настройки" maxWidth="xl">
      <div className="flex flex-col sm:flex-row gap-4 min-h-[460px] select-none text-xs text-dfz-text">
        {/* Left Navigation Menu */}
        <div className="dfz-settings-nav w-full sm:w-52 flex flex-col gap-0.5 border-b sm:border-b-0 sm:border-r border-dfz-border pb-3 sm:pb-0 sm:pr-3">
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-dfz-lg font-medium text-left transition-colors ${
              activeTab === 'profile'
                ? 'bg-dfz-accent text-white font-semibold'
                : 'text-dfz-text-muted hover:text-dfz-text hover:bg-dfz-surface-hover'
            }`}
          >
            <User size={16} />
            <span className="flex-1">Мой профиль</span>
          </button>

          <button
            onClick={() => setActiveTab('privacy')}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-dfz-lg font-medium text-left transition-colors ${
              activeTab === 'privacy' || activeTab === 'blocked'
                ? 'bg-dfz-accent text-white font-semibold'
                : 'text-dfz-text-muted hover:text-dfz-text hover:bg-dfz-surface-hover'
            }`}
          >
            <Lock size={16} />
            <span className="flex-1">Конфиденциальность</span>
          </button>

          <button
            onClick={() => setActiveTab('security')}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-dfz-lg font-medium text-left transition-colors ${
              activeTab === 'security'
                ? 'bg-dfz-accent text-white font-semibold'
                : 'text-dfz-text-muted hover:text-dfz-text hover:bg-dfz-surface-hover'
            }`}
          >
            <Laptop size={16} />
            <span className="flex-1">Устройства</span>
          </button>

          <button
            onClick={() => setActiveTab('notifications')}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-dfz-lg font-medium text-left transition-colors ${
              activeTab === 'notifications'
                ? 'bg-dfz-accent text-white font-semibold'
                : 'text-dfz-text-muted hover:text-dfz-text hover:bg-dfz-surface-hover'
            }`}
          >
            <Bell size={16} />
            <span className="flex-1">Уведомления</span>
          </button>

          <button
            onClick={() => setActiveTab('appearance')}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-dfz-lg font-medium text-left transition-colors ${
              activeTab === 'appearance'
                ? 'bg-dfz-accent text-white font-semibold'
                : 'text-dfz-text-muted hover:text-dfz-text hover:bg-dfz-surface-hover'
            }`}
          >
            <Palette size={16} />
            <span className="flex-1">Оформление</span>
          </button>

          <button
            onClick={() => setActiveTab('folders')}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-dfz-lg font-medium text-left transition-colors ${
              activeTab === 'folders'
                ? 'bg-dfz-accent text-white font-semibold'
                : 'text-dfz-text-muted hover:text-dfz-text hover:bg-dfz-surface-hover'
            }`}
          >
            <Folder size={16} />
            <span className="flex-1">Папки с чатами</span>
          </button>

          <button
            onClick={() => setActiveTab('storage')}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-dfz-lg font-medium text-left transition-colors ${
              activeTab === 'storage'
                ? 'bg-dfz-accent text-white font-semibold'
                : 'text-dfz-text-muted hover:text-dfz-text hover:bg-dfz-surface-hover'
            }`}
          >
            <HardDrive size={16} />
            <span className="flex-1">Память и данные</span>
          </button>

          <button
            onClick={() => setActiveTab('language')}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-dfz-lg font-medium text-left transition-colors ${
              activeTab === 'language'
                ? 'bg-dfz-accent text-white font-semibold'
                : 'text-dfz-text-muted hover:text-dfz-text hover:bg-dfz-surface-hover'
            }`}
          >
            <Globe size={16} />
            <span className="flex-1">Язык</span>
          </button>

          <div className="pt-2 border-t border-dfz-border my-1 flex flex-col gap-1">
            <button
              onClick={() => {
                onClose();
                setStarsOpen(true);
              }}
              className="flex items-center gap-2.5 px-3 py-2 rounded-dfz-lg font-medium text-left text-amber-400 hover:bg-amber-500/10 transition-colors"
            >
              <Star size={16} className="fill-amber-400" />
              <span>DFZ Stars</span>
            </button>

            <button
              onClick={() => {
                onClose();
                setPremiumOpen(true);
              }}
              className="flex items-center gap-2.5 px-3 py-2 rounded-dfz-lg font-medium text-left text-cyan-400 hover:bg-cyan-500/10 transition-colors"
            >
              <Sparkles size={16} />
              <span>DFZ Premium</span>
            </button>

            {isAdmin && (
              <a
                href="/admin"
                className="flex items-center gap-2.5 px-3 py-2 rounded-dfz-lg font-medium text-left text-rose-400 hover:bg-rose-500/10 transition-colors"
              >
                <ShieldCheck size={16} />
                <span>Администрация</span>
              </a>
            )}
          </div>

          <div className="pt-3 mt-auto hidden sm:block border-t border-dfz-border">
            <button
              onClick={() => {
                logout();
                onClose();
              }}
              className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-rose-400 hover:bg-rose-500/10 rounded-dfz-lg w-full transition-colors"
            >
              <LogOut size={16} />
              <span>Выйти из аккаунта</span>
            </button>
          </div>
        </div>

        {/* Right Content Area */}
        <div className="flex-1 overflow-y-auto max-h-[500px] pr-1">
          {/* TAB 1: PROFILE */}
          {activeTab === 'profile' && (
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="flex items-center gap-4">
                <Avatar src={avatarUrl} name={displayName || user?.username || 'U'} size="lg" />
                <div>
                  <h4 className="text-sm font-bold text-dfz-text">
                    {profile?.displayName || user?.username}
                  </h4>
                  <p className="text-xs text-dfz-text-muted">@{user?.username}</p>
                </div>
              </div>

              {/* Status Banner */}
              <div className="p-3 rounded-dfz-xl bg-dfz-surface-secondary border border-dfz-border flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className={`p-2 rounded-dfz-lg ${user?.isPremium ? 'bg-cyan-500/15 text-cyan-400' : 'bg-dfz-surface text-dfz-text-muted'}`}>
                    <Sparkles size={16} />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-dfz-text">
                      {user?.isPremium ? 'DFZ Premium активен' : 'Базовый статус DFZ'}
                    </h5>
                    <p className="text-[11px] text-dfz-text-muted">
                      {user?.isPremium && user.premiumUntil
                        ? `Действует до ${new Date(user.premiumUntil).toLocaleDateString()}`
                        : 'Увеличенные лимиты, уникальный бейдж ◆, отправка подарков'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    setPremiumOpen(true);
                  }}
                  className="px-3 py-1.5 rounded-dfz-lg bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-400 text-xs font-semibold transition-colors"
                >
                  {user?.isPremium ? 'Продлить' : 'Подключить'}
                </button>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-dfz-text-muted">Отображаемое имя</label>
                <input
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full h-9 px-3 bg-dfz-bg border border-dfz-border rounded-dfz-lg text-xs text-dfz-text focus:outline-none focus:border-dfz-accent"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-dfz-text-muted">О себе (Bio)</label>
                <textarea
                  rows={2}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Пара слов о себе..."
                  className="w-full p-2.5 bg-dfz-bg border border-dfz-border rounded-dfz-lg text-xs text-dfz-text focus:outline-none focus:border-dfz-accent resize-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-dfz-text-muted">URL Аватара профиля</label>
                <input
                  type="url"
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full h-9 px-3 bg-dfz-bg border border-dfz-border rounded-dfz-lg text-xs text-dfz-text focus:outline-none focus:border-dfz-accent font-mono"
                />
              </div>

              <button
                type="submit"
                className="flex items-center gap-1.5 px-4 py-2 bg-dfz-accent hover:bg-dfz-accent-hover text-white text-xs font-semibold rounded-dfz-lg transition-colors shadow-md"
              >
                {isSaved ? <Check size={16} /> : null}
                <span>{isSaved ? 'Сохранено' : 'Сохранить изменения'}</span>
              </button>
            </form>
          )}

          {/* TAB 2: PRIVACY */}
          {activeTab === 'privacy' && (
            <div className="space-y-4">
              {/* Blocked Users Entry */}
              <button
                type="button"
                onClick={() => setActiveTab('blocked')}
                className="w-full flex items-center justify-between p-3 rounded-dfz-xl bg-dfz-surface-secondary border border-dfz-border hover:border-dfz-accent/40 transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <UserX size={18} className="text-rose-400" />
                  <div>
                    <div className="font-semibold text-xs text-dfz-text">Заблокированные пользователи</div>
                    <div className="text-[11px] text-dfz-text-muted">
                      {blockedUsers.length > 0
                        ? `${blockedUsers.length} пользователей в черном списке`
                        : 'Черный список пуст'}
                    </div>
                  </div>
                </div>
                <ChevronRight size={16} className="text-dfz-text-muted" />
              </button>

              <div className="space-y-3 pt-2">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-dfz-text-muted">
                    Кто видит время последнего посещения
                  </label>
                  <select
                    value={lastSeen}
                    onChange={(e) => setLastSeen(e.target.value as PrivacyVisibility)}
                    className="w-full h-9 px-3 bg-dfz-bg border border-dfz-border rounded-dfz-lg text-xs text-dfz-text focus:outline-none"
                  >
                    <option value={PrivacyVisibility.EVERYONE}>Все</option>
                    <option value={PrivacyVisibility.CONTACTS}>Мои контакты</option>
                    <option value={PrivacyVisibility.NOBODY}>Никто</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-dfz-text-muted">
                    Кто может мне звонить
                  </label>
                  <select
                    value={callVis}
                    onChange={(e) => setCallVis(e.target.value as PrivacyVisibility)}
                    className="w-full h-9 px-3 bg-dfz-bg border border-dfz-border rounded-dfz-lg text-xs text-dfz-text focus:outline-none"
                  >
                    <option value={PrivacyVisibility.EVERYONE}>Все</option>
                    <option value={PrivacyVisibility.CONTACTS}>Мои контакты</option>
                    <option value={PrivacyVisibility.NOBODY}>Никто</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-dfz-text-muted">
                    Кто видит фотографию профиля
                  </label>
                  <select
                    value={photoVis}
                    onChange={(e) => setPhotoVis(e.target.value as PrivacyVisibility)}
                    className="w-full h-9 px-3 bg-dfz-bg border border-dfz-border rounded-dfz-lg text-xs text-dfz-text focus:outline-none"
                  >
                    <option value={PrivacyVisibility.EVERYONE}>Все</option>
                    <option value={PrivacyVisibility.CONTACTS}>Мои контакты</option>
                    <option value={PrivacyVisibility.NOBODY}>Никто</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-dfz-text-muted">
                    Кто может добавлять меня в группы и каналы
                  </label>
                  <select
                    value={groupVis}
                    onChange={(e) => setGroupVis(e.target.value as PrivacyVisibility)}
                    className="w-full h-9 px-3 bg-dfz-bg border border-dfz-border rounded-dfz-lg text-xs text-dfz-text focus:outline-none"
                  >
                    <option value={PrivacyVisibility.EVERYONE}>Все</option>
                    <option value={PrivacyVisibility.CONTACTS}>Мои контакты</option>
                    <option value={PrivacyVisibility.NOBODY}>Никто</option>
                  </select>
                </div>
              </div>

              <button
                type="button"
                onClick={handleSavePrivacy}
                className="flex items-center gap-1.5 px-4 py-2 bg-dfz-accent hover:bg-dfz-accent-hover text-white text-xs font-semibold rounded-dfz-lg transition-colors shadow-md mt-4"
              >
                {isSaved ? <Check size={16} /> : null}
                <span>{isSaved ? 'Сохранено' : 'Применить настройки приватности'}</span>
              </button>
            </div>
          )}

          {/* TAB 2.1: BLOCKED USERS NESTED VIEW */}
          {activeTab === 'blocked' && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-dfz-border">
                <button
                  onClick={() => setActiveTab('privacy')}
                  className="p-1 rounded-full text-dfz-text-muted hover:text-dfz-text hover:bg-dfz-surface-secondary"
                >
                  <ArrowLeft size={16} />
                </button>
                <h4 className="font-semibold text-xs text-dfz-text">Заблокированные пользователи</h4>
              </div>

              <div className="relative flex items-center">
                <Search size={14} className="absolute left-3 text-dfz-text-muted pointer-events-none" />
                <input
                  type="text"
                  value={blockedSearch}
                  onChange={(e) => setBlockedSearch(e.target.value)}
                  placeholder="Поиск по заблокированным..."
                  className="w-full h-8 pl-8 pr-3 bg-dfz-bg border border-dfz-border rounded-dfz-lg text-xs text-dfz-text focus:outline-none focus:border-dfz-accent"
                />
              </div>

              <div className="space-y-1.5 max-h-72 overflow-y-auto">
                {isLoadingBlocked ? (
                  <p className="text-center py-6 text-dfz-text-muted">Загрузка списка...</p>
                ) : filteredBlockedUsers.length === 0 ? (
                  <p className="text-center py-8 text-dfz-text-muted">В списке блокировки никого нет</p>
                ) : (
                  filteredBlockedUsers.map((u) => (
                    <div
                      key={u.id}
                      className="flex items-center justify-between p-2.5 rounded-dfz-xl bg-dfz-surface-secondary border border-dfz-border"
                    >
                      <div className="flex items-center gap-2.5">
                        <Avatar src={u.avatarUrl} name={u.displayName || u.username} size="sm" />
                        <div>
                          <div className="font-semibold text-xs text-dfz-text">{u.displayName}</div>
                          <div className="text-[10px] text-dfz-text-muted">@{u.username}</div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleUnblockUser(u.id)}
                        className="px-3 py-1 text-xs font-semibold text-dfz-accent hover:bg-dfz-accent/10 border border-dfz-accent/30 rounded-dfz-md transition-colors"
                      >
                        Разблокировать
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 3: SECURITY / SESSIONS */}
          {activeTab === 'security' && (
            <div className="space-y-6">
              {/* Active Sessions */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-dfz-text">Активные сеансы</h4>
                  <button
                    onClick={handleTerminateOtherSessions}
                    className="text-xs text-rose-400 hover:underline font-semibold"
                  >
                    Завершить другие сеансы
                  </button>
                </div>

                <div className="space-y-2">
                  {isLoadingSessions ? (
                    <p className="text-xs text-dfz-text-muted">Загрузка сессий...</p>
                  ) : (
                    sessions.map((s) => (
                      <div
                        key={s.id}
                        className="flex items-center justify-between p-2.5 bg-dfz-bg border border-dfz-border rounded-dfz-xl text-xs"
                      >
                        <div>
                          <p className="font-semibold text-dfz-text flex items-center gap-1.5">
                            <Laptop size={14} className="text-dfz-accent" />
                            <span>{s.deviceName}</span>
                            {s.isCurrent && <span className="text-dfz-accent text-[10px] font-bold">(это устройство)</span>}
                          </p>
                          <p className="text-[11px] text-dfz-text-muted mt-0.5">
                            IP: {s.ipAddress} • {s.browser} • {s.os}
                          </p>
                        </div>
                        {!s.isCurrent && (
                          <button
                            onClick={() => handleTerminateSession(s.id)}
                            className="p-1.5 text-rose-400 hover:bg-rose-500/10 rounded-dfz-md transition-colors"
                            title="Завершить сеанс"
                          >
                            <X size={15} />
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Password Change */}
              <form onSubmit={handleChangePassword} className="space-y-3 pt-3 border-t border-dfz-border">
                <h4 className="text-xs font-bold text-dfz-text flex items-center gap-1.5">
                  <Key size={14} className="text-dfz-accent" />
                  <span>Смена пароля</span>
                </h4>
                {passMessage && <p className="text-xs text-emerald-400 font-semibold">{passMessage}</p>}
                {passError && <p className="text-xs text-rose-400 font-semibold">{passError}</p>}

                <input
                  type="password"
                  placeholder="Текущий пароль"
                  required
                  value={currentPass}
                  onChange={(e) => setCurrentPass(e.target.value)}
                  className="w-full h-8 px-3 bg-dfz-bg border border-dfz-border rounded-dfz-lg text-xs text-dfz-text focus:outline-none"
                />
                <input
                  type="password"
                  placeholder="Новый пароль"
                  required
                  value={newPass}
                  onChange={(e) => setNewPass(e.target.value)}
                  className="w-full h-8 px-3 bg-dfz-bg border border-dfz-border rounded-dfz-lg text-xs text-dfz-text focus:outline-none"
                />
                <input
                  type="password"
                  placeholder="Повторите новый пароль"
                  required
                  value={confirmPass}
                  onChange={(e) => setConfirmPass(e.target.value)}
                  className="w-full h-8 px-3 bg-dfz-bg border border-dfz-border rounded-dfz-lg text-xs text-dfz-text focus:outline-none"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-dfz-surface-secondary text-dfz-text hover:bg-dfz-surface-hover border border-dfz-border text-xs font-semibold rounded-dfz-lg transition-colors"
                >
                  Обновить пароль
                </button>
              </form>
            </div>
          )}

          {/* TAB 4: NOTIFICATIONS */}
          {activeTab === 'notifications' && (
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-dfz-text">Оповещения о сообщениях</h4>

              <div className="space-y-2 p-3 bg-dfz-surface-secondary border border-dfz-border rounded-dfz-xl">
                <label className="flex items-center justify-between p-1.5 cursor-pointer">
                  <span>Личные сообщения</span>
                  <input
                    type="checkbox"
                    checked={notifyPrivate}
                    onChange={(e) => { setNotifyPrivate(e.target.checked); void saveSetting('notifyPrivate', e.target.checked); }}
                    className="w-4 h-4 rounded text-dfz-accent bg-dfz-bg border-dfz-border"
                  />
                </label>

                <label className="flex items-center justify-between p-1.5 cursor-pointer">
                  <span>Сообщения из групп</span>
                  <input
                    type="checkbox"
                    checked={notifyGroups}
                    onChange={(e) => { setNotifyGroups(e.target.checked); void saveSetting('notifyGroups', e.target.checked); }}
                    className="w-4 h-4 rounded text-dfz-accent bg-dfz-bg border-dfz-border"
                  />
                </label>

                <label className="flex items-center justify-between p-1.5 cursor-pointer">
                  <span>Публикации из каналов</span>
                  <input
                    type="checkbox"
                    checked={notifyChannels}
                    onChange={(e) => { setNotifyChannels(e.target.checked); void saveSetting('notifyChannels', e.target.checked); }}
                    className="w-4 h-4 rounded text-dfz-accent bg-dfz-bg border-dfz-border"
                  />
                </label>
              </div>

              <h4 className="text-xs font-bold text-dfz-text pt-2">Звуки и предпросмотр</h4>
              <div className="space-y-2 p-3 bg-dfz-surface-secondary border border-dfz-border rounded-dfz-xl">
                <label className="flex items-center justify-between p-1.5 cursor-pointer">
                  <span className="flex items-center gap-2">
                    <Volume2 size={15} />
                    <span>Звуки уведомлений</span>
                  </span>
                  <input
                    type="checkbox"
                    checked={notifySound}
                    onChange={(e) => { setNotifySound(e.target.checked); void saveSetting('notifySound', e.target.checked); }}
                    className="w-4 h-4 rounded text-dfz-accent bg-dfz-bg border-dfz-border"
                  />
                </label>

                <label className="flex items-center justify-between p-1.5 cursor-pointer">
                  <span className="flex items-center gap-2">
                    <Eye size={15} />
                    <span>Показывать текст в уведомлениях</span>
                  </span>
                  <input
                    type="checkbox"
                    checked={notifyPreview}
                    onChange={(e) => { setNotifyPreview(e.target.checked); void saveSetting('notifyPreview', e.target.checked); }}
                    className="w-4 h-4 rounded text-dfz-accent bg-dfz-bg border-dfz-border"
                  />
                </label>
              </div>
            </div>
          )}

          {/* TAB 5: APPEARANCE */}
          {activeTab === 'appearance' && (
            <div className="space-y-5">
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-dfz-text">Цветовая схема</h4>
                <div className="grid grid-cols-3 gap-2.5">
                  {([{id:'dark',label:'Графит',color:'#101115'},{id:'dim',label:'Сумерки',color:'#22232c'},{id:'light',label:'Светлая',color:'#f1f0f6'}] as const).map(theme => <button key={theme.id} disabled={themeSaving} aria-pressed={appTheme === theme.id} onClick={async()=>{setThemeSaving(true);setThemeError('');const saved=await updateProfile({theme:theme.id});if(saved)setAppTheme(theme.id);else setThemeError('Не удалось сохранить тему. Попробуйте ещё раз.');setThemeSaving(false);}} className={`p-3 rounded-xl border text-center space-y-2 transition-colors disabled:opacity-60 ${appTheme === theme.id ? 'border-dfz-accent bg-dfz-accent-subtle' : 'border-dfz-border hover:bg-dfz-surface-hover'}`}><span className="block h-12 rounded-lg border border-dfz-border" style={{background:theme.color}}/><span className="block text-xs font-medium">{theme.label}</span></button>)}
                </div>
                {themeError && <p role="alert" className="text-xs text-dfz-danger">{themeError}</p>}
              </div>

              <div className="space-y-2">
                <h4 className="text-xs font-bold text-dfz-text">Плотность отображения</h4>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={async () => { const r = await apiRequest('/api/settings',{method:'PUT',body:JSON.stringify({density:'comfortable'})}); if(r.success){setChatDensity('comfortable'); document.documentElement.dataset.density='comfortable';} }}
                    className={`flex-1 py-2 px-3 rounded-dfz-lg border text-xs font-medium transition-colors ${
                      chatDensity === 'comfortable'
                        ? 'bg-dfz-accent text-white border-dfz-accent'
                        : 'bg-dfz-bg text-dfz-text border-dfz-border hover:bg-dfz-surface-secondary'
                    }`}
                  >
                    Комфортная
                  </button>
                  <button
                    type="button"
                    onClick={async () => { const r = await apiRequest('/api/settings',{method:'PUT',body:JSON.stringify({density:'compact'})}); if(r.success){setChatDensity('compact'); document.documentElement.dataset.density='compact';} }}
                    className={`flex-1 py-2 px-3 rounded-dfz-lg border text-xs font-medium transition-colors ${
                      chatDensity === 'compact'
                        ? 'bg-dfz-accent text-white border-dfz-accent'
                        : 'bg-dfz-bg text-dfz-text border-dfz-border hover:bg-dfz-surface-secondary'
                    }`}
                  >
                    Компактная
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: CHAT FOLDERS */}
          {activeTab === 'folders' && (
            <div className="space-y-4">
              <div>
                <h4 className="text-xs font-bold text-dfz-text">Папки с чатами</h4>
                <p className="text-[11px] text-dfz-text-muted mt-1">
                  Группируйте переписки по категориям для быстрого доступа сверху в списке чатов
                </p>
              </div>

              <div className="space-y-2">
                <div className="p-3 bg-dfz-surface-secondary border border-dfz-border rounded-dfz-xl flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-xs text-dfz-text">Все чаты</div>
                    <div className="text-[11px] text-dfz-text-muted">Все входящие и сохранённые беседы</div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-dfz-surface text-[10px] text-dfz-text-muted">
                    Основная
                  </span>
                </div>

                <div className="p-3 bg-dfz-surface-secondary border border-dfz-border rounded-dfz-xl flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-xs text-dfz-text">Личные</div>
                    <div className="text-[11px] text-dfz-text-muted">Только прямые диалоги один-на-один</div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-[10px] font-bold text-emerald-400">
                    Активна
                  </span>
                </div>

                <div className="p-3 bg-dfz-surface-secondary border border-dfz-border rounded-dfz-xl flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-xs text-dfz-text">Группы</div>
                    <div className="text-[11px] text-dfz-text-muted">Командные и общие групповые чаты</div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-[10px] font-bold text-emerald-400">
                    Активна
                  </span>
                </div>

                <div className="p-3 bg-dfz-surface-secondary border border-dfz-border rounded-dfz-xl flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-xs text-dfz-text">Каналы</div>
                    <div className="text-[11px] text-dfz-text-muted">Информационные каналы и блоги</div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-[10px] font-bold text-emerald-400">
                    Активна
                  </span>
                </div>

                <div className="p-3 bg-dfz-surface-secondary border border-dfz-border rounded-dfz-xl flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-xs text-dfz-text">Непрочитанные</div>
                    <div className="text-[11px] text-dfz-text-muted">Чаты с новыми сообщениями</div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-[10px] font-bold text-emerald-400">
                    Активна
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 7: STORAGE */}
          {activeTab === 'storage' && (
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-dfz-text">Использование памяти</h4>

              <div className="p-4 bg-dfz-surface-secondary border border-dfz-border rounded-dfz-xl flex items-center justify-between">
                <div>
                  <div className="font-semibold text-xs text-dfz-text">Локальный кэш DFZ</div>
                  <div className="text-[11px] text-dfz-text-muted mt-0.5 font-mono">
                    Занято: {cacheSize}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleClearCache}
                  className="px-3 py-1.5 rounded-dfz-lg bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-400 text-xs font-semibold transition-colors"
                >
                  {cacheCleared ? 'Очищено!' : 'Очистить кэш'}
                </button>
              </div>

              <h4 className="text-xs font-bold text-dfz-text pt-2">Автозагрузка медиа</h4>
              <div className="space-y-2 p-3 bg-dfz-surface-secondary border border-dfz-border rounded-dfz-xl">
                <label className="flex items-center justify-between p-1.5 cursor-pointer">
                  <span>При подключении к Wi-Fi</span>
                  <input
                    type="checkbox"
                    checked={autoDownloadWifi}
                    onChange={(e) => { setAutoDownloadWifi(e.target.checked); void saveSetting('autoDownloadWifi', e.target.checked); }}
                    className="w-4 h-4 rounded text-dfz-accent bg-dfz-bg border-dfz-border"
                  />
                </label>

                <label className="flex items-center justify-between p-1.5 cursor-pointer">
                  <span>Через мобильную сеть</span>
                  <input
                    type="checkbox"
                    checked={autoDownloadMobile}
                    onChange={(e) => { setAutoDownloadMobile(e.target.checked); void saveSetting('autoDownloadMobile', e.target.checked); }}
                    className="w-4 h-4 rounded text-dfz-accent bg-dfz-bg border-dfz-border"
                  />
                </label>
              </div>
            </div>
          )}

          {/* TAB 8: LANGUAGE */}
          {activeTab === 'language' && (
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-dfz-text">Выбор языка интерфейса</h4>

              <div className="space-y-2">
                <label
                  onClick={() => { setSelectedLang('ru'); void updateProfile({language:'ru'}); }}
                  className={`flex items-center justify-between p-3 rounded-dfz-xl border cursor-pointer transition-colors ${
                    selectedLang === 'ru'
                      ? 'bg-dfz-surface-secondary border-dfz-accent text-dfz-text'
                      : 'bg-dfz-bg border-dfz-border text-dfz-text-muted hover:border-dfz-text-muted'
                  }`}
                >
                  <div>
                    <div className="font-semibold text-xs text-dfz-text">Русский</div>
                    <div className="text-[11px] text-dfz-text-muted">Russian</div>
                  </div>
                  {selectedLang === 'ru' && <Check size={16} className="text-dfz-accent" />}
                </label>

                <label
                  onClick={() => { setSelectedLang('en'); void updateProfile({language:'en'}); }}
                  className={`flex items-center justify-between p-3 rounded-dfz-xl border cursor-pointer transition-colors ${
                    selectedLang === 'en'
                      ? 'bg-dfz-surface-secondary border-dfz-accent text-dfz-text'
                      : 'bg-dfz-bg border-dfz-border text-dfz-text-muted hover:border-dfz-text-muted'
                  }`}
                >
                  <div>
                    <div className="font-semibold text-xs text-dfz-text">English</div>
                    <div className="text-[11px] text-dfz-text-muted">Английский</div>
                  </div>
                  {selectedLang === 'en' && <Check size={16} className="text-dfz-accent" />}
                </label>

                <label
                  onClick={() => { setSelectedLang('uz'); void updateProfile({language:'uz'}); }}
                  className={`flex items-center justify-between p-3 rounded-dfz-xl border cursor-pointer transition-colors ${
                    selectedLang === 'uz'
                      ? 'bg-dfz-surface-secondary border-dfz-accent text-dfz-text'
                      : 'bg-dfz-bg border-dfz-border text-dfz-text-muted hover:border-dfz-text-muted'
                  }`}
                >
                  <div>
                    <div className="font-semibold text-xs text-dfz-text">O'zbekcha</div>
                    <div className="text-[11px] text-dfz-text-muted">Узбекский</div>
                  </div>
                  {selectedLang === 'uz' && <Check size={16} className="text-dfz-accent" />}
                </label>
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};
