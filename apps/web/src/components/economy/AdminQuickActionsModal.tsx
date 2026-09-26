import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Shield,
  Star,
  Sparkles,
  Gift,
  ExternalLink,
  CheckCircle,
  AlertTriangle,
  X,
} from 'lucide-react';
import { Modal } from '../ui/Modal';
import { useEconomyStore } from '../../stores/economyStore';
import { apiRequest } from '../../lib/api';

interface AdminQuickActionsModalProps {
  userId?: string | null;
  onClose?: () => void;
}

export const AdminQuickActionsModal: React.FC<AdminQuickActionsModalProps> = ({
  userId: propUserId,
  onClose: propOnClose,
}) => {
  const {
    giftCatalog,
    fetchGiftCatalog,
    setToast,
    isAdminQuickActionOpen,
    adminTargetUserId,
    setAdminQuickActionOpen,
  } = useEconomyStore();

  const userId = propUserId !== undefined ? propUserId : adminTargetUserId;
  const isOpen = propUserId !== undefined ? !!propUserId : (isAdminQuickActionOpen && !!adminTargetUserId);
  const handleClose = () => {
    if (propOnClose) propOnClose();
    setAdminQuickActionOpen(false);
  };

  const [targetUser, setTargetUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'stars' | 'premium' | 'gift'>('stars');

  // Form states
  const [starsAmount, setStarsAmount] = useState('500');
  const [starsReason, setStarsReason] = useState('Contest reward');

  const [premiumDuration, setPremiumDuration] = useState<'1d' | '7d' | '30d' | '90d' | '1y' | 'lifetime'>('30d');
  const [premiumReason, setPremiumReason] = useState('Administrative Grant');

  const [selectedGiftId, setSelectedGiftId] = useState('');
  const [giftReason, setGiftReason] = useState('Administrative Award');

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (userId) {
      loadUser(userId);
      fetchGiftCatalog();
    }
  }, [userId]);

  const loadUser = async (id: string) => {
    const res = await apiRequest<any>(`/api/users/profile/${id}`);
    if (res.success && res.data) {
      setTargetUser(res.data);
    }
  };

  const handleGiveStars = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    setIsSubmitting(true);
    const res = await apiRequest('/api/economy/admin/stars/grant', {
      method: 'POST',
      body: JSON.stringify({
        targetUserId: userId,
        amount: parseInt(starsAmount, 10),
        reason: starsReason,
      }),
    });
    setIsSubmitting(false);
    if (res.success) {
      setToast({
        text: `★ ${starsAmount} Stars успешно начислены пользователю!`,
        type: 'star',
      });
      handleClose();
    } else {
      alert(res.error?.message || 'Ошибка начисления Stars');
    }
  };

  const handleGivePremium = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    setIsSubmitting(true);
    const res = await apiRequest('/api/economy/admin/premium/grant', {
      method: 'POST',
      body: JSON.stringify({
        targetUserId: userId,
        duration: premiumDuration,
        reason: premiumReason,
      }),
    });
    setIsSubmitting(false);
    if (res.success) {
      setToast({
        text: 'DFZ Premium успешно выдан пользователю!',
        type: 'success',
      });
      handleClose();
    } else {
      alert(res.error?.message || 'Ошибка выдачи Premium');
    }
  };

  const handleGiveGift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || !selectedGiftId) return;
    setIsSubmitting(true);
    const res = await apiRequest('/api/economy/admin/gifts/grant', {
      method: 'POST',
      body: JSON.stringify({
        targetUserId: userId,
        giftDefinitionId: selectedGiftId,
        message: giftReason,
      }),
    });
    setIsSubmitting(false);
    if (res.success) {
      setToast({
        text: 'Подарок успешно вручен пользователю от администрации!',
        type: 'success',
      });
      handleClose();
    } else {
      alert(res.error?.message || 'Ошибка вручения подарка');
    }
  };

  if (!isOpen || !userId) return null;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Действия администратора" maxWidth="md">
      <div className="space-y-4 text-xs select-none">
        {/* User Info Bar */}
        <div className="p-3 rounded-dfz-xl bg-dfz-surface border border-dfz-border flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-dfz-lg bg-dfz-accent/15 text-dfz-accent font-bold">
              <Shield size={16} />
            </div>
            <div>
              <h4 className="font-bold text-dfz-text">
                {targetUser?.displayName || targetUser?.username || 'Пользователь'}
              </h4>
              <p className="text-[11px] text-dfz-text-muted">@{targetUser?.username}</p>
            </div>
          </div>

          <Link
            href="/admin"
            onClick={handleClose}
            className="flex items-center gap-1 text-[11px] font-semibold text-dfz-accent hover:underline"
          >
            <span>В Admin Panel</span>
            <ExternalLink size={12} />
          </Link>
        </div>

        {/* Tab switch */}
        <div className="flex border-b border-dfz-border pb-1 gap-1">
          <button
            onClick={() => setActiveTab('stars')}
            className={`px-3 py-1.5 rounded-dfz-lg font-bold transition-colors ${
              activeTab === 'stars'
                ? 'bg-amber-500/20 text-amber-400'
                : 'text-dfz-text-muted hover:text-dfz-text'
            }`}
          >
            ★ Начислить Stars
          </button>
          <button
            onClick={() => setActiveTab('premium')}
            className={`px-3 py-1.5 rounded-dfz-lg font-bold transition-colors ${
              activeTab === 'premium'
                ? 'bg-cyan-500/20 text-cyan-400'
                : 'text-dfz-text-muted hover:text-dfz-text'
            }`}
          >
            ◆ Выдать Premium
          </button>
          <button
            onClick={() => setActiveTab('gift')}
            className={`px-3 py-1.5 rounded-dfz-lg font-bold transition-colors ${
              activeTab === 'gift'
                ? 'bg-purple-500/20 text-purple-400'
                : 'text-dfz-text-muted hover:text-dfz-text'
            }`}
          >
            🎁 Подарок
          </button>
        </div>

        {/* Form 1: Stars */}
        {activeTab === 'stars' && (
          <form onSubmit={handleGiveStars} className="space-y-3">
            <div className="space-y-1">
              <label className="font-semibold text-dfz-text">Количество Stars</label>
              <input
                type="number"
                min="1"
                value={starsAmount}
                onChange={(e) => setStarsAmount(e.target.value)}
                className="w-full px-3 py-2 rounded-dfz-lg bg-dfz-bg border border-dfz-border text-dfz-text font-mono font-bold"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="font-semibold text-dfz-text">Причина начисления (для аудита)</label>
              <input
                type="text"
                value={starsReason}
                onChange={(e) => setStarsReason(e.target.value)}
                className="w-full px-3 py-2 rounded-dfz-lg bg-dfz-bg border border-dfz-border text-dfz-text"
                required
              />
            </div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 rounded-dfz-xl bg-amber-500 hover:bg-amber-400 text-black font-bold"
            >
              {isSubmitting ? 'Начисление...' : `Начислить ★ ${starsAmount} Stars`}
            </button>
          </form>
        )}

        {/* Form 2: Premium */}
        {activeTab === 'premium' && (
          <form onSubmit={handleGivePremium} className="space-y-3">
            <div className="space-y-1">
              <label className="font-semibold text-dfz-text">Срок действия Premium</label>
              <select
                value={premiumDuration}
                onChange={(e) => setPremiumDuration(e.target.value as any)}
                className="w-full px-3 py-2 rounded-dfz-lg bg-dfz-bg border border-dfz-border text-dfz-text font-medium"
              >
                <option value="1d">1 день (тест)</option>
                <option value="7d">7 дней (1 неделя)</option>
                <option value="30d">30 дней (1 месяц)</option>
                <option value="90d">90 дней (3 месяца)</option>
                <option value="1y">1 год</option>
                <option value="lifetime">Бессрочно (Lifetime)</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="font-semibold text-dfz-text">Основание / Причина</label>
              <input
                type="text"
                value={premiumReason}
                onChange={(e) => setPremiumReason(e.target.value)}
                className="w-full px-3 py-2 rounded-dfz-lg bg-dfz-bg border border-dfz-border text-dfz-text"
                required
              />
            </div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 rounded-dfz-xl bg-gradient-to-r from-cyan-500 to-violet-600 text-white font-bold"
            >
              {isSubmitting ? 'Выдача...' : 'Выдать DFZ Premium'}
            </button>
          </form>
        )}

        {/* Form 3: Gift */}
        {activeTab === 'gift' && (
          <form onSubmit={handleGiveGift} className="space-y-3">
            <div className="space-y-1">
              <label className="font-semibold text-dfz-text">Выберите подарок из каталога</label>
              <select
                value={selectedGiftId}
                onChange={(e) => setSelectedGiftId(e.target.value)}
                className="w-full px-3 py-2 rounded-dfz-lg bg-dfz-bg border border-dfz-border text-dfz-text font-medium"
                required
              >
                <option value="">-- Выбрать подарок --</option>
                {giftCatalog.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name} ({g.rarity}, {g.priceStars} Stars)
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="font-semibold text-dfz-text">Поздравительное сообщение</label>
              <input
                type="text"
                value={giftReason}
                onChange={(e) => setGiftReason(e.target.value)}
                className="w-full px-3 py-2 rounded-dfz-lg bg-dfz-bg border border-dfz-border text-dfz-text"
                required
              />
            </div>
            <button
              type="submit"
              disabled={isSubmitting || !selectedGiftId}
              className="w-full py-2.5 rounded-dfz-xl bg-purple-600 hover:bg-purple-500 text-white font-bold disabled:opacity-50"
            >
              {isSubmitting ? 'Вручение...' : 'Вручить подарок от администрации'}
            </button>
          </form>
        )}
      </div>
    </Modal>
  );
};
