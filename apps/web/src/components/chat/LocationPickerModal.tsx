import React, { useState } from 'react';
import { X, MapPin, Radio, Navigation, Send } from 'lucide-react';

interface LocationPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSendLocation: (data: {
    latitude: number;
    longitude: number;
    title: string;
    address: string;
    isLive?: boolean;
    liveDurationMinutes?: number;
  }) => void;
}

const PRESET_PLACES = [
  {
    title: 'Красная площадь',
    address: 'Москва, Россия',
    lat: 55.7539,
    lng: 37.6208,
  },
  {
    title: 'Ташкент Сити',
    address: 'Ташкент, Узбекистан',
    lat: 41.3111,
    lng: 69.2532,
  },
  {
    title: 'Невский проспект',
    address: 'Санкт-Петербург, Россия',
    lat: 59.9343,
    lng: 30.3351,
  },
  {
    title: 'Бурдж-Халифа',
    address: 'Дубай, ОАЭ',
    lat: 25.1972,
    lng: 55.2744,
  },
];

export const LocationPickerModal: React.FC<LocationPickerModalProps> = ({
  isOpen,
  onClose,
  onSendLocation,
}) => {
  const [mode, setMode] = useState<'current' | 'live' | 'place'>('current');
  const [liveDuration, setLiveDuration] = useState<15 | 60 | 480>(15);
  const [selectedPlace, setSelectedPlace] = useState(PRESET_PLACES[0]);
  const [isLocating, setIsLocating] = useState(false);

  if (!isOpen) return null;

  const handleSendCurrent = () => {
    if (navigator.geolocation) {
      setIsLocating(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setIsLocating(false);
          onSendLocation({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            title: 'Мое текущее местоположение',
            address: `${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`,
            isLive: false,
          });
          onClose();
        },
        () => {
          setIsLocating(false);
          // Fallback to selected preset
          onSendLocation({
            latitude: selectedPlace.lat,
            longitude: selectedPlace.lng,
            title: selectedPlace.title,
            address: selectedPlace.address,
            isLive: false,
          });
          onClose();
        },
        { timeout: 5000 }
      );
    } else {
      onSendLocation({
        latitude: selectedPlace.lat,
        longitude: selectedPlace.lng,
        title: selectedPlace.title,
        address: selectedPlace.address,
        isLive: false,
      });
      onClose();
    }
  };

  const handleSendLive = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          onSendLocation({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            title: 'Трансляция геопозиции',
            address: `Обновляется в реальном времени (${liveDuration === 15 ? '15 минут' : liveDuration === 60 ? '1 час' : '8 часов'})`,
            isLive: true,
            liveDurationMinutes: liveDuration,
          });
          onClose();
        },
        () => {
          onSendLocation({
            latitude: selectedPlace.lat,
            longitude: selectedPlace.lng,
            title: 'Трансляция геопозиции',
            address: `${selectedPlace.title} (${liveDuration === 15 ? '15 минут' : liveDuration === 60 ? '1 час' : '8 часов'})`,
            isLive: true,
            liveDurationMinutes: liveDuration,
          });
          onClose();
        }
      );
    } else {
      onSendLocation({
        latitude: selectedPlace.lat,
        longitude: selectedPlace.lng,
        title: 'Трансляция геопозиции',
        address: `${selectedPlace.title} (${liveDuration === 15 ? '15 минут' : liveDuration === 60 ? '1 час' : '8 часов'})`,
        isLive: true,
        liveDurationMinutes: liveDuration,
      });
      onClose();
    }
  };

  const handleSendPreset = () => {
    onSendLocation({
      latitude: selectedPlace.lat,
      longitude: selectedPlace.lng,
      title: selectedPlace.title,
      address: selectedPlace.address,
      isLive: false,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 select-none animate-fade-in">
      <div className="relative w-full max-w-md bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--border-subtle)]">
          <div className="flex items-center gap-2">
            <MapPin size={18} className="text-[var(--accent-primary)]" />
            <h3 className="text-sm font-bold text-[var(--text-primary)]">Отправить геопозицию</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-full text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)]"
          >
            <X size={18} />
          </button>
        </div>

        {/* Mode Switcher Tabs */}
        <div className="p-3 border-b border-[var(--border-subtle)] flex gap-1.5 bg-[var(--bg-surface-secondary)]">
          <button
            type="button"
            onClick={() => setMode('current')}
            className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all ${
              mode === 'current'
                ? 'bg-[var(--accent-primary)] text-white shadow-sm'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            Текущая
          </button>
          <button
            type="button"
            onClick={() => setMode('live')}
            className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
              mode === 'live'
                ? 'bg-[var(--accent-primary)] text-white shadow-sm'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Radio size={13} className={mode === 'live' ? 'animate-pulse' : ''} />
            <span>Live Geolocation</span>
          </button>
          <button
            type="button"
            onClick={() => setMode('place')}
            className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all ${
              mode === 'place'
                ? 'bg-[var(--accent-primary)] text-white shadow-sm'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            Места
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4 text-xs overflow-y-auto">
          {mode === 'current' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-[var(--bg-surface-secondary)] border border-[var(--border-subtle)] flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[var(--accent-primary)]/20 text-[var(--accent-primary)] flex items-center justify-center flex-shrink-0">
                  <Navigation size={20} className="animate-spin-slow" />
                </div>
                <div>
                  <h4 className="font-bold text-[var(--text-primary)] text-sm">Моя геопозиция</h4>
                  <p className="text-[var(--text-secondary)] mt-0.5">
                    Будут отправлены точные GPS-координаты устройства.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleSendCurrent}
                disabled={isLocating}
                className="w-full py-3 bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] text-white rounded-xl font-bold shadow-md transition-all active:scale-[0.99] flex items-center justify-center gap-2"
              >
                <MapPin size={16} />
                <span>{isLocating ? 'Определение координат...' : 'Отправить эту геопозицию'}</span>
              </button>
            </div>
          )}

          {mode === 'live' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center gap-3 text-emerald-400">
                <Radio size={22} className="animate-pulse flex-shrink-0" />
                <div>
                  <h4 className="font-bold text-xs text-white">Транслировать геопозицию</h4>
                  <p className="text-[11px] text-emerald-300 mt-0.5">
                    Собеседник сможет видеть ваше перемещение в режиме реального времени.
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <span className="font-semibold text-[var(--text-secondary)] block">Длительность трансляции:</span>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setLiveDuration(15)}
                    className={`py-2 px-2.5 rounded-xl border text-center font-bold transition-all ${
                      liveDuration === 15
                        ? 'bg-[var(--accent-primary)] border-[var(--accent-primary)] text-white'
                        : 'bg-[var(--bg-surface)] border-[var(--border-subtle)] text-[var(--text-secondary)]'
                    }`}
                  >
                    15 минут
                  </button>
                  <button
                    type="button"
                    onClick={() => setLiveDuration(60)}
                    className={`py-2 px-2.5 rounded-xl border text-center font-bold transition-all ${
                      liveDuration === 60
                        ? 'bg-[var(--accent-primary)] border-[var(--accent-primary)] text-white'
                        : 'bg-[var(--bg-surface)] border-[var(--border-subtle)] text-[var(--text-secondary)]'
                    }`}
                  >
                    1 час
                  </button>
                  <button
                    type="button"
                    onClick={() => setLiveDuration(480)}
                    className={`py-2 px-2.5 rounded-xl border text-center font-bold transition-all ${
                      liveDuration === 480
                        ? 'bg-[var(--accent-primary)] border-[var(--accent-primary)] text-white'
                        : 'bg-[var(--bg-surface)] border-[var(--border-subtle)] text-[var(--text-secondary)]'
                    }`}
                  >
                    8 часов
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={handleSendLive}
                className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold shadow-md transition-all active:scale-[0.99] flex items-center justify-center gap-2"
              >
                <Radio size={16} />
                <span>Начать трансляцию</span>
              </button>
            </div>
          )}

          {mode === 'place' && (
            <div className="space-y-3">
              <span className="font-semibold text-[var(--text-secondary)] block">Популярные места:</span>
              <div className="space-y-1.5">
                {PRESET_PLACES.map((place) => (
                  <div
                    key={place.title}
                    onClick={() => setSelectedPlace(place)}
                    className={`p-2.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                      selectedPlace.title === place.title
                        ? 'bg-[var(--accent-primary)]/15 border-[var(--accent-primary)] text-[var(--text-primary)]'
                        : 'bg-[var(--bg-surface-secondary)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:border-[var(--accent-primary)]/40'
                    }`}
                  >
                    <div>
                      <h4 className="font-bold text-xs text-[var(--text-primary)]">{place.title}</h4>
                      <p className="text-[11px] text-[var(--text-secondary)]">{place.address}</p>
                    </div>
                    <MapPin size={16} className="text-[var(--accent-primary)] flex-shrink-0" />
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={handleSendPreset}
                className="w-full mt-2 py-3 bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] text-white rounded-xl font-bold shadow-md transition-all active:scale-[0.99] flex items-center justify-center gap-2"
              >
                <Send size={16} />
                <span>Отправить выбранное место</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
