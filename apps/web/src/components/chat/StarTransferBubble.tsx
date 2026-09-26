import React from 'react';
import { Star, ArrowDownLeft } from 'lucide-react';

interface StarTransferBubbleProps {
  content: string;
  senderName: string;
  isSelf: boolean;
}

export const StarTransferBubble: React.FC<StarTransferBubbleProps> = ({
  content,
  senderName,
  isSelf,
}) => {
  return (
    <div className="p-3.5 rounded-dfz-2xl bg-gradient-to-br from-amber-500/25 via-orange-500/15 to-transparent border border-amber-500/40 text-dfz-text shadow-md max-w-xs space-y-2 select-none relative overflow-hidden">
      {/* Subtle shine effect */}
      <div className="absolute top-0 right-0 -mr-4 -mt-4 w-16 h-16 rounded-full bg-amber-400/20 blur-xl pointer-events-none" />

      <div className="flex items-center gap-2.5">
        <div className="w-10 h-10 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300 text-lg font-bold shadow-inner">
          ★
        </div>
        <div>
          <span className="text-[10px] uppercase font-bold text-amber-400 tracking-wider block">
            Перевод Stars
          </span>
          <h4 className="text-base font-extrabold font-mono text-amber-300 tracking-tight">
            {content}
          </h4>
        </div>
      </div>

      <div className="pt-1 border-t border-amber-500/20 text-[11px] text-amber-200/80 flex items-center justify-between">
        <span>{isSelf ? 'Отправлено вами' : `От: ${senderName}`}</span>
        <span className="text-[10px] text-emerald-400 font-medium">Зачислено</span>
      </div>
    </div>
  );
};
