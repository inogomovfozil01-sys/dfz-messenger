import React, { useEffect, useState } from 'react';
import { ExternalLink, Globe } from 'lucide-react';
import { LinkPreviewData } from '@dfz/types';
import { apiRequest } from '../../lib/api';

interface LinkPreviewBubbleProps {
  url: string;
}

export const LinkPreviewBubble: React.FC<LinkPreviewBubbleProps> = ({ url }) => {
  const [data, setData] = useState<LinkPreviewData | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let isMounted = true;

    apiRequest<LinkPreviewData>('/api/preview', {
      params: { url },
    })
      .then((res) => {
        if (!isMounted) return;
        if (res.success && res.data) {
          setData(res.data);
        } else {
          setFailed(true);
        }
      })
      .catch(() => {
        if (isMounted) setFailed(true);
      });

    return () => {
      isMounted = false;
    };
  }, [url]);

  if (failed || !data) return null;

  return (
    <a
      href={data.url}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-2 block max-w-sm rounded-dfz-lg border-l-2 border-dfz-accent bg-dfz-bg/80 hover:bg-dfz-bg transition-colors p-2.5 text-left select-none overflow-hidden group shadow-dfz-sm"
    >
      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-dfz-accent mb-1 truncate">
        <Globe size={12} className="flex-shrink-0" />
        <span className="truncate">{data.siteName || new URL(data.url).hostname}</span>
        <ExternalLink size={10} className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
      </div>

      {data.title && (
        <h5 className="text-xs font-bold text-dfz-text line-clamp-1 mb-0.5">
          {data.title}
        </h5>
      )}

      {data.description && (
        <p className="text-[11px] text-dfz-text-muted line-clamp-2 leading-relaxed mb-1.5">
          {data.description}
        </p>
      )}

      {data.image && (
        <div className="w-full h-28 rounded-dfz-md overflow-hidden bg-dfz-surface">
          <img
            src={data.image}
            alt="Preview"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
            onError={(e) => {
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
        </div>
      )}
    </a>
  );
};
