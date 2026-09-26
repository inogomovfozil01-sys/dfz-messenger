import React from 'react';
import { Gift } from 'lucide-react';
import { GiftArtwork } from '../economy/GiftArtworks';

interface GiftCardBubbleProps {
  content: string;
  senderName: string;
  isSelf: boolean;
}

export const GiftCardBubble: React.FC<GiftCardBubbleProps> = ({
  content,
  senderName,
  isSelf,
}) => {
  // content might be "Подарок: Neon Rose" or similar
  const giftName = content.replace(/^Подарок:\s*/i, '');
  const artworkKey = giftName.toLowerCase().includes('rose')
    ? 'rose'
    : giftName.toLowerCase().includes('heart')
    ? 'heart'
    : giftName.toLowerCase().includes('rocket')
    ? 'rocket'
    : giftName.toLowerCase().includes('crown')
    ? 'crown'
    : giftName.toLowerCase().includes('dragon')
    ? 'dragon'
    : giftName.toLowerCase().includes('phoenix')
    ? 'phoenix'
    : 'crystal';

  return (
    <div className="p-4 rounded-dfz-2xl bg-gradient-to-br from-purple-900/30 via-indigo-900/20 to-dfz-surface border border-purple-500/40 text-dfz-text shadow-lg max-w-xs space-y-3 select-none text-center flex flex-col items-center">
      <div className="p-2 rounded-2xl bg-purple-500/10 border border-purple-500/20">
        <GiftArtwork name={artworkKey} size={64} />
      </div>

      <div className="space-y-0.5">
        <span className="text-[10px] uppercase font-bold text-purple-400 tracking-wider">
          Особенный подарок
        </span>
        <h4 className="text-sm font-extrabold text-dfz-text">{giftName}</h4>
        <p className="text-[11px] text-dfz-text-muted">
          {isSelf ? 'Подарено вами' : `От: ${senderName}`}
        </p>
      </div>

      <div className="w-full pt-1.5 border-t border-purple-500/20 text-[10px] text-purple-300/80">
        Добавлено в инвентарь профиля
      </div>
    </div>
  );
};
