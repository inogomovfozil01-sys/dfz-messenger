import { prisma } from '../prisma';
import { gatewayInstance } from '../gateway/websocket.gateway';
import { ENV } from '../config';
import { UserRole, StarTransactionType } from '@dfz/types';
import { starsService } from './stars.service';

export class PremiumService {
  /**
   * Check and refresh premium status for a user.
   */
  async getStatus(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        role: true,
        isPremium: true,
        premiumUntil: true,
        premiumType: true,
      },
    });

    if (!user) throw new Error('User not found');

    const isAdmin =
      user.role === UserRole.ADMIN || user.role === UserRole.SUPERADMIN;

    // Admin auto-premium rule
    if (isAdmin && ENV.ADMIN_AUTO_PREMIUM) {
      return {
        isPremium: true,
        premiumUntil: null,
        isLifetime: true,
        premiumType: 'ADMIN',
        badge: '◆',
      };
    }

    const now = new Date();

    // Check expiration
    if (user.isPremium && user.premiumUntil && user.premiumUntil < now) {
      await prisma.user.update({
        where: { id: userId },
        data: {
          isPremium: false,
          premiumUntil: null,
          premiumType: null,
        },
      });

      return {
        isPremium: false,
        premiumUntil: null,
        isLifetime: false,
        premiumType: null,
        badge: '',
      };
    }

    return {
      isPremium: !!user.isPremium,
      premiumUntil: user.premiumUntil ? user.premiumUntil.toISOString() : null,
      isLifetime: user.premiumType === 'LIFETIME',
      premiumType: user.premiumType,
      badge: user.isPremium ? '◆' : '',
    };
  }

  /**
   * Purchase premium using Stars.
   */
  async purchaseWithStars(
    userId: string,
    plan: 'MONTHLY' | '3MONTH' | 'YEARLY',
    idempotencyKey?: string
  ) {
    let cost = ENV.PREMIUM_MONTH_PRICE;
    let days = 30;

    if (plan === '3MONTH') {
      cost = ENV.PREMIUM_3MONTH_PRICE;
      days = 90;
    } else if (plan === 'YEARLY') {
      cost = ENV.PREMIUM_YEAR_PRICE;
      days = 365;
    }

    const userAccount = await starsService.getOrCreateAccount(userId);

    // Concurrency-safe atomic transaction
    const result = await prisma.$transaction(async (tx) => {
      let balanceBefore = userAccount.balance;
      let balanceAfter = userAccount.balance;

      if (!userAccount.isUnlimited) {
        const debitResult = await tx.starAccount.updateMany({
          where: {
            userId,
            balance: { gte: cost },
          },
          data: {
            balance: { decrement: cost },
            totalSpent: { increment: cost },
          },
        });

        if (debitResult.count === 0) {
          throw new Error('Insufficient Stars balance for Premium subscription');
        }

        const refreshed = await tx.starAccount.findUnique({ where: { userId } });
        balanceAfter = refreshed!.balance;
      }

      // Calculate new expiration date (extend if already active)
      const currentUser = await tx.user.findUnique({ where: { id: userId } });
      const currentExpiry = currentUser?.premiumUntil;
      const baseDate = currentExpiry && currentExpiry > new Date() ? currentExpiry : new Date();
      const newExpiry = new Date(baseDate.getTime() + days * 24 * 60 * 60 * 1000);

      await tx.user.update({
        where: { id: userId },
        data: {
          isPremium: true,
          premiumUntil: newExpiry,
          premiumType: plan,
        },
      });

      await tx.starTransaction.create({
        data: {
          accountId: userAccount.id,
          userId,
          type: StarTransactionType.PREMIUM_PURCHASE,
          amount: -cost,
          balanceBefore,
          balanceAfter,
          referenceType: 'PREMIUM',
          referenceId: plan,
          reason: `DFZ Premium subscription (${days} days)`,
          idempotencyKey,
        },
      });

      return { newExpiry, balanceAfter };
    });

    if (gatewayInstance) {
      gatewayInstance.notifyUser(userId, 'premium:updated', {
        isPremium: true,
        premiumUntil: result.newExpiry.toISOString(),
      });
    }

    return {
      success: true,
      isPremium: true,
      premiumUntil: result.newExpiry.toISOString(),
      balance: result.balanceAfter,
    };
  }

  /**
   * Gift premium to another user.
   */
  async giftPremium(
    senderId: string,
    recipientId: string,
    plan: 'MONTHLY' | '3MONTH' | 'YEARLY',
    idempotencyKey?: string,
    chatId?: string
  ) {
    if (senderId === recipientId) {
      throw new Error('Cannot gift premium to yourself');
    }

    let cost = ENV.PREMIUM_MONTH_PRICE;
    let days = 30;
    if (plan === '3MONTH') {
      cost = ENV.PREMIUM_3MONTH_PRICE;
      days = 90;
    } else if (plan === 'YEARLY') {
      cost = ENV.PREMIUM_YEAR_PRICE;
      days = 365;
    }

    const senderAccount = await starsService.getOrCreateAccount(senderId);
    const recipient = await prisma.user.findUnique({
      where: { id: recipientId },
      include: { profile: true },
    });
    if (!recipient) throw new Error('Recipient not found');

    const sender = await prisma.user.findUnique({
      where: { id: senderId },
      include: { profile: true },
    });

    const result = await prisma.$transaction(async (tx) => {
      let balanceBefore = senderAccount.balance;
      let balanceAfter = senderAccount.balance;

      if (!senderAccount.isUnlimited) {
        const updateAccount = await tx.starAccount.updateMany({
          where: { userId: senderId, balance: { gte: cost } },
          data: {
            balance: { decrement: cost },
            totalSpent: { increment: cost },
          },
        });
        if (updateAccount.count === 0) {
          throw new Error('Insufficient Stars to gift Premium');
        }
        const ref = await tx.starAccount.findUnique({ where: { userId: senderId } });
        balanceAfter = ref!.balance;
      }

      // Extend recipient premium
      const baseDate =
        recipient.premiumUntil && recipient.premiumUntil > new Date()
          ? recipient.premiumUntil
          : new Date();
      const newExpiry = new Date(baseDate.getTime() + days * 24 * 60 * 60 * 1000);

      await tx.user.update({
        where: { id: recipientId },
        data: {
          isPremium: true,
          premiumUntil: newExpiry,
          premiumType: plan,
        },
      });

      await tx.starTransaction.create({
        data: {
          accountId: senderAccount.id,
          userId: senderId,
          type: StarTransactionType.PREMIUM_PURCHASE,
          amount: -cost,
          balanceBefore,
          balanceAfter,
          referenceType: 'USER',
          referenceId: recipientId,
          reason: `Gifted Premium (${days} days) to @${recipient.username}`,
          idempotencyKey,
        },
      });

      return { newExpiry, balanceAfter };
    });

    if (gatewayInstance) {
      gatewayInstance.notifyUser(recipientId, 'premium:updated', {
        isPremium: true,
        premiumUntil: result.newExpiry.toISOString(),
        giftedBy: sender?.profile?.displayName || sender?.username,
      });

      if (chatId) {
        const msg = await prisma.message.create({
          data: {
            chatId,
            senderId,
            type: 'SYSTEM',
            content: `🎁 Подарил(а) подписку DFZ Premium на ${days} дней!`,
          },
          include: { sender: { include: { profile: true } } },
        });
        gatewayInstance.broadcastToChat(chatId, 'chat:message', msg);
      }
    }

    return {
      success: true,
      recipientId,
      premiumUntil: result.newExpiry.toISOString(),
      balance: result.balanceAfter,
    };
  }

  /**
   * Admin grants premium to a user.
   */
  async adminGrant(
    adminId: string,
    targetUserId: string,
    duration: '1d' | '7d' | '30d' | '90d' | '1y' | 'lifetime',
    reason: string
  ) {
    const targetUser = await prisma.user.findUnique({ where: { id: targetUserId } });
    if (!targetUser) throw new Error('Target user not found');

    let newExpiry: Date | null = null;
    let premiumType = 'ADMIN';

    if (duration === 'lifetime') {
      newExpiry = null;
      premiumType = 'LIFETIME';
    } else {
      const daysMap: Record<string, number> = {
        '1d': 1,
        '7d': 7,
        '30d': 30,
        '90d': 90,
        '1y': 365,
      };
      const days = daysMap[duration] || 30;
      const base = targetUser.premiumUntil && targetUser.premiumUntil > new Date()
        ? targetUser.premiumUntil
        : new Date();
      newExpiry = new Date(base.getTime() + days * 24 * 60 * 60 * 1000);
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id: targetUserId },
        data: {
          isPremium: true,
          premiumUntil: newExpiry,
          premiumType,
        },
      }),
      prisma.auditLog.create({
        data: {
          actorId: adminId,
          action: 'ADMIN_GRANT_PREMIUM',
          target: targetUserId,
          metadata: { duration, reason, premiumUntil: newExpiry?.toISOString() },
        },
      }),
    ]);

    if (gatewayInstance) {
      gatewayInstance.notifyUser(targetUserId, 'premium:updated', {
        isPremium: true,
        premiumUntil: newExpiry ? newExpiry.toISOString() : null,
        isLifetime: duration === 'lifetime',
      });
    }

    return {
      success: true,
      isPremium: true,
      premiumUntil: newExpiry ? newExpiry.toISOString() : null,
      isLifetime: duration === 'lifetime',
    };
  }

  /**
   * Admin revokes premium.
   */
  async adminRevoke(adminId: string, targetUserId: string, reason: string) {
    await prisma.$transaction([
      prisma.user.update({
        where: { id: targetUserId },
        data: {
          isPremium: false,
          premiumUntil: null,
          premiumType: null,
        },
      }),
      prisma.auditLog.create({
        data: {
          actorId: adminId,
          action: 'ADMIN_REVOKE_PREMIUM',
          target: targetUserId,
          metadata: { reason },
        },
      }),
    ]);

    if (gatewayInstance) {
      gatewayInstance.notifyUser(targetUserId, 'premium:updated', {
        isPremium: false,
      });
    }

    return { success: true, isPremium: false };
  }
}

export const premiumService = new PremiumService();
