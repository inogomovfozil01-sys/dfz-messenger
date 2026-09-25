'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, ArrowRight, User, Image, FileText, Lock, Check } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { Avatar } from '../../components/ui/Avatar';
import { PrivacyVisibility } from '@dfz/types';

export default function OnboardingPage() {
  const router = useRouter();
  const { user, profile, updateProfile, updatePrivacy } = useAuthStore();

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Profile data
  const [displayName, setDisplayName] = useState(profile?.displayName || user?.username || '');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [lastSeenVis, setLastSeenVis] = useState<PrivacyVisibility>(PrivacyVisibility.EVERYONE);
  const [callVis, setCallVis] = useState<PrivacyVisibility>(PrivacyVisibility.EVERYONE);

  const handleFinish = async () => {
    await updateProfile({
      displayName: displayName.trim() || user?.username,
      bio: bio.trim() || null,
      avatarUrl: avatarUrl.trim() || null,
    });
    await updatePrivacy({
      lastSeenVisibility: lastSeenVis,
      callVisibility: callVis,
    });
    router.push('/');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-dfz-bg text-dfz-text">
      <div className="w-full max-w-md bg-dfz-surface border border-dfz-border rounded-dfz-xl p-8 shadow-dfz-dropdown space-y-6 animate-scale-in">
        {/* Step Indicator */}
        <div className="flex items-center justify-between gap-2">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                i <= step ? 'bg-dfz-accent' : 'bg-dfz-surface-hover'
              }`}
            />
          ))}
        </div>

        {/* Step 1: Welcome & Display Name */}
        {step === 1 && (
          <div className="space-y-4 animate-fade-in">
            <div className="text-center space-y-1">
              <div className="w-12 h-12 bg-dfz-accent rounded-dfz-lg mx-auto flex items-center justify-center text-white shadow-dfz-md mb-3">
                <User size={24} />
              </div>
              <h2 className="text-lg font-bold text-dfz-text">Добро пожаловать в DFZ!</h2>
              <p className="text-xs text-dfz-text-muted">Как вас будут видеть другие собеседники?</p>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-dfz-text-muted">Отображаемое имя</label>
              <input
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Ваше имя или никнейм"
                className="w-full h-10 px-3 bg-dfz-bg border border-dfz-border rounded-dfz-lg text-xs text-dfz-text focus:outline-none focus:border-dfz-border-focus"
              />
            </div>

            <button
              type="button"
              disabled={!displayName.trim()}
              onClick={() => setStep(2)}
              className="w-full h-10 flex items-center justify-center gap-2 bg-dfz-accent hover:bg-dfz-accent-hover text-white text-xs font-semibold rounded-dfz-lg transition-colors shadow-dfz-sm disabled:opacity-50"
            >
              <span>Далее</span>
              <ArrowRight size={14} />
            </button>
          </div>
        )}

        {/* Step 2: Avatar & Bio */}
        {step === 2 && (
          <div className="space-y-4 animate-fade-in">
            <div className="text-center space-y-1">
              <h2 className="text-lg font-bold text-dfz-text">Аватар и статус</h2>
              <p className="text-xs text-dfz-text-muted">Персонализируйте ваш профиль</p>
            </div>

            <div className="flex justify-center my-2">
              <Avatar src={avatarUrl} name={displayName || 'U'} size="xl" />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-dfz-text-muted">Ссылка на фото (URL)</label>
              <input
                type="url"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder="https://images.unsplash.com/..."
                className="w-full h-9 px-3 bg-dfz-bg border border-dfz-border rounded-dfz-lg text-xs text-dfz-text focus:outline-none focus:border-dfz-border-focus"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-dfz-text-muted">О себе (Bio)</label>
              <textarea
                rows={2}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Расскажите о себе в двух словах..."
                className="w-full p-2.5 bg-dfz-bg border border-dfz-border rounded-dfz-lg text-xs text-dfz-text focus:outline-none focus:border-dfz-border-focus resize-none"
              />
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="flex-1 h-10 border border-dfz-border text-dfz-text-muted hover:text-dfz-text text-xs font-semibold rounded-dfz-lg transition-colors"
              >
                Назад
              </button>
              <button
                type="button"
                onClick={() => setStep(3)}
                className="flex-1 h-10 flex items-center justify-center gap-2 bg-dfz-accent hover:bg-dfz-accent-hover text-white text-xs font-semibold rounded-dfz-lg transition-colors shadow-dfz-sm"
              >
                <span>Далее</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Privacy Presets */}
        {step === 3 && (
          <div className="space-y-4 animate-fade-in">
            <div className="text-center space-y-1">
              <h2 className="text-lg font-bold text-dfz-text">Конфиденциальность</h2>
              <p className="text-xs text-dfz-text-muted">Настройте параметры приватности</p>
            </div>

            <div className="space-y-3 pt-2">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-dfz-text-muted">
                  Кто видит статус "в сети"
                </label>
                <select
                  value={lastSeenVis}
                  onChange={(e) => setLastSeenVis(e.target.value as PrivacyVisibility)}
                  className="w-full h-9 px-3 bg-dfz-bg border border-dfz-border rounded-dfz-lg text-xs text-dfz-text focus:outline-none"
                >
                  <option value={PrivacyVisibility.EVERYONE}>Все пользователи</option>
                  <option value={PrivacyVisibility.CONTACTS}>Только мои контакты</option>
                  <option value={PrivacyVisibility.NOBODY}>Никто</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-dfz-text-muted">Кто может звонить</label>
                <select
                  value={callVis}
                  onChange={(e) => setCallVis(e.target.value as PrivacyVisibility)}
                  className="w-full h-9 px-3 bg-dfz-bg border border-dfz-border rounded-dfz-lg text-xs text-dfz-text focus:outline-none"
                >
                  <option value={PrivacyVisibility.EVERYONE}>Все пользователи</option>
                  <option value={PrivacyVisibility.CONTACTS}>Только контакты</option>
                  <option value={PrivacyVisibility.NOBODY}>Никто</option>
                </select>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="flex-1 h-10 border border-dfz-border text-dfz-text-muted hover:text-dfz-text text-xs font-semibold rounded-dfz-lg transition-colors"
              >
                Назад
              </button>
              <button
                type="button"
                onClick={() => setStep(4)}
                className="flex-1 h-10 flex items-center justify-center gap-2 bg-dfz-accent hover:bg-dfz-accent-hover text-white text-xs font-semibold rounded-dfz-lg transition-colors shadow-dfz-sm"
              >
                <span>Далее</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Finished */}
        {step === 4 && (
          <div className="text-center space-y-4 animate-fade-in py-4">
            <div className="w-14 h-14 bg-dfz-success rounded-full mx-auto flex items-center justify-center text-white shadow-dfz-md">
              <Check size={28} />
            </div>

            <div className="space-y-1">
              <h2 className="text-lg font-bold text-dfz-text">Все готово!</h2>
              <p className="text-xs text-dfz-text-muted max-w-xs mx-auto">
                Ваш аккаунт полностью настроен. Добро пожаловать в современный мессенджер DFZ.
              </p>
            </div>

            <button
              type="button"
              onClick={handleFinish}
              className="w-full h-10 bg-dfz-accent hover:bg-dfz-accent-hover text-white text-xs font-semibold rounded-dfz-lg transition-colors shadow-dfz-sm"
            >
              Перейти к сообщениям
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
