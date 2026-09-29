'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  Lock,
  User,
  Eye,
  EyeOff,
  AlertCircle,
  Download,
  QrCode,
  Smartphone,
  KeyRound,
  RefreshCw,
} from 'lucide-react';
import { BrandMark } from '../../../components/ui/BrandMark';
import { useAuthStore } from '../../../stores/authStore';
import { usePwaInstall } from '../../../hooks/usePwaInstall';

type LoginTab = 'credentials' | 'phone' | 'qr';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuthStore();
  const { isStandalone, canInstall, promptInstall } = usePwaInstall();

  const [activeTab, setActiveTab] = useState<LoginTab>('credentials');
  const [isLoading, setIsLoading] = useState(false);
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [phoneCountryCode, setPhoneCountryCode] = useState('+7');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [phoneStep, setPhoneStep] = useState<'phone' | 'code'>('phone');
  const [phoneCode, setPhoneCode] = useState('');
  const [qrCodeId, setQrCodeId] = useState(() => 'tg_qr_' + Math.random().toString(36).substring(7));
  const [error, setError] = useState('');

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usernameOrEmail.trim() || !password) return;

    setError('');
    setIsLoading(true);

    try {
      const res = await login({ usernameOrEmail: usernameOrEmail.trim(), password });
      setIsLoading(false);
      if (res.success) {
        router.push('/');
      } else {
        setError(res.error || 'Неверный логин или пароль');
      }
    } catch (err: any) {
      setIsLoading(false);
      setError(err?.message || 'Ошибка подключения к серверу');
    }
  };

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (phoneStep === 'phone') {
      if (!phoneNumber.trim()) return;
      setError('');
      setIsLoading(true);
      // Simulate SMS / Telegram Auth code dispatch
      setTimeout(() => {
        setIsLoading(false);
        setPhoneStep('code');
      }, 700);
    } else {
      if (!phoneCode.trim()) return;
      setError('');
      setIsLoading(true);
      // Verify and authenticate
      try {
        const fullPhone = phoneCountryCode + phoneNumber.replace(/\D/g, '');
        const res = await login({ usernameOrEmail: fullPhone, password: phoneCode });
        setIsLoading(false);
        if (res.success) {
          router.push('/');
        } else {
          // If phone isn't registered, fallback message
          setError('Код подтверждения недействителен или пользователь не найден');
        }
      } catch (err: any) {
        setIsLoading(false);
        setError(err?.message || 'Ошибка входа');
      }
    }
  };

  const handleRefreshQr = () => {
    setQrCodeId('tg_qr_' + Math.random().toString(36).substring(7));
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-[var(--bg-main)] text-[var(--text-primary)] select-none">
      {/* Telegram Centered Auth Card */}
      <div className="w-full max-w-[420px] bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl p-7 sm:p-8 shadow-2xl space-y-6 relative overflow-hidden animate-scale-in">
        {/* Subtle Top Glow */}
        <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-48 h-48 bg-[var(--accent-primary)]/15 rounded-full blur-3xl pointer-events-none" />

        {/* Brand Header */}
        <div className="text-center space-y-2 relative">
          <div className="relative w-16 h-16 mx-auto mb-2">
            <BrandMark className="w-16 h-16 shadow-lg shadow-[var(--accent-primary)]/20 rounded-2xl mx-auto" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-[var(--text-primary)]">Вход в Telegram Web</h1>
          <p className="text-xs text-[var(--text-secondary)]">Войдите в свой аккаунт мессенджера</p>
        </div>

        {/* Navigation Tabs (Credentials / Phone / QR) */}
        <div className="flex p-1 bg-[var(--bg-surface-secondary)] border border-[var(--border-subtle)] rounded-xl gap-1 text-xs font-semibold">
          <button
            type="button"
            onClick={() => {
              setActiveTab('credentials');
              setError('');
            }}
            className={`flex-1 py-1.5 px-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'credentials'
                ? 'bg-[var(--accent-primary)] text-white shadow-sm'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <KeyRound size={14} />
            <span>Логин</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('phone');
              setError('');
            }}
            className={`flex-1 py-1.5 px-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'phone'
                ? 'bg-[var(--accent-primary)] text-white shadow-sm'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Smartphone size={14} />
            <span>Телефон</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('qr');
              setError('');
            }}
            className={`flex-1 py-1.5 px-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'qr'
                ? 'bg-[var(--accent-primary)] text-white shadow-sm'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <QrCode size={14} />
            <span>QR-код</span>
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/25 rounded-xl text-xs text-red-400 flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* 1. Tab: Username / Password */}
        {activeTab === 'credentials' && (
          <form onSubmit={handleCredentialsSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-[var(--text-secondary)]">Username или Email</label>
              <div className="relative flex items-center">
                <User size={16} className="absolute left-3.5 text-[var(--text-tertiary)] pointer-events-none" />
                <input
                  type="text"
                  required
                  autoComplete="username"
                  value={usernameOrEmail}
                  onChange={(e) => setUsernameOrEmail(e.target.value)}
                  placeholder="dfzadmin или alex_dev"
                  className="w-full h-11 pl-10 pr-3.5 bg-[var(--bg-surface-secondary)] border border-[var(--border-subtle)] focus:border-[var(--accent-primary)] rounded-xl text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none transition-colors"
                />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-[var(--text-secondary)]">Пароль</label>
              </div>
              <div className="relative flex items-center">
                <Lock size={16} className="absolute left-3.5 text-[var(--text-tertiary)] pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full h-11 pl-10 pr-10 bg-[var(--bg-surface-secondary)] border border-[var(--border-subtle)] focus:border-[var(--accent-primary)] rounded-xl text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] p-1 rounded transition-colors"
                  title={showPassword ? 'Скрыть пароль' : 'Показать пароль'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || !usernameOrEmail.trim() || !password}
              className="w-full h-11 mt-2 flex items-center justify-center gap-2 bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] text-white text-sm font-semibold rounded-xl transition-all shadow-md active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full inline-block animate-spin" />
              ) : (
                <>
                  <span>ВОЙТИ</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>
        )}

        {/* 2. Tab: Phone Number */}
        {activeTab === 'phone' && (
          <form onSubmit={handlePhoneSubmit} className="space-y-4">
            {phoneStep === 'phone' ? (
              <>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-[var(--text-secondary)]">Страна и код</label>
                  <select
                    value={phoneCountryCode}
                    onChange={(e) => setPhoneCountryCode(e.target.value)}
                    className="w-full h-11 px-3.5 bg-[var(--bg-surface-secondary)] border border-[var(--border-subtle)] focus:border-[var(--accent-primary)] rounded-xl text-sm text-[var(--text-primary)] focus:outline-none"
                  >
                    <option value="+7">🇷🇺 Россия / Казахстан (+7)</option>
                    <option value="+998">🇺🇿 Узбекистан (+998)</option>
                    <option value="+375">🇧🇾 Беларусь (+375)</option>
                    <option value="+1">🇺🇸 США / Канада (+1)</option>
                    <option value="+44">🇬🇧 Великобритания (+44)</option>
                    <option value="+49">🇩🇪 Германия (+49)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-[var(--text-secondary)]">Номер телефона</label>
                  <div className="relative flex items-center">
                    <span className="absolute left-3.5 text-xs font-mono font-bold text-[var(--text-secondary)]">
                      {phoneCountryCode}
                    </span>
                    <input
                      type="tel"
                      required
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="999 123-45-67"
                      className="w-full h-11 pl-14 pr-3.5 bg-[var(--bg-surface-secondary)] border border-[var(--border-subtle)] focus:border-[var(--accent-primary)] rounded-xl text-sm font-mono text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading || !phoneNumber.trim()}
                  className="w-full h-11 mt-2 flex items-center justify-center gap-2 bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] text-white text-sm font-semibold rounded-xl transition-all shadow-md active:scale-[0.98] disabled:opacity-50"
                >
                  {isLoading ? (
                    <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>ПРОДОЛЖИТЬ</span>
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </>
            ) : (
              <>
                <div className="p-3 bg-[var(--bg-surface-secondary)] rounded-xl border border-[var(--border-subtle)] text-center text-xs text-[var(--text-secondary)]">
                  Мы отправили проверочный код на номер{' '}
                  <span className="font-mono font-bold text-[var(--text-primary)]">
                    {phoneCountryCode} {phoneNumber}
                  </span>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-[var(--text-secondary)]">Код из Telegram или SMS</label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={phoneCode}
                    onChange={(e) => setPhoneCode(e.target.value)}
                    placeholder="•••••"
                    autoFocus
                    className="w-full h-12 text-center tracking-[0.5em] font-mono font-bold text-lg bg-[var(--bg-surface-secondary)] border border-[var(--border-subtle)] focus:border-[var(--accent-primary)] rounded-xl text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setPhoneStep('phone')}
                    className="w-1/3 h-11 border border-[var(--border-subtle)] hover:bg-[var(--bg-surface-secondary)] text-[var(--text-secondary)] text-xs font-semibold rounded-xl transition-all"
                  >
                    Назад
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading || !phoneCode.trim()}
                    className="flex-1 h-11 bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] text-white text-sm font-semibold rounded-xl transition-all shadow-md active:scale-[0.98] disabled:opacity-50"
                  >
                    {isLoading ? (
                      <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full inline-block animate-spin" />
                    ) : (
                      'ПОДТВЕРДИТЬ'
                    )}
                  </button>
                </div>
              </>
            )}
          </form>
        )}

        {/* 3. Tab: QR Code Login */}
        {activeTab === 'qr' && (
          <div className="flex flex-col items-center justify-center space-y-4 text-center">
            {/* High-res Telegram QR Card with Scanning line */}
            <div className="relative p-4 bg-white rounded-2xl shadow-xl border border-white/20">
              <div className="w-48 h-48 relative flex items-center justify-center">
                {/* SVG QR Code Simulation with Center Telegram Logo */}
                <svg viewBox="0 0 100 100" className="w-full h-full text-slate-900 fill-current">
                  {/* Outer corner markers */}
                  <rect x="5" y="5" width="25" height="25" rx="3" fill="#17212b" />
                  <rect x="9" y="9" width="17" height="17" rx="2" fill="#fff" />
                  <rect x="13" y="13" width="9" height="9" rx="1" fill="#17212b" />

                  <rect x="70" y="5" width="25" height="25" rx="3" fill="#17212b" />
                  <rect x="74" y="9" width="17" height="17" rx="2" fill="#fff" />
                  <rect x="78" y="13" width="9" height="9" rx="1" fill="#17212b" />

                  <rect x="5" y="70" width="25" height="25" rx="3" fill="#17212b" />
                  <rect x="9" y="74" width="17" height="17" rx="2" fill="#fff" />
                  <rect x="13" y="78" width="9" height="9" rx="1" fill="#17212b" />

                  {/* QR Data Grid Matrix */}
                  <rect x="36" y="8" width="5" height="5" />
                  <rect x="45" y="8" width="5" height="5" />
                  <rect x="54" y="8" width="5" height="5" />
                  <rect x="8" y="36" width="5" height="5" />
                  <rect x="18" y="45" width="5" height="5" />
                  <rect x="27" y="36" width="5" height="5" />
                  <rect x="70" y="36" width="5" height="5" />
                  <rect x="80" y="45" width="5" height="5" />
                  <rect x="88" y="36" width="5" height="5" />
                  <rect x="36" y="70" width="5" height="5" />
                  <rect x="45" y="80" width="5" height="5" />
                  <rect x="54" y="88" width="5" height="5" />
                  <rect x="70" y="70" width="5" height="5" />
                  <rect x="80" y="78" width="5" height="5" />
                  <rect x="88" y="88" width="5" height="5" />
                </svg>

                {/* Telegram Brandmark Icon in center of QR */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-12 h-12 bg-white rounded-full p-1 shadow-md flex items-center justify-center">
                    <BrandMark className="w-9 h-9" />
                  </div>
                </div>

                {/* Animated scan beam */}
                <div className="absolute inset-x-0 h-1 bg-[var(--accent-primary)]/80 shadow-[0_0_12px_var(--accent-primary)] animate-bounce" />
              </div>
            </div>

            {/* QR Instructions */}
            <div className="space-y-1.5 text-xs text-[var(--text-secondary)] text-left px-2">
              <p className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-[var(--accent-primary)]/20 text-[var(--accent-primary)] text-[10px] font-bold flex items-center justify-center shrink-0">
                  1
                </span>
                <span>Откройте Telegram на телефоне</span>
              </p>
              <p className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-[var(--accent-primary)]/20 text-[var(--accent-primary)] text-[10px] font-bold flex items-center justify-center shrink-0">
                  2
                </span>
                <span>Перейдите в Настройки → Устройства → Подключить устройство</span>
              </p>
              <p className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-[var(--accent-primary)]/20 text-[var(--accent-primary)] text-[10px] font-bold flex items-center justify-center shrink-0">
                  3
                </span>
                <span>Наведите камеру на этот экран для подтверждения</span>
              </p>
            </div>

            <button
              type="button"
              onClick={handleRefreshQr}
              className="text-xs text-[var(--accent-primary)] hover:underline flex items-center gap-1 font-medium pt-1"
            >
              <RefreshCw size={13} />
              <span>Обновить QR-код</span>
            </button>
          </div>
        )}

        {/* Link to Register */}
        <div className="pt-2 text-center text-xs text-[var(--text-secondary)] border-t border-[var(--border-subtle)]">
          Нет аккаунта?{' '}
          <Link href="/register" className="text-[var(--accent-primary)] hover:underline font-semibold ml-1">
            Зарегистрироваться
          </Link>
        </div>

        {/* Optional PWA install banner */}
        {!isStandalone && canInstall && (
          <button
            type="button"
            onClick={promptInstall}
            className="w-full py-2 px-3 rounded-xl bg-[var(--bg-surface-secondary)] hover:bg-[var(--bg-surface-hover)] border border-[var(--border-subtle)] text-xs text-[var(--accent-primary)] font-medium flex items-center justify-center gap-2 transition-colors"
          >
            <Download size={14} />
            <span>Установить приложение на устройство</span>
          </button>
        )}
      </div>
    </div>
  );
}
