import React from 'react';
import { MapPin, Navigation, ExternalLink, Radio } from 'lucide-react';

interface LocationBubbleProps {
  metadata?: {
    latitude?: number;
    longitude?: number;
    title?: string;
    address?: string;
    isLive?: boolean;
    liveDurationMinutes?: number;
  };
  content?: string;
  isOutgoing: boolean;
}

export const LocationBubble: React.FC<LocationBubbleProps> = ({
  metadata,
  content,
  isOutgoing,
}) => {
  const lat = metadata?.latitude ?? 55.7539;
  const lng = metadata?.longitude ?? 37.6208;
  const title = metadata?.title || 'Геолокация';
  const address = metadata?.address || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  const isLive = metadata?.isLive;

  // OpenStreetMap static map or preview
  const osmUrl = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=16/${lat}/${lng}`;
  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;

  return (
    <div className="w-full max-w-xs rounded-xl overflow-hidden bg-black/20 border border-white/10 select-none">
      {/* Map visual card */}
      <div className="relative h-36 w-full bg-[#1b2733] overflow-hidden group">
        {/* OpenStreetMap interactive static tile background */}
        <div
          className="absolute inset-0 bg-cover bg-center transition-transform duration-300 group-hover:scale-105"
          style={{
            backgroundImage: `url('https://static-maps.yandex.ru/1.x/?ll=${lng},${lat}&z=14&l=map&size=350,150&pt=${lng},${lat},pm2rdm')`,
            backgroundColor: '#1b2733',
          }}
        />

        {/* Fallback pin overlay if map tile fails */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="relative flex items-center justify-center">
            {isLive ? (
              <>
                <span className="absolute w-8 h-8 rounded-full bg-emerald-500/40 animate-ping" />
                <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg border border-white">
                  <Radio size={12} className="animate-pulse" />
                </div>
              </>
            ) : (
              <div className="w-7 h-7 rounded-full bg-[var(--accent-primary)] text-white flex items-center justify-center shadow-lg border border-white">
                <MapPin size={15} />
              </div>
            )}
          </div>
        </div>

        {isLive && (
          <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-emerald-500/90 text-white text-[10px] font-bold flex items-center gap-1 shadow-md">
            <Radio size={10} className="animate-pulse" />
            <span>LIVE</span>
          </div>
        )}
      </div>

      {/* Place Info */}
      <div className="p-3 space-y-1 bg-[var(--bg-surface-secondary)]/80">
        <div className="flex items-center justify-between gap-2">
          <h4 className="font-bold text-xs text-[var(--text-primary)] truncate">{title}</h4>
          <span className="text-[10px] text-[var(--text-tertiary)] font-mono flex-shrink-0">
            {lat.toFixed(3)}, {lng.toFixed(3)}
          </span>
        </div>
        <p className="text-[11px] text-[var(--text-secondary)] line-clamp-1">{address}</p>

        <div className="pt-2 flex items-center gap-2">
          <a
            href={googleMapsUrl}
            target="_blank"
            rel="noreferrer"
            className="flex-1 py-1 px-2 rounded-lg bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] text-white text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors"
          >
            <span>Открыть на карте</span>
            <ExternalLink size={11} />
          </a>
        </div>
      </div>
    </div>
  );
};
