function reconnectChats() { const state = useChatStore.getState(); void state.fetchChats(); if (state.activeChatId) void state.selectChat(state.activeChatId); }
import { useAuthStore } from './authStore';
import { create } from 'zustand';
import { Chat, Message, ChatType, ReceiptStatus, MessageType } from '@dfz/types';
import { apiRequest } from '../lib/api';
import { socketService } from '../lib/socket';
import { sounds } from '../lib/sounds';

export type FolderFilter = 'all' | 'personal' | 'groups' | 'channels' | 'unread' | 'archive';

interface ChatState {
  chats: Chat[];
  activeChatId: string | null;
  activeChat: Chat | null;
  messages: Record<string, Message[]>;
  drafts: Record<string, string>;
  connectionStatus: 'connected' | 'connecting' | 'updating' | 'offline';
  hasMore: Record<string, boolean>;
  nextCursor: Record<string, string | null>;
  typingUsers: Record<string, string[]>;
  activeFolder: FolderFilter;
  isInfoPanelOpen: boolean;
  replyTo: Message | null;
  editingMessage: Message | null;
  searchQuery: string;
  isLoadingChats: boolean;
  isLoadingMessages: boolean;

  // In-chat Search
  isSearchingInChat: boolean;
  inChatSearchQuery: string;
  inChatSearchResults: any[];

  // Multi-select & Forward
  isSelectMode: boolean;
  selectedMessageIds: string[];
  forwardingMessage: Message | null;
  isForwardOpen: boolean;

  // Management modals
  activeGroupManageChat: Chat | null;
  activeChannelManageChat: Chat | null;

  // Actions
  setDraft: (chatId: string, content: string) => void;
  setConnectionStatus: (status: 'connected' | 'connecting' | 'updating' | 'offline') => void;
  fetchChats: () => Promise<void>;
  selectChat: (chatId: string) => Promise<void>;
  fetchMessages: (chatId: string, cursor?: string) => Promise<void>;
  sendMessage: (content: string, attachments?: any[], type?: MessageType) => Promise<void>;
  editMessage: (messageId: string, content: string) => Promise<void>;
  deleteMessage: (messageId: string) => Promise<void>;
  addReaction: (messageId: string, emoji: string) => Promise<void>;
  removeReaction: (messageId: string, emoji: string) => Promise<void>;
  markAsRead: (chatId: string) => Promise<void>;
  togglePinChat: (chatId: string, isPinned: boolean) => Promise<void>;
  toggleMuteChat: (chatId: string, isMuted: boolean) => Promise<void>;
  toggleArchiveChat: (chatId: string, isArchived: boolean) => Promise<void>;
  clearChatHistory: (chatId: string) => Promise<void>;
  deleteChat: (chatId: string) => Promise<void>;
  pinMessage: (chatId: string, messageId: string) => Promise<void>;
  unpinMessage: (chatId: string, messageId: string) => Promise<void>;
  setActiveFolder: (folder: FolderFilter) => void;
  setSearchQuery: (q: string) => void;
  setReplyTo: (msg: Message | null) => void;
  setEditingMessage: (msg: Message | null) => void;
  toggleInfoPanel: () => void;
  setTyping: (chatId: string, isTyping: boolean) => void;

  // In-Chat Search Actions
  toggleSearchInChat: () => void;
  searchInChat: (query: string) => Promise<void>;

  // Selection & Forwarding Actions
  setSelectMode: (enabled: boolean) => void;
  toggleSelectMessage: (id: string) => void;
  clearSelectedMessages: () => void;
  bulkDeleteMessages: () => Promise<void>;
  openForward: (msg: Message) => void;
  closeForward: () => void;
  forwardToChat: (targetChatId: string) => Promise<boolean>;

  // Manage modals
  setGroupManageChat: (chat: Chat | null) => void;
  setChannelManageChat: (chat: Chat | null) => void;

