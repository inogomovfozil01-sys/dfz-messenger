import React, { useEffect } from 'react';
import { Plus } from 'lucide-react';
import { useStoriesStore } from '../../stores/storiesStore';
import { useAuthStore } from '../../stores/authStore';
import { Avatar } from '../ui/Avatar';

export const StoriesStrip: React.FC = () => {
  const { user } = useAuthStore();
  const { feed, isLoadingFeed, fetchFeed, openViewer, openCreator } = useStoriesStore();

  useEffect(() => {
    fetchFeed();
  }, []);

  const ownFeedItem = feed.find((f) => f.user.id === user?.id);
  const otherFeedItems = feed.filter((f) => f.user.id !== user?.id);

  if (!isLoadingFeed && feed.length === 0) return (
    <button onClick={openCreator} className="mx-4 my-3 p-3 flex items-center gap-3 text-left rounded-xl border border-dfz-border hover:bg-dfz-surface-hover transition-colors" aria-label="Добавить историю">
      <span className="w-9 h-9 grid place-items-center rounded-full border border-dashed border-dfz-accent text-dfz-accent"><Plus size={18}/></span>
      <span><span className="block text-xs font-semibold text-dfz-text">Истории</span><span className="block text-[11px] text-dfz-text-muted mt-0.5">Поделиться моментом</span></span>
    </button>
  );

  return (
    <div className="w-full py-2.5 px-3 border-b border-dfz-border/60 bg-dfz-surface select-none">
      <div className="flex items-center gap-3 overflow-x-auto no-scrollbar scroll-smooth">
        {/* 1. Current User's Story / Add Story Button */}
        <div className="flex flex-col items-center flex-shrink-0 cursor-pointer group">
          <div className="relative">
            <div
              onClick={() => {
                if (ownFeedItem && ownFeedItem.stories.length > 0) {
                  openViewer(ownFeedItem);
                } else {
                  openCreator();
                }
              }}
              className={`p-0.5 rounded-full transition-transform active:scale-95 ${
                ownFeedItem && ownFeedItem.stories.length > 0
                  ? 'bg-gradient-to-tr from-dfz-accent via-purple-500 to-pink-500'
                  : 'ring-1 ring-dfz-border hover:ring-dfz-accent/60'
              }`}
            >
              <div className="p-0.5 rounded-full bg-dfz-surface">
                <Avatar
                  src={user?.profile?.avatarUrl}
                  name={user?.profile?.displayName || user?.username || 'You'}
                  size="md"
                />
              </div>
            </div>

            {/* Plus badge */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                openCreator();
              }}
              className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-dfz-accent text-white flex items-center justify-center border-2 border-dfz-surface shadow-dfz-sm hover:scale-110 transition-transform"
              title="Добавить историю"
            >
              <Plus size={10} strokeWidth={3} />
            </button>
          </div>
          <span className="text-[11px] font-medium text-dfz-text-muted mt-1 max-w-[56px] truncate text-center group-hover:text-dfz-text">
            {ownFeedItem && ownFeedItem.stories.length > 0 ? 'Ваша' : 'Создать'}
          </span>
        </div>

        {/* 2. Other Users' Stories */}
        {otherFeedItems.map((feedItem) => {
          const hasUnseen = feedItem.hasUnseen;
          const displayName = feedItem.user.profile?.displayName || feedItem.user.username;

          return (
            <div
              key={feedItem.user.id}
              onClick={() => openViewer(feedItem)}
              className="flex flex-col items-center flex-shrink-0 cursor-pointer group"
            >
              <div
                className={`p-0.5 rounded-full transition-transform active:scale-95 ${
                  hasUnseen
                    ? 'bg-gradient-to-tr from-dfz-accent via-purple-500 to-pink-500 animate-pulse-ring'
                    : 'ring-1.5 ring-dfz-border/80'
                }`}
              >
                <div className="p-0.5 rounded-full bg-dfz-surface">
                  <Avatar
                    src={feedItem.user.profile?.avatarUrl}
                    name={displayName}
                    size="md"
                  />
                </div>
              </div>
              <span
                className={`text-[11px] mt-1 max-w-[56px] truncate text-center ${
                  hasUnseen ? 'font-semibold text-dfz-text' : 'font-medium text-dfz-text-muted group-hover:text-dfz-text'
                }`}
              >
                {displayName}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
