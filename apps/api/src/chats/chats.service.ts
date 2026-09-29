import { requireCommunication, requireMember, requireRight, httpError } from '../common/access';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../prisma';
import { requireOwnedMedia } from '../media/media.service';
import { ChatType, MemberRole, ReceiptStatus } from '@dfz/types';
import { usersService } from '../users/users.service';
import { gatewayInstance } from '../gateway/websocket.gateway';

export class ChatsService {
  async getUserChats(userId: string) {
    const memberships = await prisma.chatMember.findMany({
      where: { userId },
      include: {
        chat: {
          include: {
            members: {
              include: {
                user: {
                  include: { profile: true },
                },
              },
            },
            messages: {
              take: 1,
              orderBy: { createdAt: 'desc' },
              include: {
                sender: {
                  include: { profile: true },
                },
                attachments: true,
              },
            },
          },
        },
      },
      orderBy: [
        { isPinned: 'desc' },
        { chat: { updatedAt: 'desc' } },
      ],
    });

    const results = await Promise.all(
      memberships.map(async (m) => {
        const chat = m.chat;
        const candidate = chat.messages[0];
        const lastMsg = candidate && !candidate.isDeleted && (!m.clearedAt || candidate.createdAt > m.clearedAt) ? candidate : null;
        const profiles = new Map(await Promise.all(chat.members.map(async mem => [mem.userId, await usersService.getProfile(userId, mem.userId)] as const)));

        // Count unread messages
        let unreadCount = 0;
        if (lastMsg) {
          unreadCount = await prisma.message.count({
            where: {
              chatId: chat.id,
              senderId: { not: userId },
              isDeleted: false,
              createdAt: { gt: m.clearedAt && m.clearedAt > m.joinedAt ? m.clearedAt : m.joinedAt },
              receipts: {
                none: {
                  userId,
                  status: ReceiptStatus.READ,
                },
              },
            },
          });
        }

        // Determine title & avatar for DIRECT chats
        let title = chat.title;
        let avatarUrl = chat.avatarUrl;

        if (chat.type === ChatType.DIRECT) {
          const otherMember = chat.members.find(mem => mem.userId !== userId);
          if (otherMember) {
            title = otherMember.user.profile?.displayName || otherMember.user.username;
            avatarUrl = profiles.get(otherMember.userId)?.avatarUrl || null;
          }
        } else if (chat.type === ChatType.SAVED) {
          title = 'Saved Messages';
        }

        return {
          id: chat.id,
          type: chat.type,
          title,
          description: chat.description,
          avatarUrl,
          ownerId: chat.ownerId,
          isPublic: chat.isPublic,
          inviteCode: chat.inviteCode,
          isPinned: m.isPinned,
          isMuted: m.isMuted,
          isArchived: m.isArchived,
          mutedUntil: m.mutedUntil?.toISOString() || null,
          role: m.role,
          unreadCount,
          lastMessage: lastMsg ? {
            id: lastMsg.id,
            chatId: lastMsg.chatId,
            senderId: lastMsg.senderId,
            senderName: lastMsg.sender.profile?.displayName || lastMsg.sender.username,
            content: lastMsg.content,
            type: lastMsg.type,
            createdAt: lastMsg.createdAt.toISOString(),
          } : null,
          members: chat.members.map(mem => ({
            id: mem.id,
            userId: mem.userId,
            role: mem.role,
            username: mem.user.username,
            displayName: mem.user.profile?.displayName || mem.user.username,
            avatarUrl: profiles.get(mem.userId)?.avatarUrl,
            lastSeenAt: profiles.get(mem.userId)?.lastSeenAt || null,
            isOnline: profiles.get(mem.userId)?.isOnline || false,
          })),
          createdAt: chat.createdAt.toISOString(),
          updatedAt: chat.updatedAt.toISOString(),
        };
      })
    );

    return results;
  }

