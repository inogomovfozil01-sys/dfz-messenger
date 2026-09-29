import React from 'react';

interface BrandMarkProps {
  className?: string;
  size?: number;
}

/** DFZ geometric monogram, shared by authentication and messenger UI. */
export function BrandMark({ className = '', size = 48 }: BrandMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="DFZ Messenger"
    >
      <rect width="64" height="64" rx="14" fill="#7775D6" />
      <path d="M11 21h6l5 5v12l-5 5h-6V21Zm18 22V21h11M29 31h9M45 21h10L45 43h10" stroke="white" strokeWidth="3.5" strokeLinejoin="miter" />
    </svg>
  );
}
