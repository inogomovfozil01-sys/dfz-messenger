import { create } from 'zustand';
import { apiRequest } from '../lib/api';
import { socketService } from '../lib/socket';
import {
  StarAccount,
  StarTransaction,
  ActivityRewardState,
  GiftDefinition,
  GiftInstance,
  CollectibleInstance,
  DFZPremiumState,
} from '@dfz/types';

interface EconomyState {
  starBalance: number;
  isUnlimitedStars: boolean;
  totalEarned: number;
  totalSpent: number;
  isLoadingBalance: boolean;

  activityState: ActivityRewardState | null;
  premiumState: DFZPremiumState | null;

  giftCatalog: GiftDefinition[];
  isLoadingCatalog: boolean;
  myGifts: GiftInstance[];
  isLoadingGifts: boolean;
  myCollectibles: CollectibleInstance[];
  isLoadingCollectibles: boolean;

  transactions: StarTransaction[];
  isLoadingTransactions: boolean;
  historyFilter: string;
  hasMoreTransactions: boolean;
  nextTransactionCursor: string | null;

  // Modals & Active Selections
  isMyStarsOpen: boolean;
  isGiftStoreOpen: boolean;
  isSendGiftOpen: boolean;
  isSendStarsOpen: boolean;
  isPremiumOpen: boolean;
  isCollectibleViewerOpen: boolean;
  isAdminQuickActionOpen: boolean;

  activeStarsTab: 'buy' | 'balance' | 'earn' | 'send' | 'history' | 'gifts';
  activeCollectible: any | null;
  selectedGiftForSending: GiftDefinition | null;
  targetUserForGift: { id: string; username: string; displayName: string; avatarUrl?: string } | null;
  targetUserForStars: { id: string; username: string; displayName: string; avatarUrl?: string } | null;
  adminTargetUserId: string | null;

  // Toast / Notification
  toastMessage: { text: string; type: 'success' | 'info' | 'star' } | null;

  // Actions
  setStarsOpen: (open: boolean, initialTab?: 'buy' | 'balance' | 'earn' | 'send' | 'history' | 'gifts') => void;
  setGiftStoreOpen: (open: boolean) => void;
  setSendGiftOpen: (open: boolean, gift?: GiftDefinition | null, targetUser?: any) => void;
  setSendStarsOpen: (open: boolean, targetUser?: any) => void;
  setPremiumOpen: (open: boolean) => void;
  setCollectibleViewerOpen: (open: boolean, collectible?: any) => void;
  setAdminQuickActionOpen: (open: boolean, targetUserId?: string | null) => void;
  setToast: (toast: { text: string; type: 'success' | 'info' | 'star' } | null) => void;

  fetchBalance: () => Promise<void>;
  fetchActivityState: () => Promise<void>;
  sendHeartbeat: () => Promise<void>;
  fetchGiftCatalog: (category?: string) => Promise<void>;
  fetchMyGifts: () => Promise<void>;
  fetchMyCollectibles: () => Promise<void>;
  fetchTransactions: (filter?: string, isNext?: boolean) => Promise<void>;

  topupStars: (amount: number, packageId: string) => Promise<boolean>;
  transferStars: (recipientId: string, amount: number, message?: string, chatId?: string) => Promise<boolean>;
  sendGift: (recipientId: string, giftId: string, message?: string, isAnonymous?: boolean, chatId?: string) => Promise<boolean>;
  transferCollectible: (recipientId: string, collectibleId: string) => Promise<boolean>;
  purchasePremium: (plan: 'MONTHLY' | '3MONTH' | 'YEARLY') => Promise<boolean>;
  giftPremium: (recipientId: string, plan: 'MONTHLY' | '3MONTH' | 'YEARLY', chatId?: string) => Promise<boolean>;

  setupEconomySocket: () => void;
}

let heartbeatInterval: any = null;

