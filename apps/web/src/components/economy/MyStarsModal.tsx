import React, { useState, useEffect } from 'react';
import {
  Star,
  Send,
  Sparkles,
  History,
  Gift,
  Clock,
  ArrowUpRight,
  ArrowDownLeft,
  Shield,
  Eye,
  EyeOff,
  CheckCircle,
  X,
  CreditCard,
  Plus,
  Zap,
} from 'lucide-react';
import { Modal } from '../ui/Modal';
import { useEconomyStore } from '../../stores/economyStore';
import { useAuthStore } from '../../stores/authStore';
import { GiftArtwork } from './GiftArtworks';
import { RecipientPicker, RecipientUser } from './RecipientPicker';
import { apiRequest } from '../../lib/api';

export const MyStarsModal: React.FC = () => {
  const { user } = useAuthStore();
  const {
    starBalance,
    isUnlimitedStars,
    isMyStarsOpen,
    setStarsOpen,
    activeStarsTab,
    activityState,
    transactions,
    isLoadingTransactions,
    historyFilter,
    fetchTransactions,
    fetchBalance,
    fetchActivityState,
    topupStars,
    transferStars,
    myGifts,
    fetchMyGifts,
    setGiftStoreOpen,
    setPremiumOpen,
  } = useEconomyStore();

  const [activeTab, setActiveTab] = useState<'buy' | 'send' | 'history' | 'gifts' | 'earn'>('buy');
  const [selectedRecipient, setSelectedRecipient] = useState<RecipientUser | null>(null);
  const [transferAmount, setTransferAmount] = useState('100');
  const [transferMessage, setTransferMessage] = useState('');
  const [isSubmittingTransfer, setIsSubmittingTransfer] = useState(false);
  const [purchasingTier, setPurchasingTier] = useState<string | null>(null);

  useEffect(() => {
    if (isMyStarsOpen) {
      if (activeStarsTab === 'send') setActiveTab('send');
      else if (activeStarsTab === 'gifts') setActiveTab('gifts');
      else if (activeStarsTab === 'history') setActiveTab('history');
      else if (activeStarsTab === 'earn') setActiveTab('earn');
      else setActiveTab('buy');

      const target = useEconomyStore.getState().targetUserForStars;
      if (target) {
        setSelectedRecipient({
          id: target.id,
          username: target.username,
          displayName: target.displayName || target.username,
          avatarUrl: target.avatarUrl,
          isSelf: false,
        });
      }
      fetchBalance();
      fetchActivityState();
      fetchTransactions(historyFilter);
      fetchMyGifts();
    }
  }, [isMyStarsOpen, activeStarsTab]);

  const starPackages = [
    { id: 'tier_50', amount: 50, label: '50 Stars', popular: false },
    { id: 'tier_100', amount: 100, label: '100 Stars', popular: false },
    { id: 'tier_250', amount: 250, label: '250 Stars', popular: false },
    { id: 'tier_500', amount: 500, label: '500 Stars', popular: false },
    { id: 'tier_1000', amount: 1000, label: '1,000 Stars', popular: true },
    { id: 'tier_2500', amount: 2500, label: '2,500 Stars', popular: false },
    { id: 'tier_5000', amount: 5000, label: '5,000 Stars', popular: false },
    { id: 'tier_10000', amount: 10000, label: '10,000 Stars', popular: false },
  ];

  const handleBuyStars = async (pkg: { id: string; amount: number }) => {
    setPurchasingTier(pkg.id);
    await topupStars(pkg.amount, pkg.id);
    setPurchasingTier(null);
  };

  const handleSendStars = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseInt(transferAmount, 10);
    if (!selectedRecipient || isNaN(amount) || amount <= 0) return;

    setIsSubmittingTransfer(true);
    const success = await transferStars(selectedRecipient.id, amount, transferMessage);
    setIsSubmittingTransfer(false);
    if (success) {
      setSelectedRecipient(null);
      setTransferMessage('');
      setActiveTab('history');
    }
  };

  const handleToggleGiftVisibility = async (giftId: string, currentShow: boolean) => {
    await apiRequest(`/api/economy/gifts/${giftId}/visibility`, {
      method: 'POST',
      body: JSON.stringify({ show: !currentShow }),
    });
    fetchMyGifts();
  };

  if (!isMyStarsOpen) return null;

  return (
    <Modal
      isOpen={isMyStarsOpen}
      onClose={() => setStarsOpen(false)}
      title="DFZ Stars"
      maxWidth="lg"
    >
      <div className="space-y-4">
        {/* Strict Telegram Stars Balance Hero Card */}
        <div className="p-5 rounded-dfz-2xl bg-[#212126] border border-[#292930] relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wider font-semibold text-dfz-text-muted flex items-center gap-1.5">
              <span className="text-amber-400 font-bold">★</span>
              <span>Баланс кошелька Stars</span>
            </span>
            {isUnlimitedStars && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/10 text-amber-300 border border-amber-500/25">
                ADMIN UNLIMITED
              </span>
            )}
          </div>

          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-extrabold text-amber-400 font-mono tracking-tight">
              {isUnlimitedStars ? '★ ∞' : `★ ${starBalance.toLocaleString()}`}
            </span>
            <span className="text-xs text-dfz-text-muted font-medium">Stars</span>
          </div>

          <p className="mt-1 text-xs text-dfz-text-muted">
            DFZ Stars — официальная цифровая валюта платформы для покупки подарков, подписки Premium и переводов.
          </p>

          {/* Quick Shortcuts */}
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={() => setActiveTab('buy')}
              className={`py-1.5 px-3 rounded-dfz-lg text-xs font-semibold transition-colors flex items-center gap-1.5 border ${
                activeTab === 'buy'
                  ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                  : 'bg-[#18181c] border-[#292930] text-dfz-text hover:bg-[#28282e]'
              }`}
            >
              <Plus size={13} className="text-amber-400" />
              <span>Пополнить</span>
            </button>

            <button
              onClick={() => setActiveTab('send')}
              className={`py-1.5 px-3 rounded-dfz-lg text-xs font-semibold transition-colors flex items-center gap-1.5 border ${
                activeTab === 'send'
                  ? 'bg-[#8774e1]/20 border-[#8774e1]/40 text-[#8774e1]'
                  : 'bg-[#18181c] border-[#292930] text-dfz-text hover:bg-[#28282e]'
              }`}
            >
              <Send size={13} />
              <span>Перевести</span>
            </button>

            <button
              onClick={() => {
                setStarsOpen(false);
                setGiftStoreOpen(true);
              }}
              className="py-1.5 px-3 rounded-dfz-lg bg-[#18181c] border border-[#292930] hover:bg-[#28282e] text-dfz-text font-medium text-xs transition-colors flex items-center gap-1.5"
            >
              <Gift size={13} className="text-purple-400" />
              <span>100 Подарков</span>
            </button>

            <button
              onClick={() => {
                setStarsOpen(false);
                setPremiumOpen(true);
              }}
              className="py-1.5 px-3 rounded-dfz-lg bg-[#18181c] border border-[#292930] hover:bg-[#28282e] text-[#8774e1] font-medium text-xs transition-colors flex items-center gap-1.5"
            >
              <span>DFZ Premium</span>
              <span className="text-[10px]">◆</span>
            </button>
          </div>
        </div>

        {/* Telegram Tab Navigation */}
        <div className="flex items-center gap-1 border-b border-[#292930] pb-1 text-xs font-semibold overflow-x-auto no-scrollbar">
          {[
            { id: 'buy', label: 'Пополнение' },
            { id: 'send', label: 'Перевод' },
            { id: 'history', label: 'История операций' },
            { id: 'gifts', label: `Инвентарь (${myGifts.length})` },
            { id: 'earn', label: 'Награды за активность' },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              className={`px-3 py-1.5 rounded-dfz-lg transition-colors whitespace-nowrap ${
                activeTab === t.id
                  ? 'bg-[#212126] text-amber-400 border border-[#292930]'
                  : 'text-dfz-text-muted hover:text-dfz-text hover:bg-[#212126]/50'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab Content 1: Buy Stars (Telegram Stars Packages) */}
        {activeTab === 'buy' && (
          <div className="space-y-3">
            <div className="text-xs text-dfz-text-muted flex items-center justify-between">
              <span>Выберите пакет DFZ Stars для моментального зачисления:</span>
              <span className="text-emerald-400 text-[11px] flex items-center gap-1">
                <CheckCircle size={12} />
                Мгновенное пополнение
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {starPackages.map((pkg) => (
                <div
                  key={pkg.id}
                  onClick={() => !purchasingTier && handleBuyStars(pkg)}
                  className={`p-3.5 rounded-dfz-xl border text-center space-y-2 cursor-pointer transition-all duration-200 relative ${
                    pkg.popular
                      ? 'bg-[#212126] border-amber-500/40 hover:border-amber-400 shadow-sm'
                      : 'bg-[#212126] border-[#292930] hover:border-[#8774e1]/40'
                  }`}
                >
                  {pkg.popular && (
                    <span className="absolute -top-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-500 text-black">
                      Хит
                    </span>
                  )}

                  <div className="w-10 h-10 mx-auto rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 font-bold text-lg">
                    ★
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-dfz-text font-mono">+{pkg.amount.toLocaleString()}</h4>
                    <p className="text-[10px] text-dfz-text-muted">DFZ Stars</p>
                  </div>

                  <button
                    type="button"
                    disabled={purchasingTier === pkg.id}
                    className="w-full py-1.5 px-2 rounded-dfz-lg bg-[#18181c] hover:bg-amber-500 hover:text-black border border-[#292930] text-amber-400 text-xs font-semibold transition-colors disabled:opacity-50"
                  >
                    {purchasingTier === pkg.id ? 'Зачисление...' : 'Пополнить'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab Content 2: Send Stars */}
        {activeTab === 'send' && (
          <form onSubmit={handleSendStars} className="space-y-3.5 bg-[#212126] p-4 rounded-dfz-xl border border-[#292930]">
            <RecipientPicker
              selectedRecipient={selectedRecipient}
              onSelect={(rec) => setSelectedRecipient(rec)}
              allowSelf={false}
            />

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-dfz-text">Количество Stars</label>
              <div className="grid grid-cols-5 gap-1.5">
                {['50', '100', '250', '500', '1000'].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setTransferAmount(preset)}
                    className={`py-1.5 rounded-dfz-lg border text-xs font-mono font-bold transition-colors ${
                      transferAmount === preset
                        ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                        : 'bg-[#18181c] border-[#292930] text-dfz-text hover:bg-[#28282e]'
                    }`}
                  >
                    ★ {preset}
                  </button>
                ))}
              </div>
              <input
                type="number"
                min="1"
                max="100000"
                value={transferAmount}
                onChange={(e) => setTransferAmount(e.target.value)}
                className="w-full mt-1.5 px-3 py-2 rounded-dfz-lg bg-[#18181c] border border-[#292930] text-dfz-text font-mono text-xs focus:outline-none focus:border-[#8774e1]"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-dfz-text">Сообщение к переводу</label>
              <input
                type="text"
                value={transferMessage}
                onChange={(e) => setTransferMessage(e.target.value)}
                placeholder="За отличную работу!"
                maxLength={100}
                className="w-full px-3 py-2 rounded-dfz-lg bg-[#18181c] border border-[#292930] text-dfz-text text-xs focus:outline-none focus:border-[#8774e1]"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmittingTransfer || !selectedRecipient || (!isUnlimitedStars && starBalance < parseInt(transferAmount || '0', 10))}
              className="w-full py-2.5 rounded-dfz-lg bg-[#8774e1] hover:bg-[#7662d8] text-white text-xs font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-sm"
            >
              <Send size={13} />
              <span>{isSubmittingTransfer ? 'Отправка...' : `Перевести ★ ${transferAmount} Stars`}</span>
            </button>
          </form>
        )}

        {/* Tab Content 3: Transaction History */}
        {activeTab === 'history' && (
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {isLoadingTransactions ? (
              <div className="p-8 text-center text-xs text-dfz-text-muted">Загрузка операций...</div>
            ) : transactions.length === 0 ? (
              <div className="p-8 text-center text-xs text-dfz-text-muted bg-[#212126] rounded-dfz-xl border border-[#292930]">
                Операций со Stars пока нет.
              </div>
            ) : (
              transactions.map((tx) => (
                <div
                  key={tx.id}
                  className="p-3 rounded-dfz-xl bg-[#212126] border border-[#292930] flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                        tx.amount > 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                      }`}
                    >
                      {tx.amount > 0 ? <ArrowDownLeft size={14} /> : <ArrowUpRight size={14} />}
                    </div>
                    <div>
                      <h4 className="font-semibold text-dfz-text">{tx.reason || tx.type}</h4>
                      <p className="text-[10px] text-dfz-text-muted">
                        {new Date(tx.createdAt).toLocaleString('ru-RU')}
                      </p>
                    </div>
                  </div>

                  <span
                    className={`font-mono font-bold ${
                      tx.amount > 0 ? 'text-emerald-400' : 'text-dfz-text'
                    }`}
                  >
                    {tx.amount > 0 ? `+${tx.amount.toLocaleString()}` : tx.amount.toLocaleString()} ★
                  </span>
                </div>
              ))
            )}
          </div>
        )}

        {/* Tab Content 4: Inventory & Gifts */}
        {activeTab === 'gifts' && (
          <div className="space-y-2.5">
            {myGifts.length === 0 ? (
              <div className="p-10 text-center text-xs text-dfz-text-muted bg-[#212126] rounded-dfz-xl border border-[#292930] space-y-2">
                <Gift size={28} className="mx-auto text-dfz-text-muted opacity-60" />
                <p>У вас пока нет подарков.</p>
                <button
                  onClick={() => {
                    setStarsOpen(false);
                    setGiftStoreOpen(true);
                  }}
                  className="px-3 py-1.5 rounded-dfz-lg bg-[#8774e1] text-white font-semibold text-xs"
                >
                  Перейти в каталог 100 подарков
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-72 overflow-y-auto pr-1">
                {myGifts.map((inst) => (
                  <div
                    key={inst.id}
                    className="p-3 rounded-dfz-xl bg-[#212126] border border-[#292930] flex flex-col items-center text-center space-y-1.5"
                  >
                    <GiftArtwork
                      artworkKey={inst.giftDefinition.artwork}
                      name={inst.giftDefinition.name}
                      rarity={inst.giftDefinition.rarity}
                      size={48}
                    />
                    <h5 className="font-bold text-xs text-dfz-text truncate w-full">{inst.giftDefinition.name}</h5>
                    <p className="text-[10px] text-dfz-text-muted">
                      {inst.isAnonymous ? 'Анонимно' : inst.sender ? `От @${inst.sender.username}` : 'Подарок'}
                    </p>

                    <button
                      onClick={() => handleToggleGiftVisibility(inst.id, inst.showOnProfile)}
                      className="mt-1 text-[10px] text-dfz-text-muted hover:text-dfz-text flex items-center gap-1"
                    >
                      {inst.showOnProfile ? <Eye size={12} className="text-emerald-400" /> : <EyeOff size={12} />}
                      <span>{inst.showOnProfile ? 'В профиле' : 'Скрыт'}</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab Content 5: Activity Rewards */}
        {activeTab === 'earn' && (
          <div className="p-4 rounded-dfz-xl bg-[#212126] border border-[#292930] space-y-3 text-xs">
            <div className="flex items-center gap-2">
              <Clock size={16} className="text-emerald-400" />
              <h4 className="font-bold text-dfz-text">Автоматические награды за активность</h4>
            </div>
            <p className="text-dfz-text-muted text-[11px]">
              За каждый час непрерывной активности в DFZ Messenger система автоматически начисляет вам ★ Stars на баланс.
            </p>
            <div className="p-3 rounded-dfz-lg bg-[#18181c] border border-[#292930] flex items-center justify-between font-mono">
              <span className="text-dfz-text-muted">Текущая непрерывная сессия:</span>
              <span className="text-emerald-400 font-bold">
                {activityState ? `${Math.floor(activityState.continuousActiveSeconds / 60)} мин.` : '0 мин.'}
              </span>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
