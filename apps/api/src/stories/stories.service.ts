import { prisma } from '../prisma';
import { gatewayInstance } from '../gateway/websocket.gateway';
import { Story, StoryFeedItem, StoryMediaType, PrivacyVisibility } from '@dfz/types';
import { maySee, httpError } from '../common/access';

export class StoriesService {
  async requireAccess(userId: string, storyId: string) {
    const story = await prisma.story.findUnique({ where: { id: storyId } });
    if (!story) {
      throw httpError(404, 'Story unavailable');
    }
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
    const isAdmin = user && ['ADMIN', 'SUPERADMIN'].includes(user.role);
    if (story.authorId === userId || isAdmin) {
      return story;
    }
    if (story.isArchived || story.expiresAt <= new Date() || !(await maySee(userId, story.authorId, story.privacy))) {
      throw httpError(403, 'Story unavailable');
    }
    return story;
  }
  /**
   * Create a new 24-hour story
   */
  async createStory(
    authorId: string,
    data: {
      mediaUrl: string;
      mediaType?: StoryMediaType;
      caption?: string;
      textOverlay?: any;
      privacy?: PrivacyVisibility;
    }
  ) {
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const story = await prisma.story.create({
      data: {
        authorId,
        mediaUrl: data.mediaUrl,
        mediaType: data.mediaType || 'IMAGE',
        caption: data.caption,
        textOverlay: data.textOverlay,
        privacy: data.privacy || 'EVERYONE',
        expiresAt,
      },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            profile: true,
          },
        },
      },
    });

    // Broadcast new story event
    if (gatewayInstance) {
      gatewayInstance.notifyUser(authorId, 'story:new', {
        story: {
          ...story,
          createdAt: story.createdAt.toISOString(),
          expiresAt: story.expiresAt.toISOString(),
          viewCount: 0,
          reactionCount: 0,
          hasViewed: false,
        },
        authorId,
      });
    }

    return story;
  }

  /**
   * Retrieve active stories grouped by user for the feed strip
   */
  async getFeed(currentUserId: string): Promise<StoryFeedItem[]> {
    const now = new Date();

    // 1. Fetch user contacts (bi-directional)
    const contacts = await prisma.contact.findMany({
      where: {
        OR: [
          { userId: currentUserId },
          { contactUserId: currentUserId },
        ],
      },
      select: { userId: true, contactUserId: true },
    });
    const contactIds = Array.from(
      new Set(
        contacts
          .flatMap((c) => [c.userId, c.contactUserId])
          .filter((id) => id !== currentUserId)
      )
    );
    const blocks = await prisma.block.findMany({ where: { OR: [{ blockerId: currentUserId }, { blockedId: currentUserId }] } });
    const excluded = blocks.map(b => b.blockerId === currentUserId ? b.blockedId : b.blockerId);

    // 2. Fetch all active stories: own stories + contacts + public stories
    const activeStories = await prisma.story.findMany({
      where: {
        expiresAt: { gt: now },
        isArchived: false,
        ...(excluded.length > 0 ? { authorId: { notIn: excluded } } : {}),
        OR: [
          { authorId: currentUserId },
          { authorId: { in: contactIds }, privacy: 'CONTACTS' },
          { privacy: 'EVERYONE' },
        ],
      },
      orderBy: { createdAt: 'desc' },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            profile: true,
          },
        },
        views: {
          where: { viewerId: currentUserId },
          select: { id: true },
        },
        reactions: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                profile: true,
              },
            },
          },
        },
        _count: {
          select: {
            views: true,
            reactions: true,
          },
        },
      },
    });

    // 3. Group by author
    const authorMap = new Map<string, { user: any; stories: any[] }>();

    for (const s of activeStories) {
      const author = s.author;
      if (!author) continue;

      if (!authorMap.has(author.id)) {
        authorMap.set(author.id, {
          user: author,
          stories: [],
        });
      }

      const formattedStory = {
        id: s.id,
        authorId: s.authorId,
        author: s.author,
        mediaUrl: s.mediaUrl,
        mediaType: s.mediaType as StoryMediaType,
        caption: s.caption,
        textOverlay: s.textOverlay as any,
        privacy: s.privacy as PrivacyVisibility,
        expiresAt: s.expiresAt.toISOString(),
        isArchived: s.isArchived,
        createdAt: s.createdAt.toISOString(),
        viewCount: s._count.views,
        reactionCount: s._count.reactions,
        reactions: s.reactions.map((r) => ({
          id: r.id,
          storyId: r.storyId,
          userId: r.userId,
          user: r.user as any,
          emoji: r.emoji,
          createdAt: r.createdAt.toISOString(),
        })),
        hasViewed: s.views.length > 0,
      };

      authorMap.get(author.id)!.stories.push(formattedStory);
    }

    // 4. Construct feed items
    const feedItems: StoryFeedItem[] = [];

    // Current user's stories first (if any exist)
    const ownEntry = authorMap.get(currentUserId);
    if (ownEntry) {
      feedItems.push({
        user: ownEntry.user,
        stories: ownEntry.stories.reverse(), // chronologically ordered
        hasUnseen: false,
        latestCreatedAt: ownEntry.stories[ownEntry.stories.length - 1]?.createdAt || new Date().toISOString(),
      });
      authorMap.delete(currentUserId);
    }

    // Remaining contacts/users
    const otherEntries: StoryFeedItem[] = [];
    for (const [, entry] of authorMap.entries()) {
      const reversedStories = entry.stories.reverse();
      const hasUnseen = reversedStories.some((st) => !st.hasViewed);
      otherEntries.push({
        user: entry.user,
        stories: reversedStories,
        hasUnseen,
        latestCreatedAt: reversedStories[reversedStories.length - 1]?.createdAt || new Date().toISOString(),
      });
    }

    // Sort: unseen stories first, then most recent
    otherEntries.sort((a, b) => {
      if (a.hasUnseen && !b.hasUnseen) return -1;
      if (!a.hasUnseen && b.hasUnseen) return 1;
      return new Date(b.latestCreatedAt).getTime() - new Date(a.latestCreatedAt).getTime();
    });

    return [...feedItems, ...otherEntries];
  }

  /**
   * Mark a story as viewed by the current user
   */
  async recordView(userId: string, storyId: string) {
    await this.requireAccess(userId, storyId);
    const existing = await prisma.storyView.findUnique({
      where: {
        storyId_viewerId: {
          storyId,
          viewerId: userId,
        },
      },
    });

    if (!existing) {
      await prisma.storyView.create({
        data: {
          storyId,
          viewerId: userId,
        },
      });

      // Notify story author in real-time
      const story = await prisma.story.findUnique({
        where: { id: storyId },
        select: { authorId: true },
      });

      if (story && story.authorId !== userId && gatewayInstance) {
        gatewayInstance.notifyUser(story.authorId, 'story:viewed', {
          storyId,
          viewerId: userId,
        });
      }
    }

    return { success: true };
  }

  /**
   * Add or toggle reaction to a story
   */
  async reactToStory(userId: string, storyId: string, emoji: string) {
    await this.requireAccess(userId, storyId);
    const existing = await prisma.storyReaction.findUnique({
      where: {
        storyId_userId_emoji: {
          storyId,
          userId,
          emoji,
        },
      },
    });

    if (existing) {
      await prisma.storyReaction.delete({
        where: { id: existing.id },
      });
      return { action: 'removed', emoji };
    }

    const reaction = await prisma.storyReaction.create({
      data: {
        storyId,
        userId,
        emoji,
      },
      include: {
        user: {
          select: { id: true, username: true, profile: true },
        },
      },
    });

    // Notify author
    const story = await prisma.story.findUnique({
      where: { id: storyId },
      select: { authorId: true },
    });

    if (story && gatewayInstance) {
      gatewayInstance.notifyUser(story.authorId, 'story:reaction', {
        storyId,
        reaction,
      });
    }

    return { action: 'added', reaction };
  }

  /**
   * Viewers list for author or admin
   */
  async getStoryViews(userId: string, storyId: string) {
    const story = await prisma.story.findUnique({
      where: { id: storyId },
      select: { authorId: true },
    });

    if (!story) {
      throw httpError(404, 'Story not found');
    }

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
    const isAdmin = user && ['ADMIN', 'SUPERADMIN'].includes(user.role);

    if (story.authorId !== userId && !isAdmin) {
      throw httpError(403, 'Not authorized to view analytics for this story');
    }

    const views = await prisma.storyView.findMany({
      where: { storyId },
      orderBy: { viewedAt: 'desc' },
      include: {
        viewer: {
          select: {
            id: true,
            username: true,
            profile: true,
          },
        },
      },
    });

    const reactions = await prisma.storyReaction.findMany({
      where: { storyId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            profile: true,
          },
        },
      },
    });

    return {
      viewCount: views.length,
      views,
      reactions,
    };
  }

  /**
   * Delete or archive a story
   */
  async deleteStory(userId: string, storyId: string) {
    const story = await prisma.story.findUnique({
      where: { id: storyId },
    });

    if (!story) {
      throw httpError(404, 'Story not found');
    }

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
    const isAdmin = user && ['ADMIN', 'SUPERADMIN'].includes(user.role);

    if (story.authorId !== userId && !isAdmin) {
      throw httpError(403, 'Story not found or unauthorized');
    }

    await prisma.story.delete({
      where: { id: storyId },
    });

    return { success: true };
  }
}

export const storiesService = new StoriesService();
