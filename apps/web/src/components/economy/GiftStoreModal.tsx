import React, { useState, useEffect } from 'react';
import { Gift, Sparkles, Send, Shield, Info, X } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { useEconomyStore } from '../../stores/economyStore';
import { GiftArtwork } from './GiftArtworks';
import { GiftDefinition } from '@dfz/types';
import { apiRequest } from '../../lib/api';

export const GiftStoreModal: React.FC = () => {
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
  } = useEconomyStore();

  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [selectedGift, setSelectedGift] = useState<GiftDefinition | null>(null);
  const [recipientUsername, setRecipientUsername] = useState('');
  const [giftMessage, setGiftMessage] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isGiftStoreOpen) {
      fetchGiftCatalog(activeCategory);
      if (targetUserForGift) {
        setRecipientUsername(targetUserForGift.username);
      }
    }
  }, [isGiftStoreOpen, activeCategory]);

  const handleSendGift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGift || !recipientUsername.trim()) return;

    setIsSubmitting(true);
    // Find recipient by username
    const cleanUser = recipientUsername.trim().replace(/^@/, '');
    const userRes = await apiRequest<any>(`/api/users/profile/${cleanUser}`);
    if (!userRes.success || !userRes.data) {
      setIsSubmitting(false);
      alert('Пользователь не найден. Проверьте @username.');
      return;
    }

    const success = await sendGift(
      userRes.data.id,
      selectedGift.id,
      giftMessage,
      isAnonymous
    );

    setIsSubmitting(false);
    if (success) {
      setSelectedGift(null);
      setGiftMessage('');
      setGiftStoreOpen(false);
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
        {/* Top Balance Strip */}
        <div className="flex items-center justify-between p-3 rounded-dfz-xl bg-dfz-surface border border-dfz-border text-xs">
          <div className="flex items-center gap-2">
            <Gift size={16} className="text-purple-400" />
            <span className="font-medium text-dfz-text">Выбирайте и дарите подарки друзьям</span>
          </div>
          <span className="font-mono font-bold text-amber-400">
            {isUnlimitedStars ? '★ ∞' : `★ ${starBalance.toLocaleString()} Stars`}
          </span>
        </div>

        {/* Category Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 text-xs font-semibold">
          {[
            { id: 'all', label: 'Все' },
            { id: 'popular', label: 'Популярные' },
            { id: 'premium', label: 'Премиум' },
            { id: 'limited', label: 'Лимитированные' },
            { id: 'collectible', label: 'Коллекционные' },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-3 py-1.5 rounded-dfz-lg whitespace-nowrap transition-colors ${
                activeCategory === cat.id
                  ? 'bg-purple-500/20 text-purple-300 font-bold border border-purple-500/30'
                  : 'text-dfz-text-muted hover:text-dfz-text hover:bg-dfz-surface'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Gift Grid */}
        {isLoadingCatalog ? (
          <div className="p-12 text-center text-xs text-dfz-text-muted">Загрузка каталога...</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-96 overflow-y-auto pr-1">
            {giftCatalog.map((gift) => (
              <div
                key={gift.id}
                onClick={() => setSelectedGift(gift)}
                className="p-3.5 rounded-dfz-2xl bg-dfz-surface hover:bg-dfz-surface-hover border border-dfz-border/80 hover:border-purple-500/40 cursor-pointer transition-all duration-200 flex flex-col items-center text-center space-y-2 group shadow-sm hover:shadow-md"
              >
                <div className="transition-transform group-hover:scale-110 duration-200">
                  <GiftArtwork name={gift.artwork} size={56} />
                </div>

                <div className="w-full min-w-0">
                  <h4 className="text-xs font-bold text-dfz-text truncate">{gift.name}</h4>
                  <div className="flex items-center justify-center gap-1 mt-1">
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${getRarityBadge(
                        gift.rarity
                      )}`}
                    >
                      {gift.rarity}
                    </span>
                    {gift.isLimited && (
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        Лимит
                      </span>
                    )}
                  </div>
                </div>

                {gift.isLimited && gift.totalSupply && (
                  <div className="w-full text-[10px] text-dfz-text-muted flex justify-between px-1">
                    <span>Осталось:</span>
                    <span className="font-mono text-amber-400 font-bold">
                      {Math.max(0, gift.totalSupply - gift.soldCount)} / {gift.totalSupply}
                    </span>
                  </div>
                )}

                <button
                  type="button"
                  className="w-full mt-1 py-1.5 px-2 rounded-dfz-xl bg-amber-500/15 group-hover:bg-amber-500 group-hover:text-black text-amber-400 text-xs font-bold font-mono transition-colors flex items-center justify-center gap-1"
                >
                  <span>★</span>
                  <span>{gift.priceStars.toLocaleString()}</span>
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Send Gift Dialog Sheet */}
        {selectedGift && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
            <div className="w-full max-w-sm rounded-dfz-2xl bg-dfz-surface border border-dfz-border p-5 space-y-4 shadow-2xl text-xs">
              <div className="flex items-center justify-between border-b border-dfz-border pb-3">
                <span className="font-bold text-dfz-text text-sm">Отправить подарок</span>
                <button
                  onClick={() => setSelectedGift(null)}
                  className="p-1 rounded-dfz-md hover:bg-dfz-surface-hover text-dfz-text-muted"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-dfz-xl bg-dfz-bg border border-dfz-border">
                <GiftArtwork name={selectedGift.artwork} size={48} />
                <div>
                  <h4 className="font-bold text-sm text-dfz-text">{selectedGift.name}</h4>
                  <span className="text-amber-400 font-bold font-mono">
                    ★ {selectedGift.priceStars.toLocaleString()} Stars
                  </span>
                </div>
              </div>

              <form onSubmit={handleSendGift} className="space-y-3">
                <div className="space-y-1">
                  <label className="font-semibold text-dfz-text">Кому (@username)</label>
                  <input
                    type="text"
                    value={recipientUsername}
                    onChange={(e) => setRecipientUsername(e.target.value)}
                    placeholder="@alex"
                    className="w-full px-3 py-2 rounded-dfz-lg bg-dfz-bg border border-dfz-border text-dfz-text text-xs focus:outline-none focus:border-purple-500"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-dfz-text">Пожелание (необязательно)</label>
                  <textarea
                    rows={2}
                    value={giftMessage}
                    onChange={(e) => setGiftMessage(e.target.value)}
                    placeholder="С праздником! 🎁"
                    maxLength={200}
                    className="w-full px-3 py-2 rounded-dfz-lg bg-dfz-bg border border-dfz-border text-dfz-text text-xs resize-none focus:outline-none focus:border-purple-500"
                  />
                </div>

                <label className="flex items-center gap-2 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={isAnonymous}
                    onChange={(e) => setIsAnonymous(e.target.checked)}
                    className="rounded border-dfz-border text-purple-600 focus:ring-0"
                  />
                  <span className="text-dfz-text-muted">Отправить анонимно (скрыть моё имя)</span>
                </label>

                <div className="pt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedGift(null)}
                    className="flex-1 py-2 rounded-dfz-xl bg-dfz-surface-hover text-dfz-text font-semibold hover:bg-dfz-border transition-colors"
                  >
                    Отмена
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 py-2 rounded-dfz-xl bg-purple-600 hover:bg-purple-500 text-white font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-md"
                  >
                    <Send size={13} />
                    <span>{isSubmitting ? 'Отправка...' : 'Отправить'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
