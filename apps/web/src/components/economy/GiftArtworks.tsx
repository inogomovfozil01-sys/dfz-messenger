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
  const norm = (artworkKey || name || '').toLowerCase().trim();

  // Helper gradients and defs
  const defs = (
    <defs>
      <linearGradient id="goldMetallic" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#ffe082" />
        <stop offset="50%" stopColor="#f5c542" />
        <stop offset="100%" stopColor="#c79218" />
      </linearGradient>
      <linearGradient id="roseGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#f43f5e" />
        <stop offset="50%" stopColor="#ec4899" />
        <stop offset="100%" stopColor="#a855f7" />
      </linearGradient>
      <linearGradient id="cyanBlue" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#38bdf8" />
        <stop offset="100%" stopColor="#2563eb" />
      </linearGradient>
      <linearGradient id="emeraldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#34d399" />
        <stop offset="100%" stopColor="#059669" />
      </linearGradient>
      <linearGradient id="purpleViolet" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#c084fc" />
        <stop offset="100%" stopColor="#7c3aed" />
      </linearGradient>
      <linearGradient id="flameGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#fde047" />
        <stop offset="40%" stopColor="#f97316" />
        <stop offset="100%" stopColor="#dc2626" />
      </linearGradient>
      <linearGradient id="cosmicMythic" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#38bdf8" />
        <stop offset="50%" stopColor="#a855f7" />
        <stop offset="100%" stopColor="#f43f5e" />
      </linearGradient>
      <filter id="softGlow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="2.5" result="blur" />
        <feComposite in="SourceGraphic" in2="blur" operator="over" />
      </filter>
    </defs>
  );

  // Switch for specific SVG vector illustrations
  switch (norm) {
    case 'rose':
    case 'neon-rose':
      return (
        <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className}>
          {defs}
          <path d="M32 38 Q32 54 28 60" stroke="#059669" strokeWidth="3" strokeLinecap="round" />
          <path d="M30 48 Q22 46 20 40 Q28 42 31 46" fill="url(#emeraldGrad)" />
          <path d="M32 44 Q42 42 44 36 Q36 38 32 42" fill="url(#emeraldGrad)" />
          <circle cx="32" cy="24" r="14" fill="url(#roseGrad)" filter="url(#softGlow)" opacity="0.4" />
          <path d="M32 12 C24 12 18 18 18 26 C18 34 26 38 32 38 C38 38 46 34 46 26 C46 18 40 12 32 12 Z" fill="url(#roseGrad)" />
          <path d="M32 16 C26 16 22 20 22 26 C22 31 27 34 32 34 C37 34 42 31 42 26 C42 20 38 16 32 16 Z" fill="#fb7185" opacity="0.8" />
          <circle cx="32" cy="25" r="4" fill="#ffe4e6" />
        </svg>
      );

    case 'heart':
    case 'cyber-heart':
      return (
        <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className}>
          {defs}
          <path d="M32 52 C32 52 14 40 14 26 C14 18 20 12 28 12 C32 12 32 16 32 16 C32 16 32 12 36 12 C44 12 50 18 50 26 C50 40 32 52 32 52 Z" fill="url(#roseGrad)" filter="url(#softGlow)" />
          <circle cx="24" cy="20" r="3" fill="#ffffff" opacity="0.7" />
          <path d="M22 34 L32 46 L42 34" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" opacity="0.3" />
        </svg>
      );

    case 'cake':
    case 'birthday-cake':
      return (
        <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className}>
          {defs}
          <rect x="14" y="36" width="36" height="18" rx="4" fill="url(#purpleViolet)" />
          <rect x="18" y="24" width="28" height="14" rx="3" fill="url(#roseGrad)" />
          <path d="M14 36 Q23 40 32 36 Q41 40 50 36" fill="#fbcfe8" opacity="0.9" />
          <rect x="24" y="16" width="3" height="8" rx="1.5" fill="#fde047" />
          <rect x="37" y="16" width="3" height="8" rx="1.5" fill="#fde047" />
          <circle cx="25.5" cy="13" r="2.5" fill="#f97316" filter="url(#softGlow)" />
          <circle cx="38.5" cy="13" r="2.5" fill="#f97316" filter="url(#softGlow)" />
        </svg>
      );

    case 'wine':
    case 'sparkling-wine':
      return (
        <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className}>
          {defs}
          <path d="M28 14 L36 14 L36 22 L40 28 L40 50 L24 50 L24 28 L28 22 Z" fill="url(#emeraldGrad)" />
          <rect x="29" y="10" width="6" height="5" rx="1" fill="url(#goldMetallic)" />
          <rect x="26" y="34" width="12" height="12" rx="2" fill="url(#goldMetallic)" opacity="0.9" />
          <circle cx="44" cy="18" r="2" fill="#fde047" />
          <circle cx="48" cy="24" r="1.5" fill="#fde047" />
          <circle cx="42" cy="28" r="1" fill="#fde047" />
        </svg>
      );

    case 'coffee':
    case 'morning-coffee':
      return (
        <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className}>
          {defs}
          <path d="M16 26 L42 26 L38 48 C38 52 34 54 29 54 C24 54 20 52 20 48 Z" fill="url(#goldMetallic)" />
          <path d="M42 30 C48 30 50 36 46 42 C44 44 40 44 39 42" stroke="url(#goldMetallic)" strokeWidth="3" strokeLinecap="round" />
          <path d="M26 14 Q28 18 26 22" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
          <path d="M32 12 Q34 16 32 20" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
        </svg>
      );

    case 'star':
    case 'golden-star':
      return (
        <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className}>
          {defs}
          <polygon
            points="32,8 39,23 55,25 43,37 46,53 32,45 18,53 21,37 9,25 25,23"
            fill="url(#goldMetallic)"
            filter="url(#softGlow)"
          />
          <polygon
            points="32,16 36,25 46,26 38,34 40,44 32,39 24,44 26,34 18,26 28,25"
            fill="#fffbeb"
            opacity="0.6"
          />
        </svg>
      );

    case 'diamond':
    case 'blue-diamond':
      return (
        <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className}>
          {defs}
          <polygon points="32,12 48,24 32,54 16,24" fill="url(#cyanBlue)" filter="url(#softGlow)" />
          <polygon points="32,12 48,24 32,28" fill="#e0f2fe" opacity="0.8" />
          <polygon points="16,24 32,12 32,28" fill="#bae6fd" opacity="0.6" />
          <polygon points="16,24 32,28 32,54" fill="#0284c7" opacity="0.9" />
          <polygon points="48,24 32,28 32,54" fill="#0369a1" />
        </svg>
      );

    case 'rocket':
    case 'quantum-rocket':
      return (
        <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className}>
          {defs}
          <path d="M22 42 L16 54 L26 48 L22 42 Z" fill="url(#flameGrad)" />
          <path d="M18 36 L14 46 L24 44 Z" fill="#6366f1" />
          <path d="M34 20 L44 16 L42 26 Z" fill="#6366f1" />
          <path d="M20 40 L44 16 C50 10 52 12 48 18 L24 42 L20 40 Z" fill="url(#cyanBlue)" filter="url(#softGlow)" />
          <circle cx="36" cy="24" r="4" fill="#ffffff" opacity="0.9" />
          <circle cx="36" cy="24" r="2.5" fill="#0284c7" />
        </svg>
      );

    case 'crown':
    case 'golden-crown':
    case 'sovereign':
    case 'sovereign-crown':
      return (
        <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className}>
          {defs}
          <path d="M12 46 L16 24 L26 34 L32 18 L38 34 L48 24 L52 46 Z" fill="url(#goldMetallic)" filter="url(#softGlow)" />
          <circle cx="16" cy="22" r="3" fill="#ef4444" />
          <circle cx="32" cy="16" r="3.5" fill="#38bdf8" />
          <circle cx="48" cy="22" r="3" fill="#10b981" />
          <rect x="14" y="44" width="36" height="4" rx="2" fill="#ca8a04" />
          <circle cx="26" cy="46" r="1.5" fill="#ffffff" />
          <circle cx="32" cy="46" r="1.5" fill="#ffffff" />
          <circle cx="38" cy="46" r="1.5" fill="#ffffff" />
        </svg>
      );

    case 'trophy':
    case 'victory-trophy':
      return (
        <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className}>
          {defs}
          <path d="M20 16 L44 16 L40 34 C38 40 34 42 32 42 C30 42 26 40 24 34 Z" fill="url(#goldMetallic)" filter="url(#softGlow)" />
          <path d="M20 20 C14 20 12 28 18 32 C20 33 22 33 23 32" stroke="url(#goldMetallic)" strokeWidth="2.5" />
          <path d="M44 20 C50 20 52 28 46 32 C44 33 42 33 41 32" stroke="url(#goldMetallic)" strokeWidth="2.5" />
          <rect x="29" y="42" width="6" height="8" fill="url(#goldMetallic)" />
          <rect x="22" y="50" width="20" height="5" rx="1.5" fill="#a16207" />
          <circle cx="32" cy="26" r="3" fill="#ffffff" opacity="0.6" />
        </svg>
      );

    case 'key':
    case 'golden-key':
      return (
        <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className}>
          {defs}
          <circle cx="22" cy="24" r="12" fill="none" stroke="url(#goldMetallic)" strokeWidth="4" filter="url(#softGlow)" />
          <circle cx="22" cy="24" r="6" fill="url(#goldMetallic)" opacity="0.5" />
          <path d="M32 28 L48 44" stroke="url(#goldMetallic)" strokeWidth="4" strokeLinecap="round" />
          <path d="M44 40 L48 36" stroke="url(#goldMetallic)" strokeWidth="3" strokeLinecap="round" />
          <path d="M48 44 L52 40" stroke="url(#goldMetallic)" strokeWidth="3" strokeLinecap="round" />
        </svg>
      );

    case 'shield':
    case 'aegis-shield':
      return (
        <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className}>
          {defs}
          <path d="M32 12 L48 18 C48 34 38 48 32 52 C26 48 16 34 16 18 Z" fill="url(#cyanBlue)" filter="url(#softGlow)" />
          <path d="M32 16 L44 21 C44 33 36 44 32 48 C28 44 20 33 20 21 Z" fill="#0f172a" opacity="0.8" />
          <polygon points="32,24 35,32 43,32 37,37 39,45 32,40 25,45 27,37 21,32 29,32" fill="url(#goldMetallic)" />
        </svg>
      );

    case 'skull':
    case 'cyber-skull':
    case 'skull-nft':
      return (
        <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className}>
          {defs}
          <path d="M20 28 C20 18 24 14 32 14 C40 14 44 18 44 28 C44 34 40 38 38 42 L26 42 C24 38 20 34 20 28 Z" fill="url(#cyanBlue)" filter="url(#softGlow)" />
          <rect x="25" y="42" width="14" height="8" rx="2" fill="#0284c7" />
          <circle cx="27" cy="28" r="4.5" fill="#0f172a" />
          <circle cx="37" cy="28" r="4.5" fill="#0f172a" />
          <circle cx="27" cy="28" r="2" fill="#38bdf8" />
          <circle cx="37" cy="28" r="2" fill="#38bdf8" />
          <line x1="28" y1="42" x2="28" y2="50" stroke="#0f172a" strokeWidth="1.5" />
          <line x1="32" y1="42" x2="32" y2="50" stroke="#0f172a" strokeWidth="1.5" />
          <line x1="36" y1="42" x2="36" y2="50" stroke="#0f172a" strokeWidth="1.5" />
        </svg>
      );

    case 'crystal':
    case 'quantum-crystal':
      return (
        <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className}>
          {defs}
          <polygon points="32,10 46,24 32,54 18,24" fill="url(#purpleViolet)" filter="url(#softGlow)" />
          <polygon points="32,10 46,24 32,28" fill="#e0e7ff" opacity="0.6" />
          <polygon points="32,28 46,24 32,54" fill="#a855f7" />
          <polygon points="18,24 32,28 32,54" fill="#4f46e5" opacity="0.7" />
          <circle cx="32" cy="30" r="3" fill="#ffffff" opacity="0.8" />
        </svg>
      );

    case 'dragon':
    case 'crystal-dragon':
      return (
        <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className}>
          {defs}
          <path d="M20 18 Q32 10 44 16 Q48 24 40 32 Q46 38 42 48 Q32 54 22 46 Q16 36 20 18 Z" fill="url(#emeraldGrad)" filter="url(#softGlow)" />
          <circle cx="28" cy="22" r="3.5" fill="#fef08a" />
          <polygon points="44,14 54,18 46,26" fill="#047857" />
          <polygon points="42,32 52,38 40,42" fill="#0369a1" />
          <path d="M26 36 Q32 40 38 36" stroke="#fef08a" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );

    case 'phoenix':
    case 'genesis-phoenix':
      return (
        <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className}>
          {defs}
          <path d="M32 12 C24 20 14 28 12 40 C20 36 26 38 32 46 C38 38 44 36 52 40 C50 28 40 20 32 12 Z" fill="url(#flameGrad)" filter="url(#softGlow)" />
          <circle cx="32" cy="24" r="5" fill="#fef08a" />
          <circle cx="32" cy="24" r="2.5" fill="#dc2626" />
          <path d="M30 46 L32 54 L34 46" fill="#f97316" />
        </svg>
      );

    case 'omega':
    case 'omega-singularity':
      return (
        <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className}>
          {defs}
          <circle cx="32" cy="32" r="22" fill="none" stroke="url(#cosmicMythic)" strokeWidth="3" filter="url(#softGlow)" />
          <circle cx="32" cy="32" r="14" fill="#090d14" />
          <path d="M24 38 L24 32 C24 25 40 25 40 32 L40 38 L44 38 L44 42 L36 42 L36 38 L36 32 C36 28 28 28 28 32 L28 38 L28 42 L20 42 L20 38 Z" fill="url(#goldMetallic)" />
          <circle cx="32" cy="26" r="3" fill="#38bdf8" />
        </svg>
      );

    default:
      // High-end parametric dark vector badge for all other 80+ gifts
      const isMythic = rarity === 'MYTHIC' || norm.includes('genesis') || norm.includes('singularity') || norm.includes('galaxy');
      const isLegendary = rarity === 'LEGENDARY' || norm.includes('dragon') || norm.includes('phoenix') || norm.includes('crown');
      const isEpic = rarity === 'EPIC' || norm.includes('scepter') || norm.includes('ring') || norm.includes('wolf');

      const primaryGrad = isMythic
        ? 'url(#cosmicMythic)'
        : isLegendary
        ? 'url(#goldMetallic)'
        : isEpic
        ? 'url(#purpleViolet)'
        : 'url(#cyanBlue)';

      const initialChar = (norm[0] || '★').toUpperCase();

      return (
        <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className}>
          {defs}
          {/* Outer Aura Ring */}
          <circle cx="32" cy="32" r="23" fill="none" stroke={primaryGrad} strokeWidth="1.5" strokeDasharray="4 3" opacity="0.6" />
          {/* Core Shape */}
          <polygon
            points="32,12 49,22 49,42 32,52 15,42 15,22"
            fill="#151d26"
            stroke={primaryGrad}
            strokeWidth="2.5"
            filter="url(#softGlow)"
          />
          {/* Inner Badge Facet */}
          <polygon
            points="32,18 44,25 44,39 32,46 20,39 20,25"
            fill={primaryGrad}
            opacity="0.15"
          />
          {/* Center Graphic Symbol */}
          <text
            x="32"
            y="38"
            textAnchor="middle"
            fill={isLegendary || isMythic ? '#fde047' : '#f1f4f7'}
            fontSize="18"
            fontWeight="bold"
            fontFamily="system-ui, sans-serif"
          >
            {initialChar}
          </text>
          {/* Small Corner Jewels */}
          <circle cx="32" cy="12" r="2" fill="#ffffff" />
          <circle cx="49" cy="22" r="1.5" fill="#fde047" />
          <circle cx="15" cy="22" r="1.5" fill="#fde047" />
          <circle cx="32" cy="52" r="2" fill="#38bdf8" />
        </svg>
      );
  }
};
