import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'accent' | 'danger' | 'success' | 'muted';
  className?: string;
}

const variantStyles = {
  accent: 'bg-dfz-accent text-white',
  danger: 'bg-dfz-danger text-white',
  success: 'bg-dfz-success text-white',
  muted: 'bg-dfz-surface-hover text-dfz-text-muted',
};

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'accent',
  className = '',
}) => {
  return (
    <span
      className={`inline-flex items-center justify-center px-1.5 py-0.5 min-w-[20px] h-5 text-[11px] font-semibold rounded-full ${variantStyles[variant]} ${className}`}
    >
      {children}
    </span>
  );
};
