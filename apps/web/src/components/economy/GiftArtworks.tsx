import React from 'react';

interface ArtworkProps {
  name?: string;
  artworkKey?: string;
  rarity?: string;
  className?: string;
  size?: number;
}

export const GiftArtwork: React.FC<ArtworkProps> = ({
  name,
  artworkKey,
  rarity,
  className = '',
  size = 64,
}) => {
  const norm = (artworkKey || name || '').toLowerCase();

  switch (norm) {
    case 'rose':
    case 'neon-rose':
      return (
        <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className}>
          <defs>
            <linearGradient id="roseGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f43f5e" />
              <stop offset="50%" stopColor="#ec4899" />
              <stop offset="100%" stopColor="#8b5cf6" />
            </linearGradient>
            <linearGradient id="leafGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#059669" />
            </linearGradient>
            <filter id="roseGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>
          {/* Leaves and stem */}
          <path d="M32 38 Q32 54 28 60" stroke="#059669" strokeWidth="3" strokeLinecap="round" />
          <path d="M30 48 Q22 46 20 40 Q28 42 31 46" fill="url(#leafGrad)" />
          <path d="M32 44 Q42 42 44 36 Q36 38 32 42" fill="url(#leafGrad)" />
          {/* Petals */}
          <circle cx="32" cy="24" r="14" fill="url(#roseGrad)" filter="url(#roseGlow)" opacity="0.4" />
          <path
            d="M32 12 C24 12 18 18 18 26 C18 34 26 38 32 38 C38 38 46 34 46 26 C46 18 40 12 32 12 Z"
            fill="url(#roseGrad)"
          />
          <path
            d="M32 16 C26 16 22 20 22 26 C22 31 27 34 32 34 C37 34 42 31 42 26 C42 20 38 16 32 16 Z"
            fill="#fb7185"
            opacity="0.8"
          />
          <circle cx="32" cy="25" r="4" fill="#ffe4e6" />
        </svg>
      );

    case 'heart':
    case 'cyber-heart':
      return (
        <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className}>
          <defs>
            <linearGradient id="heartGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ec4899" />
              <stop offset="100%" stopColor="#ef4444" />
            </linearGradient>
            <filter id="heartGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>
          <path
            d="M32 52 C32 52 14 40 14 26 C14 18 20 12 28 12 C32 12 32 16 32 16 C32 16 32 12 36 12 C44 12 50 18 50 26 C50 40 32 52 32 52 Z"
            fill="url(#heartGrad)"
            filter="url(#heartGlow)"
          />
          <circle cx="24" cy="20" r="3" fill="#ffffff" opacity="0.6" />
        </svg>
      );

    case 'rocket':
    case 'quantum-rocket':
      return (
        <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className}>
          <defs>
            <linearGradient id="rocketBody" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#06b6d4" />
              <stop offset="100%" stopColor="#3b82f6" />
            </linearGradient>
            <linearGradient id="flameGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#ef4444" />
            </linearGradient>
          </defs>
          {/* Flame */}
          <path d="M22 42 L16 54 L26 48 L22 42 Z" fill="url(#flameGrad)" />
          {/* Wings */}
          <path d="M18 36 L14 46 L24 44 Z" fill="#6366f1" />
          <path d="M34 20 L44 16 L42 26 Z" fill="#6366f1" />
          {/* Rocket Body */}
          <path
            d="M20 40 L44 16 C50 10 52 12 48 18 L24 42 L20 40 Z"
            fill="url(#rocketBody)"
          />
          {/* Window */}
          <circle cx="36" cy="24" r="4" fill="#ffffff" opacity="0.9" />
          <circle cx="36" cy="24" r="2.5" fill="#0284c7" />
        </svg>
      );

    case 'crown':
    case 'golden-crown':
      return (
        <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className}>
          <defs>
            <linearGradient id="crownGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fde047" />
              <stop offset="50%" stopColor="#eab308" />
              <stop offset="100%" stopColor="#ca8a04" />
            </linearGradient>
            <filter id="crownGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>
          <path
            d="M12 46 L16 24 L26 34 L32 18 L38 34 L48 24 L52 46 Z"
            fill="url(#crownGrad)"
            filter="url(#crownGlow)"
          />
          {/* Jewels */}
          <circle cx="16" cy="22" r="3" fill="#ef4444" />
          <circle cx="32" cy="16" r="3.5" fill="#3b82f6" />
          <circle cx="48" cy="22" r="3" fill="#10b981" />
          <rect x="14" y="44" width="36" height="4" rx="2" fill="#a16207" />
        </svg>
      );

    case 'crystal':
    case 'quantum-crystal':
      return (
        <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className}>
          <defs>
            <linearGradient id="crys1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#818cf8" />
              <stop offset="100%" stopColor="#c084fc" />
            </linearGradient>
            <linearGradient id="crys2" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#a855f7" />
              <stop offset="100%" stopColor="#6366f1" />
            </linearGradient>
          </defs>
          <polygon points="32,10 46,24 32,54 18,24" fill="url(#crys1)" opacity="0.9" />
          <polygon points="32,10 46,24 32,28" fill="#e0e7ff" opacity="0.5" />
          <polygon points="32,28 46,24 32,54" fill="url(#crys2)" />
          <polygon points="18,24 32,28 32,54" fill="#4f46e5" opacity="0.7" />
        </svg>
      );

    case 'dragon':
    case 'crystal-dragon':
      return (
        <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className}>
          <defs>
            <linearGradient id="dragonGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="50%" stopColor="#06b6d4" />
              <stop offset="100%" stopColor="#3b82f6" />
            </linearGradient>
          </defs>
          <path
            d="M20 18 Q32 10 44 16 Q48 24 40 32 Q46 38 42 48 Q32 54 22 46 Q16 36 20 18 Z"
            fill="url(#dragonGrad)"
          />
          <circle cx="28" cy="22" r="3" fill="#fef08a" />
          <polygon points="44,14 54,18 46,26" fill="#047857" />
          <polygon points="42,32 52,38 40,42" fill="#0369a1" />
        </svg>
      );

    case 'phoenix':
    case 'genesis-phoenix':
    default:
      return (
        <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className}>
          <defs>
            <linearGradient id="phoeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f59e0b" />
              <stop offset="50%" stopColor="#ef4444" />
              <stop offset="100%" stopColor="#8b5cf6" />
            </linearGradient>
          </defs>
          <path
            d="M32 12 C24 20 14 28 12 40 C20 36 26 38 32 46 C38 38 44 36 52 40 C50 28 40 20 32 12 Z"
            fill="url(#phoeGrad)"
          />
          <circle cx="32" cy="24" r="5" fill="#fef08a" />
        </svg>
      );
  }
};
