'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, Lock, User, Eye, EyeOff, AlertCircle, Download } from 'lucide-react';
import { BrandMark } from '../../../components/ui/BrandMark';
import { useAuthStore } from '../../../stores/authStore';
import { usePwaInstall } from '../../../hooks/usePwaInstall';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuthStore();
  const { isStandalone, canInstall, promptInstall } = usePwaInstall();

  const [isLoading, setIsLoading] = useState(false);
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
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

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-[var(--bg-main)] text-[var(--text-primary)] select-none">
      {/* Telegram Centered Auth Card */}
      <div className="w-full max-w-[400px] bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl p-7 sm:p-8 shadow-2xl space-y-6 relative overflow-hidden animate-scale-in">
        {/* Subtle Top Glow */}
        <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-48 h-48 bg-[var(--accent-primary)]/15 rounded-full blur-3xl pointer-events-none" />

        {/* Brand Header */}
        <div className="text-center space-y-2 relative">
          <div className="relative w-16 h-16 mx-auto mb-2">
            <BrandMark className="w-16 h-16 shadow-lg shadow-[var(--accent-primary)]/20 rounded-2xl mx-auto" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-[var(--text-primary)]">Вход в DFZ Messenger</h1>
          <p className="text-xs text-[var(--text-secondary)]">Введите ваши данные для входа в аккаунт</p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/25 rounded-xl text-xs text-red-400 flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Username or Email */}
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
                placeholder="admin или alex_dev"
                className="w-full h-11 pl-10 pr-3.5 bg-[var(--bg-surface-secondary)] border border-[var(--border-subtle)] focus:border-[var(--accent-primary)] rounded-xl text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none transition-colors"
              />
            </div>
          </div>

          {/* Password */}
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

          {/* Submit Button */}
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
