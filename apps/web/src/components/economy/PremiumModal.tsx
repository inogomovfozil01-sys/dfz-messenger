import React, { useState } from 'react';
import {
  Sparkles,
  Zap,
  Check,
  HardDrive,
  Pin,
  Smile,
  Shield,
  Gift,
  ArrowRight,
} from 'lucide-react';
import { Modal } from '../ui/Modal';
import { useEconomyStore } from '../../stores/economyStore';
import { useAuthStore } from '../../stores/authStore';
import { apiRequest } from '../../lib/api';

export const PremiumModal: React.FC = () => {
  const { user } = useAuthStore();
  const {
    isPremiumOpen,
    setPremiumOpen,
    starBalance,
    isUnlimitedStars,
    purchasePremium,
    giftPremium,
  } = useEconomyStore();

  const [selectedPlan, setSelectedPlan] = useState<'MONTHLY' | '3MONTH' | 'YEARLY'>('3MONTH');
  const [isGifting, setIsGifting] = useState(false);
  const [recipientUsername, setRecipientUsername] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const plans = [
    {
      id: 'MONTHLY',
      name: '1 месяц',
      price: 1000,
      badge: 'Базовый',
    },
    {
      id: '3MONTH',
      name: '3 месяца',
      price: 2500,
      badge: 'Популярный -17%',
      highlight: true,
    },
    {
      id: 'YEARLY',
      name: '1 год',
      price: 8000,
      badge: 'Выгода -33%',
    },
  ];

  const features = [
    {
      icon: <HardDrive size={16} className="text-cyan-400" />,
      title: 'Увеличенные файлы',
      desc: 'Загрузка медиа и файлов до 2 ГБ вместо стандартных 50 МБ',
    },
    {
      icon: <Pin size={16} className="text-purple-400" />,
      title: 'Высокие лимиты',
      desc: 'До 10 закрепленных чатов и неограниченное число папок',
    },
    {
      icon: <Sparkles size={16} className="text-amber-400" />,
      title: 'Значок профиля ◆',
      desc: 'Фирменный светящийся значок Premium рядом с вашим именем',
    },
    {
      icon: <Smile size={16} className="text-pink-400" />,
      title: 'Эксклюзивные стикеры и реакции',
      desc: 'Доступ ко всем премиум-пакам и уникальным эмодзи-реакциям',
    },
    {
      icon: <Zap size={16} className="text-emerald-400" />,
      title: 'HD качество медиа',
      desc: 'Трансляция видео и историй в оригинальном качестве без сжатия',
    },
  ];

  const handleAction = async () => {
    setIsSubmitting(true);
    if (isGifting) {
      if (!recipientUsername.trim()) {
        setIsSubmitting(false);
        return;
      }
      const cleanUser = recipientUsername.trim().replace(/^@/, '');
      const userRes = await apiRequest<any>(`/api/users/profile/${cleanUser}`);
      if (!userRes.success || !userRes.data) {
        setIsSubmitting(false);
        alert('Пользователь не найден');
        return;
      }
      const success = await giftPremium(userRes.data.id, selectedPlan);
      setIsSubmitting(false);
      if (success) {
        setIsGifting(false);
        setPremiumOpen(false);
      }
    } else {
      const success = await purchasePremium(selectedPlan);
      setIsSubmitting(false);
      if (success) {
        setPremiumOpen(false);
      }
    }
  };

  if (!isPremiumOpen) return null;

  const currentPlanObj = plans.find((p) => p.id === selectedPlan)!;

  return (
    <Modal
      isOpen={isPremiumOpen}
      onClose={() => {
        setPremiumOpen(false);
        setIsGifting(false);
      }}
      title="DFZ Premium"
      maxWidth="md"
    >
      <div className="space-y-5 text-dfz-text select-none">
        {/* Header Hero */}
        <div className="text-center space-y-1.5 p-4 rounded-dfz-2xl bg-gradient-to-br from-violet-600/20 via-cyan-600/10 to-transparent border border-cyan-500/20 relative overflow-hidden">
          <div className="w-12 h-12 mx-auto rounded-full bg-gradient-to-tr from-cyan-500 to-violet-500 flex items-center justify-center text-white text-xl font-bold shadow-lg shadow-cyan-500/20">
            ◆
          </div>
          <h3 className="text-lg font-extrabold tracking-tight">DFZ Premium</h3>
          <p className="text-xs text-dfz-text-muted">
            Unlock more from your messenger.
          </p>
        </div>

        {/* Feature List */}
        <div className="space-y-2.5">
          {features.map((feat, i) => (
            <div
              key={i}
              className="flex items-start gap-3 p-2.5 rounded-dfz-xl bg-dfz-surface border border-dfz-border/60"
            >
              <div className="p-1.5 rounded-dfz-lg bg-dfz-bg shrink-0 mt-0.5">
                {feat.icon}
              </div>
              <div className="space-y-0.5">
                <h4 className="text-xs font-bold text-dfz-text">{feat.title}</h4>
                <p className="text-[11px] text-dfz-text-muted leading-tight">
                  {feat.desc}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Subscription Plans */}
        <div className="space-y-2">
          <span className="text-xs font-bold text-dfz-text">Выберите тариф подписки:</span>
          <div className="grid grid-cols-3 gap-2">
            {plans.map((plan) => {
              const isSelected = selectedPlan === plan.id;
              return (
                <div
                  key={plan.id}
                  onClick={() => setSelectedPlan(plan.id as any)}
                  className={`p-3 rounded-dfz-xl border cursor-pointer text-center space-y-1 transition-all ${
                    isSelected
                      ? 'bg-gradient-to-b from-cyan-500/20 to-violet-500/20 border-cyan-400 shadow-md scale-102'
                      : 'bg-dfz-surface hover:bg-dfz-surface-hover border-dfz-border'
                  }`}
                >
                  <span className="text-[10px] font-bold text-cyan-400 block truncate">
                    {plan.badge}
                  </span>
                  <p className="text-xs font-bold text-dfz-text">{plan.name}</p>
                  <p className="text-xs font-mono font-extrabold text-amber-400">
                    ★ {plan.price.toLocaleString()}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Gifting Toggle */}
        <div className="flex items-center justify-between text-xs pt-1">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isGifting}
              onChange={(e) => setIsGifting(e.target.checked)}
              className="rounded border-dfz-border text-cyan-500 focus:ring-0"
            />
            <span className="font-semibold text-dfz-text">Подарить подписку другу 🎁</span>
          </label>
          <span className="font-mono text-amber-400 text-xs">
            Баланс: {isUnlimitedStars ? '★ ∞' : `★ ${starBalance.toLocaleString()}`}
          </span>
        </div>

        {isGifting && (
          <div className="space-y-1.5 animate-in fade-in duration-150">
            <label className="text-xs font-semibold text-dfz-text">Получатель (@username)</label>
            <input
              type="text"
              value={recipientUsername}
              onChange={(e) => setRecipientUsername(e.target.value)}
              placeholder="@alex"
              className="w-full px-3 py-2 rounded-dfz-lg bg-dfz-bg border border-dfz-border text-dfz-text text-xs focus:outline-none focus:border-cyan-500"
              required
            />
          </div>
        )}

        {/* Action Button */}
        <button
          onClick={handleAction}
          disabled={isSubmitting}
          className="w-full py-3 rounded-dfz-xl bg-gradient-to-r from-cyan-500 to-violet-600 hover:from-cyan-400 hover:to-violet-500 text-white font-extrabold text-xs transition-all shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <span>
            {isSubmitting
              ? 'Обработка...'
              : isGifting
              ? `Подарить за ★ ${currentPlanObj.price.toLocaleString()} Stars`
              : `Подключить за ★ ${currentPlanObj.price.toLocaleString()} Stars`}
          </span>
          <ArrowRight size={14} />
        </button>
      </div>
    </Modal>
  );
};
