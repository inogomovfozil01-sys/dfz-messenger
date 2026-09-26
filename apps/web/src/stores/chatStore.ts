import { create } from 'zustand';
import { Chat, Message, ChatType, ReceiptStatus, MessageType } from '@dfz/types';
import { apiRequest } from '../lib/api';
import { socketService } from '../lib/socket';

export type FolderFilter = 'all' | 'personal' | 'groups' | 'channels' | 'unread';

interface ChatState {
  chats: Chat[];
  activeChatId: string | null;
  activeChat: Chat | null;
  messages: Record<string, Message[]>;
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

  // Actions
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
  setActiveFolder: (folder: FolderFilter) => void;
  setSearchQuery: (q: string) => void;
  setReplyTo: (msg: Message | null) => void;
  setEditingMessage: (msg: Message | null) => void;
  toggleInfoPanel: () => void;
  setTyping: (chatId: string, isTyping: boolean) => void;

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
      set((state) => ({
        messages: {
          ...state.messages,
          [chatId]: [...res.data!.items, ...(state.messages[chatId] || [])],
        },
        hasMore: { ...state.hasMore, [chatId]: res.data!.hasMore },
        nextCursor: { ...state.nextCursor, [chatId]: res.data!.nextCursor },
      }));
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
      senderId: 'me',
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
            m.id === tempId ? { ...res.data!, deliveryStatus: 'sent' } : m
          ),
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
    const unreadIds = msgs.map((m) => m.id);
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
            unreadCount: isCurrent ? 0 : (c.unreadCount || 0) + 1,
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

        if (action === 'add') {
          if (rIndex > -1) {
            reactions[rIndex] = {
              ...reactions[rIndex],
              count: reactions[rIndex].count + 1,
              hasReacted: true,
              users: [...reactions[rIndex].users, { id: userId, username }],
            };
          } else {
            reactions.push({
              emoji,
              count: 1,
              hasReacted: true,
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
                hasReacted: false,
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
    socket.off('message:new');
    socket.off('message:receipt');
    socket.off('reaction:update');
    socket.off('chat:typing');
    socket.off('poll:updated');

    socket.on('message:new', (msg: Message) => {
      get().onMessageReceived(msg);
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
