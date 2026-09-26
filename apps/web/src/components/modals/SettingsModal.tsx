import React, { useState, useEffect } from 'react';
import { User, Shield, Lock, Laptop, Palette, LogOut, Check, X, Star, Sparkles, ShieldCheck } from 'lucide-react';
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

type SettingsTab = 'profile' | 'privacy' | 'security' | 'appearance';

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { user, profile, updateProfile, updatePrivacy, logout } = useAuthStore();
  const { setStarsOpen, setPremiumOpen } = useEconomyStore();
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
  const isAdmin = user?.role === UserRole.ADMIN || user?.role === UserRole.SUPERADMIN;

  // Form states
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

  // Sessions state
  const [sessions, setSessions] = useState<any[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);

  // Password state
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [passMessage, setPassMessage] = useState('');

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.displayName || '');
      setBio(profile.bio || '');
      setAvatarUrl(profile.avatarUrl || '');
      setLastSeen(profile.lastSeenVisibility || PrivacyVisibility.EVERYONE);
      setCallVis(profile.callVisibility || PrivacyVisibility.EVERYONE);
    }
  }, [profile]);

  useEffect(() => {
    if (activeTab === 'security' && isOpen) {
      loadSessions();
    }
  }, [activeTab, isOpen]);

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
    await updateProfile({
      displayName: displayName.trim(),
      bio: bio.trim() || null,
      avatarUrl: avatarUrl.trim() || null,
    });
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const handleSavePrivacy = async () => {
    await updatePrivacy({
      lastSeenVisibility: lastSeen,
      callVisibility: callVis,
    });
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const handleTerminateOtherSessions = async () => {
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
    const res = await apiRequest('/api/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword: currentPass, newPassword: newPass }),
    });
    if (res.success) {
      setPassMessage('Пароль успешно изменен');
      setCurrentPass('');
      setNewPass('');
    } else {
      setPassMessage(res.error?.message || 'Ошибка смены пароля');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Настройки" maxWidth="lg">
      <div className="flex flex-col sm:flex-row gap-6 min-h-[380px]">
        {/* Left tabs menu */}
        <div className="w-full sm:w-48 flex sm:flex-col gap-1 border-b sm:border-b-0 sm:border-r border-dfz-border pb-3 sm:pb-0 sm:pr-3">
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-dfz-md text-xs font-medium text-left transition-colors ${
              activeTab === 'profile'
                ? 'bg-dfz-accent text-white'
                : 'text-dfz-text-muted hover:text-dfz-text hover:bg-dfz-surface-hover'
            }`}
          >
            <User size={16} />
            <span>Профиль</span>
          </button>

          <button
            onClick={() => setActiveTab('privacy')}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-dfz-md text-xs font-medium text-left transition-colors ${
              activeTab === 'privacy'
                ? 'bg-dfz-accent text-white'
                : 'text-dfz-text-muted hover:text-dfz-text hover:bg-dfz-surface-hover'
            }`}
          >
            <Lock size={16} />
            <span>Приватность</span>
          </button>

          <button
            onClick={() => setActiveTab('security')}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-dfz-md text-xs font-medium text-left transition-colors ${
              activeTab === 'security'
                ? 'bg-dfz-accent text-white'
                : 'text-dfz-text-muted hover:text-dfz-text hover:bg-dfz-surface-hover'
            }`}
          >
            <Laptop size={16} />
            <span>Сеансы и вход</span>
          </button>

          <div className="pt-2 border-t border-dfz-border my-1 flex flex-col gap-1">
            <button
              onClick={() => {
                onClose();
                setStarsOpen(true);
              }}
              className="flex items-center gap-2.5 px-3 py-2 rounded-dfz-md text-xs font-medium text-left text-amber-400 hover:bg-amber-500/10 transition-colors"
            >
              <Star size={16} className="fill-amber-400" />
              <span>DFZ Stars</span>
            </button>

            <button
              onClick={() => {
                onClose();
                setPremiumOpen(true);
              }}
              className="flex items-center gap-2.5 px-3 py-2 rounded-dfz-md text-xs font-medium text-left text-cyan-400 hover:bg-cyan-500/10 transition-colors"
            >
              <Sparkles size={16} />
              <span>DFZ Premium</span>
            </button>

            {isAdmin && (
              <a
                href="/admin"
                className="flex items-center gap-2.5 px-3 py-2 rounded-dfz-md text-xs font-medium text-left text-rose-400 hover:bg-rose-500/10 transition-colors"
              >
                <ShieldCheck size={16} />
                <span>Администрация</span>
              </a>
            )}
          </div>

          <div className="pt-4 mt-auto hidden sm:block border-t border-dfz-border">
            <button
              onClick={() => {
                logout();
                onClose();
              }}
              className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-dfz-danger hover:bg-dfz-danger/10 rounded-dfz-md w-full transition-colors"
            >
              <LogOut size={16} />
              <span>Выйти</span>
            </button>
          </div>
        </div>

        {/* Tab contents */}
        <div className="flex-1 overflow-y-auto max-h-[420px]">
          {/* 1. Profile Tab */}
          {activeTab === 'profile' && (
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="flex items-center gap-4">
                <Avatar src={avatarUrl} name={displayName || user?.username || 'U'} size="lg" />
                <div>
                  <h4 className="text-sm font-semibold text-dfz-text">
                    {profile?.displayName || user?.username}
                  </h4>
                  <p className="text-xs text-dfz-text-muted">@{user?.username}</p>
                </div>
              </div>

              {/* DFZ Status Card */}
              <div className="p-3 rounded-dfz-lg bg-dfz-surface border border-dfz-border flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className={`p-2 rounded-dfz-md ${user?.isPremium ? 'bg-cyan-500/15 text-cyan-400' : 'bg-dfz-surface-hover text-dfz-text-muted'}`}>
                    <Sparkles size={16} />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-dfz-text">
                      {user?.isPremium ? 'DFZ Premium активен' : 'Базовый аккаунт'}
                    </h5>
                    <p className="text-[11px] text-dfz-text-muted">
                      {user?.isPremium && user.premiumUntil
                        ? `Действует до ${new Date(user.premiumUntil).toLocaleDateString()}`
                        : 'Лимиты 2 ГБ, подарки, HD медиа, значок ◆'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    setPremiumOpen(true);
                  }}
                  className="px-2.5 py-1 rounded-dfz-md bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-400 text-xs font-semibold transition-colors"
                >
                  {user?.isPremium ? 'Продлить' : 'Улучшить'}
                </button>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-dfz-text-muted">Имя</label>
                <input
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full h-9 px-3 bg-dfz-bg border border-dfz-border rounded-dfz-lg text-xs text-dfz-text focus:outline-none focus:border-dfz-border-focus"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-dfz-text-muted">О себе (Bio)</label>
                <textarea
                  rows={2}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Пара слов о себе..."
                  className="w-full p-2.5 bg-dfz-bg border border-dfz-border rounded-dfz-lg text-xs text-dfz-text focus:outline-none focus:border-dfz-border-focus resize-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-dfz-text-muted">Ссылка на аватар (URL)</label>
                <input
                  type="url"
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full h-9 px-3 bg-dfz-bg border border-dfz-border rounded-dfz-lg text-xs text-dfz-text focus:outline-none focus:border-dfz-border-focus"
                />
              </div>

              <button
                type="submit"
                className="flex items-center gap-1.5 px-4 py-2 bg-dfz-accent hover:bg-dfz-accent-hover text-white text-xs font-semibold rounded-dfz-md transition-colors shadow-dfz-sm"
              >
                {isSaved ? <Check size={16} /> : null}
                <span>{isSaved ? 'Сохранено' : 'Сохранить изменения'}</span>
              </button>
            </form>
          )}

          {/* 2. Privacy Tab */}
          {activeTab === 'privacy' && (
            <div className="space-y-5">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-dfz-text">Кто видит время захода (Last Seen)</label>
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

              <div className="space-y-2">
                <label className="text-xs font-semibold text-dfz-text">Кто может мне звонить</label>
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

              <button
                type="button"
                onClick={handleSavePrivacy}
                className="flex items-center gap-1.5 px-4 py-2 bg-dfz-accent hover:bg-dfz-accent-hover text-white text-xs font-semibold rounded-dfz-md transition-colors shadow-dfz-sm"
              >
                {isSaved ? <Check size={16} /> : null}
                <span>{isSaved ? 'Настройки обновлены' : 'Применить приватность'}</span>
              </button>
            </div>
          )}

          {/* 3. Security Tab */}
          {activeTab === 'security' && (
            <div className="space-y-6">
              {/* Active Sessions */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold text-dfz-text">Активные устройства и сессии</h4>
                  <button
                    onClick={handleTerminateOtherSessions}
                    className="text-xs text-dfz-danger hover:underline font-medium"
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
                        className="flex items-center justify-between p-2.5 bg-dfz-bg border border-dfz-border rounded-dfz-lg text-xs"
                      >
                        <div>
                          <p className="font-semibold text-dfz-text">
                            {s.deviceName} {s.isCurrent && <span className="text-dfz-accent">(текущий)</span>}
                          </p>
                          <p className="text-[11px] text-dfz-text-muted mt-0.5">
                            IP: {s.ipAddress} • {s.browser} • {s.os}
                          </p>
                        </div>
                        {!s.isCurrent && (
                          <button
                            onClick={() => handleTerminateSession(s.id)}
                            className="p-1 text-dfz-danger hover:bg-dfz-danger/10 rounded transition-colors"
                            title="Завершить сеанс"
                          >
                            <X size={16} />
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Password Change */}
              <form onSubmit={handleChangePassword} className="space-y-3 pt-3 border-t border-dfz-border">
                <h4 className="text-xs font-semibold text-dfz-text">Изменение пароля</h4>
                {passMessage && (
                  <p className="text-xs text-dfz-accent font-medium">{passMessage}</p>
                )}
                <input
                  type="password"
                  placeholder="Текущий пароль"
                  required
                  value={currentPass}
                  onChange={(e) => setCurrentPass(e.target.value)}
                  className="w-full h-9 px-3 bg-dfz-bg border border-dfz-border rounded-dfz-lg text-xs text-dfz-text focus:outline-none"
                />
                <input
                  type="password"
                  placeholder="Новый пароль"
                  required
                  value={newPass}
                  onChange={(e) => setNewPass(e.target.value)}
                  className="w-full h-9 px-3 bg-dfz-bg border border-dfz-border rounded-dfz-lg text-xs text-dfz-text focus:outline-none"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-dfz-surface-hover text-dfz-text hover:bg-dfz-border text-xs font-semibold rounded-dfz-md transition-colors"
                >
                  Обновить пароль
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};
