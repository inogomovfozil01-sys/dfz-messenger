import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../prisma';
import { ChatType, MemberRole, ReceiptStatus } from '@dfz/types';

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
        const lastMsg = chat.messages[0] || null;

        // Count unread messages
        let unreadCount = 0;
        if (lastMsg) {
          unreadCount = await prisma.message.count({
            where: {
              chatId: chat.id,
              senderId: { not: userId },
              createdAt: { gt: m.joinedAt },
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
            avatarUrl = otherMember.user.profile?.avatarUrl || null;
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
            avatarUrl: mem.user.profile?.avatarUrl,
            lastSeenAt: mem.user.profile?.lastSeenAt?.toISOString() || null,
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

    let title = chat.title;
    let avatarUrl = chat.avatarUrl;
    if (chat.type === ChatType.DIRECT) {
      const other = chat.members.find(m => m.userId !== userId);
      if (other) {
        title = other.user.profile?.displayName || other.user.username;
        avatarUrl = other.user.profile?.avatarUrl || null;
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
        avatarUrl: m.user.profile?.avatarUrl,
        bio: m.user.profile?.bio,
        lastSeenAt: m.user.profile?.lastSeenAt?.toISOString() || null,
        joinedAt: m.joinedAt.toISOString(),
      })),
      pinnedMessages: chat.pinnedMessages.map(p => ({
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
    const inviteCode = uuidv4().substring(0, 8);
    const membersToCreate: any[] = [
      { userId: ownerId, role: MemberRole.OWNER },
    ];

    if (data.memberIds && Array.isArray(data.memberIds)) {
      for (const mId of data.memberIds) {
        if (mId !== ownerId) {
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

    // Role checks
    if (actor.role === MemberRole.MEMBER && actorId !== targetUserId) {
      const err: any = new Error('Permission denied to remove member');
      err.status = 403;
      throw err;
    }

    if (actor.role === MemberRole.ADMIN && target.role === MemberRole.OWNER) {
      const err: any = new Error('Cannot remove group owner');
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
}

export const chatsService = new ChatsService();
