import React, { useState, useRef } from 'react';
import { X, Image, Type, Upload, Sparkles, Check, Globe, Users } from 'lucide-react';
import { useStoriesStore } from '../../stores/storiesStore';
import { apiRequest } from '../../lib/api';

const GRADIENT_PRESETS = [
  { id: 'indigo', name: 'Indigo Dream', bg: 'linear-gradient(135deg, #6366f1 0%, #a855f7 50%, #ec4899 100%)' },
  { id: 'ocean', name: 'Neon Ocean', bg: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 50%, #6366f1 100%)' },
  { id: 'emerald', name: 'Emerald Wave', bg: 'linear-gradient(135deg, #10b981 0%, #059669 50%, #047857 100%)' },
  { id: 'sunset', name: 'Sunset Glow', bg: 'linear-gradient(135deg, #f59e0b 0%, #ef4444 50%, #db2777 100%)' },
  { id: 'midnight', name: 'Midnight', bg: 'linear-gradient(135deg, #18181b 0%, #27272a 50%, #3f3f46 100%)' },
];

export const StoryCreatorModal: React.FC = () => {
  const { isCreatorOpen, closeCreator, fetchFeed } = useStoriesStore();

  const [mode, setMode] = useState<'MEDIA' | 'TEXT'>('MEDIA');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [textContent, setTextContent] = useState('');
  const [selectedGradient, setSelectedGradient] = useState(GRADIENT_PRESETS[0]);
  const [privacy, setPrivacy] = useState<'EVERYONE' | 'CONTACTS'>('EVERYONE');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isCreatorOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 50 * 1024 * 1024) {
      setErrorMsg('Файл слишком велик (макс. 50 МБ)');
      return;
    }

    setSelectedFile(file);
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    setErrorMsg(null);
  };

  const handlePublish = async () => {
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      if (mode === 'MEDIA') {
        if (!selectedFile && !previewUrl) {
          setErrorMsg('Выберите фото или видео для публикации');
          setIsSubmitting(false);
          return;
        }

        let mediaUrl = previewUrl || '';

        // If actual file selected, upload via /api/media/upload
        if (selectedFile) {
          const formData = new FormData();
          formData.append('file', selectedFile);

          const uploadRes = await apiRequest<{ url: string }>('/api/media/upload', {
            method: 'POST',
            body: formData,
          });

          if (!uploadRes.success || !uploadRes.data) {
            throw new Error(uploadRes.error?.message || 'Ошибка загрузки медиа');
          }

          mediaUrl = uploadRes.data.url;
        }

        const isVideo = selectedFile?.type.startsWith('video/') || false;

        const res = await apiRequest('/api/stories', {
          method: 'POST',
          body: JSON.stringify({
            mediaUrl,
            mediaType: isVideo ? 'VIDEO' : 'IMAGE',
            caption: caption.trim() || undefined,
            privacy,
          }),
        });

        if (!res.success) throw new Error(res.error?.message || 'Не удалось опубликовать историю');
      } else {
        // TEXT MODE
        if (!textContent.trim()) {
          setErrorMsg('Введите текст истории');
          setIsSubmitting(false);
          return;
        }

        const res = await apiRequest('/api/stories', {
          method: 'POST',
          body: JSON.stringify({
            mediaUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg"/>',
            mediaType: 'TEXT',
            caption: textContent.trim(),
            textOverlay: {
              text: textContent.trim(),
              bgColor: selectedGradient.bg,
              textColor: '#ffffff',
            },
            privacy,
          }),
        });

        if (!res.success) throw new Error(res.error?.message || 'Не удалось опубликовать историю');
      }

      await fetchFeed();
      closeCreator();
    } catch (err: any) {
      setErrorMsg(err.message || 'Ошибка публикации истории');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 select-none animate-fade-in">
      <div className="relative w-full max-w-lg bg-dfz-surface border border-dfz-border rounded-dfz-2xl shadow-dfz-modal overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-dfz-border">
          <div className="flex items-center gap-2">
            <Sparkles size={18} className="text-dfz-accent" />
            <h2 className="text-sm font-bold text-dfz-text">Новая история (24 часа)</h2>
          </div>
          <button
            type="button"
            onClick={closeCreator}
            className="p-1 rounded-full text-dfz-text-muted hover:text-dfz-text hover:bg-dfz-surface-hover"
          >
            <X size={18} />
          </button>
        </div>

        {/* Mode Selector Tabs */}
        <div className="flex p-2 bg-dfz-bg border-b border-dfz-border gap-2">
          <button
            type="button"
            onClick={() => setMode('MEDIA')}
            className={`flex-1 flex items-center justify-center gap-2 py-1.5 rounded-dfz-lg text-xs font-semibold transition-colors ${
              mode === 'MEDIA'
                ? 'bg-dfz-accent text-white shadow-dfz-sm'
                : 'text-dfz-text-muted hover:text-dfz-text'
            }`}
          >
            <Image size={15} />
            <span>Фото / Видео</span>
          </button>
          <button
            type="button"
            onClick={() => setMode('TEXT')}
            className={`flex-1 flex items-center justify-center gap-2 py-1.5 rounded-dfz-lg text-xs font-semibold transition-colors ${
              mode === 'TEXT'
                ? 'bg-dfz-accent text-white shadow-dfz-sm'
                : 'text-dfz-text-muted hover:text-dfz-text'
            }`}
          >
            <Type size={15} />
            <span>Текстовая история</span>
          </button>
        </div>

        {/* Body & Preview Canvas */}
        <div className="p-4 flex-1 overflow-y-auto space-y-4">
          {errorMsg && (
            <div className="p-2.5 rounded-dfz-md bg-dfz-danger/10 border border-dfz-danger/30 text-dfz-danger text-xs">
              {errorMsg}
            </div>
          )}

          {mode === 'MEDIA' ? (
            <div className="space-y-3">
              {/* Media Preview Box */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="relative w-full h-64 rounded-dfz-xl bg-dfz-bg border-2 border-dashed border-dfz-border hover:border-dfz-accent flex flex-col items-center justify-center cursor-pointer overflow-hidden transition-colors"
              >
                {previewUrl ? (
                  selectedFile?.type.startsWith('video/') ? (
                    <video src={previewUrl} autoPlay loop muted className="w-full h-full object-cover" />
                  ) : (
                    <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                  )
                ) : (
                  <div className="flex flex-col items-center gap-2 text-dfz-text-muted">
                    <div className="w-12 h-12 rounded-full bg-dfz-surface flex items-center justify-center text-dfz-accent shadow-dfz-sm">
                      <Upload size={22} />
                    </div>
                    <span className="text-xs font-medium">Нажмите для выбора фото или видео</span>
                    <span className="text-[11px] opacity-70">PNG, JPG, MP4, WebM (до 50 МБ)</span>
                  </div>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>

              {/* Caption Input */}
              <div>
                <label className="block text-xs font-semibold text-dfz-text mb-1">Подпись к истории</label>
                <input
                  type="text"
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Добавьте описание или теги..."
                  maxLength={300}
                  className="w-full h-9 px-3 bg-dfz-bg border border-dfz-border rounded-dfz-lg text-xs text-dfz-text placeholder:text-dfz-text-muted focus:outline-none focus:border-dfz-border-focus"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Text Canvas Preview */}
              <div
                className="relative w-full h-64 rounded-dfz-xl flex items-center justify-center p-6 text-center text-white shadow-inner transition-all overflow-hidden"
                style={{ background: selectedGradient.bg }}
              >
                <p className="font-bold text-xl leading-relaxed drop-shadow-md break-words max-h-full overflow-hidden">
                  {textContent || 'Введите ваш текст ниже...'}
                </p>
              </div>

              {/* Text Area */}
              <div>
                <label className="block text-xs font-semibold text-dfz-text mb-1">Текст истории</label>
                <textarea
                  value={textContent}
                  onChange={(e) => setTextContent(e.target.value)}
                  placeholder="О чем вы думаете сегодня?.."
                  rows={3}
                  maxLength={300}
                  className="w-full p-2.5 bg-dfz-bg border border-dfz-border rounded-dfz-lg text-xs text-dfz-text placeholder:text-dfz-text-muted focus:outline-none focus:border-dfz-border-focus resize-none"
                />
              </div>

              {/* Gradient Palette Selector */}
              <div>
                <label className="block text-xs font-semibold text-dfz-text mb-1.5">Фон истории</label>
                <div className="flex items-center gap-2">
                  {GRADIENT_PRESETS.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setSelectedGradient(p)}
                      className={`w-8 h-8 rounded-full shadow-dfz-sm transition-transform flex items-center justify-center ${
                        selectedGradient.id === p.id ? 'scale-115 ring-2 ring-dfz-accent ring-offset-2 ring-offset-dfz-surface' : 'hover:scale-105'
                      }`}
                      style={{ background: p.bg }}
                      title={p.name}
                    >
                      {selectedGradient.id === p.id && <Check size={14} className="text-white" strokeWidth={3} />}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Privacy Visibility Selector */}
          <div className="pt-2 border-t border-dfz-border flex items-center justify-between">
            <span className="text-xs font-semibold text-dfz-text">Кто может видеть:</span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setPrivacy('EVERYONE')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                  privacy === 'EVERYONE'
                    ? 'bg-dfz-accent text-white'
                    : 'bg-dfz-bg text-dfz-text-muted hover:text-dfz-text'
                }`}
              >
                <Globe size={13} />
                <span>Все</span>
              </button>
              <button
                type="button"
                onClick={() => setPrivacy('CONTACTS')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                  privacy === 'CONTACTS'
                    ? 'bg-dfz-accent text-white'
                    : 'bg-dfz-bg text-dfz-text-muted hover:text-dfz-text'
                }`}
              >
                <Users size={13} />
                <span>Контакты</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer Publish Button */}
        <div className="p-4 border-t border-dfz-border bg-dfz-bg flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={closeCreator}
            disabled={isSubmitting}
            className="px-4 py-2 rounded-dfz-lg text-xs font-semibold text-dfz-text-muted hover:bg-dfz-surface transition-colors"
          >
            Отмена
          </button>
          <button
            type="button"
            onClick={handlePublish}
            disabled={isSubmitting}
            className="px-5 py-2 rounded-dfz-lg bg-dfz-accent hover:bg-dfz-accent-hover text-white text-xs font-semibold shadow-dfz-sm disabled:opacity-50 transition-colors flex items-center gap-1.5"
          >
            {isSubmitting ? 'Публикация...' : 'Опубликовать на 24 часа'}
          </button>
        </div>
      </div>
    </div>
  );
};