  async getChatById(chatId: string, userId: string) {
    const chat = await prisma.chat.findUnique({
      where: { id: chatId },
      include: {
        members: {
          include: {
            user: {
              include: { profile: true },
            },
          },
        },
        pinnedMessages: {
          include: {
            message: {
              include: {
                sender: {
                  include: { profile: true },
                },
                attachments: true,
              },
            },
          },
        },
      },
    });

    if (!chat) {
      const err: any = new Error('Chat not found');
      err.status = 404;
      throw err;
    }

    const membership = chat.members.find(m => m.userId === userId);
    if (!membership && !chat.isPublic) {
      const err: any = new Error('Access denied to this conversation');
      err.status = 403;
      throw err;
    }

    const profiles = new Map(await Promise.all(chat.members.map(async mem => [mem.userId, await usersService.getProfile(userId, mem.userId)] as const)));
    let title = chat.title;
    let avatarUrl = chat.avatarUrl;
    if (chat.type === ChatType.DIRECT) {
      const other = chat.members.find(m => m.userId !== userId);
      if (other) {
        title = other.user.profile?.displayName || other.user.username;
        avatarUrl = profiles.get(other.userId)?.avatarUrl || null;
      }
    } else if (chat.type === ChatType.SAVED) {
      title = 'Saved Messages';
    }

    return {
      id: chat.id,
      type: chat.type,
      title,
      description: chat.description,
      avatarUrl,
      ownerId: chat.ownerId,
      isPublic: chat.isPublic,
      inviteCode: chat.inviteCode,
      isPinned: membership?.isPinned || false,
      isMuted: membership?.isMuted || false,
      isArchived: membership?.isArchived || false,
      myRole: membership?.role || null,
      permissions: membership?.permissions,
      members: chat.members.map(m => ({
        id: m.id,
        userId: m.userId,
        role: m.role,
        permissions: m.permissions,
        username: m.user.username,
        displayName: m.user.profile?.displayName || m.user.username,
        avatarUrl: profiles.get(m.userId)?.avatarUrl,
        bio: profiles.get(m.userId)?.bio,
        lastSeenAt: profiles.get(m.userId)?.lastSeenAt || null,
        isOnline: profiles.get(m.userId)?.isOnline || false,
        joinedAt: m.joinedAt.toISOString(),
      })),
      pinnedMessages: chat.pinnedMessages.filter(p => !p.message.isDeleted && (!membership?.clearedAt || p.message.createdAt > membership.clearedAt)).map(p => ({
        id: p.message.id,
        content: p.message.content,
        senderId: p.message.senderId,
        senderName: p.message.sender.profile?.displayName || p.message.sender.username,
        pinnedAt: p.pinnedAt.toISOString(),
      })),
      createdAt: chat.createdAt.toISOString(),
      updatedAt: chat.updatedAt.toISOString(),
    };
  }

  async createDirectChat(currentUserId: string, targetUserId: string) {
    if (currentUserId === targetUserId) {
      // Return or create Saved Messages chat
      let saved = await prisma.chat.findFirst({
        where: {
          type: ChatType.SAVED,
          ownerId: currentUserId,
        },
      });
      if (!saved) {
        saved = await prisma.chat.create({
          data: {
            type: ChatType.SAVED,
            title: 'Saved Messages',
            ownerId: currentUserId,
            members: {
              create: { userId: currentUserId, role: MemberRole.OWNER },
            },
          },
        });
      }
      return this.getChatById(saved.id, currentUserId);
    }

    await requireCommunication(currentUserId, targetUserId, 'messageVisibility');
    // Check if target is blocked or blocked us
    const isBlocked = await prisma.block.findFirst({
      where: {
        OR: [
          { blockerId: currentUserId, blockedId: targetUserId },
          { blockerId: targetUserId, blockedId: currentUserId },
        ],
      },
    });

    if (isBlocked) {
      const err: any = new Error('Cannot communicate with this user due to block restrictions');
      err.status = 403;
      err.code = 'USER_BLOCKED';
      throw err;
    }

    // Check if direct chat already exists
    const existingChat = await prisma.chat.findFirst({
      where: {
        type: ChatType.DIRECT,
        AND: [
          { members: { some: { userId: currentUserId } } },
          { members: { some: { userId: targetUserId } } },
        ],
      },
    });

    if (existingChat) {
      return this.getChatById(existingChat.id, currentUserId);
    }

    // Create new direct chat
    const newChat = await prisma.chat.create({
      data: {
        type: ChatType.DIRECT,
        members: {
          create: [
            { userId: currentUserId, role: MemberRole.MEMBER },
            { userId: targetUserId, role: MemberRole.MEMBER },
          ],
        },
      },
    });

    return this.getChatById(newChat.id, currentUserId);
  }

