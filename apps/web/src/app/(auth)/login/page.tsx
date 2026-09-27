'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ShieldCheck, ArrowRight, Lock, User } from 'lucide-react';
import { useAuthStore } from '../../../stores/authStore';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    setIsLoading(true);
    const res = await login({ usernameOrEmail, password });
    setIsLoading(false);
    if (res.success) {
      router.push('/');
    } else {
      setError(res.error || 'Неверный логин или пароль');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-dfz-bg text-dfz-text">
      <div className="w-full max-w-sm bg-dfz-surface border border-dfz-border rounded-dfz-xl p-8 shadow-dfz-dropdown space-y-6 animate-scale-in">
        {/* Logo & Header */}
        <div className="text-center space-y-1">
          <div className="w-12 h-12 bg-dfz-accent rounded-dfz-lg mx-auto flex items-center justify-center text-white shadow-dfz-md mb-3">
            <ShieldCheck size={26} />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-dfz-text">Вход в DFZ Messenger</h1>
          <p className="text-xs text-dfz-text-muted">Введите ваши учетные данные для доступа к чатам</p>
        </div>

        {error && (
          <div className="p-3 bg-dfz-danger/10 border border-dfz-danger/20 rounded-dfz-md text-xs text-dfz-danger">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-dfz-text-muted">Username или Email</label>
            <div className="relative">
              <User size={16} className="absolute left-3 top-2.5 text-dfz-text-muted" />
              <input
                type="text"
                required
                value={usernameOrEmail}
                onChange={(e) => setUsernameOrEmail(e.target.value)}
                placeholder="admin или alex_dev"
                className="w-full h-9 pl-9 pr-3 bg-dfz-bg border border-dfz-border rounded-dfz-lg text-xs text-dfz-text placeholder:text-dfz-text-muted focus:outline-none focus:border-dfz-border-focus"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-dfz-text-muted">Пароль</label>
            <div className="relative">
              <Lock size={16} className="absolute left-3 top-2.5 text-dfz-text-muted" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full h-9 pl-9 pr-3 bg-dfz-bg border border-dfz-border rounded-dfz-lg text-xs text-dfz-text placeholder:text-dfz-text-muted focus:outline-none focus:border-dfz-border-focus"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading || !usernameOrEmail || !password}
            className="w-full h-10 flex items-center justify-center gap-2 bg-dfz-accent hover:bg-dfz-accent-hover text-white text-xs font-semibold rounded-dfz-lg transition-colors shadow-dfz-sm disabled:opacity-50"
          >
            <span>{isLoading ? 'Вход...' : 'Войти'}</span>
            <ArrowRight size={14} />
          </button>
        </form>

        <div className="pt-2 text-center text-xs text-dfz-text-muted border-t border-dfz-border">
          Нет аккаунта?{' '}
          <Link href="/register" className="text-dfz-accent hover:underline font-semibold">
            Зарегистрироваться
          </Link>
        </div>
      </div>
    </div>
  );
}
