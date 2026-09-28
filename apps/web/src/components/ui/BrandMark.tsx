import React from 'react';
/** Shared DFZ identity, sourced from the same master artwork as app icons. */
export function BrandMark({ className = '' }: { className?: string }) {
  return <img src="/brand/dfz-mark.svg" width={48} height={48} alt="DFZ Messenger" draggable={false} className={className} />;
}
