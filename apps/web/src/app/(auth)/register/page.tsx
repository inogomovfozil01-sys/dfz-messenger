'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ShieldCheck, ArrowRight, Lock, User, Mail, Check, AlertCircle } from 'lucide-react';
import { useAuthStore } from '../../../stores/authStore';
import { apiRequest } from '../../../lib/api';

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');

  // Realtime username check
  const [usernameStatus, setUsernameStatus] = useState<{
    checking: boolean;
    available?: boolean;
    message?: string;
  }>({ checking: false });

  useEffect(() => {
    if (!username.trim() || username.length < 3) {
      setUsernameStatus({ checking: false });
      return;
    }

    const timer = setTimeout(async () => {
      setUsernameStatus({ checking: true });
      const res = await apiRequest<{ available: boolean; message: string }>(
        `/api/users/check-username/${username.trim().toLowerCase()}`
      );
      if (res.success && res.data) {
        setUsernameStatus({
          checking: false,
          available: res.data.available,
          message: res.data.message,
        });
      } else {
        setUsernameStatus({ checking: false });
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [username]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (usernameStatus.available === false) return;
    setError('');

    setIsLoading(true);
    const res = await register({
      username: username.trim().toLowerCase(),
      password,
      email: email.trim() || undefined,
    });

    setIsLoading(false);
    if (res.success) {
      router.push('/onboarding');
    } else {
      setError(res.error || 'Ошибка при регистрации');
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
          <h1 className="text-xl font-bold tracking-tight text-dfz-text">Регистрация</h1>
          <p className="text-xs text-dfz-text-muted">Создайте аккаунт в новом поколении мессенджера</p>
        </div>

        {error && (
          <div className="p-3 bg-dfz-danger/10 border border-dfz-danger/20 rounded-dfz-md text-xs text-dfz-danger">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Username with Realtime Validation */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-dfz-text-muted">Username</label>
            <div className="relative">
              <User size={16} className="absolute left-3 top-2.5 text-dfz-text-muted" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                placeholder="никнейм (например: alex_99)"
                className="w-full h-9 pl-9 pr-9 bg-dfz-bg border border-dfz-border rounded-dfz-lg text-xs text-dfz-text placeholder:text-dfz-text-muted focus:outline-none focus:border-dfz-border-focus"
              />
              {/* Validation icon */}
              <div className="absolute right-3 top-2.5">
                {usernameStatus.checking ? (
                  <span className="w-4 h-4 border-2 border-dfz-accent border-t-transparent rounded-full inline-block animate-spin" />
                ) : usernameStatus.available === true ? (
                  <Check size={16} className="text-dfz-success" />
                ) : usernameStatus.available === false ? (
                  <AlertCircle size={16} className="text-dfz-danger" />
                ) : null}
              </div>
            </div>
            {usernameStatus.message && (
              <p
                className={`text-[11px] ${
                  usernameStatus.available ? 'text-dfz-success' : 'text-dfz-danger'
                }`}
              >
                {usernameStatus.message}
              </p>
            )}
          </div>

          {/* Email */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-dfz-text-muted">
              Email <span className="opacity-60 font-normal">(необязательно)</span>
            </label>
            <div className="relative">
              <Mail size={16} className="absolute left-3 top-2.5 text-dfz-text-muted" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full h-9 pl-9 pr-3 bg-dfz-bg border border-dfz-border rounded-dfz-lg text-xs text-dfz-text placeholder:text-dfz-text-muted focus:outline-none focus:border-dfz-border-focus"
              />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-dfz-text-muted">Пароль</label>
            <div className="relative">
              <Lock size={16} className="absolute left-3 top-2.5 text-dfz-text-muted" />
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Минимум 6 символов"
                className="w-full h-9 pl-9 pr-3 bg-dfz-bg border border-dfz-border rounded-dfz-lg text-xs text-dfz-text placeholder:text-dfz-text-muted focus:outline-none focus:border-dfz-border-focus"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={
              isLoading ||
              !username ||
              !password ||
              usernameStatus.available === false ||
              usernameStatus.checking
            }
            className="w-full h-10 flex items-center justify-center gap-2 bg-dfz-accent hover:bg-dfz-accent-hover text-white text-xs font-semibold rounded-dfz-lg transition-colors shadow-dfz-sm disabled:opacity-50"
          >
            <span>{isLoading ? 'Регистрация...' : 'Продолжить'}</span>
            <ArrowRight size={14} />
          </button>
        </form>

        <div className="pt-2 text-center text-xs text-dfz-text-muted border-t border-dfz-border">
          Уже есть аккаунт?{' '}
          <Link href="/login" className="text-dfz-accent hover:underline font-semibold">
            Войти
          </Link>
        </div>
      </div>
    </div>
  );
}
