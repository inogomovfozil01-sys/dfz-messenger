import { prisma } from '../prisma';
import { MessageType, ReceiptStatus, MemberRole, ChatType } from '@dfz/types';

export class MessagesService {
  async getMessages(chatId: string, userId: string, options: {
    cursor?: string;
    limit?: number;
    direction?: 'before' | 'after';
  }) {
    // 1. Verify user has access to chat
    const membership = await prisma.chatMember.findUnique({
      where: { chatId_userId: { chatId, userId } },
    });

    const chat = await prisma.chat.findUnique({
      where: { id: chatId },
      select: { isPublic: true },
    });

    if (!membership && !chat?.isPublic) {
      const err: any = new Error('Access denied to messages');
      err.status = 403;
      throw err;
    }

    const limit = Math.min(options.limit || 40, 100);

    // 2. Cursor pagination query
    let cursorObj = options.cursor ? { id: options.cursor } : undefined;

    const messages = await prisma.message.findMany({
      where: {
        chatId,
        isDeleted: false,
      },
      take: limit + 1,
      cursor: cursorObj,
      skip: cursorObj ? 1 : 0,
      orderBy: { createdAt: 'desc' }, // newest first for initial load
      include: {
        sender: {
          include: { profile: true },
        },
        attachments: true,
        replyTo: {
          include: {
            sender: {
              include: { profile: true },
            },
          },
        },
        reactions: {
          include: {
            user: {
              include: { profile: true },
            },
          },
        },
        receipts: true,
      },
    });

    let hasMore = false;
    let items = messages;
    if (items.length > limit) {
      hasMore = true;
      items = items.slice(0, limit);
    }

    // Format reaction summaries
    const formatted = items.map((m) => {
      const reactionMap = new Map<string, {
        emoji: string;
        count: number;
        users: Array<{ id: string; username: string; displayName?: string }>;
        hasReacted: boolean;
      }>();

      for (const r of m.reactions) {
        let entry = reactionMap.get(r.emoji);
        if (!entry) {
          entry = {
            emoji: r.emoji,
            count: 0,
            users: [],
            hasReacted: false,
          };
          reactionMap.set(r.emoji, entry);
        }
        entry.count++;
        entry.users.push({
          id: r.user.id,
          username: r.user.username,
          displayName: r.user.profile?.displayName,
        });
        if (r.userId === userId) {
          entry.hasReacted = true;
        }
      }

      // Check read receipts
      const hasRead = m.receipts.some(rec => rec.userId !== m.senderId && rec.status === ReceiptStatus.READ);
      const deliveryStatus = hasRead ? 'read' : m.receipts.length > 0 ? 'delivered' : 'sent';

      return {
        id: m.id,
        chatId: m.chatId,
        senderId: m.senderId,
        sender: {
          id: m.sender.id,
          username: m.sender.username,
          displayName: m.sender.profile?.displayName || m.sender.username,
          avatarUrl: m.sender.profile?.avatarUrl,
        },
        type: m.type,
        content: m.content,
        attachments: m.attachments.map(a => ({
          id: a.id,
          messageId: a.messageId,
          originalName: a.originalName,
          mimeType: a.mimeType,
          sizeBytes: a.sizeBytes,
          url: a.url,
          thumbnailUrl: a.thumbnailUrl,
          duration: a.duration,
          waveform: (a.waveform as number[]) || null,
          width: a.width,
          height: a.height,
        })),
        replyTo: m.replyTo ? {
          id: m.replyTo.id,
          content: m.replyTo.content,
          senderName: m.replyTo.sender.profile?.displayName || m.replyTo.sender.username,
          type: m.replyTo.type,
        } : null,
        reactions: Array.from(reactionMap.values()),
        isEdited: m.isEdited,
        isDeleted: m.isDeleted,
        deliveryStatus,
        createdAt: m.createdAt.toISOString(),
        updatedAt: m.updatedAt.toISOString(),
      };
    });

    // Return chronological order for UI rendering
    formatted.reverse();

    return {
      items: formatted,
      nextCursor: hasMore && items.length > 0 ? items[items.length - 1].id : null,
      hasMore,
    };
  }

