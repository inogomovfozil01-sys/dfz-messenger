import { create } from 'zustand';
import { Story, StoryFeedItem } from '@dfz/types';
import { apiRequest } from '../lib/api';
import { socketService } from '../lib/socket';

interface StoriesState {
  feed: StoryFeedItem[];
  isLoadingFeed: boolean;
  activeFeedItem: StoryFeedItem | null;
  activeStoryIndex: number;
  isViewerOpen: boolean;
  isCreatorOpen: boolean;
  isAnalyticsOpen: boolean;
  analyticsStoryId: string | null;

  // Actions
  fetchFeed: () => Promise<void>;
  openViewer: (feedItem: StoryFeedItem, index?: number) => void;
  closeViewer: () => void;
  nextStory: () => void;
  prevStory: () => void;
  openCreator: () => void;
  closeCreator: () => void;
  openAnalytics: (storyId: string) => void;
  closeAnalytics: () => void;
  recordView: (storyId: string) => Promise<void>;
  reactToStory: (storyId: string, emoji: string) => Promise<void>;
  deleteStory: (storyId: string) => Promise<void>;
  setupStoriesSocket: () => void;
}

export const useStoriesStore = create<StoriesState>((set, get) => ({
  feed: [],
  isLoadingFeed: false,
  activeFeedItem: null,
  activeStoryIndex: 0,
  isViewerOpen: false,
  isCreatorOpen: false,
  isAnalyticsOpen: false,
  analyticsStoryId: null,

  fetchFeed: async () => {
    set({ isLoadingFeed: true });
    try {
      const res = await apiRequest<StoryFeedItem[]>('/api/stories/feed');
      if (res.success && res.data) {
        set({ feed: res.data });
      }
    } finally {
      set({ isLoadingFeed: false });
    }
  },

  openViewer: (feedItem, index = 0) => {
    set({
      activeFeedItem: feedItem,
      activeStoryIndex: Math.max(0, Math.min(index, feedItem.stories.length - 1)),
      isViewerOpen: true,
    });

    // Automatically record view for current story
    const currentStory = feedItem.stories[index];
    if (currentStory && !currentStory.hasViewed) {
      get().recordView(currentStory.id);
    }
  },

  closeViewer: () => {
    set({
      isViewerOpen: false,
      activeFeedItem: null,
      activeStoryIndex: 0,
    });
  },

  nextStory: () => {
    const { activeFeedItem, activeStoryIndex, feed } = get();
    if (!activeFeedItem) return;

    if (activeStoryIndex < activeFeedItem.stories.length - 1) {
      // Advance to next story in current user's stories
      const nextIdx = activeStoryIndex + 1;
      set({ activeStoryIndex: nextIdx });
      const nextStory = activeFeedItem.stories[nextIdx];
      if (nextStory && !nextStory.hasViewed) {
        get().recordView(nextStory.id);
      }
    } else {
      // Advance to next user's stories in feed
      const currentFeedIdx = feed.findIndex((f) => f.user.id === activeFeedItem.user.id);
      if (currentFeedIdx !== -1 && currentFeedIdx < feed.length - 1) {
        const nextFeedItem = feed[currentFeedIdx + 1];
        set({
          activeFeedItem: nextFeedItem,
          activeStoryIndex: 0,
        });
        const firstStory = nextFeedItem.stories[0];
        if (firstStory && !firstStory.hasViewed) {
          get().recordView(firstStory.id);
        }
      } else {
        // End of feed
        get().closeViewer();
      }
    }
  },

  prevStory: () => {
    const { activeFeedItem, activeStoryIndex, feed } = get();
    if (!activeFeedItem) return;

    if (activeStoryIndex > 0) {
      set({ activeStoryIndex: activeStoryIndex - 1 });
    } else {
      // Go back to previous user's stories in feed
      const currentFeedIdx = feed.findIndex((f) => f.user.id === activeFeedItem.user.id);
      if (currentFeedIdx > 0) {
        const prevFeedItem = feed[currentFeedIdx - 1];
        set({
          activeFeedItem: prevFeedItem,
          activeStoryIndex: prevFeedItem.stories.length - 1,
        });
      }
    }
  },

  openCreator: () => set({ isCreatorOpen: true }),
  closeCreator: () => set({ isCreatorOpen: false }),

  openAnalytics: (storyId: string) => set({ isAnalyticsOpen: true, analyticsStoryId: storyId }),
  closeAnalytics: () => set({ isAnalyticsOpen: false, analyticsStoryId: null }),

  recordView: async (storyId: string) => {
    await apiRequest(`/api/stories/${storyId}/view`, { method: 'POST' });

    // Mark as viewed locally
    set((state) => ({
      feed: state.feed.map((item) => ({
        ...item,
        stories: item.stories.map((st) => (st.id === storyId ? { ...st, hasViewed: true } : st)),
        hasUnseen: item.stories.some((st) => st.id !== storyId && !st.hasViewed),
      })),
      activeFeedItem: state.activeFeedItem
        ? {
            ...state.activeFeedItem,
            stories: state.activeFeedItem.stories.map((st) =>
              st.id === storyId ? { ...st, hasViewed: true } : st
            ),
          }
        : null,
    }));
  },

  reactToStory: async (storyId: string, emoji: string) => {
    await apiRequest(`/api/stories/${storyId}/react`, {
      method: 'POST',
      body: JSON.stringify({ emoji }),
    });
    get().fetchFeed();
  },

  deleteStory: async (storyId: string) => {
    await apiRequest(`/api/stories/${storyId}`, { method: 'DELETE' });
    get().fetchFeed();
    get().closeViewer();
  },

  setupStoriesSocket: () => {
    const socket = socketService.getSocket();
    if (!socket) return;

    socket.on('story:new', () => {
      get().fetchFeed();
    });

    socket.on('story:reaction', () => {
      get().fetchFeed();
    });

    socket.on('story:viewed', () => {
      // Author gets view update
      get().fetchFeed();
    });
  },
}));
