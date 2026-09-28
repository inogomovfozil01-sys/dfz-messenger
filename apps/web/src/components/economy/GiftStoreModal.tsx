import React, { useState, useEffect, useMemo } from 'react';
import {
  Gift,
  Sparkles,
  Send,
  Shield,
  Search,
  ArrowUpDown,
  X,
  CheckCircle,
  Plus,
  Coins,
  ExternalLink,
} from 'lucide-react';
import { Modal } from '../ui/Modal';
import { useEconomyStore } from '../../stores/economyStore';
import { useAuthStore } from '../../stores/authStore';
import { GiftArtwork } from './GiftArtworks';
import { RecipientPicker, RecipientUser } from './RecipientPicker';
import { GiftDefinition } from '@dfz/types';
import { apiRequest } from '../../lib/api';

export const GiftStoreModal: React.FC = () => {
  const { user, profile } = useAuthStore();
  const {
    isGiftStoreOpen,
    setGiftStoreOpen,
    giftCatalog,
    fetchGiftCatalog,
    isLoadingCatalog,
    starBalance,
    isUnlimitedStars,
    sendGift,
    targetUserForGift,
    setStarsOpen,
  } = useEconomyStore();

  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'default' | 'asc' | 'desc'>('default');
  const [selectedGift, setSelectedGift] = useState<GiftDefinition | null>(null);
  const [selectedRecipient, setSelectedRecipient] = useState<RecipientUser | null>(null);
  const [giftMessage, setGiftMessage] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sendSuccess, setSendSuccess] = useState(false);

  useEffect(() => {
    if (isGiftStoreOpen) {
      fetchGiftCatalog(activeCategory);
      if (targetUserForGift) {
        setSelectedRecipient({
          id: targetUserForGift.id,
          username: targetUserForGift.username,
          displayName: targetUserForGift.displayName || targetUserForGift.username,
          avatarUrl: targetUserForGift.avatarUrl,
          isSelf: user ? targetUserForGift.id === user.id : false,
        });
      } else if (user && !selectedRecipient) {
        setSelectedRecipient({
          id: user.id,
          username: user.username,
          displayName: profile?.displayName || user.username,
          avatarUrl: profile?.avatarUrl,
          isSelf: true,
        });
      }
    }
  }, [isGiftStoreOpen, activeCategory, targetUserForGift, user]);

  const filteredCatalog = useMemo(() => {
    let list = [...giftCatalog];

    // Filter by search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (g) => g.name.toLowerCase().includes(q) || (g.description && g.description.toLowerCase().includes(q))
      );
    }

    // Sort by price
    if (sortOrder === 'asc') {
      list.sort((a, b) => a.priceStars - b.priceStars);
    } else if (sortOrder === 'desc') {
      list.sort((a, b) => b.priceStars - a.priceStars);
    }

    return list;
  }, [giftCatalog, searchQuery, sortOrder]);

  const handleSendGift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGift || !selectedRecipient) return;

    setIsSubmitting(true);

    const success = await sendGift(
      selectedRecipient.id,
      selectedGift.id,
      giftMessage.trim() || (selectedRecipient.isSelf ? 'В личную коллекцию' : undefined),
      selectedRecipient.isSelf ? false : isAnonymous
    );

    setIsSubmitting(false);
    if (success) {
      setSendSuccess(true);
      setTimeout(() => {
        setSendSuccess(false);
        setSelectedGift(null);
        setGiftMessage('');
        setGiftStoreOpen(false);
      }, 1200);
    }
  };

  const getRarityBadge = (rarity: string) => {
    switch (rarity) {
      case 'COMMON':
        return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
      case 'RARE':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'EPIC':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      case 'LEGENDARY':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'MYTHIC':
      default:
        return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
    }
  };

  if (!isGiftStoreOpen) return null;

  return (
    <Modal
      isOpen={isGiftStoreOpen}
      onClose={() => {
        setGiftStoreOpen(false);
        setSelectedGift(null);
      }}
      title="Магазин подарков DFZ"
      maxWidth="lg"
    >
      <div className="space-y-4">
        {/* Strict Telegram Top Header Bar */}
        <div className="flex items-center justify-between p-3.5 rounded-dfz-xl bg-[#212126] border border-[#292930] shadow-sm">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 font-bold">
              ★
            </div>
            <div>
              <span className="text-[11px] uppercase tracking-wider font-semibold text-dfz-text-muted">
                Ваш баланс
              </span>
              <div className="text-sm font-bold text-dfz-text font-mono flex items-center gap-1.5">
                <span className="text-amber-400">
                  {isUnlimitedStars ? '★ ∞ Stars' : `★ ${starBalance.toLocaleString()} Stars`}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={() => {
              setGiftStoreOpen(false);
              setStarsOpen(true, 'balance');
            }}
            className="py-1.5 px-3 rounded-dfz-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/25 text-amber-400 hover:text-amber-300 font-semibold text-xs transition-colors flex items-center gap-1.5"
          >
            <Plus size={13} />
            <span>Пополнить Stars</span>
          </button>
        </div>

        {/* Filter Tabs (Telegram Category Pills) */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5 text-xs font-semibold">
          {[
            { id: 'all', label: 'Все подарки' },
            { id: 'popular', label: 'Популярные' },
            { id: 'collectible', label: 'NFT & Уникальные' },
            { id: 'limited', label: 'Лимитированные' },
            { id: 'premium', label: 'Премиум' },
            { id: 'legendary', label: 'Легендарные' },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-3 py-1.5 rounded-dfz-lg whitespace-nowrap transition-colors border ${
                activeCategory === cat.id
                  ? 'bg-dfz-accent/15 border-dfz-accent/40 text-dfz-accent font-bold'
                  : 'bg-[#212126] border-[#292930] text-dfz-text-muted hover:text-dfz-text hover:bg-[#28282e]'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Search & Sort Controls */}
        <div className="flex items-center gap-2">
          <div className="flex-1 relative">
            <Search size={14} className="absolute left-3 top-2.5 text-dfz-text-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Поиск по названию подарка..."
              className="w-full h-8 pl-8 pr-3 rounded-dfz-lg bg-[#18181c] border border-[#292930] text-xs text-dfz-text placeholder:text-dfz-text-muted focus:outline-none focus:border-dfz-accent"
            />
          </div>

          <button
            onClick={() => {
              setSortOrder((prev) => (prev === 'default' ? 'asc' : prev === 'asc' ? 'desc' : 'default'));
            }}
            className="h-8 px-2.5 rounded-dfz-lg bg-[#212126] border border-[#292930] text-xs text-dfz-text-muted hover:text-dfz-text flex items-center gap-1 transition-colors"
            title="Сортировка по цене"
          >
            <ArrowUpDown size={13} />
            <span className="hidden sm:inline">
              {sortOrder === 'asc' ? 'Дешевле' : sortOrder === 'desc' ? 'Дороже' : 'По умолчанию'}
            </span>
          </button>
        </div>

        {/* Gift Grid (Strict Dark Telegram Grid) */}
        {isLoadingCatalog ? (
          <div className="p-16 text-center text-xs text-dfz-text-muted flex flex-col items-center gap-2">
            <div className="w-5 h-5 border-2 border-dfz-accent border-t-transparent rounded-full animate-spin" />
            <span>Загрузка каталога подарков...</span>
          </div>
        ) : filteredCatalog.length === 0 ? (
          <div className="p-12 text-center text-xs text-dfz-text-muted bg-[#212126] rounded-dfz-xl border border-[#292930]">
            Подарки не найдены по запросу "{searchQuery}".
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 max-h-[420px] overflow-y-auto pr-1">
            {filteredCatalog.map((gift) => (
              <div
                key={gift.id}
                onClick={() => setSelectedGift(gift)}
                className="p-3 rounded-dfz-xl bg-[#212126] hover:bg-[#28282e] border border-[#292930] hover:border-[#8774e1]/40 cursor-pointer transition-all duration-200 flex flex-col items-center text-center space-y-1.5 group relative"
              >
                {/* Rarity & NFT Badges */}
                <div className="w-full flex items-center justify-between text-[9px]">
                  <span className={`font-mono font-bold px-1.5 py-0.5 rounded border ${getRarityBadge(gift.rarity)}`}>
                    {gift.rarity}
                  </span>
                  {gift.isCollectibleEligible && (
                    <span className="font-mono font-bold px-1.5 py-0.5 rounded bg-[#8774e1]/15 text-[#8774e1] border border-[#8774e1]/30">
                      NFT
                    </span>
                  )}
                </div>

                {/* Central Artwork */}
                <div className="py-2 transition-transform duration-200 group-hover:scale-105">
                  <GiftArtwork artworkKey={gift.artwork} name={gift.name} rarity={gift.rarity} size={54} />
                </div>

                {/* Title & Description */}
                <div className="w-full min-w-0">
                  <h4 className="text-xs font-semibold text-dfz-text truncate">{gift.name}</h4>
                  {gift.isLimited && gift.totalSupply && (
                    <div className="text-[10px] text-dfz-text-muted mt-0.5">
                      Тираж: <span className="text-amber-400/90 font-mono font-bold">{gift.totalSupply} шт.</span>
                    </div>
                  )}
                </div>

                {/* Telegram-style Price Button */}
                <div className="w-full pt-1">
                  <button
                    type="button"
                    className="w-full py-1.5 px-2 rounded-dfz-lg bg-[#18181c] group-hover:bg-amber-500/15 border border-[#292930] group-hover:border-amber-500/30 text-amber-400 text-xs font-bold font-mono transition-colors flex items-center justify-center gap-1"
                  >
                    <span>★</span>
                    <span>{gift.priceStars.toLocaleString()}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Telegram-grade Send Gift Sheet */}
        {selectedGift && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
            <div className="w-full max-w-sm rounded-dfz-2xl bg-[#18181c] border border-[#292930] p-6 space-y-4 shadow-2xl text-xs relative">
              <div className="flex items-center justify-between border-b border-[#292930] pb-3">
                <span className="font-bold text-dfz-text text-sm">Отправить подарок</span>
                <button
                  onClick={() => setSelectedGift(null)}
                  className="p-1 rounded-dfz-md hover:bg-[#28282e] text-dfz-text-muted hover:text-dfz-text"
                >
                  <X size={16} />
                </button>
              </div>

              {sendSuccess ? (
                <div className="py-8 text-center space-y-3">
                  <CheckCircle size={44} className="mx-auto text-emerald-400 animate-bounce" />
                  <h4 className="text-sm font-bold text-dfz-text">
                    {selectedRecipient?.isSelf
                      ? 'Подарок добавлен в вашу коллекцию!'
                      : 'Подарок успешно отправлен!'}
                  </h4>
                  <p className="text-xs text-dfz-text-muted">
                    {selectedRecipient?.isSelf
                      ? 'Он уже отображается в вашем профиле в разделе подарков.'
                      : 'Пользователь получит уведомление в чате.'}
                  </p>
                </div>
              ) : (
                <>
                  {/* Selected Gift Highlight Card */}
                  <div className="flex items-center gap-3.5 p-3.5 rounded-dfz-xl bg-[#212126] border border-[#292930]">
                    <div className="p-2 rounded-dfz-lg bg-[#18181c] border border-[#292930]">
                      <GiftArtwork
                        artworkKey={selectedGift.artwork}
                        name={selectedGift.name}
                        rarity={selectedGift.rarity}
                        size={52}
                      />
                    </div>
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <h4 className="font-bold text-sm text-dfz-text truncate">{selectedGift.name}</h4>
                        <span className={`text-[9px] font-mono px-1 rounded border ${getRarityBadge(selectedGift.rarity)}`}>
                          {selectedGift.rarity}
                        </span>
                      </div>
                      <p className="text-[11px] text-dfz-text-muted line-clamp-1">{selectedGift.description}</p>
                      <div className="text-amber-400 font-bold font-mono text-xs flex items-center gap-1">
                        <span>★ {selectedGift.priceStars.toLocaleString()} Stars</span>
                        {selectedGift.isCollectibleEligible && (
                          <span className="text-[10px] text-[#8774e1] font-normal">• NFT-тираж</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <form onSubmit={handleSendGift} className="space-y-3.5">
                    <RecipientPicker
                      selectedRecipient={selectedRecipient}
                      onSelect={(rec) => setSelectedRecipient(rec)}
                      allowSelf={true}
                    />

                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <label className="font-semibold text-dfz-text">Пожелание</label>
                        <span className="text-[10px] text-dfz-text-muted">{giftMessage.length}/200</span>
                      </div>
                      <textarea
                        rows={2}
                        value={giftMessage}
                        onChange={(e) => setGiftMessage(e.target.value)}
                        placeholder={
                          selectedRecipient?.isSelf
                            ? 'Заметка для личной коллекции 🎁'
                            : 'С праздником! Пусть удача всегда будет рядом 🎁'
                        }
                        maxLength={200}
                        className="w-full px-3 py-2 rounded-dfz-lg bg-[#212126] border border-[#292930] text-dfz-text text-xs resize-none focus:outline-none focus:border-[#8774e1]"
                      />
                    </div>

                    {!selectedRecipient?.isSelf && (
                      <label className="flex items-center gap-2 cursor-pointer pt-1 select-none">
                        <input
                          type="checkbox"
                          checked={isAnonymous}
                          onChange={(e) => setIsAnonymous(e.target.checked)}
                          className="rounded border-[#292930] text-[#8774e1] focus:ring-0 bg-[#212126]"
                        />
                        <span className="text-dfz-text-muted text-[11px]">Отправить анонимно (скрыть имя в карточке)</span>
                      </label>
                    )}

                    {/* Insufficient balance warning */}
                    {!isUnlimitedStars && starBalance < selectedGift.priceStars && (
                      <div className="p-2.5 rounded-dfz-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px] flex items-center justify-between">
                        <span>Недостаточно Stars на балансе</span>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedGift(null);
                            setGiftStoreOpen(false);
                            setStarsOpen(true, 'balance');
                          }}
                          className="text-amber-400 font-bold hover:underline"
                        >
                          Пополнить
                        </button>
                      </div>
                    )}

                    <div className="pt-2 flex gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedGift(null)}
                        className="flex-1 py-2 rounded-dfz-lg bg-[#212126] hover:bg-[#28282e] border border-[#292930] text-dfz-text font-semibold transition-colors"
                      >
                        Отмена
                      </button>
                      <button
                        type="submit"
                        disabled={isSubmitting || !selectedRecipient || (!isUnlimitedStars && starBalance < selectedGift.priceStars)}
                        className="flex-1 py-2 rounded-dfz-lg bg-dfz-accent hover:bg-dfz-accent-hover text-white font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-sm"
                      >
                        <Send size={13} />
                        <span>
                          {isSubmitting
                            ? 'Отправка...'
                            : selectedRecipient?.isSelf
                            ? `Подарить себе за ★ ${selectedGift.priceStars.toLocaleString()}`
                            : `Подарить за ★ ${selectedGift.priceStars.toLocaleString()}`}
                        </span>
                      </button>
                    </div>
                  </form>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