  async createGroup(ownerId: string, data: {
    title: string;
    description?: string;
    avatarUrl?: string;
    memberIds?: string[];
  }) {
    await requireOwnedMedia(ownerId, data.avatarUrl);
    const inviteCode = uuidv4().substring(0, 8);
    const membersToCreate: any[] = [
      { userId: ownerId, role: MemberRole.OWNER },
    ];

    if (data.memberIds && Array.isArray(data.memberIds)) {
      for (const mId of new Set(data.memberIds)) {
        if (mId !== ownerId) {
          await requireCommunication(ownerId, mId, 'groupAddVisibility');
          membersToCreate.push({ userId: mId, role: MemberRole.MEMBER });
        }
      }
    }

    const group = await prisma.chat.create({
      data: {
        type: ChatType.GROUP,
        title: data.title.trim(),
        description: data.description || null,
        avatarUrl: data.avatarUrl || null,
        ownerId,
        inviteCode,
        members: {
          create: membersToCreate,
        },
      },
    });

    return this.getChatById(group.id, ownerId);
  }

  async createChannel(ownerId: string, data: {
    title: string;
    description?: string;
    avatarUrl?: string;
    isPublic?: boolean;
  }) {
    await requireOwnedMedia(ownerId, data.avatarUrl);
    const inviteCode = uuidv4().substring(0, 8);
    const channel = await prisma.chat.create({
      data: {
        type: ChatType.CHANNEL,
        title: data.title.trim(),
        description: data.description || null,
        avatarUrl: data.avatarUrl || null,
        ownerId,
        isPublic: !!data.isPublic,
        inviteCode,
        members: {
          create: { userId: ownerId, role: MemberRole.OWNER },
        },
      },
    });

    return this.getChatById(channel.id, ownerId);
  }

  async addMember(chatId: string, actorId: string, targetUserId: string, role: MemberRole = MemberRole.MEMBER) {
    const chat = await prisma.chat.findUnique({
      where: { id: chatId },
      include: { members: true },
    });

    if (!chat) {
      const err: any = new Error('Chat not found');
      err.status = 404;
      throw err;
    }

    const actorMembership = chat.members.find(m => m.userId === actorId);
    if (!actorMembership || (actorMembership.role === MemberRole.MEMBER && chat.type !== ChatType.GROUP)) {
      const err: any = new Error('Permission denied to add members');
      err.status = 403;
      throw err;
    }

    if (!['GROUP', 'CHANNEL'].includes(chat.type)) throw httpError(403, 'Cannot add members to private conversation');
    requireRight(actorMembership, 'inviteUsers', chat.type === 'GROUP');
    if (role !== MemberRole.MEMBER) throw httpError(403, 'Use owner role management to promote members');
    await requireCommunication(actorId, targetUserId, 'groupAddVisibility');
    const alreadyMember = chat.members.find(m => m.userId === targetUserId);
    if (alreadyMember) {
      return { message: 'User is already a member' };
    }

    await prisma.chatMember.create({
      data: {
        chatId,
        userId: targetUserId,
        role,
      },
    });

    return this.getChatById(chatId, actorId);
  }

  async removeMember(chatId: string, actorId: string, targetUserId: string) {
    const chat = await prisma.chat.findUnique({
      where: { id: chatId },
      include: { members: true },
    });

    if (!chat) {
      const err: any = new Error('Chat not found');
      err.status = 404;
      throw err;
    }

    const actor = chat.members.find(m => m.userId === actorId);
    const target = chat.members.find(m => m.userId === targetUserId);

    if (!actor || !target) {
      const err: any = new Error('Member not found');
      err.status = 404;
      throw err;
    }

    if (target.role === 'OWNER') throw httpError(403, 'Transfer ownership or delete the group before leaving');
    if (actorId !== targetUserId) requireRight(actor, 'banUsers');
    if (actor.role === 'ADMIN' && target.role === 'ADMIN' && actorId !== targetUserId) throw httpError(403, 'Only owner can remove admins');
    // Role checks
    if (actor.role === MemberRole.MEMBER && actorId !== targetUserId) {
      const err: any = new Error('Permission denied to remove member');
      err.status = 403;
      throw err;
    }

    await prisma.chatMember.delete({
      where: {
        chatId_userId: {
          chatId,
          userId: targetUserId,
        },
      },
    });

    gatewayInstance?.io.in(`user:${targetUserId}`).socketsLeave(`chat:${chatId}`);
    return { message: 'Member removed successfully' };
  }

  async togglePinChat(chatId: string, userId: string, isPinned: boolean) {
    await prisma.chatMember.update({
      where: {
        chatId_userId: { chatId, userId },
      },
      data: { isPinned },
    });
    return { isPinned };
  }

  async toggleMuteChat(chatId: string, userId: string, isMuted: boolean, mutedUntil?: Date) {
    await prisma.chatMember.update({
      where: {
        chatId_userId: { chatId, userId },
      },
      data: { isMuted, mutedUntil },
    });
    return { isMuted, mutedUntil };
  }

