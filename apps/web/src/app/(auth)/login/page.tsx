'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { BrandMark } from '../../../components/ui/BrandMark';
import { useRouter } from 'next/navigation';
import { ArrowRight, Lock, User, CheckCircle, Smartphone } from 'lucide-react';
import { useAuthStore } from '../../../stores/authStore';
import { usePwaInstall } from '../../../hooks/usePwaInstall';
import { PwaInstallGate } from '../../../components/pwa/PwaInstallGate';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuthStore();
  const { isStandalone, isBypassed, bypassPwa } = usePwaInstall();

  const [isLoading, setIsLoading] = useState(false);
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  // If NOT in standalone PWA and NOT explicitly bypassed for browser testing:
  if (!isStandalone && !isBypassed) {
    return (
      <PwaInstallGate
        title="Вход в DFZ Messenger"
        description="Для защиты ваших данных и стабильной работы мессенджера вход осуществляется через PWA-клиент."
        onBypass={() => bypassPwa()}
      />
    );
  }

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
          <BrandMark className="w-14 h-14 mx-auto mb-3 shadow-dfz-md" />

          {/* PWA Mode Badge */}
          {isStandalone ? (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-mono font-semibold mb-2">
              <CheckCircle size={11} />
              <span>DFZ PWA CLIENT • ЗАЩИЩЕННАЯ СРЕДА</span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-mono font-semibold mb-2">
              <Smartphone size={11} />
              <span>WEB BROWSER SESSION</span>
            </div>
          )}

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
