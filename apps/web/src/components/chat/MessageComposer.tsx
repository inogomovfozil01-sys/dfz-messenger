import React, { useState, useRef, useEffect } from 'react';
import { Paperclip, Smile, Send, Mic, X, Edit3, Reply } from 'lucide-react';
import { useChatStore } from '../../stores/chatStore';
import { apiRequest } from '../../lib/api';
import { VoiceRecorder } from './VoiceRecorder';
import { EmojiPicker } from './EmojiPicker';

interface MessageComposerProps {
  chatId: string;
}

export const MessageComposer: React.FC<MessageComposerProps> = ({ chatId }) => {
  const [text, setText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const {
    sendMessage,
    editMessage,
    replyTo,
    setReplyTo,
    editingMessage,
    setEditingMessage,
    setTyping,
  } = useChatStore();

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimerRef = useRef<any>(null);

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

  // File Upload
  const uploadFile = async (file: File) => {
    setIsUploading(true);
    setUploadProgress(20);

    const formData = new FormData();
    formData.append('file', file);

    const res = await apiRequest<any>('/api/media/upload', {
      method: 'POST',
      body: formData,
    });

    setUploadProgress(100);
    setIsUploading(false);

    if (res.success && res.data) {
      await sendMessage('', [res.data]);
    }
  };

  // Voice recording upload & send
  const handleVoiceSend = async (blob: Blob, duration: number) => {
    setIsRecording(false);
    setIsUploading(true);

    const formData = new FormData();
    formData.append('audio', blob, 'voice.webm');
    formData.append('duration', duration.toString());

    const res = await apiRequest<any>('/api/media/voice', {
      method: 'POST',
      body: formData,
    });

    setIsUploading(false);

    if (res.success && res.data) {
      await sendMessage('', [res.data]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      uploadFile(files[0]);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  if (isRecording) {
    return (
      <div className="p-3 bg-dfz-bg border-t border-dfz-border">
        <VoiceRecorder
          onSend={handleVoiceSend}
          onCancel={() => setIsRecording(false)}
        />
      </div>
    );
  }

  return (
    <div className="relative p-2.5 bg-dfz-bg border-t border-dfz-border">
      {/* Uploading progress indicator */}
      {isUploading && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-dfz-surface overflow-hidden">
          <div
            className="h-full bg-dfz-accent transition-all duration-300"
            style={{ width: `${uploadProgress}%` }}
          />
        </div>
      )}

      {/* Reply or Edit Preview Bar */}
      {(replyTo || editingMessage) && (
        <div className="flex items-center justify-between px-3 py-1.5 mb-2 bg-dfz-surface border border-dfz-border rounded-dfz-lg text-xs animate-slide-up">
          <div className="flex items-center gap-2 overflow-hidden">
            {editingMessage ? (
              <Edit3 size={14} className="text-dfz-accent flex-shrink-0" />
            ) : (
              <Reply size={14} className="text-dfz-accent flex-shrink-0" />
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

      {/* Composer Input Box */}
      <div className="flex items-end gap-2 bg-dfz-surface border border-dfz-border rounded-dfz-xl px-2 py-1.5 focus-within:border-dfz-border-focus transition-colors">
        {/* Attachment Button */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="p-2 text-dfz-text-muted hover:text-dfz-text hover:bg-dfz-surface-hover rounded-full transition-colors flex-shrink-0 mb-0.5"
          title="Прикрепить файл"
        >
          <Paperclip size={18} />
        </button>

        {/* Emoji Button */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="p-2 text-dfz-text-muted hover:text-dfz-text hover:bg-dfz-surface-hover rounded-full transition-colors flex-shrink-0 mb-0.5"
            title="Эмодзи"
          >
            <Smile size={18} />
          </button>
          {showEmojiPicker && (
            <div className="absolute bottom-12 left-0 z-30">
              <EmojiPicker
                onSelect={(emoji) => {
                  setText((prev) => prev + emoji);
                  setShowEmojiPicker(false);
                  textareaRef.current?.focus();
                }}
                onClose={() => setShowEmojiPicker(false)}
              />
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

        {/* Voice or Send Button */}
        {text.trim() || editingMessage ? (
          <button
            type="button"
            onClick={handleSend}
            className="p-2 bg-dfz-accent hover:bg-dfz-accent-hover text-white rounded-full transition-colors flex-shrink-0 mb-0.5 shadow-dfz-sm animate-scale-in"
            title="Отправить"
          >
            <Send size={16} />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setIsRecording(true)}
            className="p-2 text-dfz-text-muted hover:text-dfz-accent hover:bg-dfz-surface-hover rounded-full transition-colors flex-shrink-0 mb-0.5"
            title="Записать голосовое сообщение"
          >
            <Mic size={18} />
          </button>
        )}
      </div>
    </div>
  );
};
