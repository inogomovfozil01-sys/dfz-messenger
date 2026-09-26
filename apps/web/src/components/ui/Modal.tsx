import React, { useEffect, useRef, useId } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl';
}

const maxWidthMap = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
};

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = 'md',
}) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  useEffect(() => {
    if (!isOpen) return;
    const previous = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    panel?.focus();
    const trap = (event: KeyboardEvent) => {
      if (event.key !== 'Tab' || !panel) return;
      const elements = [...panel.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), select, textarea, a[href], [tabindex="0"]')].filter(el => el.getClientRects().length);
      const first = elements[0], last = elements.at(-1);
      if (!first) { event.preventDefault(); return; }
      if (event.shiftKey && (document.activeElement === first || document.activeElement === panel)) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || document.activeElement === panel)) { event.preventDefault(); first.focus(); }
    };
    panel?.addEventListener('keydown', trap);
    return () => { panel?.removeEventListener('keydown', trap); previous?.focus(); };
  }, [isOpen]);
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div
        className="fixed inset-0"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={panelRef} role="dialog" aria-modal="true" aria-labelledby={title ? titleId : undefined} aria-label={title ? undefined : 'Диалог'} tabIndex={-1}
        className={`relative w-full max-h-[calc(100dvh-2rem)] overflow-y-auto ${maxWidthMap[maxWidth]} bg-dfz-surface border border-dfz-border rounded-dfz-xl shadow-dfz-dropdown z-10 animate-scale-in`}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-dfz-border">
            <h3 id={titleId} className="text-base font-semibold text-dfz-text">{title}</h3>
            <button
              onClick={onClose}
              aria-label="Закрыть"
              className="p-1 rounded-dfz-md text-dfz-text-muted hover:text-dfz-text hover:bg-dfz-surface-hover transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        )}
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
};
