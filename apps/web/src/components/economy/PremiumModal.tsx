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
  Gauge,
  Mic,
  ShieldCheck,
  Tag,
  Star,
  X,
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
    premiumState,
    setStarsOpen,
  } = useEconomyStore();

  const [selectedPlan, setSelectedPlan] = useState<'MONTHLY' | '3MONTH' | 'YEARLY'>('YEARLY');
  const [isGifting, setIsGifting] = useState(false);
  const [recipientUsername, setRecipientUsername] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const plans = [
    {
      id: 'YEARLY' as const,
      name: '12 месяцев',
      periodLabel: 'Годовая подписка',
      price: 8000,
      monthlyPrice: '667 ★/мес',
      badge: 'Выгода 40%',
      highlight: true,
    },
    {
      id: '3MONTH' as const,
      name: '6 месяцев',
      periodLabel: 'Полугодовая подписка',
      price: 4500,
      monthlyPrice: '750 ★/мес',
      badge: 'Выгода 25%',
      highlight: false,
    },
    {
      id: 'MONTHLY' as const,
      name: '1 месяц',
      periodLabel: 'Ежемесячная подписка',
      price: 1000,
      monthlyPrice: '1 000 ★/мес',
      badge: 'Стандарт',
      highlight: false,
    },
  ];

  const features = [
    {
      icon: <Pin size={16} className="text-cyan-400" />,
      title: 'Удвоенные лимиты',
      desc: 'До 10 закреплений, до 1 000 каналов и 20 папок для идеального порядка в чатах',
    },
    {
      icon: <HardDrive size={16} className="text-blue-400" />,
      title: 'Файлы до 4 ГБ',
      desc: 'Передавайте объемные архивы, исходники видео в 4K и базы данных без сжатия',
    },
    {
      icon: <Gauge size={16} className="text-emerald-400" />,
      title: 'Максимальная скорость скачивания',
      desc: 'Загружайте любые медиафайлы без искусственного ограничения пропускной способности',
    },
    {
      icon: <Mic size={16} className="text-purple-400" />,
      title: 'Расшифровка аудио и видео',
      desc: 'Преобразование голосовых сообщений и видеозаметок в текст в один клик',
    },
    {
      icon: <Sparkles size={16} className="text-amber-400" />,
      title: 'Значок DFZ Premium ◆',
      desc: 'Престижный фирменный значок в профиле и рядом с именем во всех беседах',
    },
    {
      icon: <Smile size={16} className="text-pink-400" />,
      title: 'Эксклюзивные стикеры и реакции',
      desc: 'Доступ ко всем премиум-пакам и уникальным анимированным эмодзи',
    },
    {
      icon: <ShieldCheck size={16} className="text-indigo-400" />,
      title: 'Защита от спама и блокировка ЛС',
      desc: 'Возможность запретить входящие сообщения и звонки от незнакомых пользователей',
    },
    {
      icon: <Tag size={16} className="text-rose-400" />,
      title: 'Кастомные статусы профиля',
      desc: 'Установка анимированных эмодзи-статусов, отражающих ваш текущий статус',
    },
  ];

  const currentPlanObj = plans.find((p) => p.id === selectedPlan) || plans[0];

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
        alert('Пользователь не найден. Проверьте @username.');
        return;
      }
      const success = await giftPremium(userRes.data.id, selectedPlan);
      setIsSubmitting(false);
      if (success) {
        setRecipientUsername('');
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

  const isUserPremium = user?.isPremium || premiumState?.isPremium;

  return (
    <Modal
      isOpen={isPremiumOpen}
      onClose={() => setPremiumOpen(false)}
      title="DFZ Premium"
      maxWidth="md"
    >
      <div className="space-y-4 text-xs">
        {/* Telegram Premium Hero Banner */}
        <div className="p-6 rounded-dfz-2xl bg-[#151d26] border border-[#26323e] text-center space-y-3 relative overflow-hidden">
          {/* Subtle Background Glow */}
          <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-48 h-48 bg-gradient-to-br from-cyan-500/20 via-purple-500/15 to-transparent rounded-full blur-2xl pointer-events-none" />

          {/* Premium Metallic Star Emblem */}
          <div className="relative w-16 h-16 mx-auto flex items-center justify-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/20 rotate-3">
              <span className="text-white text-3xl font-extrabold -rotate-3">◆</span>
            </div>
          </div>

          <div className="space-y-1 relative">
            <h3 className="text-lg font-bold text-dfz-text tracking-tight">DFZ Messenger Premium</h3>
            <p className="text-dfz-text-muted text-xs max-w-sm mx-auto">
              Максимальные возможности, расширенная безопасность, поддержка разработчиков и эксклюзивный статус.
            </p>
          </div>

          {isUserPremium && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/25 text-cyan-400 font-semibold text-[11px]">
              <Check size={13} />
              <span>Ваша подписка активна</span>
            </div>
          )}
        </div>

        {/* Action Mode Toggle */}
        <div className="grid grid-cols-2 gap-1.5 p-1 bg-[#0e141b] rounded-dfz-xl border border-[#26323e]">
          <button
            onClick={() => setIsGifting(false)}
            className={`py-1.5 rounded-dfz-lg font-semibold transition-colors ${
              !isGifting ? 'bg-[#151d26] text-dfz-text shadow-sm' : 'text-dfz-text-muted hover:text-dfz-text'
            }`}
          >
            Оформить себе
          </button>
          <button
            onClick={() => setIsGifting(true)}
            className={`py-1.5 rounded-dfz-lg font-semibold transition-colors flex items-center justify-center gap-1.5 ${
              isGifting ? 'bg-[#151d26] text-dfz-text shadow-sm' : 'text-dfz-text-muted hover:text-dfz-text'
            }`}
          >
            <Gift size={13} className="text-purple-400" />
            <span>Подарить другу</span>
          </button>
        </div>

        {isGifting && (
          <div className="p-3.5 rounded-dfz-xl bg-[#151d26] border border-[#26323e] space-y-1.5 animate-in fade-in duration-150">
            <label className="font-semibold text-dfz-text text-xs">Кому подарить (@username)</label>
            <input
              type="text"
              value={recipientUsername}
              onChange={(e) => setRecipientUsername(e.target.value)}
              placeholder="@alex_dev или username"
              className="w-full px-3 py-2 rounded-dfz-lg bg-[#0e141b] border border-[#26323e] text-dfz-text text-xs focus:outline-none focus:border-dfz-accent"
              required
            />
          </div>
        )}

        {/* Telegram Subscription Tiers */}
        <div className="grid grid-cols-3 gap-2">
          {plans.map((p) => (
            <div
              key={p.id}
              onClick={() => setSelectedPlan(p.id)}
              className={`p-3 rounded-dfz-xl border cursor-pointer transition-all duration-200 text-center relative flex flex-col justify-between ${
                selectedPlan === p.id
                  ? 'bg-[#151d26] border-cyan-500/60 shadow-sm ring-1 ring-cyan-500/30'
                  : 'bg-[#151d26] border-[#26323e] hover:border-[#384858]'
              }`}
            >
              {p.highlight && (
                <span className="absolute -top-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full text-[9px] font-bold bg-cyan-500 text-black">
                  {p.badge}
                </span>
              )}

              <div>
                <h4 className="font-bold text-dfz-text text-xs">{p.name}</h4>
                <div className="mt-1 text-sm font-extrabold text-amber-400 font-mono">
                  ★ {p.price.toLocaleString()}
                </div>
              </div>

              <div className="mt-2 pt-2 border-t border-[#26323e] text-[10px] text-dfz-text-muted">
                {p.monthlyPrice}
              </div>
            </div>
          ))}
        </div>

        {/* Telegram Feature Matrix */}
        <div className="p-3.5 rounded-dfz-xl bg-[#151d26] border border-[#26323e] space-y-2.5 max-h-48 overflow-y-auto pr-1">
          {features.map((f, i) => (
            <div key={i} className="flex items-start gap-2.5 py-1">
              <div className="p-1.5 rounded-dfz-lg bg-[#0e141b] border border-[#26323e] shrink-0 mt-0.5">
                {f.icon}
              </div>
              <div className="min-w-0">
                <h5 className="font-semibold text-dfz-text text-xs">{f.title}</h5>
                <p className="text-[11px] text-dfz-text-muted leading-tight">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Stars Balance Check & Checkout Action */}
        <div className="p-3.5 rounded-dfz-xl bg-[#0e141b] border border-[#26323e] flex items-center justify-between">
          <div>
            <span className="text-[11px] text-dfz-text-muted">Ваш баланс:</span>
            <div className="text-amber-400 font-mono font-bold text-xs">
              {isUnlimitedStars ? '★ ∞ Stars' : `★ ${starBalance.toLocaleString()} Stars`}
            </div>
          </div>

          {!isUnlimitedStars && starBalance < currentPlanObj.price && (
            <button
              onClick={() => {
                setPremiumOpen(false);
                setStarsOpen(true, 'buy');
              }}
              className="text-xs text-cyan-400 hover:underline font-semibold"
            >
              Пополнить баланс Stars →
            </button>
          )}
        </div>

        <button
          onClick={handleAction}
          disabled={isSubmitting || (!isUnlimitedStars && starBalance < currentPlanObj.price)}
          className="w-full py-3 rounded-dfz-xl bg-gradient-to-r from-cyan-600 via-blue-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 text-white font-bold text-xs transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <span>
            {isSubmitting
              ? 'Обработка...'
              : isGifting
              ? `Подарить DFZ Premium за ★ ${currentPlanObj.price.toLocaleString()} Stars`
              : `Подключить DFZ Premium за ★ ${currentPlanObj.price.toLocaleString()} Stars`}
          </span>
          <ArrowRight size={14} />
        </button>
      </div>
    </Modal>
  );
};