  // Socket event dispatchers
  onMessageReceived: (message: Message) => void;
  onMessageEdited: (message: Message) => void;
  onMessageDeleted: (data: { messageId: string; chatId: string }) => void;
  onReceiptReceived: (data: { chatId: string; messageIds: string[]; status: ReceiptStatus; userId: string }) => void;
  onReactionReceived: (data: { chatId: string; messageId: string; emoji: string; userId: string; username: string; action: 'add' | 'remove' }) => void;
  onTypingReceived: (data: { chatId: string; userId: string; username: string; isTyping: boolean }) => void;
  setupSocketListeners: () => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  chats: [],
  activeChatId: null,
  activeChat: null,
  messages: {},
  hasMore: {},
  nextCursor: {},
  typingUsers: {},
  activeFolder: 'all',
  isInfoPanelOpen: false,
  replyTo: null,
  editingMessage: null,
  searchQuery: '',
  isLoadingChats: false,
  isLoadingMessages: false,

  // In-chat Search
  isSearchingInChat: false,
  inChatSearchQuery: '',
  inChatSearchResults: [],

  // Multi-select & Forward
  isSelectMode: false,
  selectedMessageIds: [],
  forwardingMessage: null,
  isForwardOpen: false,

  activeGroupManageChat: null,
  activeChannelManageChat: null,