  async sendMessage(userId: string, data: {
    chatId: string;
    content: string;
    type?: MessageType;
    replyToId?: string;
    attachments?: Array<{
      originalName: string;
      mimeType: string;
      sizeBytes: number;
      storageKey: string;
      url: string;
      thumbnailUrl?: string;
      duration?: number;
      waveform?: number[];
      width?: number;
      height?: number;
    }>;
    idempotencyKey?: string;
  }) {
    // 1. Check idempotency if provided
    if (data.idempotencyKey) {
      const existing = await prisma.message.findFirst({
        where: {
          chatId: data.chatId,
          senderId: userId,
          idempotencyKey: data.idempotencyKey,
        },
        include: {
          sender: { include: { profile: true } },
          attachments: true,
        },
      });
      if (existing) {
        return this.formatSingleMessage(existing, userId);
      }
    }

    // 2. Check chat & membership
    const chat = await prisma.chat.findUnique({
      where: { id: data.chatId },
      include: { members: true },
    });

    if (!chat) {
      const err: any = new Error('Chat not found');
      err.status = 404;
      throw err;
    }

    const membership = chat.members.find(m => m.userId === userId);
    if (!membership) {
      const err: any = new Error('You are not a member of this chat');
      err.status = 403;
      throw err;
    }

    // Check if direct chat partner has blocked
    if (chat.type === ChatType.DIRECT) {
      const other = chat.members.find(m => m.userId !== userId);
      if (other) {
        const isBlocked = await prisma.block.findFirst({
          where: {
            OR: [
              { blockerId: userId, blockedId: other.userId },
              { blockerId: other.userId, blockedId: userId },
            ],
          },
        });
        if (isBlocked) {
          const err: any = new Error('Message cannot be sent due to user block');
          err.status = 403;
          err.code = 'USER_BLOCKED';
          throw err;
        }
      }
    }

    // In channels, only OWNER and ADMIN can post messages
    if (chat.type === ChatType.CHANNEL && membership.role === MemberRole.MEMBER) {
      const err: any = new Error('Only channel administrators can post messages');
      err.status = 403;
      throw err;
    }

    // 3. Create message
    const message = await prisma.message.create({
      data: {
        chatId: data.chatId,
        senderId: userId,
        content: data.content || '',
        type: data.type || MessageType.TEXT,
        replyToId: data.replyToId || null,
        idempotencyKey: data.idempotencyKey || null,
        attachments: data.attachments && data.attachments.length > 0 ? {
          create: data.attachments.map(att => ({
            originalName: att.originalName,
            mimeType: att.mimeType,
            sizeBytes: att.sizeBytes,
            storageKey: att.storageKey,
            url: att.url,
            thumbnailUrl: att.thumbnailUrl,
            duration: att.duration,
            waveform: att.waveform ? att.waveform : undefined,
            width: att.width,
            height: att.height,
          })),
        } : undefined,
      },
      include: {
        sender: { include: { profile: true } },
        attachments: true,
        replyTo: {
          include: { sender: { include: { profile: true } } },
        },
      },
    });

    // Update chat updatedAt timestamp
    await prisma.chat.update({
      where: { id: data.chatId },
      data: { updatedAt: new Date() },
    });

    return this.formatSingleMessage(message, userId);
  }

  async editMessage(userId: string, messageId: string, newContent: string) {
    const msg = await prisma.message.findUnique({
      where: { id: messageId },
      include: { chat: { include: { members: true } } },
    });

    if (!msg || msg.isDeleted) {
      const err: any = new Error('Message not found');
      err.status = 404;
      throw err;
    }

    if (msg.senderId !== userId) {
      const err: any = new Error('You can only edit your own messages');
      err.status = 403;
      throw err;
    }

    const updated = await prisma.message.update({
      where: { id: messageId },
      data: {
        content: newContent,
        isEdited: true,
      },
      include: {
        sender: { include: { profile: true } },
        attachments: true,
        replyTo: { include: { sender: { include: { profile: true } } } },
      },
    });

    return this.formatSingleMessage(updated, userId);
  }

  async deleteMessage(userId: string, messageId: string) {
    const msg = await prisma.message.findUnique({
      where: { id: messageId },
      include: { chat: { include: { members: true } } },
    });

    if (!msg || msg.isDeleted) {
      const err: any = new Error('Message not found');
      err.status = 404;
      throw err;
    }

    const membership = msg.chat.members.find(m => m.userId === userId);
    const isSender = msg.senderId === userId;
    const isAdmin = membership && (membership.role === MemberRole.ADMIN || membership.role === MemberRole.OWNER);

    if (!isSender && !isAdmin) {
      const err: any = new Error('Permission denied to delete this message');
      err.status = 403;
      throw err;
    }

    await prisma.message.update({
      where: { id: messageId },
      data: {
        isDeleted: true,
        content: 'This message was deleted',
      },
    });

    return { messageId, chatId: msg.chatId, isDeleted: true };
  }

