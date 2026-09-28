'use client';

import React, { useState, useEffect } from 'react';
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
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Avatar } from '../ui/Avatar';
import { GiftArtwork } from './GiftArtworks';
import { useEconomyStore } from '../../stores/economyStore';
import { useAuthStore } from '../../stores/authStore';
import { apiRequest } from '../../lib/api';

export const PremiumModal: React.FC = () => {
  const { user, profile } = useAuthStore();
  const {
    isPremiumOpen,
    setPremiumOpen,
    starBalance,
    isUnlimitedStars,
    purchasePremium,
    giftPremium,
    premiumState,
    setStarsOpen,
    giftCatalog,
    fetchGiftCatalog,
    setSendGiftOpen,
    targetUserForGift,
  } = useEconomyStore();

  const [selectedPlan, setSelectedPlan] = useState<'MONTHLY' | '3MONTH' | 'YEARLY'>('3MONTH');
  const [isGifting, setIsGifting] = useState(false);
  const [recipientUsername, setRecipientUsername] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [giftFilter, setGiftFilter] = useState<'all' | 'nft'>('all');
  const [showAllFeatures, setShowAllFeatures] = useState(false);

  useEffect(() => {
    if (isPremiumOpen) {
      if (giftCatalog.length === 0) {
        fetchGiftCatalog();
      }
      if (targetUserForGift) {
        setIsGifting(true);
        setRecipientUsername(targetUserForGift.username);
      }
    }
  }, [isPremiumOpen, giftCatalog.length, fetchGiftCatalog, targetUserForGift]);

  if (!isPremiumOpen) return null;

  const isUserPremium = user?.isPremium || premiumState?.isPremium;

  const plans = [
    {
      id: 'MONTHLY' as const,
      months: 3,
      title: '3 месяца',
      priceUzs: '155 990,00 UZS',
      starPrice: 1000,
      badge: null,
      boxColor: 'from-emerald-500 to-teal-600',
      ribbonColor: '#10b981',
    },
    {
      id: '3MONTH' as const,
      months: 6,
      title: '6 месяцев',
      priceUzs: '209 990,00 UZS',
      starPrice: 1500,
      badge: '-32%',
      boxColor: 'from-blue-500 to-indigo-600',
      ribbonColor: '#3b82f6',
    },
    {
      id: 'YEARLY' as const,
      months: 12,
      title: '1 год',
      priceUzs: '379 990,00 UZS',
      starPrice: 2500,
      badge: '-39%',
      boxColor: 'from-purple-500 to-pink-600',
      ribbonColor: '#8774e1',
    },
  ];

  const currentPlan = plans.find((p) => p.id === selectedPlan) || plans[1];

  const features = [
    {
      icon: <Pin size={16} className="text-[#8774e1]" />,
      title: 'Удвоенные лимиты',
      desc: 'До 1 000 каналов, 30 папок, 10 закрепленных чатов, 4 аккаунта',
    },
    {
      icon: <HardDrive size={16} className="text-[#8774e1]" />,
      title: 'Файлы до 4 ГБ',
      desc: 'Отправляйте объемные видео, архивы и файлы любого типа без сжатия',
    },
    {
      icon: <Gauge size={16} className="text-[#8774e1]" />,
      title: 'Максимальная скорость скачивания',
      desc: 'Никаких искусственных ограничений скорости на загрузку медиа',
    },
    {
      icon: <Mic size={16} className="text-[#8774e1]" />,
      title: 'Распознавание речи',
      desc: 'Мгновенное преобразование голосовых сообщений и видеозаметок в текст',
    },
    {
      icon: <Star size={16} className="text-[#f5c542]" />,
      title: 'Значок подписчика ★',
      desc: 'Эксклюзивная звезда Telegram рядом с вашим именем в чатах и профиле',
    },
    {
      icon: <Smile size={16} className="text-[#8774e1]" />,
      title: 'Эксклюзивные стикеры и реакции',
      desc: 'Анимации на весь экран, уникальные паки и до 3 реакций на сообщение',
    },
    {
      icon: <ShieldCheck size={16} className="text-[#8774e1]" />,
      title: 'Защита от спама и блокировка ЛС',
      desc: 'Возможность запретить входящие звонки и сообщения от незнакомцев',
    },
    {
      icon: <Tag size={16} className="text-[#8774e1]" />,
      title: 'Эмодзи-статусы профиля',
      desc: 'Установка анимированных эмодзи в качестве статуса в профиле',
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

  const filteredGifts = giftCatalog
    .filter((g) => (giftFilter === 'nft' ? g.isCollectibleEligible : true))
    .slice(0, 6);

  const displayAvatar = targetUserForGift?.avatarUrl || profile?.avatarUrl;
  const displayName = targetUserForGift
    ? targetUserForGift.displayName || targetUserForGift.username
    : profile?.displayName || user?.username || 'пользователь';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-fade-in select-none">
      <div className="relative w-full max-w-lg max-h-[92vh] bg-[#18181c] border border-[#292930] rounded-dfz-2xl shadow-2xl flex flex-col overflow-hidden text-dfz-text">
        {/* Top Header with Close Button */}
        <div className="h-12 px-4 flex items-center justify-between border-b border-[#292930] bg-[#18181c] shrink-0">
          <button
            onClick={() => setPremiumOpen(false)}
            className="p-1.5 rounded-full hover:bg-[#28282e] text-dfz-text-muted hover:text-dfz-text transition-colors"
          >
            <X size={19} />
          </button>
          <span className="text-xs font-semibold text-dfz-text-muted">DFZ Premium</span>
          <div className="w-8" />
        </div>

        {/* Scrollable Modal Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Centered Avatar with Golden Sparkle Halo (Exact as Telegram Screenshot 3) */}
          <div className="flex flex-col items-center text-center relative pt-2">
            {/* Ambient Starburst Particles */}
            <div className="relative w-24 h-24 flex items-center justify-center">
              {/* Outer Golden Sparkles */}
              <div className="absolute inset-0 pointer-events-none">
                <span className="absolute -top-1 left-2 text-[#f5c542] text-sm animate-pulse">✦</span>
                <span className="absolute top-1 -right-1 text-[#f5c542] text-xs animate-ping">★</span>
                <span className="absolute -bottom-1 left-4 text-[#f5c542] text-xs">✦</span>
                <span className="absolute bottom-2 -right-2 text-[#f5c542] text-sm animate-pulse">★</span>
                <span className="absolute top-1/2 -left-3 text-[#f5c542] text-xs">✦</span>
                <span className="absolute top-1/3 -right-3 text-[#f5c542] text-xs">✦</span>
              </div>

              {/* Avatar */}
              <Avatar
                src={displayAvatar}
                name={displayName}
                size="xl"
                className="w-20 h-20 ring-4 ring-[#8774e1]/30 shadow-xl"
              />
            </div>

            <h2 className="text-lg font-bold text-dfz-text mt-3">
              {isGifting ? 'Подарить Premium' : 'DFZ Premium'}
            </h2>
            <p className="text-xs text-dfz-text-muted max-w-sm mt-1 leading-relaxed">
              С подпиской DFZ Premium {isGifting ? displayName : 'вы'} получите доступ к эксклюзивным функциям мессенджера.
            </p>

            {isUserPremium && !isGifting && (
              <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-[#8774e1]/15 border border-[#8774e1]/30 text-[#8774e1] font-semibold text-[11px]">
                <Check size={13} />
                <span>Ваша подписка активна</span>
              </div>
            )}
          </div>

          {/* Mode Switch: Оформить себе / Подарить другу */}
          <div className="grid grid-cols-2 gap-1 p-1 bg-[#0e0e10] rounded-dfz-xl border border-[#292930]">
            <button
              onClick={() => setIsGifting(false)}
              className={`py-2 text-xs font-semibold rounded-dfz-lg transition-all ${
                !isGifting
                  ? 'bg-[#212126] text-dfz-text shadow-sm'
                  : 'text-dfz-text-muted hover:text-dfz-text'
              }`}
            >
              Для себя
            </button>
            <button
              onClick={() => setIsGifting(true)}
              className={`py-2 text-xs font-semibold rounded-dfz-lg transition-all flex items-center justify-center gap-1.5 ${
                isGifting
                  ? 'bg-[#212126] text-dfz-text shadow-sm'
                  : 'text-dfz-text-muted hover:text-dfz-text'
              }`}
            >
              <Gift size={13} className="text-[#8774e1]" />
              <span>Подарить другу</span>
            </button>
          </div>

          {isGifting && (
            <div className="p-3.5 rounded-dfz-xl bg-[#212126] border border-[#292930] space-y-1.5 animate-fade-in">
              <label className="font-semibold text-dfz-text text-xs">Кому подарить (@username)</label>
              <input
                type="text"
                value={recipientUsername}
                onChange={(e) => setRecipientUsername(e.target.value)}
                placeholder="@username пользователя"
                className="w-full px-3 py-2 rounded-dfz-lg bg-[#18181c] border border-[#292930] text-dfz-text text-xs focus:outline-none focus:border-[#8774e1]"
                required
              />
            </div>
          )}

          {/* 3 Subscription Plan Cards (Exact Screenshot 3 layout) */}
          <div className="grid grid-cols-3 gap-2.5">
            {plans.map((p) => {
              const isSelected = selectedPlan === p.id;
              return (
                <div
                  key={p.id}
                  onClick={() => setSelectedPlan(p.id)}
                  className={`p-3 rounded-dfz-xl border cursor-pointer transition-all duration-200 text-center relative flex flex-col justify-between overflow-hidden ${
                    isSelected
                      ? 'bg-[#212126] border-[#8774e1] shadow-lg ring-1 ring-[#8774e1]'
                      : 'bg-[#212126] border-[#292930] hover:border-[#3a3a44]'
                  }`}
                >
                  {/* Diagonal Top-Right Discount Ribbon Badge */}
                  {p.badge && (
                    <div className="absolute top-2 right-2">
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#8774e1] text-white shadow-sm">
                        {p.badge}
                      </span>
                    </div>
                  )}

                  {/* 3D Gift Box Vector Artwork */}
                  <div className="py-2 flex justify-center">
                    <div className="w-12 h-12 relative flex items-center justify-center">
                      <div
                        className={`w-11 h-11 rounded-xl bg-gradient-to-br ${p.boxColor} shadow-md flex items-center justify-center transform transition-transform group-hover:scale-105`}
                      >
                        <Gift size={22} className="text-white drop-shadow" />
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-bold text-dfz-text text-xs">{p.title}</h4>
                    <p className="text-[10px] text-dfz-text-muted mt-0.5">Premium</p>

                    {/* Fiat Price Tag Chip */}
                    <div className="mt-2 py-1 px-2 rounded-dfz-md bg-[#18181c] border border-[#292930] text-[10px] font-mono text-[#8774e1] truncate font-semibold">
                      {p.priceUzs}
                    </div>

                    {/* Stars Price */}
                    <div className="mt-1.5 text-[11px] font-bold text-[#f5c542] font-mono">
                      или ★ {p.starPrice.toLocaleString()}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Section: Отправить подарок (Exact Screenshot 3 layout) */}
          <div className="space-y-3 pt-2 border-t border-[#292930]">
            <div className="text-center space-y-1">
              <h3 className="text-sm font-bold text-dfz-text">Отправить подарок</h3>
              <p className="text-[11px] text-dfz-text-muted">
                Дарите {displayName} подарки, которые можно хранить в профиле или обменять на звёзды.
              </p>
            </div>

            {/* Filter Pills */}
            <div className="flex justify-center gap-1.5">
              <button
                type="button"
                onClick={() => setGiftFilter('all')}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                  giftFilter === 'all'
                    ? 'bg-[#8774e1] text-white shadow-sm'
                    : 'bg-[#212126] text-dfz-text-muted hover:text-dfz-text border border-[#292930]'
                }`}
              >
                Все
              </button>
              <button
                type="button"
                onClick={() => setGiftFilter('nft')}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                  giftFilter === 'nft'
                    ? 'bg-[#8774e1] text-white shadow-sm'
                    : 'bg-[#212126] text-dfz-text-muted hover:text-dfz-text border border-[#292930]'
                }`}
              >
                Коллекционные
              </button>
            </div>

            {/* Gifts Preview Grid (Screenshot 3 style) */}
            <div className="grid grid-cols-3 gap-2">
              {filteredGifts.map((gift) => (
                <div
                  key={gift.id}
                  onClick={() => {
                    setPremiumOpen(false);
                    setSendGiftOpen(true, gift, targetUserForGift);
                  }}
                  className="p-2.5 rounded-dfz-xl bg-[#212126] hover:bg-[#28282e] border border-[#292930] hover:border-[#8774e1]/40 cursor-pointer transition-all flex flex-col items-center text-center space-y-1 group"
                >
                  <div className="w-12 h-12 flex items-center justify-center transition-transform group-hover:scale-110">
                    <GiftArtwork artworkKey={gift.artwork} name={gift.name} rarity={gift.rarity} size={44} />
                  </div>
                  <span className="text-[11px] font-semibold text-dfz-text truncate w-full">
                    {gift.name}
                  </span>
                  <div className="flex items-center gap-1 text-[11px] font-bold text-[#f5c542] font-mono">
                    <span>★</span>
                    <span>{gift.priceStars}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Telegram Premium Feature Matrix */}
          <div className="space-y-2 pt-2 border-t border-[#292930]">
            <button
              type="button"
              onClick={() => setShowAllFeatures(!showAllFeatures)}
              className="w-full flex items-center justify-between text-xs font-bold text-dfz-text hover:text-[#8774e1] transition-colors"
            >
              <span>Возможности DFZ Premium ({features.length})</span>
              {showAllFeatures ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>

            {showAllFeatures && (
              <div className="p-3 rounded-dfz-xl bg-[#212126] border border-[#292930] space-y-2.5 max-h-56 overflow-y-auto pr-1">
                {features.map((f, i) => (
                  <div key={i} className="flex items-start gap-2.5 py-1">
                    <div className="p-1.5 rounded-dfz-lg bg-[#18181c] border border-[#292930] shrink-0 mt-0.5">
                      {f.icon}
                    </div>
                    <div className="min-w-0">
                      <h5 className="font-semibold text-dfz-text text-xs">{f.title}</h5>
                      <p className="text-[11px] text-dfz-text-muted leading-tight">{f.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Bottom Sticky Action Bar */}
        <div className="p-4 border-t border-[#292930] bg-[#18181c] space-y-2 shrink-0">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 text-dfz-text-muted">
              <span>Ваш баланс:</span>
              <span className="text-[#f5c542] font-mono font-bold">
                {isUnlimitedStars ? '★ ∞ Stars' : `★ ${starBalance.toLocaleString()} Stars`}
              </span>
            </div>

            {!isUnlimitedStars && starBalance < currentPlan.starPrice && (
              <button
                type="button"
                onClick={() => {
                  setPremiumOpen(false);
                  setStarsOpen(true, 'buy');
                }}
                className="text-xs text-[#8774e1] hover:underline font-semibold"
              >
                Пополнить баланс Stars →
              </button>
            )}
          </div>

          <button
            onClick={handleAction}
            disabled={isSubmitting || (!isUnlimitedStars && starBalance < currentPlan.starPrice)}
            className="w-full h-11 rounded-dfz-xl bg-[#8774e1] hover:bg-[#7662d8] text-white font-bold text-xs transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <span>
              {isSubmitting
                ? 'Обработка...'
                : isGifting
                ? `Подарить DFZ Premium за ★ ${currentPlan.starPrice.toLocaleString()} Stars`
                : `Подключить DFZ Premium за ★ ${currentPlan.starPrice.toLocaleString()} Stars`}
            </span>
            <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};
