import React, { useState, useEffect } from 'react';
import {
  Diamond,
  Share2,
  Calendar,
  User,
  Shield,
  Send,
  History,
  CheckCircle,
  X,
} from 'lucide-react';
import { Modal } from '../ui/Modal';
import { useEconomyStore } from '../../stores/economyStore';
import { GiftArtwork } from './GiftArtworks';
import { apiRequest } from '../../lib/api';

export const CollectibleViewerModal: React.FC = () => {
  const {
    isCollectibleViewerOpen,
    setCollectibleViewerOpen,
    activeCollectible,
    transferCollectible,
  } = useEconomyStore();

  const [collectibleData, setCollectibleData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isTransferring, setIsTransferring] = useState(false);
  const [recipientUsername, setRecipientUsername] = useState('');
  const [transferSubmitting, setTransferSubmitting] = useState(false);

  useEffect(() => {
    if (isCollectibleViewerOpen && activeCollectible?.id) {
      loadDetails(activeCollectible.id);
    }
  }, [isCollectibleViewerOpen, activeCollectible]);

  const loadDetails = async (id: string) => {
    setIsLoading(true);
    const res = await apiRequest<any>(`/api/economy/collectibles/${id}`);
    setIsLoading(false);
    if (res.success && res.data) {
      setCollectibleData(res.data);
    }
  };

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!collectibleData || !recipientUsername.trim()) return;

    setTransferSubmitting(true);
    const cleanUser = recipientUsername.trim().replace(/^@/, '');
    const userRes = await apiRequest<any>(`/api/users/profile/${cleanUser}`);
    if (!userRes.success || !userRes.data) {
      setTransferSubmitting(false);
      alert('Пользователь не найден. Проверьте @username.');
      return;
    }

    const success = await transferCollectible(userRes.data.id, collectibleData.id);
    setTransferSubmitting(false);
    if (success) {
      setIsTransferring(false);
      setCollectibleViewerOpen(false);
    }
  };

  if (!isCollectibleViewerOpen) return null;

  return (
    <Modal
      isOpen={isCollectibleViewerOpen}
      onClose={() => {
        setCollectibleViewerOpen(false);
        setIsTransferring(false);
      }}
      title="Коллекционный артефакт"
      maxWidth="md"
    >
      {isLoading || !collectibleData ? (
        <div className="p-12 text-center text-xs text-dfz-text-muted">Загрузка артефакта...</div>
      ) : (
        <div className="space-y-5 select-none">
          {/* 3D-styled Glowing Art Card */}
          <div className="relative p-6 rounded-dfz-2xl bg-gradient-to-br from-indigo-900/40 via-purple-900/20 to-dfz-surface border border-indigo-500/30 flex flex-col items-center justify-center text-center shadow-2xl overflow-hidden group">
            {/* Background Glow */}
            <div className="absolute inset-0 bg-gradient-to-t from-purple-500/10 via-transparent to-indigo-500/10 pointer-events-none" />

            <div className="relative transform transition-transform group-hover:scale-105 duration-300 py-3">
              <GiftArtwork name={collectibleData.artwork || 'crystal'} size={96} />
            </div>

            <div className="relative mt-2">
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                #{collectibleData.uniqueNumber?.toString().padStart(4, '0')} / {collectibleData.totalSupply}
              </span>
              <h3 className="mt-2 text-base font-extrabold text-dfz-text">
                {collectibleData.editionName || collectibleData.giftName}
              </h3>
              <p className="text-xs text-indigo-300 font-semibold uppercase tracking-wider">
                {collectibleData.rarity} EDITION
              </p>
            </div>
          </div>

          {/* Attributes Matrix */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 rounded-dfz-xl bg-dfz-surface border border-dfz-border">
              <span className="text-[10px] text-dfz-text-muted block">Фон / Тема</span>
              <span className="font-bold text-dfz-text capitalize">{collectibleData.background || 'Aurora'}</span>
            </div>
            <div className="p-2.5 rounded-dfz-xl bg-dfz-surface border border-dfz-border">
              <span className="text-[10px] text-dfz-text-muted block">Модель</span>
              <span className="font-bold text-dfz-text capitalize">{collectibleData.modelPattern || 'Quantum'}</span>
            </div>
            <div className="p-2.5 rounded-dfz-xl bg-dfz-surface border border-dfz-border">
              <span className="text-[10px] text-dfz-text-muted block">Текущий владелец</span>
              <span className="font-bold text-dfz-text truncate block">
                @{collectibleData.currentOwner?.username}
              </span>
            </div>
            <div className="p-2.5 rounded-dfz-xl bg-dfz-surface border border-dfz-border">
              <span className="text-[10px] text-dfz-text-muted block">Дата чеканки</span>
              <span className="font-bold text-dfz-text">
                {new Date(collectibleData.mintedAt).toLocaleDateString('ru')}
              </span>
            </div>
          </div>

          {/* Provenance History */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-dfz-text flex items-center gap-1.5">
              <History size={13} className="text-dfz-text-muted" />
              <span>История владения (Provenance)</span>
            </span>

            <div className="p-3 rounded-dfz-xl bg-dfz-surface border border-dfz-border/80 space-y-2 text-xs max-h-36 overflow-y-auto">
              {collectibleData.history?.map((h: any, i: number) => (
                <div key={h.id || i} className="flex items-center justify-between text-[11px] border-b border-dfz-border/40 pb-1.5 last:border-0 last:pb-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-indigo-400">{h.action}</span>
                    <span className="text-dfz-text-muted">→</span>
                    <span className="text-dfz-text font-medium">@{h.toUser?.username}</span>
                  </div>
                  <span className="text-[10px] text-dfz-text-muted">
                    {new Date(h.createdAt).toLocaleDateString('ru')}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Transfer Button or Transfer Form */}
          {!isTransferring ? (
            <button
              onClick={() => setIsTransferring(true)}
              className="w-full py-2.5 rounded-dfz-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-colors flex items-center justify-center gap-2 shadow-md"
            >
              <Share2 size={14} />
              <span>Передать артефакт другому пользователю</span>
            </button>
          ) : (
            <form onSubmit={handleTransfer} className="p-3 rounded-dfz-xl bg-dfz-surface border border-indigo-500/40 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-dfz-text">Передача владения</span>
                <button
                  type="button"
                  onClick={() => setIsTransferring(false)}
                  className="text-dfz-text-muted hover:text-dfz-text"
                >
                  <X size={14} />
                </button>
              </div>

              <input
                type="text"
                value={recipientUsername}
                onChange={(e) => setRecipientUsername(e.target.value)}
                placeholder="@username нового владельца"
                className="w-full px-3 py-2 rounded-dfz-lg bg-dfz-bg border border-dfz-border text-dfz-text text-xs focus:outline-none focus:border-indigo-500"
                required
              />

              <button
                type="submit"
                disabled={transferSubmitting}
                className="w-full py-2 rounded-dfz-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
              >
                <Send size={13} />
                <span>{transferSubmitting ? 'Передача...' : 'Подтвердить передачу'}</span>
              </button>
            </form>
          )}
        </div>
      )}
    </Modal>
  );
};
