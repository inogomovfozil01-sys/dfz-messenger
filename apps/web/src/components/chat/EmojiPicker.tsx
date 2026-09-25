import React from 'react';

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
  onClose?: () => void;
}

const COMMON_EMOJIS = [
  '👍', '❤️', '🔥', '🎉', '😂', '😮', '😢', '👏',
  '🚀', '💯', '✨', '🙏', '👀', '😍', '🤝', '⚡'
];

export const EmojiPicker: React.FC<EmojiPickerProps> = ({ onSelect, onClose }) => {
  return (
    <div
      className="p-2 bg-dfz-surface border border-dfz-border rounded-dfz-lg shadow-dfz-dropdown grid grid-cols-8 gap-1 w-64 animate-scale-in"
      onClick={(e) => e.stopPropagation()}
    >
      {COMMON_EMOJIS.map((emoji) => (
        <button
          key={emoji}
          type="button"
          onClick={() => {
            onSelect(emoji);
            onClose?.();
          }}
          className="w-7 h-7 flex items-center justify-center text-lg hover:bg-dfz-surface-hover rounded-dfz-sm transition-transform hover:scale-125"
        >
          {emoji}
        </button>
      ))}
    </div>
  );
};
