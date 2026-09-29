import React, { useState } from 'react';
import { Poll, PollOption } from '@dfz/types';
import { BarChart2, Check, Lock, Users } from 'lucide-react';
import { apiRequest } from '../../lib/api';
import { useAuthStore } from '../../stores/authStore';

interface PollBubbleProps {
  poll: Poll;
  isOwnMessage: boolean;
  onPollUpdated?: (updatedPoll: Poll) => void;
}

export const PollBubble: React.FC<PollBubbleProps> = ({ poll, isOwnMessage, onPollUpdated }) => {
  const { user } = useAuthStore();
  const [currentPoll, setCurrentPoll] = useState<Poll>(poll);
  const [isVoting, setIsVoting] = useState(false);

  // Sync if prop changes
  React.useEffect(() => {
    setCurrentPoll(poll);
  }, [poll]);

  const handleVote = async (optionId: string) => {
    if (currentPoll.isClosed || isVoting) return;

    setIsVoting(true);
    try {
      const res = await apiRequest<Poll>(`/api/polls/${currentPoll.id}/vote`, {
        method: 'POST',
        body: JSON.stringify({ optionId }),
      });

      if (res.success && res.data) {
        setCurrentPoll(res.data);
        if (onPollUpdated) onPollUpdated(res.data);
      }
    } finally {
      setIsVoting(false);
    }
  };

  const handleClosePoll = async () => {
    if (currentPoll.isClosed) return;
    if (!confirm('Завершить опрос? Новые голоса приниматься не будут.')) return;

    const res = await apiRequest<Poll>(`/api/polls/${currentPoll.id}/close`, {
      method: 'POST',
    });

    if (res.success && res.data) {
      setCurrentPoll(res.data);
      if (onPollUpdated) onPollUpdated(res.data);
    }
  };

  const hasVotedAny = currentPoll.hasVoted || (currentPoll.userVotes && currentPoll.userVotes.length > 0);
  const showResults = hasVotedAny || currentPoll.isClosed;

  return (
    <div className="w-full max-w-sm rounded-dfz-xl bg-dfz-surface/90 border border-dfz-border p-3.5 space-y-3 select-none text-dfz-text">
      {/* Header */}
      <div className="space-y-1">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-dfz-accent">
          <BarChart2 size={14} />
          <span>
            {(currentPoll as any).isQuiz
              ? 'Викторина'
              : currentPoll.isClosed
              ? 'Опрос завершен'
              : currentPoll.isAnonymous
              ? 'Анонимный опрос'
              : 'Публичный опрос'}
          </span>
          {currentPoll.allowMultiple && (
            <span className="text-dfz-text-muted font-normal">• Несколько ответов</span>
          )}
        </div>
        <h4 className="text-sm font-bold leading-snug">{currentPoll.question}</h4>
      </div>

      {/* Options List */}
      <div className="space-y-2">
        {currentPoll.options.map((opt) => {
          const isSelected = currentPoll.userVotes?.includes(opt.id) || opt.hasVoted;

          return (
            <div
              key={opt.id}
              onClick={() => handleVote(opt.id)}
              className={`relative overflow-hidden rounded-dfz-lg border p-2.5 transition-all cursor-pointer ${
                isSelected
                  ? 'border-dfz-accent bg-dfz-accent/10 shadow-dfz-sm'
                  : 'border-dfz-border hover:border-dfz-accent/40 bg-dfz-bg'
              } ${currentPoll.isClosed ? 'cursor-default opacity-85' : 'active:scale-[0.99]'}`}
            >
              {/* Animated Progress Bar fill */}
              {showResults && (
                <div
                  className="absolute inset-y-0 left-0 bg-dfz-accent/20 transition-all duration-500 ease-out -z-0"
                  style={{ width: `${opt.percentage || 0}%` }}
                />
              )}

              <div className="relative z-10 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  {/* Selector Icon */}
                  <div
                    className={`w-4 h-4 rounded-${
                      currentPoll.allowMultiple ? 'sm' : 'full'
                    } border flex items-center justify-center transition-colors flex-shrink-0 ${
                      isSelected
                        ? 'bg-dfz-accent border-dfz-accent text-white'
                        : 'border-dfz-text-muted/60 bg-dfz-surface'
                    }`}
                  >
                    {isSelected && <Check size={11} strokeWidth={3} />}
                  </div>

                  <span className={`text-xs ${isSelected ? 'font-semibold text-dfz-text' : 'text-dfz-text'}`}>
                    {opt.text}
                  </span>
                </div>

                {/* Percentage & Vote count */}
                {showResults && (
                  <div className="flex items-center gap-1.5 text-xs font-mono flex-shrink-0">
                    <span className="font-bold text-dfz-text">{opt.percentage || 0}%</span>
                    <span className="text-[10px] text-dfz-text-muted">({opt.voteCount})</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Quiz Explanation */}
      {showResults && (currentPoll as any).explanation && (
        <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-xs text-emerald-300 animate-scale-in">
          <span className="font-semibold text-emerald-400 block mb-0.5">💡 Объяснение:</span>
          <p>{(currentPoll as any).explanation}</p>
        </div>
      )}

      {/* Footer Info & Actions */}
      <div className="flex items-center justify-between text-[11px] text-dfz-text-muted pt-1 border-t border-dfz-border/50">
        <div className="flex items-center gap-1 font-mono">
          <Users size={12} />
          <span>{currentPoll.totalVotes || 0} голосов</span>
        </div>

        {isOwnMessage && !currentPoll.isClosed && (
          <button
            type="button"
            onClick={handleClosePoll}
            className="flex items-center gap-1 text-dfz-danger hover:underline font-semibold"
          >
            <Lock size={12} />
            <span>Завершить опрос</span>
          </button>
        )}
      </div>
    </div>
  );
};