  drafts: (() => {
    if (typeof window === 'undefined') return {};
    try {
      return JSON.parse(localStorage.getItem('dfz_drafts') || '{}');
    } catch {
      return {};
    }
  })(),
  connectionStatus: 'connected',
  setDraft: (chatId: string, content: string) => {
    set((state) => {
      const next = { ...state.drafts };
      if (!content || !content.trim()) {
        delete next[chatId];
      } else {
        next[chatId] = content;
      }
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('dfz_drafts', JSON.stringify(next));
        } catch {}
      }
      return { drafts: next };
    });
  },
  setConnectionStatus: (status) => set({ connectionStatus: status }),

  fetchChats: async () => {
    set({ isLoadingChats: true });
    const res = await apiRequest<Chat[]>('/api/chats');
    if (res.success && res.data) {
      set({ chats: res.data, isLoadingChats: false });
    } else {
      set({ isLoadingChats: false });
    }
  },

  selectChat: async (chatId: string) => {
    const { activeChatId } = get();
    const socket = socketService.getSocket();

    if (activeChatId) {
      socket.emit('chat:leave', activeChatId);
    }

    set({
      activeChatId: chatId,
      activeChat: null,
      isSearchingInChat: false,
      isInfoPanelOpen: false,
      replyTo: null,
      editingMessage: null,
      isLoadingMessages: true,
    });

    socket.emit('chat:join', chatId);

    // Fetch chat details & initial messages
    const [chatRes, msgRes] = await Promise.all([
      apiRequest<Chat>(`/api/chats/${chatId}`),
      apiRequest<{ items: Message[]; nextCursor: string | null; hasMore: boolean }>(`/api/messages/chat/${chatId}`),
    ]);

    if (get().activeChatId !== chatId) return;
    if (chatRes.success && chatRes.data) {
      set({ activeChat: chatRes.data });
    }

    if (msgRes.success && msgRes.data) {
      set((state) => ({
        messages: { ...state.messages, [chatId]: msgRes.data!.items },
        hasMore: { ...state.hasMore, [chatId]: msgRes.data!.hasMore },
        nextCursor: { ...state.nextCursor, [chatId]: msgRes.data!.nextCursor },
        isLoadingMessages: false,
      }));

      // Mark unread messages as read
      get().markAsRead(chatId);
    } else {
      set({ isLoadingMessages: false });
    }
  },

  fetchMessages: async (chatId: string, cursor?: string) => {
    const cur = cursor || get().nextCursor[chatId];
    if (!cur) return;

    const res = await apiRequest<{ items: Message[]; nextCursor: string | null; hasMore: boolean }>(
      `/api/messages/chat/${chatId}`,
      { params: { cursor: cur, direction: 'before' } }
    );

    if (res.success && res.data) {
      set((state) => {
        const existingMessages = state.messages[chatId] || [];
        const newItems = res.data!.items || [];
        const existingIds = new Set(existingMessages.map((m) => m.id));
        const filteredNew = newItems.filter((m) => !existingIds.has(m.id));

        return {
          messages: {
            ...state.messages,
            [chatId]: [...filteredNew, ...existingMessages],
          },
          hasMore: { ...state.hasMore, [chatId]: res.data!.hasMore },
          nextCursor: { ...state.nextCursor, [chatId]: res.data!.nextCursor },
        };
      });
    }
  },

  sendMessage: async (content: string, attachments?: any[], type?: MessageType) => {
    const { activeChatId, replyTo } = get();
    if (!activeChatId) return;

    const idempotencyKey = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    const msgType = type || (attachments?.length ? (attachments[0].mimeType?.startsWith('image/') ? MessageType.IMAGE : MessageType.FILE) : MessageType.TEXT);

    // Optimistic message
    const tempId = `temp_${Date.now()}`;
    const optimisticMsg: Message = {
      id: tempId,
      chatId: activeChatId,
      senderId: useAuthStore.getState().user!.id,
      content,
      type: msgType,
      attachments: attachments || [],
      replyTo: replyTo ? { ...replyTo } : null,
      isEdited: false,
      isDeleted: false,
      deliveryStatus: 'sending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    set((state) => ({
      messages: {
        ...state.messages,
        [activeChatId]: [...(state.messages[activeChatId] || []), optimisticMsg],
      },
      replyTo: null,
    }));

    sounds.playSentMessage();

    const res = await apiRequest<Message>('/api/messages', {
      method: 'POST',
      body: JSON.stringify({
        chatId: activeChatId,
        content,
        type: msgType,
        replyToId: replyTo?.id,
        idempotencyKey,
        attachments,
      }),
    });

    if (res.success && res.data) {
      // Replace optimistic message
      set((state) => ({
        messages: {
          ...state.messages,
          [activeChatId]: (state.messages[activeChatId] || []).map((m) =>
            m.id === tempId ? { ...res.data!, deliveryStatus: 'sent' as const } : m
          ).filter((m, i, all) => all.findIndex(x => x.id === m.id) === i),
        },
      }));

      // Broadcast to socket room
      const socket = socketService.getSocket();
      socket.emit('message:send', res.data);

      // Update chat's last message in list
      set((state) => ({
        chats: state.chats.map((c) =>
          c.id === activeChatId
            ? {
                ...c,
                lastMessage: res.data,
                updatedAt: res.data!.createdAt,
              }
            : c
        ),
      }));
    } else {
      // Mark as failed
      set((state) => ({
        messages: {
          ...state.messages,
          [activeChatId]: (state.messages[activeChatId] || []).map((m) =>
            m.id === tempId ? { ...m, deliveryStatus: 'failed' } : m
          ),
        },
      }));
    }
  },

  editMessage: async (messageId: string, content: string) => {
    const { activeChatId } = get();
    if (!activeChatId) return;

    const res = await apiRequest<Message>(`/api/messages/${messageId}`, {
      method: 'PUT',
      body: JSON.stringify({ content }),
    });

    if (res.success && res.data) {
      set((state) => ({
        messages: {
          ...state.messages,
          [activeChatId]: (state.messages[activeChatId] || []).map((m) =>
            m.id === messageId ? { ...m, content, isEdited: true } : m
          ),
        },
        editingMessage: null,
      }));
    }
  },

  deleteMessage: async (messageId: string) => {
    const { activeChatId } = get();
    if (!activeChatId) return;

    const res = await apiRequest(`/api/messages/${messageId}`, {
      method: 'DELETE',
    });

    if (res.success) {
      set((state) => ({
        messages: {
          ...state.messages,
          [activeChatId]: (state.messages[activeChatId] || []).filter((m) => m.id !== messageId),
        },
      }));
    }
  },

  addReaction: async (messageId: string, emoji: string) => {
    const { activeChatId } = get();
    if (!activeChatId) return;

    const res = await apiRequest(`/api/messages/${messageId}/reactions`, {
      method: 'POST',
      body: JSON.stringify({ emoji }),
    });

    if (res.success) {
      const socket = socketService.getSocket();
      socket.emit('reaction:update', {
        chatId: activeChatId,
        messageId,
        emoji,
        action: 'add',
      });
    }
  },

  removeReaction: async (messageId: string, emoji: string) => {
    const { activeChatId } = get();
    if (!activeChatId) return;

    const res = await apiRequest(`/api/messages/${messageId}/reactions/${encodeURIComponent(emoji)}`, {
      method: 'DELETE',
    });

    if (res.success) {
      const socket = socketService.getSocket();
      socket.emit('reaction:update', {
        chatId: activeChatId,
        messageId,
        emoji,
        action: 'remove',
      });
    }
  },

  markAsRead: async (chatId: string) => {
    const msgs = get().messages[chatId] || [];
    const unreadIds = msgs.filter(m => !m.id.startsWith('temp_') && m.senderId !== useAuthStore.getState().user?.id).slice(-200).map(m => m.id);
    if (!unreadIds.length) return;

    await apiRequest('/api/messages/receipts', {
      method: 'POST',
      body: JSON.stringify({ chatId, messageIds: unreadIds, status: 'READ' }),
    });

    set((state) => ({
      chats: state.chats.map((c) =>
        c.id === chatId ? { ...c, unreadCount: 0 } : c
      ),
    }));
  },

  togglePinChat: async (chatId: string, isPinned: boolean) => {
    const res = await apiRequest(`/api/chats/${chatId}/pin`, {
      method: 'POST',
      body: JSON.stringify({ isPinned }),
    });
    if (res.success) {
      set((state) => ({
        chats: state.chats.map((c) => (c.id === chatId ? { ...c, isPinned } : c)),
      }));
    }
  },

  toggleMuteChat: async (chatId: string, isMuted: boolean) => {
    const res = await apiRequest(`/api/chats/${chatId}/mute`, {
      method: 'POST',
      body: JSON.stringify({ isMuted }),
    });
    if (res.success) {
      set((state) => ({
        chats: state.chats.map((c) => (c.id === chatId ? { ...c, isMuted } : c)),
      }));
    }
  },

  toggleArchiveChat: async (chatId: string, isArchived: boolean) => {
    const res = await apiRequest(`/api/chats/${chatId}/archive`, {
      method: 'POST',
      body: JSON.stringify({ isArchived }),
    });
    if (res.success) {
      set((state) => ({
        chats: state.chats.map((c) => (c.id === chatId ? { ...c, isArchived } : c)),
      }));
    }
  },

  clearChatHistory: async (chatId: string) => {
    const res = await apiRequest(`/api/chats/${chatId}/clear`, { method: 'POST' });
    if (res.success) {
      set((state) => ({
        messages: { ...state.messages, [chatId]: [] },
        hasMore: { ...state.hasMore, [chatId]: false },
        nextCursor: { ...state.nextCursor, [chatId]: null },
      }));
    }
  },

  deleteChat: async (chatId: string) => {
    const res = await apiRequest(`/api/chats/${chatId}`, { method: 'DELETE' });
    if (res.success) {
      set((state) => ({
        chats: state.chats.filter((c) => c.id !== chatId),
        activeChatId: state.activeChatId === chatId ? null : state.activeChatId,
        activeChat: state.activeChatId === chatId ? null : state.activeChat,
      }));
    }
  },

  pinMessage: async (chatId: string, messageId: string) => {
    const res = await apiRequest(`/api/messages/${messageId}/pin`, {
      method: 'POST',
      body: JSON.stringify({ chatId }),
    });
    if (res.success) {
      const chatRes = await apiRequest<Chat>(`/api/chats/${chatId}`);
      if (chatRes.success && chatRes.data) {
        set({ activeChat: chatRes.data });
      }
    }
  },

  unpinMessage: async (chatId: string, messageId: string) => {
    const res = await apiRequest(`/api/messages/${messageId}/pin?chatId=${chatId}`, {
      method: 'DELETE',
    });
    if (res.success) {
      const chatRes = await apiRequest<Chat>(`/api/chats/${chatId}`);
      if (chatRes.success && chatRes.data) {
        set({ activeChat: chatRes.data });
      }
    }
  },

  toggleSearchInChat: () => {
    set((state) => ({
      isSearchingInChat: !state.isSearchingInChat,
      inChatSearchQuery: '',
      inChatSearchResults: [],
    }));
  },

  searchInChat: async (query: string) => {
    const { activeChatId } = get();
    if (!activeChatId || !query.trim()) {
      set({ inChatSearchQuery: query, inChatSearchResults: [] });
      return;
    }
    set({ inChatSearchQuery: query });
    const res = await apiRequest<any[]>(`/api/search/chat/${activeChatId}?q=${encodeURIComponent(query.trim())}`);
    if (res.success && res.data) {
      set({ inChatSearchResults: res.data });
    }
  },

  setSelectMode: (enabled: boolean) => {
    set({ isSelectMode: enabled, selectedMessageIds: enabled ? get().selectedMessageIds : [] });
  },

  toggleSelectMessage: (id: string) => {
    set((state) => {
      const exists = state.selectedMessageIds.includes(id);
      const updated = exists
        ? state.selectedMessageIds.filter((mId) => mId !== id)
        : [...state.selectedMessageIds, id];
      return {
        selectedMessageIds: updated,
        isSelectMode: updated.length > 0,
      };
    });
  },

  clearSelectedMessages: () => {
    set({ isSelectMode: false, selectedMessageIds: [] });
  },

  bulkDeleteMessages: async () => {
    const { selectedMessageIds, activeChatId } = get();
    if (!selectedMessageIds.length) return;
    const deletedIds: string[] = [];
    for (const id of selectedMessageIds) {
      const res = await apiRequest(`/api/messages/${id}`, { method: 'DELETE' });
      if(res.success) deletedIds.push(id);
    }
    if (activeChatId) {
      set((state) => ({
        messages: {
          ...state.messages,
          [activeChatId]: (state.messages[activeChatId] || []).filter(
            (m) => !deletedIds.includes(m.id)
          ),
        },
        selectedMessageIds: [],
        isSelectMode: false,
      }));
    }
  },

  openForward: (msg: Message) => {
    set({ forwardingMessage: msg, isForwardOpen: true });
  },

  closeForward: () => {
    set({ forwardingMessage: null, isForwardOpen: false });
  },

  forwardToChat: async (targetChatId: string) => {
    const { forwardingMessage, selectedMessageIds } = get();
    const messageIds = selectedMessageIds.length ? selectedMessageIds : forwardingMessage ? [forwardingMessage.id] : [];
    if (!messageIds.length) return false;
    const res = await apiRequest('/api/messages/forward', { method:'POST', body:JSON.stringify({chatId:targetChatId, messageIds}) });
    if (res.success) { set({ forwardingMessage:null, isForwardOpen:false, selectedMessageIds:[], isSelectMode:false }); await get().fetchChats(); }
    return res.success;
  },

  setGroupManageChat: (chat: Chat | null) => set({ activeGroupManageChat: chat }),
  setChannelManageChat: (chat: Chat | null) => set({ activeChannelManageChat: chat }),

  setActiveFolder: (folder) => set({ activeFolder: folder }),
  setSearchQuery: (q) => set({ searchQuery: q }),
  setReplyTo: (msg) => set({ replyTo: msg }),
  setEditingMessage: (msg) => set({ editingMessage: msg }),
  toggleInfoPanel: () => set((s) => ({ isInfoPanelOpen: !s.isInfoPanelOpen })),

  setTyping: (chatId: string, isTyping: boolean) => {
    const socket = socketService.getSocket();
    socket.emit('chat:typing', { chatId, isTyping });
  },

  onMessageReceived: (message: Message) => {
    const { activeChatId } = get();
    const chatId = message.chatId;

    if (message.senderId !== useAuthStore.getState().user?.id) {
      sounds.playIncomingMessage();
    }

    set((state) => {
      const currentMsgs = state.messages[chatId] || [];
      const exists = currentMsgs.some((m) => m.id === message.id);
      const updatedMsgs = exists ? currentMsgs : [...currentMsgs, message];

      const updatedChats = state.chats.map((c) => {
        if (c.id === chatId) {
          const isCurrent = activeChatId === chatId;
          return {
            ...c,
            lastMessage: message,
            unreadCount: isCurrent ? 0 : (c.unreadCount || 0) + (exists || message.senderId === useAuthStore.getState().user?.id ? 0 : 1),
            updatedAt: message.createdAt,
          };
        }
        return c;
      });

      return {
        messages: { ...state.messages, [chatId]: updatedMsgs },
        chats: updatedChats,
      };
    });
  },

  onMessageEdited: (message: Message) => {
    const chatId = message.chatId;
    set((state) => ({
      messages: {
        ...state.messages,
        [chatId]: (state.messages[chatId] || []).map((m) => (m.id === message.id ? message : m)),
      },
    }));
  },

  onMessageDeleted: ({ messageId, chatId }) => {
    set((state) => ({
      messages: {
        ...state.messages,
        [chatId]: (state.messages[chatId] || []).filter((m) => m.id !== messageId),
      },
    }));
  },

  onReceiptReceived: ({ chatId, messageIds, status }) => {
    set((state) => ({
      messages: {
        ...state.messages,
        [chatId]: (state.messages[chatId] || []).map((m) =>
          messageIds.includes(m.id) ? { ...m, deliveryStatus: status.toLowerCase() as any } : m
        ),
      },
    }));
  },

  onReactionReceived: ({ chatId, messageId, emoji, userId, username, action }) => {
    set((state) => {
      const msgs = state.messages[chatId] || [];
      const updatedMsgs = msgs.map((m) => {
        if (m.id !== messageId) return m;

        let reactions = m.reactions ? [...m.reactions] : [];
        let rIndex = reactions.findIndex((r) => r.emoji === emoji);

        if (action === 'add' && reactions[rIndex]?.users.some(u => u.id === userId)) return m;
        if (action === 'add') {
          if (rIndex > -1) {
            reactions[rIndex] = {
              ...reactions[rIndex],
              count: reactions[rIndex].count + 1,
              hasReacted: userId === useAuthStore.getState().user?.id || !!reactions[rIndex]?.hasReacted,
              users: [...reactions[rIndex].users, { id: userId, username }],
            };
          } else {
            reactions.push({
              emoji,
              count: 1,
              hasReacted: userId === useAuthStore.getState().user?.id || !!reactions[rIndex]?.hasReacted,
              users: [{ id: userId, username }],
            });
          }
        } else {
          if (rIndex > -1) {
            const newCount = reactions[rIndex].count - 1;
            if (newCount <= 0) {
              reactions.splice(rIndex, 1);
            } else {
              reactions[rIndex] = {
                ...reactions[rIndex],
                count: newCount,
                hasReacted: userId === useAuthStore.getState().user?.id ? false : reactions[rIndex].hasReacted,
                users: reactions[rIndex].users.filter((u) => u.id !== userId),
              };
            }
          }
        }

        return { ...m, reactions };
      });

      return {
        messages: { ...state.messages, [chatId]: updatedMsgs },
      };
    });
  },

  onTypingReceived: ({ chatId, username, isTyping }) => {
    set((state) => {
      const current = state.typingUsers[chatId] || [];
      let updated: string[];
      if (isTyping) {
        updated = current.includes(username) ? current : [...current, username];
      } else {
        updated = current.filter((u) => u !== username);
      }
      return {
        typingUsers: { ...state.typingUsers, [chatId]: updated },
      };
    });
  },

  setupSocketListeners: () => {
    const socket = socketService.getSocket();
    socket.off('message:edited');
    socket.off('message:deleted');
    socket.on('message:edited', message => get().onMessageEdited(message));
    socket.on('message:deleted', data => get().onMessageDeleted(data));
    socket.off('message:new');
    socket.off('message:receipt');
    socket.off('reaction:update');
    socket.off('chat:typing');
    socket.off('connect');
    socket.off('disconnect');
    socket.on('connect', () => {
      set({ connectionStatus: 'connected' });
      reconnectChats();
    });
    socket.on('disconnect', () => {
      set({ connectionStatus: 'connecting' });
    });

    socket.on('message:new', (msg: Message) => {
      const message = (msg as any).message || msg;
      if (!message?.id || !message.chatId) return;
      get().onMessageReceived(message);
      if (message.chatId === get().activeChatId && document.visibilityState === 'visible') void get().markAsRead(message.chatId);
    });

    socket.on('message:receipt', (data: any) => {
      get().onReceiptReceived(data);
    });

    socket.on('reaction:update', (data: any) => {
      get().onReactionReceived(data);
    });

    socket.on('chat:typing', (data: any) => {
      get().onTypingReceived(data);
    });

    socket.on('poll:updated', (data: { chatId: string; messageId: string; poll: any }) => {
      set((state) => ({
        messages: {
          ...state.messages,
          [data.chatId]: (state.messages[data.chatId] || []).map((m) =>
            m.id === data.messageId ? { ...m, poll: data.poll } : m
          ),
        },
      }));
    });
  },
}));
