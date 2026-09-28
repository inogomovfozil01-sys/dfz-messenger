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
  const giftName = content.replace(/^Подарок:\s*/i, '').trim();

  return (
    <div className="p-4 rounded-dfz-2xl bg-[#212126] border border-[#292930] text-dfz-text shadow-lg max-w-xs space-y-3 select-none text-center flex flex-col items-center">
      <div className="p-2.5 rounded-2xl bg-[#18181c] border border-[#292930]">
        <GiftArtwork artworkKey={giftName} name={giftName} size={64} />
      </div>

      <div className="space-y-0.5">
        <span className="text-[10px] uppercase font-bold text-[#8774e1] tracking-wider">
          Особенный подарок
        </span>
        <h4 className="text-sm font-extrabold text-dfz-text">{giftName}</h4>
        <p className="text-[11px] text-dfz-text-muted">
          {isSelf ? 'Подарено вами' : `От: ${senderName}`}
        </p>
      </div>

      <div className="w-full pt-1.5 border-t border-[#8774e1]/20 text-[10px] text-[#8774e1]">
        Добавлено в инвентарь профиля
      </div>
    </div>
  );
};
