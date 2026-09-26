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
  ShieldCheck,
  Eye,
  EyeOff,
  CheckCircle,
  X,
  RefreshCw,
} from 'lucide-react';
import { Modal } from '../ui/Modal';
import { useEconomyStore } from '../../stores/economyStore';
import { useAuthStore } from '../../stores/authStore';
import { GiftArtwork } from './GiftArtworks';
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
    transferStars,
    myGifts,
    fetchMyGifts,
    setSendStarsOpen,
    setGiftStoreOpen,
    setPremiumOpen,
  } = useEconomyStore();

  const [activeTab, setActiveTab] = useState<'balance' | 'earn' | 'send' | 'history' | 'gifts'>('balance');
  const [recipientQuery, setRecipientQuery] = useState('');
  const [transferAmount, setTransferAmount] = useState('100');
  const [transferMessage, setTransferMessage] = useState('');
  const [isSubmittingTransfer, setIsSubmittingTransfer] = useState(false);
  const [selectedTx, setSelectedTx] = useState<any>(null);

  useEffect(() => {
    if (isMyStarsOpen) {
      setActiveTab(activeStarsTab || 'balance');
      const target = useEconomyStore.getState().targetUserForStars;
      if (target) {
        setRecipientQuery(target.username ? `@${target.username}` : '');
      }
      fetchBalance();
      fetchActivityState();
      fetchTransactions(historyFilter);
      fetchMyGifts();
    }
  }, [isMyStarsOpen, activeStarsTab]);

  const handleSendStars = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseInt(transferAmount, 10);
    if (!recipientQuery.trim() || isNaN(amount) || amount <= 0) return;

    setIsSubmittingTransfer(true);
    // Find recipient by username
    const searchRes = await apiRequest<any>(`/api/users/profile/${recipientQuery.trim().replace(/^@/, '')}`);
    if (!searchRes.success || !searchRes.data) {
      setIsSubmittingTransfer(false);
      alert('Пользователь не найден. Укажите точный @username');
      return;
    }

    const success = await transferStars(
      searchRes.data.id,
      amount,
      transferMessage
    );
    setIsSubmittingTransfer(false);
    if (success) {
      setRecipientQuery('');
      setTransferMessage('');
      setActiveTab('history');
    }
  };

  const formatRemaining = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
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
      <div className="space-y-5">
        {/* Balance Hero Card */}
        <div className="p-5 rounded-dfz-2xl bg-dfz-surface-secondary border border-dfz-border shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wider font-semibold text-dfz-text-muted flex items-center gap-1.5">
              <Star size={13} className="text-amber-400 fill-amber-400" />
              <span>Баланс кошелька DFZ Stars</span>
            </span>
            {isUnlimitedStars && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                Административный безлимит
              </span>
            )}
          </div>

          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-extrabold text-amber-300 font-mono tracking-tight">
              {isUnlimitedStars ? '★ ∞' : `★ ${starBalance.toLocaleString()}`}
            </span>
            <span className="text-xs text-amber-400/80 font-medium">Stars</span>
          </div>

          <p className="mt-1 text-xs text-dfz-text-muted">
            Внутренняя валюта DFZ Messenger для поощрений, подарков и подписки DFZ Premium.
          </p>

          {/* Quick Actions Bar */}
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={() => setActiveTab('send')}
              className="py-1.5 px-3 rounded-dfz-lg bg-dfz-accent hover:bg-dfz-accent-hover text-white font-semibold text-xs transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <Send size={13} />
              <span>Перевести</span>
            </button>

            <button
              onClick={() => setActiveTab('earn')}
              className="py-1.5 px-3 rounded-dfz-lg bg-dfz-surface hover:bg-dfz-surface-hover border border-dfz-border text-dfz-text font-medium text-xs transition-colors flex items-center gap-1.5"
            >
              <Sparkles size={13} className="text-amber-400" />
              <span>Награды</span>
            </button>

            <button
              onClick={() => {
                setStarsOpen(false);
                setGiftStoreOpen(true);
              }}
              className="py-1.5 px-3 rounded-dfz-lg bg-dfz-surface hover:bg-dfz-surface-hover border border-dfz-border text-dfz-text font-medium text-xs transition-colors flex items-center gap-1.5"
            >
              <Gift size={13} className="text-purple-400" />
              <span>Подарки</span>
            </button>

            <button
              onClick={() => {
                setStarsOpen(false);
                setPremiumOpen(true);
              }}
              className="py-1.5 px-3 rounded-dfz-lg bg-dfz-surface hover:bg-dfz-surface-hover border border-dfz-border text-cyan-400 font-medium text-xs transition-colors flex items-center gap-1.5"
            >
              <span>DFZ Premium</span>
              <span className="text-[10px]">◆</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 border-b border-dfz-border/60 pb-2 overflow-x-auto no-scrollbar text-xs font-semibold">
          <button
            onClick={() => setActiveTab('balance')}
            className={`px-3 py-1.5 rounded-dfz-md transition-colors ${
              activeTab === 'balance'
                ? 'bg-amber-500/20 text-amber-400'
                : 'text-dfz-text-muted hover:text-dfz-text'
            }`}
          >
            Обзор
          </button>
          <button
            onClick={() => setActiveTab('earn')}
            className={`px-3 py-1.5 rounded-dfz-md transition-colors flex items-center gap-1.5 ${
              activeTab === 'earn'
                ? 'bg-amber-500/20 text-amber-400'
                : 'text-dfz-text-muted hover:text-dfz-text'
            }`}
          >
            <span>Награды</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          </button>
          <button
            onClick={() => setActiveTab('send')}
            className={`px-3 py-1.5 rounded-dfz-md transition-colors ${
              activeTab === 'send'
                ? 'bg-amber-500/20 text-amber-400'
                : 'text-dfz-text-muted hover:text-dfz-text'
            }`}
          >
            Отправить
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-3 py-1.5 rounded-dfz-md transition-colors ${
              activeTab === 'history'
                ? 'bg-amber-500/20 text-amber-400'
                : 'text-dfz-text-muted hover:text-dfz-text'
            }`}
          >
            История
          </button>
          <button
            onClick={() => setActiveTab('gifts')}
            className={`px-3 py-1.5 rounded-dfz-md transition-colors ${
              activeTab === 'gifts'
                ? 'bg-amber-500/20 text-amber-400'
                : 'text-dfz-text-muted hover:text-dfz-text'
            }`}
          >
            Инвентарь ({myGifts.length})
          </button>
        </div>

        {/* Tab 1: Overview */}
        {activeTab === 'balance' && (
          <div className="space-y-4">
            {/* Activity Reward Card */}
            <div className="p-4 rounded-dfz-xl bg-dfz-surface border border-dfz-border space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-dfz-lg bg-emerald-500/10 text-emerald-400">
                    <Clock size={16} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-dfz-text">Почасовая награда за активность</h4>
                    <p className="text-[11px] text-dfz-text-muted">
                      +100 ★ за каждый полный час непрерывной сессии
                    </p>
                  </div>
                </div>
                <span className="text-xs font-mono font-bold text-emerald-400">
                  {activityState ? formatRemaining(activityState.remainingSeconds) : '36:00'}
                </span>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-dfz-bg rounded-full h-2 overflow-hidden border border-dfz-border/50">
                <div
                  className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full transition-all duration-500"
                  style={{ width: `${activityState ? (activityState as any).progressPercent || 0 : 0}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[11px] text-dfz-text-muted">
                <span>Прогресс: {(activityState as any)?.progressPercent || 0}%</span>
                <span className="text-amber-400 font-medium">Следующая выплата: +100 ★</span>
              </div>
            </div>

            {/* Quick explanation */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-dfz-xl bg-dfz-surface-secondary border border-dfz-border space-y-1">
                <span className="font-semibold text-dfz-text flex items-center gap-1.5">
                  <ShieldCheck size={14} className="text-emerald-400" />
                  <span>Гарантия реестра</span>
                </span>
                <p className="text-[11px] text-dfz-text-muted">
                  Stars — это фиксированные учетные единицы с двойной записью в транзакционном журнале.
                </p>
              </div>
              <div className="p-3 rounded-dfz-xl bg-dfz-surface-secondary border border-dfz-border space-y-1">
                <span className="font-semibold text-dfz-text flex items-center gap-1.5">
                  <Gift size={14} className="text-purple-400" />
                  <span>Коллекции и подарки</span>
                </span>
                <p className="text-[11px] text-dfz-text-muted">
                  Отправляйте авторские подарки с персональными пожеланиями в личные чаты.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Earn Stars */}
        {activeTab === 'earn' && (
          <div className="space-y-4">
            <div className="p-4 rounded-dfz-xl bg-gradient-to-br from-emerald-500/10 to-teal-500/5 border border-emerald-500/20 space-y-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-dfz-xl bg-emerald-500/20 text-emerald-400">
                  <Clock size={20} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-dfz-text">Серверный Activity Engine</h4>
                  <p className="text-xs text-dfz-text-muted">
                    Автоматическое начисление ★100 Stars за каждый проверенный час активности
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-dfz-lg bg-dfz-bg/80 border border-dfz-border space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span>До следующей выплаты:</span>
                  <span className="font-mono text-emerald-400 text-sm">
                    {activityState ? formatRemaining(activityState.remainingSeconds) : '60:00'}
                  </span>
                </div>
                <div className="w-full bg-dfz-surface rounded-full h-2.5 overflow-hidden">
                  <div
                    className="bg-emerald-500 h-full transition-all duration-300"
                    style={{ width: `${(activityState as any)?.progressPercent || 0}%` }}
                  />
                </div>
              </div>

              <div className="space-y-1 text-xs text-dfz-text-muted leading-relaxed">
                <p>• <strong>Защита от накрутки:</strong> система учитывает видимость вкладки и действия пользователя.</p>
                <p>• <strong>Grace period 5 минут:</strong> кратковременные переподключения или смена сети не сбрасывают таймер.</p>
                <p>• <strong>Единый счет:</strong> активность на нескольких устройствах объединяется, исключая дублирование.</p>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Send Stars */}
        {activeTab === 'send' && (
          <form onSubmit={handleSendStars} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-dfz-text">Получатель (@username)</label>
              <input
                type="text"
                value={recipientQuery}
                onChange={(e) => setRecipientQuery(e.target.value)}
                placeholder="@username друга"
                className="w-full px-3 py-2 rounded-dfz-lg bg-dfz-bg border border-dfz-border text-dfz-text text-xs focus:outline-none focus:border-amber-500"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-dfz-text">Количество Stars</label>
              <input
                type="number"
                min="1"
                max="50000"
                value={transferAmount}
                onChange={(e) => setTransferAmount(e.target.value)}
                className="w-full px-3 py-2 rounded-dfz-lg bg-dfz-bg border border-dfz-border text-dfz-text text-xs font-mono font-bold focus:outline-none focus:border-amber-500"
                required
              />

              {/* Quick Pills */}
              <div className="flex gap-2 pt-1">
                {[50, 100, 500, 1000].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setTransferAmount(amt.toString())}
                    className="px-2.5 py-1 rounded-dfz-md bg-dfz-surface hover:bg-dfz-surface-hover border border-dfz-border text-xs text-amber-400 font-mono font-semibold"
                  >
                    ★ {amt}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-dfz-text">Сообщение (необязательно)</label>
              <input
                type="text"
                value={transferMessage}
                onChange={(e) => setTransferMessage(e.target.value)}
                placeholder="За помощь в проекте..."
                className="w-full px-3 py-2 rounded-dfz-lg bg-dfz-bg border border-dfz-border text-dfz-text text-xs focus:outline-none focus:border-amber-500"
                maxLength={100}
              />
            </div>

            <button
              type="submit"
              disabled={isSubmittingTransfer}
              className="w-full py-2.5 rounded-dfz-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black font-bold text-xs transition-colors flex items-center justify-center gap-2 shadow-md"
            >
              {isSubmittingTransfer ? 'Отправка...' : `Отправить ★ ${transferAmount || 0} Stars`}
            </button>
          </form>
        )}

        {/* Tab 4: History */}
        {activeTab === 'history' && (
          <div className="space-y-3">
            {/* Filters */}
            <div className="flex gap-1 overflow-x-auto no-scrollbar pb-1 text-[11px] font-medium">
              {['ALL', 'EARNED', 'SENT', 'RECEIVED', 'GIFTS', 'ADMIN'].map((f) => (
                <button
                  key={f}
                  onClick={() => fetchTransactions(f)}
                  className={`px-2.5 py-1 rounded-dfz-md whitespace-nowrap transition-colors ${
                    historyFilter === f
                      ? 'bg-amber-500/20 text-amber-400 font-semibold'
                      : 'text-dfz-text-muted hover:text-dfz-text hover:bg-dfz-surface'
                  }`}
                >
                  {f === 'ALL'
                    ? 'Все'
                    : f === 'EARNED'
                    ? 'Награды'
                    : f === 'SENT'
                    ? 'Отправленные'
                    : f === 'RECEIVED'
                    ? 'Полученные'
                    : f === 'GIFTS'
                    ? 'Подарки'
                    : 'Админ'}
                </button>
              ))}
            </div>

            {/* List */}
            {isLoadingTransactions ? (
              <div className="p-8 text-center text-xs text-dfz-text-muted">Загрузка транзакций...</div>
            ) : transactions.length === 0 ? (
              <div className="p-8 text-center text-xs text-dfz-text-muted">
                В этой категории нет транзакций
              </div>
            ) : (
              <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
                {transactions.map((tx) => {
                  const isPositive = tx.amount > 0;
                  return (
                    <div
                      key={tx.id}
                      onClick={() => setSelectedTx(tx)}
                      className="p-2.5 rounded-dfz-xl bg-dfz-surface hover:bg-dfz-surface-hover border border-dfz-border/70 flex items-center justify-between cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                            isPositive
                              ? 'bg-emerald-500/10 text-emerald-400'
                              : 'bg-dfz-text-muted/10 text-dfz-text-muted'
                          }`}
                        >
                          {isPositive ? <ArrowDownLeft size={14} /> : <ArrowUpRight size={14} />}
                        </div>
                        <div>
                          <p className="text-xs font-medium text-dfz-text">
                            {tx.reason || tx.type}
                          </p>
                          <p className="text-[10px] text-dfz-text-muted">
                            {new Date(tx.createdAt).toLocaleString('ru', {
                              day: 'numeric',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        </div>
                      </div>

                      <span
                        className={`text-xs font-mono font-bold ${
                          isPositive ? 'text-emerald-400' : 'text-dfz-text-muted'
                        }`}
                      >
                        {isPositive ? `+${tx.amount.toLocaleString()} ★` : `${tx.amount.toLocaleString()} ★`}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab 5: Gifts Inventory */}
        {activeTab === 'gifts' && (
          <div className="space-y-3">
            {myGifts.length === 0 ? (
              <div className="p-8 text-center text-xs text-dfz-text-muted space-y-2">
                <Gift size={28} className="mx-auto text-dfz-text-muted opacity-50" />
                <p>У вас пока нет подарков</p>
                <button
                  onClick={() => {
                    setStarsOpen(false);
                    setGiftStoreOpen(true);
                  }}
                  className="px-3 py-1.5 rounded-dfz-lg bg-dfz-accent text-white text-xs font-medium"
                >
                  Перейти в магазин
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-80 overflow-y-auto pr-1">
                {myGifts.map((g) => (
                  <div
                    key={g.id}
                    className="p-3 rounded-dfz-xl bg-dfz-surface border border-dfz-border flex flex-col items-center text-center space-y-1.5 relative group"
                  >
                    <GiftArtwork name={g.giftDefinition.artwork} size={48} />
                    <h5 className="text-xs font-bold text-dfz-text truncate w-full">
                      {g.giftDefinition.name}
                    </h5>
                    {g.serialNumber && (
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-dfz-bg text-amber-400 border border-amber-500/20">
                        #{g.serialNumber.toString().padStart(4, '0')}
                      </span>
                    )}
                    {g.message && (
                      <p className="text-[10px] text-dfz-text-muted italic truncate w-full">
                        "{g.message}"
                      </p>
                    )}
                    <button
                      onClick={() => handleToggleGiftVisibility(g.id, g.showOnProfile)}
                      className="mt-1 text-[10px] text-dfz-text-muted hover:text-dfz-text flex items-center gap-1"
                      title={g.showOnProfile ? 'Скрыть из профиля' : 'Показать в профиле'}
                    >
                      {g.showOnProfile ? <Eye size={12} className="text-emerald-400" /> : <EyeOff size={12} />}
                      <span>{g.showOnProfile ? 'В профиле' : 'Скрыт'}</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Transaction Details Modal */}
        {selectedTx && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="w-full max-w-sm rounded-dfz-2xl bg-dfz-surface border border-dfz-border p-5 space-y-4 text-xs shadow-2xl">
              <div className="flex items-center justify-between border-b border-dfz-border pb-3">
                <span className="font-bold text-dfz-text">Детали транзакции</span>
                <button
                  onClick={() => setSelectedTx(null)}
                  className="p-1 rounded-dfz-md hover:bg-dfz-surface-hover text-dfz-text-muted"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-dfz-text-muted">Тип:</span>
                  <span className="font-semibold text-dfz-text">{selectedTx.type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-dfz-text-muted">Сумма:</span>
                  <span className={`font-mono font-bold ${selectedTx.amount > 0 ? 'text-emerald-400' : 'text-dfz-text'}`}>
                    {selectedTx.amount > 0 ? `+${selectedTx.amount}` : selectedTx.amount} ★
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-dfz-text-muted">Баланс после:</span>
                  <span className="font-mono text-dfz-text">{selectedTx.balanceAfter} ★</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-dfz-text-muted">Дата:</span>
                  <span className="text-dfz-text">{new Date(selectedTx.createdAt).toLocaleString('ru')}</span>
                </div>
                {selectedTx.reason && (
                  <div className="flex justify-between">
                    <span className="text-dfz-text-muted">Назначение:</span>
                    <span className="text-dfz-text">{selectedTx.reason}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-dfz-text-muted">Статус:</span>
                  <span className="text-emerald-400 font-semibold flex items-center gap-1">
                    <CheckCircle size={12} /> Подтверждено
                  </span>
                </div>
              </div>

              <button
                onClick={() => setSelectedTx(null)}
                className="w-full py-2 rounded-dfz-xl bg-dfz-surface-hover hover:bg-dfz-border text-dfz-text font-semibold"
              >
                Закрыть
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
