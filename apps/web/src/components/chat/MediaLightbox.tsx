import React, { useEffect, useState } from 'react';
import { X, ZoomIn, ZoomOut, Download } from 'lucide-react';

interface MediaLightboxProps {
  url: string | null;
  name?: string;
  onClose: () => void;
}

export const MediaLightbox: React.FC<MediaLightboxProps> = ({ url, name, onClose }) => {
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!url) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md animate-fade-in">
      {/* Top controls */}
      <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
        <button
          onClick={() => setScale((s) => Math.min(s + 0.25, 3))}
          className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors"
          title="Zoom in"
        >
          <ZoomIn size={18} />
        </button>
        <button
          onClick={() => setScale((s) => Math.max(s - 0.25, 0.5))}
          className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors"
          title="Zoom out"
        >
          <ZoomOut size={18} />
        </button>
        <a
          href={url}
          download={name || 'image'}
          target="_blank"
          rel="noreferrer"
          className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors"
          title="Download"
        >
          <Download size={18} />
        </a>
        <button
          onClick={onClose}
          className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors"
          title="Close"
        >
          <X size={18} />
        </button>
      </div>

      {/* Backdrop click */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Image Container */}
      <div className="relative max-w-[90vw] max-h-[90vh] overflow-hidden flex items-center justify-center z-0">
        <img
          src={url}
          alt={name || 'Preview'}
          style={{ transform: `scale(${scale})` }}
          className="max-w-full max-h-[85vh] object-contain rounded-dfz-md transition-transform duration-150 select-none"
          onClick={(e) => e.stopPropagation()}
        />
      </div>
    </div>
  );
};
