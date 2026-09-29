import React from 'react';
import { Avatar } from '../ui/Avatar';

interface MemberItem {
  id: string;
  username?: string;
  displayName?: string;
  avatarUrl?: string;
}

interface MentionSuggestionsProps {
  query: string;
  members: MemberItem[];
  onSelect: (username: string) => void;
  onClose: () => void;
}

export const MentionSuggestions: React.FC<MentionSuggestionsProps> = ({
  query,
  members,
  onSelect,
  onClose,
}) => {
  const filtered = members.filter((m) => {
    const q = query.toLowerCase();
    const matchUser = m.username?.toLowerCase().includes(q);
    const matchName = m.displayName?.toLowerCase().includes(q);
    return matchUser || matchName;
  });

  if (filtered.length === 0) return null;

  return (
    <div className="absolute bottom-full left-0 mb-2 w-64 max-h-48 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl shadow-2xl overflow-y-auto z-40 p-1 select-none animate-scale-in">
      <div className="px-2.5 py-1 text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">
        Участники чата
      </div>
      {filtered.map((member) => (
        <button
          key={member.id}
          type="button"
          onClick={() => onSelect(member.username || member.id)}
          className="w-full flex items-center gap-2.5 p-2 rounded-lg hover:bg-[var(--bg-surface-hover)] transition-colors text-left"
        >
          <Avatar
            src={member.avatarUrl}
            name={member.displayName || member.username || 'User'}
            size="sm"
          />
          <div className="min-w-0 flex-1">
            <h4 className="text-xs font-semibold text-[var(--text-primary)] truncate">
              {member.displayName || member.username}
            </h4>
            {member.username && (
              <p className="text-[11px] text-[var(--accent-primary)] truncate font-mono">
                @{member.username}
              </p>
            )}
          </div>
        </button>
      ))}
    </div>
  );
};
