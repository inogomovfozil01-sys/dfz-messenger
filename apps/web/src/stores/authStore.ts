import { create } from 'zustand';
import { User, UserProfile, PrivacyVisibility } from '@dfz/types';
import { apiRequest } from '../lib/api';
import { socketService } from '../lib/socket';

interface AuthState {
  user: User | null;
  profile: UserProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  checkAuth: () => Promise<boolean>;
  login: (credentials: { usernameOrEmail: string; password: string }) => Promise<{ success: boolean; error?: string }>;
  register: (data: { username: string; password: string; email?: string; displayName?: string; bio?: string }) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  updateProfile: (data: Partial<UserProfile>) => Promise<boolean>;
  updatePrivacy: (data: Partial<Record<string, PrivacyVisibility>>) => Promise<boolean>;
  setProfileAvatar: (avatarUrl: string) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  profile: null,
  isLoading: true,
  isAuthenticated: false,

  checkAuth: async () => {
    set({ isLoading: true });
    const res = await apiRequest('/api/auth/me');
    if (res.success && res.data?.user) {
      set({
        user: res.data.user,
        profile: res.data.user.profile || null,
        isAuthenticated: true,
        isLoading: false,
      });
      // Connect realtime socket
      socketService.connect();
      return true;
    } else {
      set({
        user: null,
        profile: null,
        isAuthenticated: false,
        isLoading: false,
      });
      return false;
    }
  },

  login: async (credentials) => {
    set({ isLoading: true });
    const res = await apiRequest('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });

    if (res.success && res.data?.user) {
      set({
        user: res.data.user,
        profile: res.data.user.profile || null,
        isAuthenticated: true,
        isLoading: false,
      });
      socketService.connect();
      return { success: true };
    }

    set({ isLoading: false });
    return {
      success: false,
      error: res.error?.message || 'Login failed',
    };
  },

  register: async (data) => {
    set({ isLoading: true });
    const res = await apiRequest('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });

    if (res.success && res.data?.user) {
      set({
        user: res.data.user,
        profile: res.data.user.profile || null,
        isAuthenticated: true,
        isLoading: false,
      });
      socketService.connect();
      return { success: true };
    }

    set({ isLoading: false });
    return {
      success: false,
      error: res.error?.message || 'Registration failed',
    };
  },

  logout: async () => {
    await apiRequest('/api/auth/logout', { method: 'POST' });
    socketService.disconnect();
    const { useChatStore } = await import('./chatStore');
    useChatStore.setState(useChatStore.getInitialState(), true);
    set({
      user: null,
      profile: null,
      isAuthenticated: false,
      isLoading: false,
    });
  },

  updateProfile: async (data) => {
    const res = await apiRequest('/api/users/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    if (res.success && res.data) {
      set((state) => ({
        profile: { ...state.profile, ...res.data },
      }));
      return true;
    }
    return false;
  },

  updatePrivacy: async (data) => {
    const res = await apiRequest('/api/users/privacy', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    if (res.success && res.data) {
      set((state) => ({
        profile: { ...state.profile, ...res.data },
      }));
      return true;
    }
    return false;
  },

  setProfileAvatar: (avatarUrl: string) => {
    set((state) => ({
      profile: state.profile ? { ...state.profile, avatarUrl } : null,
    }));
  },
}));
