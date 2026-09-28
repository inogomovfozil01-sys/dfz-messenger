'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  Check,
  Camera,
  Plus,
  X,
  Sparkles,
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

    if (username.trim() && username.trim().length < 5) {
      setErrorMessage('Минимальная длина имени пользователя — 5 символов');
      return;
    }

    setIsSaving(true);
    setErrorMessage('');

    const fullDisplayName = lastName.trim()
      ? `${firstName.trim()} ${lastName.trim()}`
      : firstName.trim();

    try {
      // 1. Update Profile via PUT /api/users/profile
      const payload: any = {
        displayName: fullDisplayName,
        bio: bio.trim() || null,
        avatarUrl: avatarUrl.trim() || null,
      };

      if (username.trim() && username.trim().toLowerCase() !== user.username) {
        payload.username = username.trim().toLowerCase();
      }

      const res = await apiRequest('/api/users/profile', {
        method: 'PUT',
        body: JSON.stringify(payload),
      });

      if (!res.success) {
        throw new Error(res.error?.message || 'Ошибка сохранения профиля');
      }

      // Also sync local store
      await updateProfile({
        displayName: fullDisplayName,
        bio: bio.trim() || null,
        avatarUrl: avatarUrl.trim() || null,
      });

      await checkAuth();

      setSuccessMessage('Профиль успешно сохранен');
      setTimeout(() => {
        setSuccessMessage('');
        onClose();
      }, 500);
    } catch (err: any) {
      setErrorMessage(err.message || 'Ошибка сохранения профиля');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Show instant preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatarUrl(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Also upload file to backend
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await apiRequest<{ url: string }>('/api/media/upload', {
        method: 'POST',
        body: formData,
      });
      if (res.success && res.data?.url) {
        setAvatarUrl(res.data.url);
      }
    } catch {
      // Keep data URI preview as fallback
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-sm animate-fade-in select-none">
      <div className="relative w-full max-w-[420px] h-full sm:h-auto sm:max-h-[92vh] bg-[#18181c] sm:border sm:border-[#292930] sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden text-dfz-text">
        {/* Hidden File Input */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/*"
          className="hidden"
        />

        {/* Telegram Top Header Bar 1:1 like Screenshot */}
        <div className="h-14 px-4 border-b border-[#292930]/80 flex items-center justify-between shrink-0 bg-[#18181c] z-10">
          <div className="flex items-center gap-4">
            <button
              onClick={onClose}
              className="p-1 -ml-1 rounded-full text-white/80 hover:text-white hover:bg-white/10 transition-colors"
              title="Назад"
            >
              <ArrowLeft size={22} />
            </button>
            <h2 className="text-lg font-bold text-white tracking-wide">Изменить профиль</h2>
          </div>

          <button
            onClick={() => handleSave()}
            disabled={isSaving}
            className="p-1 -mr-1 rounded-full text-[#8774e1] hover:text-[#9987ea] hover:bg-[#8774e1]/10 transition-colors disabled:opacity-40"
            title="Сохранить"
          >
            {isSaving ? (
              <span className="w-5 h-5 border-2 border-[#8774e1] border-t-transparent rounded-full block animate-spin" />
            ) : (
              <Check size={24} strokeWidth={2.6} />
            )}
          </button>
        </div>

        {/* Scrollable Form Content */}
        <div className="flex-1 overflow-y-auto px-4 py-5 space-y-6">
          {errorMessage && (
            <div className="p-3 bg-[#ef5350]/10 border border-[#ef5350]/25 rounded-xl text-xs text-[#ef5350]">
              {errorMessage}
            </div>
          )}

          {successMessage && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/25 rounded-xl text-xs text-emerald-400">
              {successMessage}
            </div>
          )}

          {/* Telegram Large Centered Avatar with Camera+ Overlay 1:1 */}
          <div className="flex flex-col items-center pt-1 pb-2">
            <div
              onClick={handleAvatarClick}
              className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-full cursor-pointer group shadow-xl transition-transform active:scale-95"
            >
              <Avatar
                src={avatarUrl}
                name={firstName || user.username}
                size="xl"
                className="w-28 h-28 sm:w-32 sm:h-32 text-3xl ring-2 ring-[#292930] group-hover:ring-[#8774e1] transition-all"
              />

              {/* Exact Camera+ Icon Overlay from Screenshot */}
              <div className="absolute inset-0 bg-black/35 group-hover:bg-black/50 rounded-full flex items-center justify-center transition-all">
                <div className="relative">
                  <Camera size={38} className="text-white drop-shadow-md" strokeWidth={1.8} />
                  <div className="absolute -bottom-1 -right-1 bg-white text-black rounded-full p-0.5 shadow">
                    <Plus size={12} strokeWidth={3} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* First Group: Outlined Notch Fields (Имя, Фамилия, О себе) */}
          <div className="p-3 sm:p-4 rounded-2xl bg-[#212126] border border-[#2c2c34] space-y-3 shadow-sm">
            {/* Field 1: Имя */}
            <div className="relative rounded-xl border border-[#383842] focus-within:border-[#8774e1] bg-[#18181c]/60 px-3.5 pt-2 pb-1.5 transition-colors">
              <label className="block text-[11px] font-medium text-[#8e8e93] leading-none mb-0.5">
                Имя
              </label>
              <input
                type="text"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Имя"
                className="w-full bg-transparent text-[15px] font-medium text-white placeholder:text-[#5c5c66] focus:outline-none"
              />
            </div>

            {/* Field 2: Фамилия */}
            <div className="relative rounded-xl border border-[#383842] focus-within:border-[#8774e1] bg-[#18181c]/60 px-3.5 pt-2 pb-1.5 transition-colors">
              <label className="block text-[11px] font-medium text-[#8e8e93] leading-none mb-0.5">
                Фамилия
              </label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Фамилия"
                className="w-full bg-transparent text-[15px] font-medium text-white placeholder:text-[#5c5c66] focus:outline-none"
              />
            </div>

            {/* Field 3: О себе (необязательно) */}
            <div className="relative rounded-xl border border-[#383842] focus-within:border-[#8774e1] bg-[#18181c]/60 px-3.5 pt-2 pb-2 transition-colors">
              <div className="flex justify-between items-center mb-0.5">
                <label className="block text-[11px] font-medium text-[#8e8e93] leading-none">
                  О себе (необязательно)
                </label>
                <span className="text-[10px] text-[#8e8e93] font-mono">{bio.length}/70</span>
              </div>
              <textarea
                rows={2}
                maxLength={70}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="О себе"
                className="w-full bg-transparent text-[14px] text-white placeholder:text-[#5c5c66] leading-snug resize-none focus:outline-none"
              />
            </div>
          </div>

          {/* Helper caption 1 under Card 1 (Exact from Screenshot) */}
          <p className="px-2 text-[13px] text-[#8e8e93] leading-relaxed -mt-3">
            Любые подробности, например: возраст, род занятий или город. Пример: 23 года, дизайнер из Санкт-Петербурга.
          </p>

          {/* Second Group: Имя пользователя */}
          <div className="space-y-1.5 pt-1">
            <h3 className="px-2 text-sm font-semibold text-[#8774e1] tracking-wide">
              Имя пользователя
            </h3>

            <div className="p-3 sm:p-4 rounded-2xl bg-[#212126] border border-[#2c2c34] shadow-sm">
              <div className="relative rounded-xl border border-[#383842] focus-within:border-[#8774e1] bg-[#18181c]/60 px-3.5 pt-2 pb-1.5 transition-colors">
                <label className="block text-[11px] font-medium text-[#8e8e93] leading-none mb-0.5">
                  Имя пользователя (необязательно)
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                  placeholder="realDFZ"
                  className="w-full bg-transparent text-[15px] font-medium text-white placeholder:text-[#5c5c66] focus:outline-none font-mono"
                />
              </div>
            </div>

            {/* Helper captions 2 under Card 2 (Exact from Screenshot) */}
            <div className="px-2 space-y-3 pt-2 text-[13px] text-[#8e8e93] leading-relaxed">
              <p>
                Вы можете выбрать публичное имя пользователя в <strong className="text-white font-medium">Telegram</strong>. В этом случае другие люди смогут найти Вас по такому имени и связаться, не зная Вашего телефона.
              </p>
              <p>
                Вы можете использовать символы <strong className="text-white font-medium">a–z</strong>, <strong className="text-white font-medium">0–9</strong> и подчёркивания. Минимальная длина — <strong className="text-white font-medium">5</strong> символов.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
