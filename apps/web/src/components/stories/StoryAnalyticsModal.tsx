import React, { useEffect, useState } from 'react';
import { X, Eye, Heart, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';
import { useStoriesStore } from '../../stores/storiesStore';
import { Avatar } from '../ui/Avatar';
import { apiRequest } from '../../lib/api';

interface AnalyticsData {
  viewCount: number;
  views: Array<{
    id: string;
    viewedAt: string;
    viewer: {
      id: string;
      username: string;
      profile?: {
        displayName?: string;
        avatarUrl?: string;
      };
    };
  }>;
  reactions: Array<{
    id: string;
    emoji: string;
    user: {
      id: string;
      username: string;
      profile?: {
        displayName?: string;
        avatarUrl?: string;
      };
    };
  }>;
}

export const StoryAnalyticsModal: React.FC = () => {
  const { isAnalyticsOpen, analyticsStoryId, closeAnalytics } = useStoriesStore();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isAnalyticsOpen || !analyticsStoryId) return;

    setIsLoading(true);
    apiRequest<AnalyticsData>(`/api/stories/${analyticsStoryId}/analytics`)
      .then((res) => {
        if (res.success && res.data) {
          setData(res.data);
        }
      })
      .finally(() => setIsLoading(false));
  }, [isAnalyticsOpen, analyticsStoryId]);

  if (!isAnalyticsOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 select-none animate-fade-in">
      <div className="relative w-full max-w-sm bg-dfz-surface border border-dfz-border rounded-dfz-2xl shadow-dfz-modal overflow-hidden flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-dfz-border">
          <div className="flex items-center gap-2">
            <Eye size={18} className="text-dfz-accent" />
            <h3 className="text-sm font-bold text-dfz-text">Просмотры истории</h3>
          </div>
          <button
            type="button"
            onClick={closeAnalytics}
            className="p-1 rounded-full text-dfz-text-muted hover:text-dfz-text hover:bg-dfz-surface-hover"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content list */}
        <div className="p-4 flex-1 overflow-y-auto space-y-4">
          {isLoading ? (
            <div className="text-center py-6 text-xs text-dfz-text-muted">Загрузка данных...</div>
          ) : !data || data.views.length === 0 ? (
            <div className="text-center py-8 text-xs text-dfz-text-muted">
              Пока никто не посмотрел эту историю.
            </div>
          ) : (
            <div className="space-y-2">
              <div className="text-xs font-semibold text-dfz-text-muted px-1">
                Всего просмотров: {data.viewCount}
              </div>

              <div className="divide-y divide-dfz-border/50 rounded-dfz-xl border border-dfz-border bg-dfz-bg overflow-hidden">
                {data.views.map((v) => {
                  const reaction = data.reactions.find((r) => r.user.id === v.viewer.id);
                  const name = v.viewer.profile?.displayName || v.viewer.username;

                  return (
                    <div key={v.id} className="flex items-center justify-between p-2.5">
                      <div className="flex items-center gap-2.5">
                        <Avatar src={v.viewer.profile?.avatarUrl} name={name} size="sm" />
                        <div className="flex flex-col">
                          <span className="text-xs font-semibold text-dfz-text">{name}</span>
                          <span className="text-[10px] text-dfz-text-muted flex items-center gap-1 font-mono">
                            <Clock size={10} />
                            {formatDistanceToNow(new Date(v.viewedAt), { addSuffix: true, locale: ru })}
                          </span>
                        </div>
                      </div>

                      {reaction && (
                        <span className="text-lg animate-bounce-short">{reaction.emoji}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
