import { prisma } from '../prisma';
import { PrivacyVisibility } from '@dfz/types';
import { maySee } from '../common/access';
import { gatewayInstance } from '../gateway/websocket.gateway';

export class UsersService {
  async checkUsernameAvailable(username: string) {
    const clean = username.trim().toLowerCase();
    if (clean.length < 3 || clean.length > 32) {
      return { available: false, message: 'Username must be between 3 and 32 characters' };
    }
    if (!/^[a-zA-Z0-9_]+$/.test(clean)) {
      return { available: false, message: 'Username can only contain letters, numbers, and underscores' };
    }

    const user = await prisma.user.findUnique({
      where: { username: clean },
      select: { id: true },
    });

    return {
      available: !user,
      message: user ? 'Username already taken' : 'Username is available',
    };
  }

  async updateProfile(userId: string, data: {
    displayName?: string;
    bio?: string;
    avatarUrl?: string;
    theme?: string;
    language?: string;
  }) {
    const updated = await prisma.profile.upsert({
      where: { userId },
      update: {
        ...(data.displayName !== undefined && { displayName: data.displayName }),
        ...(data.bio !== undefined && { bio: data.bio }),
        ...(data.avatarUrl !== undefined && { avatarUrl: data.avatarUrl }),
        ...(data.theme !== undefined && { theme: data.theme }),
        ...(data.language !== undefined && { language: data.language }),
      },
      create: {
        userId,
        displayName: data.displayName || 'User',
        bio: data.bio || null,
        avatarUrl: data.avatarUrl || null,
        theme: data.theme || 'dark',
        language: data.language || 'ru',
      },
    });

    return updated;
  }

  async updatePrivacy(userId: string, data: {
    lastSeenVisibility?: PrivacyVisibility;
    messageVisibility?: PrivacyVisibility;
    callVisibility?: PrivacyVisibility;
    groupAddVisibility?: PrivacyVisibility;
    photoVisibility?: PrivacyVisibility;
  }) {
    const updated = await prisma.profile.update({
      where: { userId },
      data: {
        ...(data.lastSeenVisibility && { lastSeenVisibility: data.lastSeenVisibility }),
        ...(data.messageVisibility && { messageVisibility: data.messageVisibility }),
        ...(data.callVisibility && { callVisibility: data.callVisibility }),
        ...(data.groupAddVisibility && { groupAddVisibility: data.groupAddVisibility }),
        ...(data.photoVisibility && { photoVisibility: data.photoVisibility }),
      },
    });

    return updated;
  }

  async getProfile(currentUserId: string, targetIdOrUsername: string) {
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { id: targetIdOrUsername },
          { username: targetIdOrUsername.toLowerCase() },
        ],
      },
      include: {
        profile: true,
      },
    });

    if (!user) {
      const err: any = new Error('User not found');
      err.status = 404;
      throw err;
    }

    // Check if blocked
    const isBlocked = await prisma.block.findFirst({
      where: {
        OR: [
          { blockerId: currentUserId, blockedId: user.id },
          { blockerId: user.id, blockedId: currentUserId },
        ],
      },
    });

    // Check if contact
    const isContact = await prisma.contact.findUnique({
      where: {
        userId_contactUserId: {
          userId: user.id,
          contactUserId: currentUserId,
        },
      },
    });

    const prof = user.profile;
    let showLastSeen = true;
    let showPhoto = true;

    if (prof) {
      if (prof.lastSeenVisibility === PrivacyVisibility.NOBODY) {
        showLastSeen = false;
      } else if (prof.lastSeenVisibility === PrivacyVisibility.CONTACTS && !isContact) {
        showLastSeen = false;
      }

      if (prof.photoVisibility === PrivacyVisibility.NOBODY) {
        showPhoto = false;
      } else if (prof.photoVisibility === PrivacyVisibility.CONTACTS && !isContact) {
        showPhoto = false;
      }
    }

    if (isBlocked) {
      showLastSeen = false;
      showPhoto = false;
    }

    return {
      id: user.id,
      username: user.username,
      displayName: prof?.displayName || user.username,
      bio: isBlocked ? null : prof?.bio || null,
      avatarUrl: currentUserId === user.id || showPhoto ? prof?.avatarUrl : null,
      lastSeenAt: currentUserId === user.id || showLastSeen ? prof?.lastSeenAt?.toISOString() : null,
      isBlocked: isBlocked?.blockerId === currentUserId,
      canMessage: await maySee(currentUserId, user.id, prof?.messageVisibility),
      canCall: await maySee(currentUserId, user.id, prof?.callVisibility),
      isPremium: user.isPremium && (!user.premiumUntil || user.premiumUntil > new Date()),
      isOnline: showLastSeen && !!gatewayInstance?.isOnline(user.id),
      createdAt: user.createdAt.toISOString(),
    };
  }

  async searchUsers(query: string, currentUserId: string) {
    const clean = query.trim().toLowerCase();
    if (!clean) return [];

    const users = await prisma.user.findMany({
      where: {
        AND: [
          { id: { not: currentUserId } },
          { isBanned: false },
          {
            OR: [
              { username: { contains: clean, mode: 'insensitive' } },
              { profile: { displayName: { contains: clean, mode: 'insensitive' } } },
            ],
          },
        ],
      },
      include: { profile: true },
      take: 20,
    });

    return Promise.all(users.map(u => this.getProfile(currentUserId, u.id)));
  }

  async blockUser(currentUserId: string, targetUserId: string, reason?: string) {
    if (currentUserId === targetUserId) {
      const err: any = new Error('Cannot block yourself');
      err.status = 400;
      throw err;
    }

    await prisma.block.upsert({
      where: {
        blockerId_blockedId: {
          blockerId: currentUserId,
          blockedId: targetUserId,
        },
      },
      update: { reason },
      create: {
        blockerId: currentUserId,
        blockedId: targetUserId,
        reason,
      },
    });

    return { message: 'User blocked' };
  }

  async unblockUser(currentUserId: string, targetUserId: string) {
    await prisma.block.deleteMany({
      where: {
        blockerId: currentUserId,
        blockedId: targetUserId,
      },
    });

    return { message: 'User unblocked' };
  }

  async getBlockedUsers(currentUserId: string) {
    const blocks = await prisma.block.findMany({
      where: { blockerId: currentUserId },
      include: {
        blocked: {
          include: { profile: true },
        },
      },
    });

    return blocks.map(b => ({
      id: b.blocked.id,
      username: b.blocked.username,
      displayName: b.blocked.profile?.displayName || b.blocked.username,
      avatarUrl: b.blocked.profile?.avatarUrl,
      blockedAt: b.createdAt.toISOString(),
      reason: b.reason,
    }));
  }
}

export const usersService = new UsersService();