  async toggleArchiveChat(chatId: string, userId: string, isArchived: boolean) {
    await prisma.chatMember.update({
      where: {
        chatId_userId: { chatId, userId },
      },
      data: { isArchived },
    });
    return { isArchived };
  }

  async createTopic(chatId: string, userId: string, data: { title: string; icon?: string; color?: string }) {
    const membership = await prisma.chatMember.findUnique({
      where: { chatId_userId: { chatId, userId } },
    });

    if (!membership) {
      throw new Error('Not a member of this chat');
    }

    requireRight(membership, 'manageTopics');
    const topic = await prisma.topic.create({
      data: {
        chatId,
        creatorId: userId,
        title: data.title,
        icon: data.icon,
        color: data.color,
      },
      include: {
        creator: {
          select: { id: true, username: true, profile: true },
        },
      },
    });

    // Mark chat as forum
    await prisma.chat.update({
      where: { id: chatId },
      data: { isForum: true },
    });

    if (gatewayInstance) {
      gatewayInstance.broadcastToChat(chatId, 'topic:new', {
        chatId,
        topic: {
          ...topic,
          createdAt: topic.createdAt.toISOString(),
          updatedAt: topic.updatedAt.toISOString(),
          messageCount: 0,
        },
      });
    }

    return topic;
  }

  async getTopics(chatId: string, userId: string) {
    const membership = await prisma.chatMember.findUnique({
      where: { chatId_userId: { chatId, userId } },
    });

    if (!membership) {
      throw new Error('Access denied');
    }

    const topics = await prisma.topic.findMany({
      where: { chatId },
      orderBy: [{ isPinned: 'desc' }, { updatedAt: 'desc' }],
      include: {
        creator: {
          select: { id: true, username: true, profile: true },
        },
        _count: {
          select: { messages: true },
        },
        messages: {
          take: 1,
          orderBy: { createdAt: 'desc' },
          include: {
            sender: {
              select: { id: true, username: true, profile: true },
            },
          },
        },
      },
    });

    return topics.map((t) => ({
      id: t.id,
      chatId: t.chatId,
      title: t.title,
      icon: t.icon,
      color: t.color,
      creatorId: t.creatorId,
      creator: t.creator,
      isClosed: t.isClosed,
      isPinned: t.isPinned,
      messageCount: t._count.messages,
      lastMessage: t.messages[0] ? {
        id: t.messages[0].id,
        content: t.messages[0].content,
        senderName: t.messages[0].sender?.profile?.displayName || t.messages[0].sender?.username,
        createdAt: t.messages[0].createdAt.toISOString(),
      } : null,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
    }));
  }

  async closeTopic(chatId: string, topicId: string, userId: string) {
    const membership = await prisma.chatMember.findUnique({
      where: { chatId_userId: { chatId, userId } },
    });

    const topic = await prisma.topic.findUnique({
      where: { id: topicId },
    });

    if (!topic || topic.chatId !== chatId) {
      throw new Error('Topic not found');
    }

    if (membership?.role !== 'OWNER' && membership?.role !== 'ADMIN' && topic.creatorId !== userId) {
      throw new Error('Unauthorized');
    }

    const updated = await prisma.topic.update({
      where: { id: topicId },
      data: { isClosed: true },
    });

    return updated;
  }

  async updateChat(chatId: string, userId: string, data: {
    title?: string;
    description?: string;
    avatarUrl?: string;
    isPublic?: boolean;
    isForum?: boolean;
  }) {
    const membership = await prisma.chatMember.findUnique({
      where: { chatId_userId: { chatId, userId } },
    });

    if (!membership || (membership.role !== MemberRole.OWNER && membership.role !== MemberRole.ADMIN)) {
      const err: any = new Error('Permission denied to update settings');
      err.status = 403;
      throw err;
    }

    requireRight(membership, 'changeInfo');
    await requireOwnedMedia(userId, data.avatarUrl);
    const updated = await prisma.chat.update({
      where: { id: chatId },
      data: {
        ...(data.title !== undefined && { title: data.title.trim() }),
        ...(data.description !== undefined && { description: data.description?.trim() || null }),
        ...(data.avatarUrl !== undefined && { avatarUrl: data.avatarUrl }),
        ...(data.isPublic !== undefined && { isPublic: data.isPublic }),
        ...(data.isForum !== undefined && { isForum: data.isForum }),
      },
    });

    return this.getChatById(chatId, userId);
  }