export const useEconomyStore = create<EconomyState>((set, get) => ({
  starBalance: 0,
  isUnlimitedStars: false,
  totalEarned: 0,
  totalSpent: 0,
  isLoadingBalance: false,

  activityState: null,
  premiumState: null,

  giftCatalog: [],
  isLoadingCatalog: false,
  myGifts: [],
  isLoadingGifts: false,
  myCollectibles: [],
  isLoadingCollectibles: false,

  transactions: [],
  isLoadingTransactions: false,
  historyFilter: 'ALL',
  hasMoreTransactions: false,
  nextTransactionCursor: null,

  isMyStarsOpen: false,
  isGiftStoreOpen: false,
  isSendGiftOpen: false,
  isSendStarsOpen: false,
  isPremiumOpen: false,
  isCollectibleViewerOpen: false,
  isAdminQuickActionOpen: false,

  activeStarsTab: 'balance',
  activeCollectible: null,
  selectedGiftForSending: null,
  targetUserForGift: null,
  targetUserForStars: null,
  adminTargetUserId: null,

  toastMessage: null,

  setStarsOpen: (open, initialTab = 'balance') =>
    set({ isMyStarsOpen: open, activeStarsTab: initialTab }),
  setGiftStoreOpen: (open) => set({ isGiftStoreOpen: open }),
  setSendGiftOpen: (open, gift = null as any, targetUser = null) =>
    set({ isSendGiftOpen: open, isGiftStoreOpen: open, selectedGiftForSending: gift, targetUserForGift: targetUser }),
  setSendStarsOpen: (open, targetUser = null) =>
    set({ isSendStarsOpen: open, isMyStarsOpen: open, activeStarsTab: 'send', targetUserForStars: targetUser }),
  setPremiumOpen: (open) => set({ isPremiumOpen: open }),
  setCollectibleViewerOpen: (open, collectible = null) =>
    set({ isCollectibleViewerOpen: open, activeCollectible: collectible }),
  setAdminQuickActionOpen: (open, targetUserId = null as any) =>
    set({ isAdminQuickActionOpen: open, adminTargetUserId: targetUserId }),
  setToast: (toast) => {
    set({ toastMessage: toast });
    if (toast) {
      setTimeout(() => {
        if (get().toastMessage?.text === toast.text) {
          set({ toastMessage: null });
        }
      }, 4000);
    }
  },

  fetchBalance: async () => {
    set({ isLoadingBalance: true });
    const res = await apiRequest<any>('/api/economy/stars/balance');
    set({ isLoadingBalance: false });
    if (res.success && res.data) {
      set({
        starBalance: res.data.balance,
        isUnlimitedStars: !!res.data.isUnlimited,
        totalEarned: res.data.totalEarned,
        totalSpent: res.data.totalSpent,
      });
    }
  },

  fetchActivityState: async () => {
    const res = await apiRequest<ActivityRewardState>('/api/economy/activity/state');
    if (res.success && res.data) {
      set({ activityState: res.data });
    }
  },

  sendHeartbeat: async () => {
    const isVisible = typeof document !== 'undefined' ? !document.hidden : true;
    const res = await apiRequest<ActivityRewardState>('/api/economy/activity/heartbeat', {
      method: 'POST',
      body: JSON.stringify({ active: isVisible, visible: isVisible }),
    });
    if (res.success && res.data) {
      set({ activityState: res.data });
    }
  },

  fetchGiftCatalog: async (category?: string) => {
    set({ isLoadingCatalog: true });
    const query = category ? `?category=${category}` : '';
    const res = await apiRequest<GiftDefinition[]>(`/api/economy/gifts/catalog${query}`);
    set({ isLoadingCatalog: false });
    if (res.success && res.data) {
      set({ giftCatalog: res.data });
    }
  },

  fetchMyGifts: async () => {
    set({ isLoadingGifts: true });
    // User's own gifts from getMe profile id
    const res = await apiRequest<any>('/api/economy/gifts/user/me');
    set({ isLoadingGifts: false });
    if (res.success && res.data) {
      set({ myGifts: res.data });
    }
  },

  fetchMyCollectibles: async () => {
    set({ isLoadingCollectibles: true });
    const res = await apiRequest<CollectibleInstance[]>('/api/economy/collectibles/my');
    set({ isLoadingCollectibles: false });
    if (res.success && res.data) {
      set({ myCollectibles: res.data });
    }
  },

  fetchTransactions: async (filter = 'ALL', isNext = false) => {
    set({ isLoadingTransactions: true, historyFilter: filter });
    const cursor = isNext ? get().nextTransactionCursor : undefined;
    const query = new URLSearchParams({ filter });
    if (cursor) query.append('cursor', cursor);

    const res = await apiRequest<any>(`/api/economy/stars/history?${query.toString()}`);
    set({ isLoadingTransactions: false });
    if (res.success && res.data) {
      set({
        transactions: isNext ? [...get().transactions, ...res.data.items] : res.data.items,
        hasMoreTransactions: res.data.hasMore,
        nextTransactionCursor: res.data.nextCursor,
      });
    }
  },

  topupStars: async (amount: number, packageId: string) => {
    const res = await apiRequest<{ balance: number }>('/api/economy/stars/topup', {
      method: 'POST',
      body: JSON.stringify({ amount, packageId }),
    });

    if (res.success && res.data) {
      set({ starBalance: res.data.balance });
      get().fetchTransactions();
      get().setToast({
        text: `★ Баланс успешно пополнен на +${amount.toLocaleString()} Stars!`,
        type: 'star',
      });
      return true;
    } else {
      get().setToast({
        text: res.error?.message || 'Ошибка пополнения Stars',
        type: 'info',
      });
      return false;
    }
  },

  transferStars: async (recipientId, amount, message, chatId) => {
    const res = await apiRequest<any>('/api/economy/stars/transfer', {
      method: 'POST',
      body: JSON.stringify({ recipientId, amount, message, chatId }),
    });

    if (res.success) {
      get().fetchBalance();
      get().fetchTransactions(get().historyFilter);
      get().setToast({
        text: `★ ${amount.toLocaleString()} Stars успешно отправлены!`,
        type: 'star',
      });
      return true;
    } else {
      get().setToast({
        text: res.error?.message || 'Ошибка перевода Stars',
        type: 'info',
      });
      return false;
    }
  },

  sendGift: async (recipientId, giftId, message, isAnonymous, chatId) => {
    const res = await apiRequest<any>('/api/economy/gifts/send', {
      method: 'POST',
      body: JSON.stringify({
        recipientId,
        giftDefinitionId: giftId,
        message,
        isAnonymous,
        chatId,
      }),
    });

    if (res.success) {
      get().fetchBalance();
      get().setToast({
        text: `Подарок успешно отправлен! 🎁`,
        type: 'success',
      });
      return true;
    } else {
      get().setToast({
        text: res.error?.message || 'Ошибка отправки подарка',
        type: 'info',
      });
      return false;
    }
  },

  transferCollectible: async (recipientId, collectibleId) => {
    const res = await apiRequest<any>(`/api/economy/collectibles/${collectibleId}/transfer`, {
      method: 'POST',
      body: JSON.stringify({ recipientId }),
    });

    if (res.success) {
      get().fetchMyCollectibles();
      get().setToast({
        text: 'Коллекционный артефакт успешно передан!',
        type: 'success',
      });
      return true;
    } else {
      get().setToast({
        text: res.error?.message || 'Ошибка передачи артефакта',
        type: 'info',
      });
      return false;
    }
  },

  purchasePremium: async (plan) => {
    const res = await apiRequest<any>('/api/economy/premium/purchase', {
      method: 'POST',
      body: JSON.stringify({ plan }),
    });

    if (res.success) {
      get().fetchBalance();
      get().setToast({
        text: '◆ Поздравляем! DFZ Premium активирован!',
        type: 'success',
      });
      return true;
    } else {
      get().setToast({
        text: res.error?.message || 'Ошибка покупки Premium',
        type: 'info',
      });
      return false;
    }
  },

  giftPremium: async (recipientId, plan, chatId) => {
    const res = await apiRequest<any>('/api/economy/premium/gift', {
      method: 'POST',
      body: JSON.stringify({ recipientId, plan, chatId }),
    });

    if (res.success) {
      get().fetchBalance();
      get().setToast({
        text: '◆ Подписка DFZ Premium успешно подарена другу!',
        type: 'success',
      });
      return true;
    } else {
      get().setToast({
        text: res.error?.message || 'Ошибка дарения Premium',
        type: 'info',
      });
      return false;
    }
  },

  setupEconomySocket: () => {
    const socket = socketService.getSocket();
    if (!socket) return;

    // Remove existing listeners
    socket.off('star:reward');
    socket.off('star:transfer');
    socket.off('gift:received');
    socket.off('premium:updated');
    socket.off('collectible:transferred');

    // 1. Star Reward Notification (Section 57: Hourly small toast)
    socket.on('star:reward', (data: { amount: number; balance: number; message: string }) => {
      set({ starBalance: data.balance });
      get().setToast({
        text: data.message || `+${data.amount} ★ Награда за активность!`,
        type: 'star',
      });
      get().fetchActivityState();
    });

    // 2. Star Transfer Notification
    socket.on('star:transfer', (data: any) => {
      get().fetchBalance();
      if (data.amount > 0) {
        get().setToast({
          text: `Вам начислено ★ ${data.amount.toLocaleString()} Stars от ${data.senderName}`,
          type: 'star',
        });
      }
    });

    // 3. Gift Received Notification
    socket.on('gift:received', (data: any) => {
      get().fetchMyGifts();
      get().setToast({
        text: `🎁 Вам пришел подарок: "${data.giftInstance.giftDefinition.name}" от ${data.senderName}`,
        type: 'success',
      });
    });

    // 4. Premium updated
    socket.on('premium:updated', () => {
      // Reload profile
      if (typeof window !== 'undefined') {
        apiRequest<any>('/api/economy/premium/status').then((res) => {
          if (res.success && res.data) {
            set({ premiumState: res.data });
          }
        });
      }
    });

    // 5. Collectible transferred
    socket.on('collectible:transferred', (data: any) => {
      get().fetchMyCollectibles();
      get().setToast({
        text: `💎 Получен коллекционный артефакт: ${data.editionName} #${data.uniqueNumber}`,
        type: 'info',
      });
    });

    // Start background activity heartbeat interval (every 30s)
    if (heartbeatInterval) clearInterval(heartbeatInterval);
    get().fetchBalance();
    get().fetchActivityState();
    heartbeatInterval = setInterval(() => {
      get().sendHeartbeat();
    }, 30000);
  },
}));
