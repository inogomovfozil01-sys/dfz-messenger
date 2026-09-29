'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, Lock, User, Mail, Check, AlertCircle, Eye, EyeOff, Smartphone, Download } from 'lucide-react';
import { BrandMark } from '../../../components/ui/BrandMark';
import { useAuthStore } from '../../../stores/authStore';
import { apiRequest } from '../../../lib/api';
import { usePwaInstall } from '../../../hooks/usePwaInstall';

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuthStore();
  const { isStandalone, canInstall, promptInstall } = usePwaInstall();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Realtime username check
  const [usernameStatus, setUsernameStatus] = useState<{
    checking: boolean;
    available?: boolean;
    message?: string;
  }>({ checking: false });

  useEffect(() => {
    const clean = username.trim().toLowerCase();
    if (!clean || clean.length < 3) {
      setUsernameStatus({ checking: false });
      return;
    }

    let active = true;
    setUsernameStatus({ checking: true });
    const timer = setTimeout(async () => {
      try {
        const res = await apiRequest<{ available: boolean; message: string }>(
          `/api/users/check-username/${clean}`
        );
        if (!active) return;
        if (res.success && res.data) {
          setUsernameStatus({
            checking: false,
            available: res.data.available,
            message: res.data.message,
          });
        } else {
          setUsernameStatus({ checking: false });
        }
      } catch {
        if (active) setUsernameStatus({ checking: false });
      }
    }, 350);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [username]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUsername = username.trim().toLowerCase();

    if (!cleanUsername || cleanUsername.length < 3) {
      setError('Имя пользователя должно содержать не менее 3 символов');
      return;
    }

    if (!password || password.length < 6) {
      setError('Пароль должен быть не менее 6 символов');
      return;
    }

    if (usernameStatus.available === false) {
      setError(usernameStatus.message || 'Это имя пользователя уже занято');
      return;
    }

    setError('');
    setIsLoading(true);

    try {
      const res = await register({
        username: cleanUsername,
        password,
        displayName: displayName.trim() || undefined,
        email: email.trim() || undefined,
      });

      setIsLoading(false);
      if (res.success) {
        router.push('/');
      } else {
        setError(res.error || 'Ошибка при регистрации. Попробуйте еще раз.');
      }
    } catch (err: any) {
      setIsLoading(false);
      setError(err?.message || 'Ошибка подключения к серверу');
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-[var(--bg-main)] text-[var(--text-primary)] select-none">
      {/* DFZ Centered Auth Card */}
      <div className="w-full max-w-[400px] bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl p-7 sm:p-8 shadow-2xl space-y-6 relative overflow-hidden animate-scale-in">
        {/* Subtle Top Glow */}
        <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-48 h-48 bg-[var(--accent-primary)]/15 rounded-full blur-3xl pointer-events-none" />

        {/* Brand Header */}
        <div className="text-center space-y-2 relative">
          <div className="relative w-16 h-16 mx-auto mb-2">
            <BrandMark className="w-16 h-16 shadow-lg shadow-[var(--accent-primary)]/20 rounded-2xl mx-auto" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-[var(--text-primary)]">Регистрация в DFZ Messenger</h1>
          <p className="text-xs text-[var(--text-secondary)]">Создайте аккаунт DFZ</p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/25 rounded-xl text-xs text-red-400 flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Username */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-[var(--text-secondary)]">
              Имя пользователя (username) <span className="text-[var(--accent-primary)]">*</span>
            </label>
            <div className="relative flex items-center">
              <span className="absolute left-3.5 text-sm font-semibold text-[var(--text-tertiary)] pointer-events-none">
                @
              </span>
              <input
                type="text"
                required
                minLength={3}
                maxLength={32}
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                placeholder="username (например: alex_99)"
                className="w-full h-11 pl-8 pr-10 bg-[var(--bg-surface-secondary)] border border-[var(--border-subtle)] focus:border-[var(--accent-primary)] rounded-xl text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none transition-colors"
              />
              <div className="absolute right-3.5">
                {usernameStatus.checking ? (
                  <span className="w-4 h-4 border-2 border-[var(--accent-primary)] border-t-transparent rounded-full inline-block animate-spin" />
                ) : usernameStatus.available === true ? (
                  <Check size={16} className="text-emerald-400" />
                ) : usernameStatus.available === false ? (
                  <AlertCircle size={16} className="text-red-400" />
                ) : null}
              </div>
            </div>
            {usernameStatus.message && (
              <p
                className={`text-[11px] px-1 ${
                  usernameStatus.available ? 'text-emerald-400' : 'text-red-400'
                }`}
              >
                {usernameStatus.message}
              </p>
            )}
          </div>

          {/* Display Name */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-[var(--text-secondary)]">
              Отображаемое имя <span className="text-[var(--text-tertiary)]">(необязательно)</span>
            </label>
            <div className="relative flex items-center">
              <User size={16} className="absolute left-3.5 text-[var(--text-tertiary)] pointer-events-none" />
              <input
                type="text"
                maxLength={64}
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Как вас зовут (например: Александр)"
                className="w-full h-11 pl-10 pr-3.5 bg-[var(--bg-surface-secondary)] border border-[var(--border-subtle)] focus:border-[var(--accent-primary)] rounded-xl text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none transition-colors"
              />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-[var(--text-secondary)]">
              Пароль <span className="text-[var(--accent-primary)]">*</span>
            </label>
            <div className="relative flex items-center">
              <Lock size={16} className="absolute left-3.5 text-[var(--text-tertiary)] pointer-events-none" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Минимум 6 символов"
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

          {/* Email (Optional) */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-[var(--text-secondary)]">
              Email <span className="text-[var(--text-tertiary)]">(необязательно)</span>
            </label>
            <div className="relative flex items-center">
              <Mail size={16} className="absolute left-3.5 text-[var(--text-tertiary)] pointer-events-none" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full h-11 pl-10 pr-3.5 bg-[var(--bg-surface-secondary)] border border-[var(--border-subtle)] focus:border-[var(--accent-primary)] rounded-xl text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none transition-colors"
              />
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading || !username || !password || username.length < 3 || password.length < 6}
            className="w-full h-11 mt-2 flex items-center justify-center gap-2 bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] text-white text-sm font-semibold rounded-xl transition-all shadow-md active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full inline-block animate-spin" />
            ) : (
              <>
                <span>ЗАРЕГИСТРИРОВАТЬСЯ</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        {/* Link to Login */}
        <div className="pt-2 text-center text-xs text-[var(--text-secondary)] border-t border-[var(--border-subtle)]">
          Уже зарегистрированы?{' '}
          <Link href="/login" className="text-[var(--accent-primary)] hover:underline font-semibold ml-1">
            Войти
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
