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

  return (
    <main className="dfz-auth-screen">
      <section className="dfz-auth-card">
        <div className="flex items-center gap-3 mb-9"><BrandMark size={40} /><div><p className="text-[15px] font-semibold">DFZ Messenger</p><p className="text-xs text-[var(--text-secondary)] mt-0.5">Private communication, simplified.</p></div></div>
        <h1 className="text-xl font-semibold tracking-tight mb-2">Рады видеть вас снова</h1>
        <p className="text-sm text-[var(--text-secondary)] mb-7">Войдите, чтобы продолжить общение.</p>
        {error && <div role="alert" className="flex gap-2 p-3 mb-4 rounded-lg bg-red-500/10 text-[var(--color-danger)] text-sm"><AlertCircle size={18} className="shrink-0" />{error}</div>}
          <form onSubmit={handleCredentialsSubmit} className="space-y-4">
            <div className="space-y-1">
              <label htmlFor="login-username" className="text-xs font-medium text-[var(--text-secondary)]">Имя пользователя или email</label>
              <div className="relative flex items-center">
                <User size={16} className="absolute left-3.5 text-[var(--text-tertiary)] pointer-events-none" />
                <input
                  type="text"
                  required
                  id="login-username" autoComplete="username"
                  value={usernameOrEmail}
                  onChange={(e) => setUsernameOrEmail(e.target.value)}
                  placeholder="Ваш логин или email"
                  className="w-full h-11 pl-10 pr-3.5 bg-[var(--bg-surface-secondary)] border border-[var(--border-subtle)] focus:border-[var(--accent-primary)] rounded-lg text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none transition-colors"
                />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label htmlFor="login-password" className="text-xs font-medium text-[var(--text-secondary)]">Пароль</label>
              </div>
              <div className="relative flex items-center">
                <Lock size={16} className="absolute left-3.5 text-[var(--text-tertiary)] pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  id="login-password" autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full h-11 pl-10 pr-10 bg-[var(--bg-surface-secondary)] border border-[var(--border-subtle)] focus:border-[var(--accent-primary)] rounded-lg text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none transition-colors"
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
              className="w-full h-11 mt-2 flex items-center justify-center gap-2 bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] text-white text-sm font-semibold rounded-lg transition-all  disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full inline-block animate-spin" />
              ) : (
                <>
                  <span>Войти</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

        <p className="text-[13px] text-[var(--text-secondary)] mt-6 text-center">Впервые в DFZ? <Link href="/register" className="text-[var(--accent-text)] font-medium hover:underline">Создать аккаунт</Link></p>
        {!isStandalone && canInstall && <button onClick={() => void promptInstall()} className="mt-6 w-full flex justify-center items-center gap-2 text-sm text-[var(--text-secondary)] py-2"><Download size={16} />Установить DFZ</button>}
      </section>
      <p className="text-xs text-[var(--text-tertiary)] mt-6">DFZ · Ваши разговоры. Ваше пространство.</p>
    </main>
  );
}
