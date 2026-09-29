import React, { useState } from 'react';
import { X, UserPlus, Lock, User, AlertCircle, ArrowRight } from 'lucide-react';
import { apiRequest } from '../../lib/api';
import { useAuthStore } from '../../stores/authStore';

interface AddAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccountAdded?: () => void;
}

export const AddAccountModal: React.FC<AddAccountModalProps> = ({
  isOpen,
  onClose,
  onAccountAdded,
}) => {
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const { checkAuth } = useAuthStore();

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usernameOrEmail.trim() || !password) return;

    setError('');
    setIsLoading(true);

    try {
      const res = await apiRequest<any>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ usernameOrEmail: usernameOrEmail.trim(), password }),
      });

      if (res.success && res.data?.user) {
        // Save current user to multi accounts list
        const newUser = res.data.user;
        const stored = JSON.parse(localStorage.getItem('dfz_multi_accounts') || '[]');
        const updated = [
          ...stored.filter((a: any) => a.id !== newUser.id),
          {
            id: newUser.id,
            username: newUser.username,
            displayName: newUser.profile?.displayName || newUser.username,
            avatarUrl: newUser.profile?.avatarUrl,
          },
        ];
        localStorage.setItem('dfz_multi_accounts', JSON.stringify(updated));

        await checkAuth();
        if (onAccountAdded) onAccountAdded();
        onClose();
        window.location.reload();
      } else {
        setError(res.error?.message || 'Неверный логин или пароль');
      }
    } catch (err: any) {
      setError(err?.message || 'Ошибка входа');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 select-none animate-fade-in">
      <div className="relative w-full max-w-sm bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl shadow-2xl p-6 overflow-hidden">
        <div className="flex items-center justify-between pb-4 border-b border-[var(--border-subtle)] mb-4">
          <div className="flex items-center gap-2">
            <UserPlus size={18} className="text-[var(--accent-primary)]" />
            <h3 className="text-sm font-bold text-[var(--text-primary)]">Добавить аккаунт</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-full text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)]"
          >
            <X size={18} />
          </button>
        </div>

        {error && (
          <div className="p-2.5 mb-3 bg-red-500/10 border border-red-500/25 rounded-xl text-xs text-red-400 flex items-center gap-2">
            <AlertCircle size={15} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          <div>
            <label className="font-semibold text-[var(--text-secondary)] block mb-1">
              Username или Email
            </label>
            <div className="relative flex items-center">
              <User size={15} className="absolute left-3 text-[var(--text-tertiary)] pointer-events-none" />
              <input
                type="text"
                required
                value={usernameOrEmail}
                onChange={(e) => setUsernameOrEmail(e.target.value)}
                placeholder="Логин нового аккаунта"
                className="w-full h-10 pl-9 pr-3 bg-[var(--bg-surface-secondary)] border border-[var(--border-subtle)] focus:border-[var(--accent-primary)] rounded-xl text-xs text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="font-semibold text-[var(--text-secondary)] block mb-1">Пароль</label>
            <div className="relative flex items-center">
              <Lock size={15} className="absolute left-3 text-[var(--text-tertiary)] pointer-events-none" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full h-10 pl-9 pr-3 bg-[var(--bg-surface-secondary)] border border-[var(--border-subtle)] focus:border-[var(--accent-primary)] rounded-xl text-xs text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading || !usernameOrEmail.trim() || !password}
            className="w-full h-10 mt-3 flex items-center justify-center gap-2 bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] text-white text-xs font-bold rounded-xl transition-all shadow-md disabled:opacity-50"
          >
            {isLoading ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span>Войти и подключить</span>
                <ArrowRight size={14} />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
