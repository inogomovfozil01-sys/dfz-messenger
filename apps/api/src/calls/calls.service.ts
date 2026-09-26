import { prisma } from '../prisma';
import { CallType, CallStatus, PrivacyVisibility } from '@dfz/types';

export class CallsService {
  async getCallHistory(userId: string, filter: 'all' | 'missed' = 'all') {
    const where: any = {
      OR: [
        { callerId: userId },
        { receiverId: userId },
      ],
    };

    if (filter === 'missed') {
      where.status = CallStatus.MISSED;
      where.receiverId = userId;
    }

    const calls = await prisma.call.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        caller: {
          include: { profile: true },
        },
        receiver: {
          include: { profile: true },
        },
        chat: {
          select: { id: true, title: true, type: true, avatarUrl: true },
        },
      },
    });

    return calls.map((c) => {
      const isOutgoing = c.callerId === userId;
      const otherUser = isOutgoing ? c.receiver : c.caller;

      return {
        id: c.id,
        chatId: c.chatId,
        type: c.type,
        status: c.status,
        isOutgoing,
        durationSeconds: c.durationSeconds,
        startedAt: c.startedAt?.toISOString() || null,
        endedAt: c.endedAt?.toISOString() || null,
        createdAt: c.createdAt.toISOString(),
        otherUser: otherUser
          ? {
              id: otherUser.id,
              username: otherUser.username,
              displayName: otherUser.profile?.displayName || otherUser.username,
              avatarUrl: otherUser.profile?.avatarUrl,
            }
          : null,
      };
    });
  }

  async checkCallPermission(callerId: string, receiverId: string): Promise<{ allowed: boolean; reason?: string }> {
    // 1. Check if blocked
    const block = await prisma.block.findFirst({
      where: {
        OR: [
          { blockerId: callerId, blockedId: receiverId },
          { blockerId: receiverId, blockedId: callerId },
        ],
      },
    });

    if (block) {
      return { allowed: false, reason: 'Пользователь недоступен для звонков' };
    }

    // 2. Check receiver privacy setting
    const receiverProfile = await prisma.profile.findUnique({
      where: { userId: receiverId },
    });

    const visibility = receiverProfile?.callVisibility || PrivacyVisibility.EVERYONE;

    if (visibility === PrivacyVisibility.NOBODY) {
      return { allowed: false, reason: 'Пользователь ограничил входящие звонки' };
    }

    if (visibility === PrivacyVisibility.CONTACTS) {
      const isContact = await prisma.contact.findUnique({
        where: {
          userId_contactUserId: {
            userId: receiverId,
            contactUserId: callerId,
          },
        },
      });

      if (!isContact) {
        return { allowed: false, reason: 'Пользователь принимает звонки только от своих контактов' };
      }
    }

    return { allowed: true };
  }

  async logCallStart(data: {
    chatId: string;
    callerId: string;
    receiverId: string;
    type: CallType;
  }) {
    return prisma.call.create({
      data: {
        chatId: data.chatId,
        callerId: data.callerId,
        receiverId: data.receiverId,
        type: data.type,
        status: CallStatus.RINGING,
      },
    });
  }

  async updateCallStatus(callId: string, status: CallStatus, durationSeconds = 0) {
    const data: any = { status };
    if (status === CallStatus.CONNECTED) {
      data.startedAt = new Date();
    } else if (status === CallStatus.ENDED || status === CallStatus.REJECTED || status === CallStatus.MISSED) {
      data.endedAt = new Date();
      data.durationSeconds = durationSeconds;
    }

    return prisma.call.update({
      where: { id: callId },
      data,
    });
  }
}

export const callsService = new CallsService();