  async addReaction(userId: string, messageId: string, emoji: string) {
    const msg = await prisma.message.findUnique({
      where: { id: messageId },
      include: { chat: { include: { members: true } } },
    });

    if (!msg || msg.isDeleted) {
      const err: any = new Error('Message not found');
      err.status = 404;
      throw err;
    }

    const isMember = msg.chat.members.some(m => m.userId === userId);
    if (!isMember) {
      const err: any = new Error('Must be chat member to react');
      err.status = 403;
      throw err;
    }

    await prisma.reaction.upsert({
      where: {
        messageId_userId_emoji: {
          messageId,
          userId,
          emoji,
        },
      },
      update: {},
      create: {
        messageId,
        userId,
        emoji,
      },
    });

    return { messageId, chatId: msg.chatId, emoji, userId };
  }

  async removeReaction(userId: string, messageId: string, emoji: string) {
    const msg = await prisma.message.findUnique({
      where: { id: messageId },
      select: { chatId: true },
    });

    await prisma.reaction.deleteMany({
      where: {
        messageId,
        userId,
        emoji,
      },
    });

    return { messageId, chatId: msg?.chatId, emoji, userId };
  }

  async markReceipt(userId: string, chatId: string, messageIds: string[], status: ReceiptStatus) {
    if (!messageIds.length) return { updatedCount: 0 };

    for (const msgId of messageIds) {
      await prisma.messageReceipt.upsert({
        where: {
          messageId_userId: {
            messageId: msgId,
            userId,
          },
        },
        update: { status },
        create: {
          messageId: msgId,
          userId,
          status,
        },
      });
    }

    return { updatedCount: messageIds.length, status, chatId };
  }

  async pinMessage(chatId: string, messageId: string, userId: string) {
    const chat = await prisma.chat.findUnique({
      where: { id: chatId },
      include: { members: true },
    });

    if (!chat) {
      const err: any = new Error('Chat not found');
      err.status = 404;
      throw err;
    }

    const member = chat.members.find(m => m.userId === userId);
    if (!member || (member.role === MemberRole.MEMBER && chat.type !== ChatType.SAVED && chat.type !== ChatType.DIRECT)) {
      const err: any = new Error('Permission denied to pin message');
      err.status = 403;
      throw err;
    }

    const pinned = await prisma.pinnedMessage.upsert({
      where: {
        chatId_messageId: { chatId, messageId },
      },
      update: {},
      create: {
        chatId,
        messageId,
        pinnedById: userId,
      },
    });

    return pinned;
  }

  async unpinMessage(chatId: string, messageId: string, userId: string) {
    await prisma.pinnedMessage.deleteMany({
      where: { chatId, messageId },
    });

    return { message: 'Message unpinned' };
  }

  private formatSingleMessage(m: any, viewerUserId: string) {
    return {
      id: m.id,
      chatId: m.chatId,
      senderId: m.senderId,
      sender: {
        id: m.sender.id,
        username: m.sender.username,
        displayName: m.sender.profile?.displayName || m.sender.username,
        avatarUrl: m.sender.profile?.avatarUrl,
      },
      type: m.type,
      content: m.content,
      attachments: m.attachments?.map((a: any) => ({
        id: a.id,
        messageId: a.messageId,
        originalName: a.originalName,
        mimeType: a.mimeType,
        sizeBytes: a.sizeBytes,
        url: a.url,
        thumbnailUrl: a.thumbnailUrl,
        duration: a.duration,
        waveform: a.waveform,
        width: a.width,
        height: a.height,
      })) || [],
      replyTo: m.replyTo ? {
        id: m.replyTo.id,
        content: m.replyTo.content,
        senderName: m.replyTo.sender?.profile?.displayName || m.replyTo.sender?.username,
        type: m.replyTo.type,
      } : null,
      reactions: [],
      isEdited: m.isEdited,
      isDeleted: m.isDeleted,
      deliveryStatus: 'sent',
      createdAt: m.createdAt.toISOString(),
      updatedAt: m.updatedAt.toISOString(),
    };
  }
}

export const messagesService = new MessagesService();
