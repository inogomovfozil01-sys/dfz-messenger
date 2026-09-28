'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Search, User as UserIcon, Users, Check, X, Sparkles } from 'lucide-react';
import { Avatar } from '../ui/Avatar';
import { useAuthStore } from '../../stores/authStore';
import { useChatStore } from '../../stores/chatStore';
import { apiRequest } from '../../lib/api';

export interface RecipientUser {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string | null;
  isSelf: boolean;
}

interface RecipientPickerProps {
  selectedRecipient: RecipientUser | null;
  onSelect: (recipient: RecipientUser) => void;
  allowSelf?: boolean;
}

export const RecipientPicker: React.FC<RecipientPickerProps> = ({
  selectedRecipient,
  onSelect,
  allowSelf = true,
}) => {
  const { user, profile } = useAuthStore();
  const { chats } = useChatStore();

  const [isOpen, setIsOpen] = useState(false);
  const [contacts, setContacts] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [manualError, setManualError] = useState('');

  // Load contacts
  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      apiRequest<any[]>('/api/contacts')
        .then((res) => {
          if (res.success && res.data) setContacts(res.data);
        })
        .finally(() => setIsLoading(false));
    }
  }, [isOpen]);

  // Combine contacts + direct chats into unified user list
  const availableUsers = useMemo(() => {
    const map = new Map<string, RecipientUser>();

    // 1. Direct chats
    chats.forEach((chat) => {
      if (chat.type === 'DIRECT') {
        const other = chat.members?.find((m) => m.userId !== user?.id);
        const u = (other as any)?.user;
        const uid = u?.id || other?.userId;
        if (uid && uid !== user?.id) {
          map.set(uid, {
            id: uid,
            username: u?.username || (other as any)?.username || 'user',
            displayName: u?.profile?.displayName || chat.title || 'User',
            avatarUrl: u?.profile?.avatarUrl || chat.avatarUrl,
            isSelf: false,
          });
        }
      }
    });

    // 2. Contacts
    contacts.forEach((c) => {
      const u = c.contactUser || c.user || c;
      if (u && u.id && u.id !== user?.id) {
        map.set(u.id, {
          id: u.id,
          username: u.username,
          displayName: u.profile?.displayName || u.displayName || u.username,
          avatarUrl: u.profile?.avatarUrl || u.avatarUrl,
          isSelf: false,
        });
      }
    });

    let list = Array.from(map.values());

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().replace(/^@/, '');
      list = list.filter(
        (u) =>
          u.username.toLowerCase().includes(q) ||
          u.displayName.toLowerCase().includes(q)
      );
    }

    return list;
  }, [chats, contacts, user, searchQuery]);

  const handleSelectSelf = () => {
    if (!user) return;
    onSelect({
      id: user.id,
      username: user.username,
      displayName: profile?.displayName || user.username,
      avatarUrl: profile?.avatarUrl,
      isSelf: true,
    });
    setIsOpen(false);
  };

  const handleSelectContact = (u: RecipientUser) => {
    onSelect(u);
    setIsOpen(false);
  };

  const handleSearchManual = async () => {
    const clean = searchQuery.trim().replace(/^@/, '');
    if (!clean) return;
    if (user && clean.toLowerCase() === user.username.toLowerCase()) {
      handleSelectSelf();
      return;
    }

    setManualError('');
    setIsLoading(true);
    const res = await apiRequest<any>(`/api/users/profile/${clean}`);
    setIsLoading(false);

    if (res.success && res.data) {
      const foundUser = res.data;
      onSelect({
        id: foundUser.id,
        username: foundUser.username,
        displayName: foundUser.profile?.displayName || foundUser.username,
        avatarUrl: foundUser.profile?.avatarUrl,
        isSelf: foundUser.id === user?.id,
      });
      setIsOpen(false);
    } else {
      setManualError('Пользователь не найден. Проверьте @username.');
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="font-semibold text-dfz-text text-xs">Получатель</label>
        {allowSelf && (
          <button
            type="button"
            onClick={handleSelectSelf}
            className={`text-[11px] font-semibold flex items-center gap-1 transition-colors ${
              selectedRecipient?.isSelf
                ? 'text-[#8774e1]'
                : 'text-dfz-text-muted hover:text-[#8774e1]'
            }`}
          >
            <Sparkles size={11} />
            <span>Подарить себе</span>
          </button>
        )}
      </div>

      {/* Selected Recipient Card */}
      {selectedRecipient ? (
        <div className="flex items-center justify-between p-3 rounded-xl bg-[#212126] border border-[#292930]">
          <div className="flex items-center gap-2.5 min-w-0">
            <Avatar
              src={selectedRecipient.avatarUrl || undefined}
              name={selectedRecipient.displayName}
              size="sm"
              className="w-8 h-8 text-xs shrink-0"
            />
            <div className="min-w-0">
              <div className="text-xs font-bold text-dfz-text flex items-center gap-1.5 truncate">
                <span className="truncate">{selectedRecipient.displayName}</span>
                {selectedRecipient.isSelf && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#8774e1]/20 text-[#8774e1] font-semibold shrink-0">
                    Себе
                  </span>
                )}
              </div>
              <div className="text-[11px] text-dfz-text-muted font-mono truncate">
                @{selectedRecipient.username}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="text-xs text-[#8774e1] hover:underline font-semibold shrink-0 ml-2"
          >
            Изменить
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="w-full py-2.5 px-3 rounded-xl bg-[#212126] hover:bg-[#28282e] border border-dashed border-[#383842] hover:border-[#8774e1] text-dfz-text-muted hover:text-dfz-text text-xs flex items-center justify-center gap-2 transition-colors"
        >
          <Users size={14} className="text-[#8774e1]" />
          <span>Выбрать из контактов или чатов</span>
        </button>
      )}

      {/* Recipient Selector Modal Dialog */}
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-sm rounded-2xl bg-[#18181c] border border-[#292930] p-4 space-y-3.5 shadow-2xl text-xs flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between border-b border-[#292930] pb-2.5">
              <span className="font-bold text-white text-sm">Выбор получателя</span>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-lg hover:bg-[#28282e] text-dfz-text-muted hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            {/* Quick Option: Gift to myself */}
            {allowSelf && user && (
              <div
                onClick={handleSelectSelf}
                className={`p-2.5 rounded-xl cursor-pointer flex items-center justify-between transition-colors border ${
                  selectedRecipient?.isSelf
                    ? 'bg-[#8774e1]/15 border-[#8774e1]/40'
                    : 'bg-[#212126] hover:bg-[#28282e] border-[#292930]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Avatar
                    src={profile?.avatarUrl || undefined}
                    name={profile?.displayName || user.username}
                    size="sm"
                    className="w-8 h-8 text-xs ring-1 ring-[#8774e1]/40"
                  />
                  <div>
                    <div className="text-xs font-bold text-white flex items-center gap-1.5">
                      <span>Подарить себе (в свой профиль)</span>
                    </div>
                    <div className="text-[11px] text-[#8e8e93] font-mono">@{user.username}</div>
                  </div>
                </div>
                {selectedRecipient?.isSelf && <Check size={16} className="text-[#8774e1]" />}
              </div>
            )}

            {/* Search Input */}
            <div className="relative">
              <Search size={14} className="absolute left-3 top-2.5 text-dfz-text-muted" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setManualError('');
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSearchManual();
                  }
                }}
                placeholder="Поиск по контактам или @username..."
                className="w-full h-8 pl-8 pr-16 rounded-xl bg-[#212126] border border-[#292930] text-xs text-white placeholder:text-dfz-text-muted focus:outline-none focus:border-[#8774e1]"
                autoFocus
              />
              {searchQuery.trim() && (
                <button
                  type="button"
                  onClick={handleSearchManual}
                  className="absolute right-1.5 top-1 px-2 py-1 rounded bg-[#8774e1] text-white text-[10px] font-bold"
                >
                  Найти
                </button>
              )}
            </div>

            {manualError && (
              <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[11px]">
                {manualError}
              </div>
            )}

            {/* User List */}
            <div className="flex-1 overflow-y-auto space-y-1 pr-1 max-h-[300px]">
              <div className="text-[10px] uppercase font-bold text-dfz-text-muted px-1 py-0.5">
                Контакты и чаты
              </div>

              {availableUsers.length === 0 ? (
                <div className="p-6 text-center text-dfz-text-muted text-xs">
                  {searchQuery.trim()
                    ? 'Контакты не найдены. Нажмите «Найти» для глобального поиска по @username.'
                    : 'Список контактов пуст. Введите @username пользователя выше.'}
                </div>
              ) : (
                availableUsers.map((u) => {
                  const isSelected = selectedRecipient?.id === u.id;
                  return (
                    <div
                      key={u.id}
                      onClick={() => handleSelectContact(u)}
                      className={`p-2 rounded-xl cursor-pointer flex items-center justify-between transition-colors border ${
                        isSelected
                          ? 'bg-[#8774e1]/15 border-[#8774e1]/40'
                          : 'bg-[#212126]/60 hover:bg-[#212126] border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Avatar
                          src={u.avatarUrl || undefined}
                          name={u.displayName}
                          size="sm"
                          className="w-7 h-7 text-xs shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-white truncate">
                            {u.displayName}
                          </div>
                          <div className="text-[11px] text-dfz-text-muted font-mono truncate">
                            @{u.username}
                          </div>
                        </div>
                      </div>
                      {isSelected && <Check size={16} className="text-[#8774e1] shrink-0" />}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
