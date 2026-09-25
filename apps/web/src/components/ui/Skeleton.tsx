import React from 'react';

export const Skeleton: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div
      className={`animate-pulse bg-dfz-surface-hover/70 rounded-dfz-md ${className}`}
    />
  );
};
