import React, { useState, useRef, useEffect } from 'react';
import { Paperclip, Smile, Send, Mic, Video, X, Edit3, Reply, BarChart2, Image, FileText, Sparkles, Star, Gift } from 'lucide-react';
import { useChatStore } from '../../stores/chatStore';
import { useAuthStore } from '../../stores/authStore';
import { useEconomyStore } from '../../stores/economyStore';
import { apiRequest } from '../../lib/api';
import { socketService } from '../../lib/socket';
import { VoiceRecorder } from './VoiceRecorder';
import { EmojiPicker } from './EmojiPicker';
import { StickerPicker } from './StickerPicker';
import { CreatePollModal } from './CreatePollModal';
import { VideoNoteRecorder } from './VideoNoteRecorder';
import { MessageType, Sticker } from '@dfz/types';

interface MessageComposerProps {
  chatId: string;
}

export const MessageComposer: React.FC<MessageComposerProps> = ({ chatId }) => {
  const [text, setText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isVideoRecording, setIsVideoRecording] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [pickerTab, setPickerTab] = useState<'EMOJI' | 'STICKERS'>('EMOJI');
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [isPollModalOpen, setIsPollModalOpen] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const {
    sendMessage,
    editMessage,
    replyTo,
    setReplyTo,
    editingMessage,
    setEditingMessage,
    setTyping,
    activeChat,
  } = useChatStore();
  const { user } = useAuthStore();
  const { setSendGiftOpen, setSendStarsOpen } = useEconomyStore();

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaInputRef = useRef<HTMLInputElement>(null);
  const typingTimerRef = useRef<any>(null);
  const draftTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    let cancelled = false;
    setText('');
    apiRequest<any>(`/api/chats/${chatId}/draft`).then(res => { if (!cancelled && res.success) setText(res.data?.content || ''); });
    const socket = socketService.getSocket();
    const onDraft = (draft: {chatId: string; content: string}) => { if (draft.chatId === chatId && document.activeElement !== textareaRef.current) setText(draft.content); };
    socket.on('draft:updated', onDraft);
    return () => { cancelled = true; socket.off('draft:updated', onDraft); };
  }, [chatId]);
  const saveDraft = (content: string) => {
    if (draftTimerRef.current) clearTimeout(draftTimerRef.current);
    draftTimerRef.current = setTimeout(() => { void apiRequest(`/api/chats/${chatId}/draft`, { method:'PUT', body:JSON.stringify({content}) }); }, 450);
  };

  // If editing message, populate textarea with existing content
  useEffect(() => {
    if (editingMessage) {
      setText(editingMessage.content);
      textareaRef.current?.focus();
    }
  }, [editingMessage]);

  // Auto-resize textarea
  const adjustHeight = () => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
    }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    if (!editingMessage) saveDraft(e.target.value);
    adjustHeight();

    // Typing event emission
    setTyping(chatId, true);
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      setTyping(chatId, false);
    }, 2500);
  };

  const handleSend = async () => {
    const content = text.trim();
    if (!content && !isUploading) return;

    if (editingMessage) {
      await editMessage(editingMessage.id, content);
      setEditingMessage(null);
      setText('');
      if (textareaRef.current) textareaRef.current.style.height = 'auto';
      return;
    }

    if (content) {
      await sendMessage(content);
      saveDraft('');
      setText('');
      setReplyTo(null);
      if (textareaRef.current) textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Clipboard paste listener for images / screenshots
  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        const file = items[i].getAsFile();
        if (file) {
          uploadFile(file);
          break;
        }
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadFile(file);
    }
    e.target.value = '';
    setShowAttachMenu(false);
  };

  const uploadFile = async (file: File) => {
    setIsUploading(true);
    setUploadProgress(10);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await apiRequest<{
        url: string;
        storageKey: string;
        mimeType: string;
        sizeBytes: number;
        originalName: string;
        duration?: number;
        width?: number;
        height?: number;
      }>('/api/media/upload', {
        method: 'POST',
        body: formData,
      });

      if (res.success && res.data) {
        setUploadProgress(100);

        let msgType = MessageType.FILE;
        if (res.data.mimeType.startsWith('image/')) msgType = MessageType.IMAGE;
        else if (res.data.mimeType.startsWith('video/')) msgType = MessageType.VIDEO;
        else if (res.data.mimeType.startsWith('audio/')) msgType = MessageType.AUDIO;

        await sendMessage('', [res.data], msgType);
      } else {
        alert(res.error?.message || 'Ошибка загрузки файла');
      }
    } catch {
      alert('Ошибка при отправке файла');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleVoiceSend = async (blob: Blob, duration: number, waveform?: number[]) => {
    setIsUploading(true);
    try {
      const file = new File([blob], `voice_${Date.now()}.ogg`, { type: 'audio/ogg' });
      const formData = new FormData();
      formData.append('file', file);

      const res = await apiRequest<{
        url: string;
        storageKey: string;
        mimeType: string;
        sizeBytes: number;
      }>('/api/media/upload', {
        method: 'POST',
        body: formData,
      });

      if (res.success && res.data) {
        const attachment = {
          ...res.data,
          originalName: 'Voice message',
          duration,
          waveform,
        };
        await sendMessage('', [attachment], MessageType.VOICE);
      }
    } finally {
      setIsUploading(false);
      setIsRecording(false);
    }
  };

  const handleSendVideoNote = async (attachment: any, duration: number) => {
    await sendMessage('', [{...attachment, duration}], MessageType.VIDEO_NOTE);
  };
  const handleSelectSticker = async (sticker: Sticker) => {
    setShowEmojiPicker(false);
    await sendMessage(sticker.url, [], MessageType.STICKER);
  };

  if (isRecording) {
    return (
      <div className="p-3 bg-dfz-surface border-t border-dfz-border">
        <VoiceRecorder
          onSend={handleVoiceSend}
          onCancel={() => setIsRecording(false)}
        />
      </div>
    );
  }

  return (
    <div className="dfz-composer select-none relative">
      {/* Uploading progress indicator */}
      {isUploading && (
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-[var(--accent-primary)] overflow-hidden">
          <div
            className="h-full bg-white/60 transition-all duration-300"
            style={{ width: `${uploadProgress}%` }}
          />
        </div>
      )}

      {/* Editing or Reply Preview Banner */}
      {(replyTo || editingMessage) && (
        <div className="flex items-center justify-between px-3 py-1.5 mb-2 bg-dfz-surface border-l-4 border-[var(--accent-primary)] rounded-r-dfz-lg text-xs animate-slide-up bg-black/20">
          <div className="flex items-center gap-2 overflow-hidden">
            {editingMessage ? (
              <Edit3 size={14} className="text-[var(--accent-primary)] flex-shrink-0" />
            ) : (
              <Reply size={14} className="text-[var(--accent-primary)] flex-shrink-0" />
            )}
            <div className="truncate">
              <span className="font-semibold text-dfz-text">
                {editingMessage ? 'Редактирование' : `Ответ на: ${replyTo?.sender?.profile?.displayName || 'Сообщение'}`}
              </span>
              <span className="ml-2 text-dfz-text-muted truncate">
                {editingMessage ? editingMessage.content : replyTo?.content}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setReplyTo(null);
              setEditingMessage(null);
              setText('');
            }}
            className="p-1 text-dfz-text-muted hover:text-dfz-text rounded-full"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Hidden file inputs */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
      />
      <input
        type="file"
        ref={mediaInputRef}
        accept="image/*,video/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Telegram Composer Input Bar */}
      <div className="flex items-end gap-2">
        <div className="flex-1 flex items-end gap-1.5 bg-dfz-surface border border-dfz-border rounded-2xl px-2 py-1 focus-within:border-[var(--accent-primary)] transition-colors shadow-inner">
        {/* Attachment Button & Popup Menu */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowAttachMenu(!showAttachMenu)}
            className="p-2 text-dfz-text-muted hover:text-dfz-text hover:bg-dfz-surface-hover rounded-full transition-colors flex-shrink-0 mb-0.5"
            title="Прикрепить"
          >
            <Paperclip size={18} />
          </button>

          {showAttachMenu && (
            <div
              className="absolute bottom-12 left-0 w-48 bg-dfz-surface border border-dfz-border rounded-dfz-xl shadow-dfz-dropdown py-1 z-40 animate-scale-in"
              onClick={() => setShowAttachMenu(false)}
            >
              <button
                type="button"
                onClick={() => mediaInputRef.current?.click()}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-dfz-text hover:bg-dfz-surface-hover text-left"
              >
                <Image size={16} className="text-dfz-accent" />
                <span>Фото или видео</span>
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-dfz-text hover:bg-dfz-surface-hover text-left"
              >
                <FileText size={16} className="text-blue-500" />
                <span>Документ</span>
              </button>
              <button
                type="button"
                onClick={() => setIsPollModalOpen(true)}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-dfz-text hover:bg-dfz-surface-hover text-left"
              >
                <BarChart2 size={16} className="text-purple-500" />
                <span>Создать опрос</span>
              </button>
              <div className="my-1 border-t border-dfz-border/50" />
              <button
                type="button"
                onClick={() => {
                  setShowAttachMenu(false);
                  const otherMember = activeChat?.type === 'DIRECT'
                    ? activeChat.members?.find((m: any) => m.userId !== user?.id)?.user
                    : null;
                  setSendGiftOpen(
                    true,
                    null as any,
                    otherMember
                      ? {
                          id: otherMember.id,
                          username: otherMember.username,
                          displayName: otherMember.profile?.displayName || otherMember.username,
                        }
                      : null
                  );
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-dfz-text hover:bg-dfz-surface-hover text-left"
              >
                <Gift size={16} className="text-purple-400" />
                <span>Подарок</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAttachMenu(false);
                  const otherMember = activeChat?.type === 'DIRECT'
                    ? activeChat.members?.find((m: any) => m.userId !== user?.id)?.user
                    : null;
                  setSendStarsOpen(
                    true,
                    otherMember
                      ? {
                          id: otherMember.id,
                          username: otherMember.username,
                          displayName: otherMember.profile?.displayName || otherMember.username,
                        }
                      : null
                  );
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-dfz-text hover:bg-dfz-surface-hover text-left"
              >
                <Star size={16} className="fill-amber-400 text-amber-400" />
                <span>Отправить Stars</span>
              </button>
            </div>
          )}
        </div>

        {/* Emoji & Sticker Drawer Button */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="p-2 text-dfz-text-muted hover:text-dfz-text hover:bg-dfz-surface-hover rounded-full transition-colors flex-shrink-0 mb-0.5"
            title="Эмодзи и стикеры"
          >
            <Smile size={18} />
          </button>

          {showEmojiPicker && (
            <div className="absolute bottom-12 left-0 z-40 bg-dfz-surface border border-dfz-border rounded-dfz-xl shadow-dfz-dropdown overflow-hidden flex flex-col animate-scale-in">
              {/* Tab Selector Header */}
              <div className="flex border-b border-dfz-border bg-dfz-bg p-1 gap-1">
                <button
                  type="button"
                  onClick={() => setPickerTab('EMOJI')}
                  className={`flex-1 py-1 text-xs font-semibold rounded-dfz-md transition-colors flex items-center justify-center gap-1.5 ${
                    pickerTab === 'EMOJI' ? 'bg-dfz-surface text-dfz-text shadow-dfz-sm' : 'text-dfz-text-muted hover:text-dfz-text'
                  }`}
                >
                  <Smile size={14} />
                  <span>Эмодзи</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPickerTab('STICKERS')}
                  className={`flex-1 py-1 text-xs font-semibold rounded-dfz-md transition-colors flex items-center justify-center gap-1.5 ${
                    pickerTab === 'STICKERS' ? 'bg-dfz-surface text-dfz-text shadow-dfz-sm' : 'text-dfz-text-muted hover:text-dfz-text'
                  }`}
                >
                  <Sparkles size={14} className="text-dfz-accent" />
                  <span>Стикеры</span>
                </button>
              </div>

              {pickerTab === 'EMOJI' ? (
                <EmojiPicker
                  onSelect={(emoji) => {
                    setText((prev) => prev + emoji);
                    setShowEmojiPicker(false);
                    textareaRef.current?.focus();
                  }}
                  onClose={() => setShowEmojiPicker(false)}
                />
              ) : (
                <StickerPicker onSelectSticker={handleSelectSticker} />
              )}
            </div>
          )}
        </div>

        {/* Auto-expanding Textarea */}
        <textarea
          ref={textareaRef}
          value={text}
          onChange={handleTextChange}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder="Написать сообщение..."
          rows={1}
          className="flex-1 max-h-36 min-h-[24px] py-1.5 px-1 bg-transparent text-dfz-text placeholder:text-dfz-text-muted text-sm resize-none focus:outline-none leading-relaxed"
        />

        </div>

        {/* Telegram Action Button: Round Send OR Voice & Video Note */}
        {text.trim() || editingMessage ? (
          <button
            type="button"
            onClick={handleSend}
            className="w-11 h-11 bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] text-white rounded-full transition-transform active:scale-95 flex items-center justify-center flex-shrink-0 shadow-md animate-scale-in"
            title="Отправить (Enter)"
          >
            <Send size={18} className="translate-x-0.5 -translate-y-0.5" />
          </button>
        ) : (
          <div className="flex items-center gap-0.5 flex-shrink-0">
            {/* Round Video Note Button */}
            <button
              type="button"
              onClick={() => setIsVideoRecording(true)}
              className="p-2.5 text-dfz-text-muted hover:text-[var(--accent-primary)] hover:bg-dfz-surface-hover rounded-full transition-colors"
              title="Записать видеосообщение (кружок)"
            >
              <Video size={19} />
            </button>

            {/* Voice Message Button */}
            <button
              type="button"
              onClick={() => setIsRecording(true)}
              className="w-11 h-11 bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] text-white rounded-full transition-transform active:scale-95 flex items-center justify-center flex-shrink-0 shadow-md"
              title="Записать голосовое сообщение"
            >
              <Mic size={19} />
            </button>
          </div>
        )}
      </div>

      {/* Create Poll Modal */}
      <CreatePollModal
        chatId={chatId}
        isOpen={isPollModalOpen}
        onClose={() => setIsPollModalOpen(false)}
      />

      {/* Video Note Recorder Overlay */}
      {isVideoRecording && (
        <VideoNoteRecorder
          chatId={chatId}
          onClose={() => setIsVideoRecording(false)}
          onSendVideoNote={handleSendVideoNote}
        />
      )}
    </div>
  );
};
