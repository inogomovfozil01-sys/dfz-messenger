'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  Check,
  Camera,
  X,
  User,
  AtSign,
  Calendar,
  Phone,
  HelpCircle,
  Sparkles,
  Link as LinkIcon,
} from 'lucide-react';
import { Avatar } from '../ui/Avatar';
import { useAuthStore } from '../../stores/authStore';
import { apiRequest } from '../../lib/api';

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const EditProfileModal: React.FC<EditProfileModalProps> = ({ isOpen, onClose }) => {
  const { user, profile, updateProfile, checkAuth } = useAuthStore();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [bio, setBio] = useState('');
  const [username, setUsername] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [birthday, setBirthday] = useState('');
  const [phone, setPhone] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && profile) {
      const parts = (profile.displayName || '').trim().split(' ');
      setFirstName(parts[0] || '');
      setLastName(parts.slice(1).join(' ') || '');
      setBio(profile.bio || '');
      setAvatarUrl(profile.avatarUrl || '');
      setUsername(user?.username || '');
      setPhone(user?.phone || '');
      setBirthday((profile as any)?.birthday || '22 февраля');
      setErrorMessage('');
      setSuccessMessage('');
    }
  }, [isOpen, profile, user]);

  if (!isOpen || !user) return null;

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!firstName.trim()) {
      setErrorMessage('Пожалуйста, укажите имя');
      return;
    }

    setIsSaving(true);
    setErrorMessage('');

    const fullDisplayName = lastName.trim()
      ? `${firstName.trim()} ${lastName.trim()}`
      : firstName.trim();

    // 1. Update Profile (displayName, bio, avatarUrl)
    const success = await updateProfile({
      displayName: fullDisplayName,
      bio: bio.trim() || null,
      avatarUrl: avatarUrl.trim() || null,
    });

    // 2. Check if username changed
    if (username.trim() && username.trim().toLowerCase() !== user.username) {
      const uRes = await apiRequest('/api/users/profile', {
        method: 'PUT',
        body: JSON.stringify({ username: username.trim().toLowerCase() }),
      });
      if (!uRes.success) {
        setErrorMessage(uRes.error?.message || 'Не удалось обновить имя пользователя');
        setIsSaving(false);
        return;
      }
    }

    setIsSaving(false);
    if (success) {
      setSuccessMessage('Профиль успешно сохранен');
      await checkAuth();
      setTimeout(() => {
        setSuccessMessage('');
        onClose();
      }, 700);
    } else {
      setErrorMessage('Ошибка сохранения профиля');
    }
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePromptUrl = () => {
    const url = prompt('Или введите URL аватарки:', avatarUrl);
    if (url !== null) {
      setAvatarUrl(url.trim());
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-fade-in select-none">
      <div className="relative w-full max-w-md max-h-[92vh] bg-[#18181c] border border-[#292930] rounded-dfz-2xl shadow-2xl flex flex-col overflow-hidden text-dfz-text">
        {/* Hidden File Input */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/*"
          className="hidden"
        />

        {/* Telegram Top Header Bar with Checkmark */}
        <div className="h-14 px-4 border-b border-[#292930] flex items-center justify-between shrink-0 bg-[#18181c]">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="p-2 -ml-2 rounded-full hover:bg-[#28282e] text-dfz-text-muted hover:text-dfz-text transition-colors"
              title="Назад"
            >
              <ArrowLeft size={20} />
            </button>
            <h2 className="text-base font-bold text-dfz-text">Изменить профиль</h2>
          </div>

          <button
            onClick={() => handleSave()}
            disabled={isSaving}
            className="p-2 -mr-2 rounded-full hover:bg-[#8774e1]/15 text-[#8774e1] hover:text-[#7662d8] transition-colors disabled:opacity-50"
            title="Сохранить"
          >
            {isSaving ? (
              <span className="w-5 h-5 border-2 border-[#8774e1] border-t-transparent rounded-full block animate-spin" />
            ) : (
              <Check size={22} strokeWidth={2.5} />
            )}
          </button>
        </div>

        {/* Scrollable Form Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {errorMessage && (
            <div className="p-3 bg-[#ef5350]/10 border border-[#ef5350]/25 rounded-dfz-xl text-xs text-[#ef5350]">
              {errorMessage}
            </div>
          )}

          {successMessage && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/25 rounded-dfz-xl text-xs text-emerald-400">
              {successMessage}
            </div>
          )}

          {/* Telegram Large Centered Avatar with Camera Overlay */}
          <div className="flex flex-col items-center pt-2">
            <div
              onClick={handleAvatarClick}
              className="relative w-24 h-24 rounded-full cursor-pointer group select-none shadow-lg ring-2 ring-transparent hover:ring-[#8774e1] transition-all"
            >
              <Avatar
                src={avatarUrl}
                name={firstName || user.username}
                size="xl"
                className="w-24 h-24 text-2xl"
              />
              <div className="absolute inset-0 bg-black/45 rounded-full flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera size={26} className="text-white drop-shadow" />
                <span className="text-[10px] text-white font-medium mt-0.5">Выбрать</span>
              </div>
            </div>
            <div className="flex items-center gap-3 mt-2">
              <button
                type="button"
                onClick={handleAvatarClick}
                className="text-xs text-[#8774e1] hover:underline font-semibold"
              >
                Выбрать фото
              </button>
              <span className="text-dfz-text-muted text-xs">•</span>
              <button
                type="button"
                onClick={handlePromptUrl}
                className="text-xs text-dfz-text-muted hover:text-dfz-text hover:underline"
              >
                Ввести URL
              </button>
            </div>
          </div>

          {/* Name Card (First & Last Name) */}
          <div className="p-3.5 rounded-dfz-xl bg-[#212126] border border-[#292930] space-y-3">
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-dfz-text-muted">Имя</label>
              <input
                type="text"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Имя"
                className="w-full h-9 px-3 rounded-dfz-lg bg-[#18181c] border border-[#292930] text-sm text-dfz-text placeholder:text-dfz-text-muted focus:outline-none focus:border-[#8774e1]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-dfz-text-muted">Фамилия (необязательно)</label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Фамилия"
                className="w-full h-9 px-3 rounded-dfz-lg bg-[#18181c] border border-[#292930] text-sm text-dfz-text placeholder:text-dfz-text-muted focus:outline-none focus:border-[#8774e1]"
              />
            </div>
          </div>

          {/* Bio / About */}
          <div className="p-3.5 rounded-dfz-xl bg-[#212126] border border-[#292930] space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="text-[11px] font-semibold text-dfz-text-muted">О себе</label>
              <span className="text-[10px] text-dfz-text-muted font-mono">{bio.length}/70</span>
            </div>
            <textarea
              rows={2}
              maxLength={70}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Любые подробности, например: возраст, профессия или город."
              className="w-full px-3 py-2 rounded-dfz-lg bg-[#18181c] border border-[#292930] text-xs text-dfz-text placeholder:text-dfz-text-muted resize-none focus:outline-none focus:border-[#8774e1]"
            />
            <p className="text-[10px] text-dfz-text-muted leading-tight">
              Любые подробности о вас, которые увидят другие пользователи.
            </p>
          </div>

          {/* Username (@username) */}
          <div className="p-3.5 rounded-dfz-xl bg-[#212126] border border-[#292930] space-y-1.5">
            <label className="text-[11px] font-semibold text-dfz-text-muted">Имя пользователя</label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-dfz-text-muted text-sm font-mono">@</span>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                placeholder="username"
                className="w-full h-9 pl-7 pr-3 rounded-dfz-lg bg-[#18181c] border border-[#292930] text-sm font-mono text-dfz-text focus:outline-none focus:border-[#8774e1]"
              />
            </div>
            <p className="text-[10px] text-dfz-text-muted leading-tight">
              Вы можете выбрать публичное имя в DFZ Messenger. По этому имени другие пользователи смогут найти вас.
            </p>
            {username && (
              <p className="text-[11px] text-[#8774e1] font-mono truncate">
                https://dfz.im/{username}
              </p>
            )}
          </div>

          {/* Birthday & Phone (Exact as Telegram Screenshot 1) */}
          <div className="p-3.5 rounded-dfz-xl bg-[#212126] border border-[#292930] space-y-3">
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-dfz-text-muted flex items-center gap-1.5">
                <Calendar size={13} className="text-[#8774e1]" />
                <span>День рождения</span>
              </label>
              <input
                type="text"
                value={birthday}
                onChange={(e) => setBirthday(e.target.value)}
                placeholder="например: 22 февраля"
                className="w-full h-9 px-3 rounded-dfz-lg bg-[#18181c] border border-[#292930] text-xs text-dfz-text focus:outline-none focus:border-[#8774e1]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-dfz-text-muted flex items-center gap-1.5">
                <Phone size={13} className="text-[#8774e1]" />
                <span>Номер телефона</span>
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+7 999 123 4567"
                className="w-full h-9 px-3 rounded-dfz-lg bg-[#18181c] border border-[#292930] text-xs text-dfz-text focus:outline-none focus:border-[#8774e1]"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
