import React, { useState } from 'react';
import { X, Plus, Trash2, BarChart2 } from 'lucide-react';
import { apiRequest } from '../../lib/api';

interface CreatePollModalProps {
  chatId: string;
  isOpen: boolean;
  onClose: () => void;
  onPollCreated?: (message: any) => void;
}

export const CreatePollModal: React.FC<CreatePollModalProps> = ({
  chatId,
  isOpen,
  onClose,
  onPollCreated,
}) => {
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState<string[]>(['', '']);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [allowMultiple, setAllowMultiple] = useState(false);
  const [isQuiz, setIsQuiz] = useState(false);
  const [correctOptionIndex, setCorrectOptionIndex] = useState(0);
  const [explanation, setExplanation] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleOptionChange = (idx: number, val: string) => {
    const updated = [...options];
    updated[idx] = val;
    setOptions(updated);
  };

  const handleAddOption = () => {
    if (options.length < 10) {
      setOptions([...options, '']);
    }
  };

  const handleRemoveOption = (idx: number) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== idx));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const validOptions = options.map((o) => o.trim()).filter(Boolean);

    if (!question.trim()) {
      setErrorMsg('Введите вопрос опроса');
      return;
    }

    if (validOptions.length < 2) {
      setErrorMsg('Добавьте минимум 2 варианта ответа');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await apiRequest<{ message: any }>('/api/polls', {
        method: 'POST',
        body: JSON.stringify({
          chatId,
          question: question.trim(),
          options: validOptions,
          isAnonymous: isQuiz ? false : isAnonymous,
          allowMultiple: isQuiz ? false : allowMultiple,
          isQuiz,
          correctOptionIndex: isQuiz ? correctOptionIndex : undefined,
          explanation: isQuiz ? explanation.trim() : undefined,
        }),
      });

      if (!res.success) {
        throw new Error(res.error?.message || 'Не удалось создать опрос');
      }

      if (onPollCreated && res.data?.message) {
        onPollCreated(res.data.message);
      }

      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Ошибка создания опроса');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 select-none animate-fade-in">
      <div className="relative w-full max-w-md bg-dfz-surface border border-dfz-border rounded-dfz-2xl shadow-dfz-modal overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-dfz-border">
          <div className="flex items-center gap-2">
            <BarChart2 size={18} className="text-dfz-accent" />
            <h3 className="text-sm font-bold text-dfz-text">Создать опрос</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-full text-dfz-text-muted hover:text-dfz-text hover:bg-dfz-surface-hover"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 flex-1 overflow-y-auto space-y-4">
          {errorMsg && (
            <div className="p-2.5 rounded-dfz-md bg-dfz-danger/10 border border-dfz-danger/30 text-dfz-danger text-xs">
              {errorMsg}
            </div>
          )}

          {/* Question */}
          <div>
            <label className="block text-xs font-semibold text-dfz-text mb-1">Вопрос</label>
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Задайте вопрос..."
              maxLength={250}
              className="w-full h-9 px-3 bg-dfz-bg border border-dfz-border rounded-dfz-lg text-xs text-dfz-text placeholder:text-dfz-text-muted focus:outline-none focus:border-dfz-border-focus"
            />
          </div>

          {/* Options */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-dfz-text">Варианты ответа</label>
              {isQuiz && (
                <span className="text-[11px] text-emerald-400 font-medium">
                  Выберите верный ответ
                </span>
              )}
            </div>
            {options.map((opt, idx) => (
              <div key={idx} className="flex items-center gap-2">
                {isQuiz && (
                  <button
                    type="button"
                    onClick={() => setCorrectOptionIndex(idx)}
                    className={`w-5 h-5 rounded-full border flex items-center justify-center flex-shrink-0 transition-colors ${
                      correctOptionIndex === idx
                        ? 'border-emerald-500 bg-emerald-500 text-white'
                        : 'border-dfz-border bg-dfz-bg hover:border-emerald-500/50'
                    }`}
                    title="Выбрать как правильный ответ"
                  >
                    {correctOptionIndex === idx && <span className="w-2 h-2 rounded-full bg-white" />}
                  </button>
                )}
                <input
                  type="text"
                  value={opt}
                  onChange={(e) => handleOptionChange(idx, e.target.value)}
                  placeholder={`Вариант ${idx + 1}`}
                  maxLength={100}
                  className="flex-1 h-9 px-3 bg-dfz-bg border border-dfz-border rounded-dfz-lg text-xs text-dfz-text placeholder:text-dfz-text-muted focus:outline-none focus:border-dfz-border-focus"
                />
                {options.length > 2 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveOption(idx)}
                    className="p-2 text-dfz-text-muted hover:text-dfz-danger rounded-dfz-md transition-colors"
                  >
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
            ))}

            {options.length < 10 && (
              <button
                type="button"
                onClick={handleAddOption}
                className="flex items-center gap-1.5 text-xs font-semibold text-dfz-accent hover:underline pt-1"
              >
                <Plus size={14} />
                <span>Добавить вариант</span>
              </button>
            )}
          </div>

          {/* Toggles */}
          <div className="space-y-3 pt-2 border-t border-dfz-border">
            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <span className="text-xs text-dfz-text font-medium block">Режим викторины (Quiz)</span>
                <span className="text-[11px] text-dfz-text-muted">Опрос имеет правильный ответ</span>
              </div>
              <input
                type="checkbox"
                checked={isQuiz}
                onChange={(e) => {
                  setIsQuiz(e.target.checked);
                  if (e.target.checked) setAllowMultiple(false);
                }}
                className="w-4 h-4 rounded text-dfz-accent bg-dfz-bg border-dfz-border focus:ring-dfz-accent"
              />
            </label>

            {isQuiz && (
              <div className="animate-scale-in">
                <label className="block text-xs font-semibold text-dfz-text mb-1">
                  Объяснение правильного ответа
                </label>
                <textarea
                  value={explanation}
                  onChange={(e) => setExplanation(e.target.value)}
                  placeholder="Пользователи увидят объяснение после голосования..."
                  rows={2}
                  className="w-full p-2 bg-dfz-bg border border-dfz-border rounded-dfz-lg text-xs text-dfz-text placeholder:text-dfz-text-muted focus:outline-none focus:border-dfz-border-focus resize-none"
                />
              </div>
            )}

            {!isQuiz && (
              <>
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-xs text-dfz-text font-medium">Анонимное голосование</span>
                  <input
                    type="checkbox"
                    checked={isAnonymous}
                    onChange={(e) => setIsAnonymous(e.target.checked)}
                    className="w-4 h-4 rounded text-dfz-accent bg-dfz-bg border-dfz-border focus:ring-dfz-accent"
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-xs text-dfz-text font-medium">Выбор нескольких ответов</span>
                  <input
                    type="checkbox"
                    checked={allowMultiple}
                    onChange={(e) => setAllowMultiple(e.target.checked)}
                    className="w-4 h-4 rounded text-dfz-accent bg-dfz-bg border-dfz-border focus:ring-dfz-accent"
                  />
                </label>
              </>
            )}
          </div>

          {/* Footer Submit */}
          <div className="pt-3 border-t border-dfz-border flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-dfz-lg text-xs font-semibold text-dfz-text-muted hover:bg-dfz-surface transition-colors"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-dfz-lg bg-dfz-accent hover:bg-dfz-accent-hover text-white text-xs font-semibold shadow-dfz-sm disabled:opacity-50 transition-colors"
            >
              {isSubmitting ? 'Создание...' : 'Создать опрос'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
