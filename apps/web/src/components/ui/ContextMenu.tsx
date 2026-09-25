import React, { useEffect, useRef } from 'react';

export interface ContextMenuItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  danger?: boolean;
  disabled?: boolean;
  onClick: () => void;
}

interface ContextMenuProps {
  x: number;
  y: number;
  items: ContextMenuItem[];
  onClose: () => void;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({ x, y, items, onClose }) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleScroll = () => onClose();

    window.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('scroll', handleScroll, true);
    return () => {
      window.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [onClose]);

  // Viewport bounds calculation
  let posX = x;
  let posY = y;
  const menuWidth = 180;
  const menuHeight = items.length * 36 + 16;

  if (typeof window !== 'undefined') {
    if (posX + menuWidth > window.innerWidth) {
      posX = window.innerWidth - menuWidth - 10;
    }
    if (posY + menuHeight > window.innerHeight) {
      posY = window.innerHeight - menuHeight - 10;
    }
  }

  return (
    <div
      ref={menuRef}
      style={{ left: `${Math.max(10, posX)}px`, top: `${Math.max(10, posY)}px` }}
      className="fixed z-50 min-w-[180px] bg-dfz-surface border border-dfz-border rounded-dfz-lg shadow-dfz-dropdown py-1.5 overflow-hidden animate-scale-in"
    >
      {items.map((item) => (
        <button
          key={item.id}
          disabled={item.disabled}
          onClick={() => {
            item.onClick();
            onClose();
          }}
          className={`w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-left transition-colors ${
            item.danger
              ? 'text-dfz-danger hover:bg-dfz-danger/10'
              : 'text-dfz-text hover:bg-dfz-surface-hover'
          } ${item.disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
        >
          {item.icon && <span className="w-4 h-4 flex-shrink-0 flex items-center justify-center">{item.icon}</span>}
          <span>{item.label}</span>
        </button>
      ))}
    </div>
  );
};
