import React, { useEffect, useState } from 'react';
import { StickerPack, Sticker } from '@dfz/types';
import { apiRequest } from '../../lib/api';
import { Smile, Sparkles } from 'lucide-react';

interface StickerPickerProps {
  onSelectSticker: (sticker: Sticker) => void;
  onClose?: () => void;
}

export const StickerPicker: React.FC<StickerPickerProps> = ({ onSelectSticker }) => {
  const [packs, setPacks] = useState<StickerPack[]>([]);
  const [activePackId, setActivePackId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    apiRequest<StickerPack[]>('/api/stickers/packs')
      .then((res) => {
        if (res.success && res.data) {
          setPacks(res.data);
          if (res.data.length > 0) {
            setActivePackId(res.data[0].id);
          }
        }
      })
      .finally(() => setIsLoading(false));
  }, []);

  const activePack = packs.find((p) => p.id === activePackId);

  return (
    <div className="w-80 h-72 bg-dfz-surface border border-dfz-border rounded-dfz-xl shadow-dfz-dropdown flex flex-col overflow-hidden select-none animate-scale-in">
      {/* Header */}
      <div className="p-2.5 border-b border-dfz-border flex items-center justify-between bg-dfz-bg/50">
        <div className="flex items-center gap-1.5 text-xs font-bold text-dfz-text">
          <Sparkles size={14} className="text-dfz-accent" />
          <span>{activePack ? activePack.title : 'Стикеры'}</span>
        </div>
      </div>

      {/* Stickers Grid */}
      <div className="flex-1 overflow-y-auto p-3">
        {isLoading ? (
          <div className="text-center py-10 text-xs text-dfz-text-muted">Загрузка стикеров...</div>
        ) : !activePack || activePack.stickers.length === 0 ? (
          <div className="text-center py-10 text-xs text-dfz-text-muted">Нет стикеров</div>
        ) : (
          <div className="grid grid-cols-4 gap-2">
            {activePack.stickers.map((sticker) => (
              <button
                key={sticker.id}
                type="button"
                onClick={() => onSelectSticker(sticker)}
                className="w-16 h-16 rounded-dfz-lg hover:bg-dfz-surface-hover p-1 transition-transform hover:scale-110 active:scale-95 flex items-center justify-center"
                title={sticker.emoji}
              >
                <img
                  src={sticker.url}
                  alt={sticker.emoji}
                  className="w-full h-full object-cover rounded-dfz-md pointer-events-none"
                  loading="lazy"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Packs Navigation Bar */}
      <div className="h-10 border-t border-dfz-border bg-dfz-bg flex items-center px-2 gap-1.5 overflow-x-auto no-scrollbar">
        {packs.map((pack) => {
          const isActive = pack.id === activePackId;
          const firstSticker = pack.stickers[0];

          return (
            <button
              key={pack.id}
              type="button"
              onClick={() => setActivePackId(pack.id)}
              className={`p-1 rounded-dfz-md flex items-center justify-center flex-shrink-0 transition-colors ${
                isActive ? 'bg-dfz-accent/20 border border-dfz-accent' : 'hover:bg-dfz-surface-hover'
              }`}
              title={pack.title}
            >
              {firstSticker ? (
                <img src={firstSticker.url} alt={pack.title} className="w-5 h-5 rounded object-cover" />
              ) : (
                <Smile size={16} className="text-dfz-text-muted" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