  async updateMember(chatId: string, actorId: string, targetUserId: string, data: {
    role?: MemberRole;
    customTitle?: string;
    permissions?: any;
  }) {
    const chat = await prisma.chat.findUnique({
      where: { id: chatId },
      include: { members: true },
    });

    if (!chat) {
      const err: any = new Error('Chat not found');
      err.status = 404;
      throw err;
    }

    const actor = chat.members.find(m => m.userId === actorId);
    if (!actor || actor.role !== MemberRole.OWNER) {
      const err: any = new Error('Only the group owner can update administrator rights and roles');
      err.status = 403;
      throw err;
    }

    if (targetUserId === chat.ownerId || data.role === MemberRole.OWNER) throw httpError(403, 'Ownership cannot be changed here');
    const updated = await prisma.chatMember.update({
      where: { chatId_userId: { chatId, userId: targetUserId } },
      data: {
        ...(data.role && { role: data.role }),
        ...(data.customTitle !== undefined && { customTitle: data.customTitle }),
        ...(data.permissions !== undefined && { permissions: data.permissions }),
      },
      include: {
        user: { include: { profile: true } },
      },
    });

    return updated;
  }

  async deleteChat(chatId: string, userId: string) {
    const chat = await prisma.chat.findUnique({
      where: { id: chatId },
      include: { members: true },
    });

    if (!chat) {
      const err: any = new Error('Chat not found');
      err.status = 404;
      throw err;
    }

    if (chat.type === ChatType.DIRECT) {
      // Both members can delete direct chat
      const isMember = chat.members.some(m => m.userId === userId);
      if (!isMember) {
        const err: any = new Error('Access denied');
        err.status = 403;
        throw err;
      }
    } else {
      // Group or Channel: only owner can delete
      if (chat.ownerId !== userId) {
        const err: any = new Error('Only the creator can delete this conversation');
        err.status = 403;
        throw err;
      }
    }

    await prisma.chat.delete({
      where: { id: chatId },
    });

    return { success: true, message: 'Chat deleted permanently' };
  }

  async clearHistory(chatId: string, userId: string) {
    const membership = await prisma.chatMember.findUnique({
      where: { chatId_userId: { chatId, userId } },
    });

    if (!membership) {
      const err: any = new Error('Access denied');
      err.status = 403;
      throw err;
    }

    // Set member's joinedAt to now, so messages before now are not considered unread/visible
    await prisma.chatMember.update({
      where: { chatId_userId: { chatId, userId } },
      data: { clearedAt: new Date() },
    });

    return { success: true, message: 'Chat history cleared' };
  }

  async regenerateInviteCode(chatId: string, userId: string) {
    const membership = await prisma.chatMember.findUnique({
      where: { chatId_userId: { chatId, userId } },
    });

    if (!membership || (membership.role !== MemberRole.OWNER && membership.role !== MemberRole.ADMIN)) {
      const err: any = new Error('Permission denied');
      err.status = 403;
      throw err;
    }

    const newCode = uuidv4().substring(0, 8);
    const updated = await prisma.chat.update({
      where: { id: chatId },
      data: { inviteCode: newCode },
      select: { inviteCode: true },
    });

    return updated;
  }

  async getChatMedia(chatId: string, userId: string, category: 'media' | 'files' | 'voice' | 'links') {
    const membership = await prisma.chatMember.findUnique({
      where: { chatId_userId: { chatId, userId } },
    });

    if (!membership) {
      const err: any = new Error('Access denied');
      err.status = 403;
      throw err;
    }

    if (category === 'links') {
      const messages = await prisma.message.findMany({
        where: {
          chatId,
          isDeleted: false,
          content: { contains: 'http', mode: 'insensitive' },
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });

      return messages.map(m => ({
        id: m.id,
        content: m.content,
        createdAt: m.createdAt.toISOString(),
      }));
    }

    // Attachment-based queries
    const mimeFilter: any = {};
    if (category === 'media') {
      mimeFilter.startsWith = 'image/';
    } else if (category === 'voice') {
      mimeFilter.startsWith = 'audio/';
    } else if (category === 'files') {
      mimeFilter.not = { startsWith: 'image/' };
    }

    const attachments = await prisma.attachment.findMany({
      where: {
        message: { chatId, isDeleted: false },
        mimeType: mimeFilter,
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return attachments.map(a => ({
      id: a.id,
      originalName: a.originalName,
      mimeType: a.mimeType,
      sizeBytes: a.sizeBytes,
      url: a.url,
      thumbnailUrl: a.thumbnailUrl,
      duration: a.duration,
      createdAt: a.createdAt.toISOString(),
    }));
  }
}

export const chatsService = new ChatsService();
