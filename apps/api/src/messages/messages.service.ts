import { requireMember, requirePosting, requireRight, httpError } from '../common/access';
import { prisma } from '../prisma';
import { MessageType, ReceiptStatus, MemberRole, ChatType, UserRole } from '@dfz/types';

export class MessagesService {
  async forward(userId: string, messageIds: string[], chatId: string) {
    await requirePosting(chatId, userId);
    const source = await prisma.message.findMany({ where: { id: { in: messageIds }, isDeleted: false }, include: { attachments: true, chat: { include: { policy: true } } } });
    if (source.length !== new Set(messageIds).size) throw httpError(404, 'Message unavailable');
    for (const message of source) {
      const member = await requireMember(message.chatId, userId);
      if (member.clearedAt && message.createdAt <= member.clearedAt || message.chat.policy?.protectedContent) throw httpError(403, 'Forwarding is restricted');
      await requirePosting(chatId, userId, message.type);
    }
    const result = await prisma.$transaction(async tx => {
      const results = [];
      for (const m of source) {
        const ordinary = !['POLL','GIFT','STARS_TRANSFER','SYSTEM'].includes(m.type);
        results.push(await tx.message.create({ data: { chatId, senderId: userId, forwardedFromId: m.forwardedFromId || m.senderId, content: m.content, type: ordinary ? m.type : 'TEXT', attachments: { create: m.attachments.map(a => ({ originalName:a.originalName, mimeType:a.mimeType, sizeBytes:a.sizeBytes, storageKey:a.storageKey, url:a.url, duration:a.duration })) } }, include: { sender: { include: { profile: true } }, attachments: true } }));
      }
      await tx.chat.update({ where:{id:chatId}, data:{updatedAt:new Date()} });
      return results;
    });
    return result.map(m => this.formatSingleMessage(m, userId));
  }
  async getMessages(chatId: string, userId: string, options: {
    cursor?: string;
    limit?: number;
    direction?: 'before' | 'after';
    topicId?: string;
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

    const limit = Math.max(1, Math.min(options.limit || 40, 100));

    // 2. Cursor pagination query
    let cursorObj = options.cursor ? { id: options.cursor } : undefined;

    const messages = await prisma.message.findMany({
      where: {
        chatId,
        isDeleted: false,
        ...(membership?.clearedAt && { createdAt: { gt: membership.clearedAt } }),
        topicId: options.topicId !== undefined ? options.topicId : undefined,
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
        poll: {
          include: {
            options: true,
            votes: true,
          },
        },
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

      // Format poll if present
      let formattedPoll = null;
      if (m.poll) {
        const totalVotes = m.poll.options.reduce((sum: number, o: any) => sum + o.voteCount, 0);
        const userVotes = m.poll.votes?.filter((v: any) => v.userId === userId).map((v: any) => v.optionId) || [];
        formattedPoll = {
          id: m.poll.id,
          chatId: m.poll.chatId,
          messageId: m.poll.messageId,
          question: m.poll.question,
          isAnonymous: m.poll.isAnonymous,
          allowMultiple: m.poll.allowMultiple,
          isClosed: m.poll.isClosed,
          createdAt: m.poll.createdAt.toISOString(),
          totalVotes,
          hasVoted: userVotes.length > 0,
          userVotes,
          options: m.poll.options.map((opt: any) => ({
            id: opt.id,
            pollId: opt.pollId,
            text: opt.text,
            voteCount: opt.voteCount,
            percentage: totalVotes > 0 ? Math.round((opt.voteCount / totalVotes) * 100) : 0,
            hasVoted: userVotes.includes(opt.id),
          })),
        };
      }

      return {
        id: m.id,
        chatId: m.chatId,
        topicId: m.topicId,
        senderId: m.senderId,
        sender: {
          id: m.sender.id,
          username: m.sender.username,
          displayName: m.sender.profile?.displayName || m.sender.username,
          avatarUrl: m.sender.profile?.avatarUrl,
        },
        type: m.type,
        content: m.content,
        poll: formattedPoll,
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
    topicId?: string;
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
    await requirePosting(data.chatId, userId, data.type);
    if (data.type === MessageType.SYSTEM || data.type === MessageType.GIFT || data.type === MessageType.STARS_TRANSFER) throw httpError(403, 'System message types are server-only');
    if (data.attachments?.length) {
      data.attachments = await Promise.all(data.attachments.map(async att => {
        const upload = await prisma.upload.findUnique({ where: { storageKey: att.storageKey } });
        if (!upload || upload.ownerId !== userId) throw httpError(403, 'Attachment must be uploaded by sender');
        return { ...att, originalName: upload.originalName, mimeType: upload.mimeType, sizeBytes: upload.sizeBytes, url: `/api/media/files/${upload.storageKey}`, thumbnailUrl: undefined };
      }));
    }
    if (data.replyToId && !await prisma.message.findFirst({ where: { id: data.replyToId, chatId: data.chatId, isDeleted: false } })) throw httpError(400, 'Reply must reference a message in this chat');
    if (data.topicId && !await prisma.topic.findFirst({ where: { id: data.topicId, chatId: data.chatId, isClosed: false } })) throw httpError(400, 'Topic unavailable');
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

    // Serialize retries across API workers before testing and inserting the key.
    const message = await prisma.$transaction(async tx => {
    if (data.idempotencyKey) {
      const key = JSON.stringify([data.chatId, userId, data.idempotencyKey]);
      await tx.$queryRaw`SELECT 1 FROM pg_advisory_xact_lock(hashtextextended(${key}, 0))`;
      const existing = await tx.message.findFirst({
        where: { chatId: data.chatId, senderId: userId, idempotencyKey: data.idempotencyKey },
        include: { sender: { include: { profile: true } }, attachments: true, replyTo: { include: { sender: { include: { profile: true } } } } },
      });
      if (existing) return existing;
    }
    const created = await tx.message.create({
      data: {
        chatId: data.chatId,
        senderId: userId,
        topicId: data.topicId || null,
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
    await tx.chat.update({
      where: { id: data.chatId },
      data: { updatedAt: new Date() },
    });
    return created;
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

    await requirePosting(msg.chatId, userId);
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
    const isChatAdmin = membership && (membership.role === MemberRole.ADMIN || membership.role === MemberRole.OWNER);

    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    const isSystemAdmin = currentUser?.role === UserRole.ADMIN || currentUser?.role === UserRole.SUPERADMIN;

    if (!membership && !isSystemAdmin) throw httpError(403, 'Chat membership required');
    if (isChatAdmin && !isSender && !isSystemAdmin) requireRight(membership!, 'deleteMessages');
    if (!isSender && !isChatAdmin && !isSystemAdmin) {
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
    await requireMember(chatId, userId);
    if (!['READ', 'DELIVERED'].includes(status) || messageIds.length > 200 || messageIds.some(id => typeof id !== 'string')) throw httpError(400, 'Invalid receipt');
    if (!messageIds.length) return { updatedCount: 0 };
    const valid = await prisma.message.count({ where: { id: { in: messageIds }, chatId, isDeleted: false } });
    if (valid !== new Set(messageIds).size) throw httpError(403, 'Receipt references inaccessible messages');

    for (const msgId of messageIds) {
      await prisma.messageReceipt.upsert({
        where: {
          messageId_userId: {
            messageId: msgId,
            userId,
          },
        },
        update: status === 'READ' ? { status } : {},
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

    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    const isSystemAdmin = currentUser?.role === UserRole.ADMIN || currentUser?.role === UserRole.SUPERADMIN;

    const member = chat.members.find(m => m.userId === userId);
    if (!isSystemAdmin && (!member || (member.role === MemberRole.MEMBER && chat.type !== ChatType.SAVED && chat.type !== ChatType.DIRECT))) {
      const err: any = new Error('Permission denied to pin message');
      err.status = 403;
      throw err;
    }

    if (!isSystemAdmin && member) {
      requireRight(member, 'pinMessages', chat.type === 'DIRECT' || chat.type === 'SAVED');
    }
    if (!await prisma.message.findFirst({ where: { id: messageId, chatId, isDeleted: false } })) throw httpError(400, 'Message does not belong to chat');
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
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    const isSystemAdmin = currentUser?.role === UserRole.ADMIN || currentUser?.role === UserRole.SUPERADMIN;

    if (!isSystemAdmin) {
      const member = await requireMember(chatId, userId);
      requireRight(member, 'pinMessages', member.chat.type === 'DIRECT' || member.chat.type === 'SAVED');
    }
    await prisma.pinnedMessage.deleteMany({
      where: { chatId, messageId },
    });

    return { message: 'Message unpinned' };
  }

  private formatSingleMessage(m: any, viewerUserId: string) {
    let formattedPoll = null;
      if (m.poll) {
        const totalVotes = m.poll.options?.reduce((sum: number, o: any) => sum + o.voteCount, 0) || 0;
        const userVotes = m.poll.votes?.filter((v: any) => v.userId === viewerUserId).map((v: any) => v.optionId) || [];
        formattedPoll = {
          id: m.poll.id,
          chatId: m.poll.chatId,
          messageId: m.poll.messageId,
          question: m.poll.question,
          isAnonymous: m.poll.isAnonymous,
          allowMultiple: m.poll.allowMultiple,
          isClosed: m.poll.isClosed,
          createdAt: m.poll.createdAt.toISOString ? m.poll.createdAt.toISOString() : m.poll.createdAt,
          totalVotes,
          hasVoted: userVotes.length > 0,
          userVotes,
          options: m.poll.options?.map((opt: any) => ({
            id: opt.id,
            pollId: opt.pollId,
            text: opt.text,
            voteCount: opt.voteCount,
            percentage: totalVotes > 0 ? Math.round((opt.voteCount / totalVotes) * 100) : 0,
            hasVoted: userVotes.includes(opt.id),
          })) || [],
        };
      }

      return {
        id: m.id,
        chatId: m.chatId,
        topicId: m.topicId || null,
        senderId: m.senderId,
        sender: {
          id: m.sender.id,
          username: m.sender.username,
          displayName: m.sender.profile?.displayName || m.sender.username,
          avatarUrl: m.sender.profile?.avatarUrl,
        },
        type: m.type,
        content: m.content,
        poll: formattedPoll,
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
        createdAt: m.createdAt.toISOString ? m.createdAt.toISOString() : m.createdAt,
        updatedAt: m.updatedAt.toISOString ? m.updatedAt.toISOString() : m.updatedAt,
      };
    }
}

export const messagesService = new MessagesService();
