import React, { useState } from 'react';
import { X, Calendar, Clock, Send, Trash2, CheckCircle2 } from 'lucide-react';
import { format, addHours, addDays, setHours, setMinutes } from 'date-fns';
import { ru } from 'date-fns/locale';

export interface ScheduledMessageItem {
  id: string;
  chatId: string;
  content: string;
  scheduledFor: string; // ISO string
  createdAt: string;
  silent?: boolean;
}

interface ScheduledMessagesModalProps {
  isOpen: boolean;
  onClose: () => void;
  chatId: string;
  messageText?: string;
  onSchedule?: (item: ScheduledMessageItem) => void;
}

export const ScheduledMessagesModal: React.FC<ScheduledMessagesModalProps> = ({
  isOpen,
  onClose,
  chatId,
  messageText = '',
  onSchedule,
}) => {
  const [selectedPreset, setSelectedPreset] = useState<'today' | 'tomorrow' | 'custom'>('today');
  const [customDate, setCustomDate] = useState(() => format(addDays(new Date(), 1), 'yyyy-MM-dd'));
  const [customTime, setCustomTime] = useState('12:00');
  const [scheduledList, setScheduledList] = useState<ScheduledMessageItem[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const all: ScheduledMessageItem[] = JSON.parse(localStorage.getItem('dfz_scheduled_msgs') || '[]');
      return all.filter((m) => m.chatId === chatId);
    } catch {
      return [];
    }
  });

  if (!isOpen) return null;

  const handleSave = () => {
    let targetDate = new Date();
    if (selectedPreset === 'today') {
      targetDate = setMinutes(setHours(targetDate, targetDate.getHours() + 2), 0);
    } else if (selectedPreset === 'tomorrow') {
      targetDate = setMinutes(setHours(addDays(new Date(), 1), 9), 0);
    } else {
      const [year, month, day] = customDate.split('-').map(Number);
      const [hours, minutes] = customTime.split(':').map(Number);
      targetDate = new Date(year, month - 1, day, hours, minutes);
    }

    const newItem: ScheduledMessageItem = {
      id: 'sched_' + Date.now(),
      chatId,
      content: messageText.trim() || 'Запланированное сообщение',
      scheduledFor: targetDate.toISOString(),
      createdAt: new Date().toISOString(),
    };

    try {
      const all: ScheduledMessageItem[] = JSON.parse(localStorage.getItem('dfz_scheduled_msgs') || '[]');
      const updated = [...all, newItem];
      localStorage.setItem('dfz_scheduled_msgs', JSON.stringify(updated));
      setScheduledList(updated.filter((m) => m.chatId === chatId));
    } catch {}

    if (onSchedule) onSchedule(newItem);
    onClose();
  };

  const handleDelete = (id: string) => {
    try {
      const all: ScheduledMessageItem[] = JSON.parse(localStorage.getItem('dfz_scheduled_msgs') || '[]');
      const updated = all.filter((m) => m.id !== id);
      localStorage.setItem('dfz_scheduled_msgs', JSON.stringify(updated));
      setScheduledList(updated.filter((m) => m.chatId === chatId));
    } catch {}
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 select-none animate-fade-in">
      <div className="relative w-full max-w-md bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--border-subtle)]">
          <div className="flex items-center gap-2">
            <Calendar size={18} className="text-[var(--accent-primary)]" />
            <h3 className="text-sm font-bold text-[var(--text-primary)]">Запланированные сообщения</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-full text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)]"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-4 overflow-y-auto flex-1 text-xs">
          {messageText ? (
            <div className="space-y-3 p-3 rounded-xl bg-[var(--bg-surface-secondary)] border border-[var(--border-subtle)]">
              <span className="font-semibold text-[var(--text-secondary)]">Текст для отправки:</span>
              <p className="text-sm text-[var(--text-primary)] whitespace-pre-wrap font-medium line-clamp-3">
                {messageText}
              </p>

              <div className="pt-2 border-t border-[var(--border-subtle)] space-y-2">
                <span className="font-semibold text-[var(--text-primary)] block">Когда отправить:</span>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedPreset('today')}
                    className={`py-2 px-2.5 rounded-lg border text-center font-medium transition-all ${
                      selectedPreset === 'today'
                        ? 'bg-[var(--accent-primary)] border-[var(--accent-primary)] text-white shadow-sm'
                        : 'bg-[var(--bg-surface)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    Сегодня (через 2ч)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedPreset('tomorrow')}
                    className={`py-2 px-2.5 rounded-lg border text-center font-medium transition-all ${
                      selectedPreset === 'tomorrow'
                        ? 'bg-[var(--accent-primary)] border-[var(--accent-primary)] text-white shadow-sm'
                        : 'bg-[var(--bg-surface)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    Завтра в 09:00
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedPreset('custom')}
                    className={`py-2 px-2.5 rounded-lg border text-center font-medium transition-all ${
                      selectedPreset === 'custom'
                        ? 'bg-[var(--accent-primary)] border-[var(--accent-primary)] text-white shadow-sm'
                        : 'bg-[var(--bg-surface)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    Точное время
                  </button>
                </div>

                {selectedPreset === 'custom' && (
                  <div className="flex gap-2 pt-2 animate-scale-in">
                    <input
                      type="date"
                      value={customDate}
                      onChange={(e) => setCustomDate(e.target.value)}
                      className="flex-1 h-9 px-2.5 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-lg text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]"
                    />
                    <input
                      type="time"
                      value={customTime}
                      onChange={(e) => setCustomTime(e.target.value)}
                      className="w-24 h-9 px-2.5 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-lg text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]"
                    />
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={handleSave}
                className="w-full mt-2 py-2.5 bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] text-white rounded-xl font-semibold shadow-md transition-all active:scale-[0.99] flex items-center justify-center gap-2"
              >
                <Clock size={16} />
                <span>Запланировать отправку</span>
              </button>
            </div>
          ) : null}

          {/* Existing Scheduled Messages in this chat */}
          <div className="space-y-2">
            <span className="font-bold text-[var(--text-secondary)] uppercase tracking-wider text-[11px] block">
              В очереди на отправку ({scheduledList.length})
            </span>

            {scheduledList.length === 0 ? (
              <div className="p-6 text-center text-[var(--text-tertiary)] italic">
                Нет запланированных сообщений
              </div>
            ) : (
              scheduledList.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-3 p-3 rounded-xl bg-[var(--bg-surface-secondary)] border border-[var(--border-subtle)]"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-[var(--text-primary)] truncate font-medium">{item.content}</p>
                    <div className="flex items-center gap-1.5 text-[11px] text-[var(--accent-primary)] font-mono mt-1">
                      <Clock size={12} />
                      <span>{format(new Date(item.scheduledFor), 'dd.MM.yyyy HH:mm', { locale: ru })}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDelete(item.id)}
                    className="p-1.5 text-[var(--text-secondary)] hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                    title="Удалить"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
