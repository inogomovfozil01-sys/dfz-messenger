import React from 'react';

interface AvatarProps {
  src?: string | null;
  name?: string | null;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  isOnline?: boolean;
  className?: string;
}

const sizeClasses = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
  xl: 'w-16 h-16 text-xl',
};

const onlineBadgeSizes = {
  sm: 'w-2.5 h-2.5 right-0 bottom-0',
  md: 'w-3 h-3 right-0 bottom-0',
  lg: 'w-3.5 h-3.5 right-0.5 bottom-0.5',
  xl: 'w-4 h-4 right-1 bottom-1',
};

export const Avatar: React.FC<AvatarProps> = ({
  src,
  name = '?',
  size = 'md',
  isOnline,
  className = '',
}) => {
  const getInitials = (n?: string | null) => {
    if (!n) return '?';
    const parts = n.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return n.slice(0, 2).toUpperCase();
  };

  // Color generator for avatar background
  const getBackgroundColor = (str?: string | null) => {
    const s = str || '?';
    const colors = [
      'bg-blue-600',
      'bg-indigo-600',
      'bg-violet-600',
      'bg-emerald-600',
      'bg-teal-600',
      'bg-rose-600',
      'bg-amber-600',
    ];
    let hash = 0;
    for (let i = 0; i < s.length; i++) {
      hash = s.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % colors.length;
    return colors[index];
  };

  const resolveMediaUrl = (url?: string | null) => {
    if (!url) return '';
    if (url.startsWith('/api/') && process.env.NEXT_PUBLIC_API_URL) {
      return `${process.env.NEXT_PUBLIC_API_URL}${url}`;
    }
    return url;
  };

  const resolvedSrc = resolveMediaUrl(src);

  return (
    <div className={`relative inline-block select-none flex-shrink-0 ${className}`}>
      {resolvedSrc ? (
        <img
          src={resolvedSrc}
          alt={name || 'Avatar'}
          className={`${sizeClasses[size]} rounded-full object-cover border border-dfz-border`}
          onError={(e) => {
            // fallback on image error
            (e.target as HTMLElement).style.display = 'none';
          }}
        />
      ) : (
        <div
          className={`${sizeClasses[size]} ${getBackgroundColor(name)} rounded-full flex items-center justify-center font-medium text-white shadow-dfz-sm`}
        >
          {getInitials(name)}
        </div>
      )}

      {isOnline && (
        <span
          className={`absolute rounded-full bg-dfz-success border-2 border-dfz-surface ${onlineBadgeSizes[size]}`}
          title="Online"
        />
      )}
    </div>
  );
};
