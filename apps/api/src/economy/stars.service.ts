import { prisma } from '../prisma';
import { gatewayInstance } from '../gateway/websocket.gateway';
import { ENV } from '../config';
import { UserRole, StarTransactionType, Permission } from '@dfz/types';
import { hasPermission } from '../common/permission.guard';
import { requirePosting, requireCommunication, httpError } from '../common/access';

export class StarsService {
  /**
   * Get or create star account for a user.
   * If user has ADMIN or SUPERADMIN role, isUnlimited is true.
   */
  async getOrCreateAccount(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true },
    });

    if (!user) throw new Error('User not found');

    const shouldBeUnlimited =
      user.role === UserRole.ADMIN || user.role === UserRole.SUPERADMIN;

    let account = await prisma.starAccount.findUnique({
      where: { userId },
    });

    if (!account) {
      account = await prisma.starAccount.create({
        data: {
          userId,
          balance: 0,
          isUnlimited: shouldBeUnlimited,
        },
      });
    } else if (account.isUnlimited !== shouldBeUnlimited) {
      account = await prisma.starAccount.update({
        where: { id: account.id },
        data: { isUnlimited: shouldBeUnlimited },
      });
    }

    return account;
  }

  /**
   * Get balance for a user.
   * Privacy rule (Section 55): Only the owner or an authorized admin can view balance.
   */
  async getBalance(targetUserId: string, requestingUserId: string, requestingUserRole: string) {
    const isOwner = targetUserId === requestingUserId;
    const canViewOthers = hasPermission(requestingUserRole, [], Permission.STARS_VIEW);

    if (!isOwner && !canViewOthers) {
      throw new Error('Private balance cannot be viewed by other users');
    }

    const account = await this.getOrCreateAccount(targetUserId);

    return {
      balance: account.balance,
      isUnlimited: account.isUnlimited,
      totalEarned: account.totalEarned,
      totalSpent: account.totalSpent,
    };
  }

  /**
   * Concurrency-safe atomic star transfer between users.
   */
  async transferStars(
    senderId: string,
    recipientId: string,
    amount: number,
    message?: string,
    idempotencyKey?: string,
    chatId?: string
  ) {
    // 1. Validation
    await requireCommunication(senderId, recipientId, 'messageVisibility');
    if (chatId) await requirePosting(chatId, senderId);
    if (idempotencyKey) idempotencyKey = `transfer:${senderId}:${idempotencyKey}`;
    if (!Number.isInteger(amount) || amount <= 0) {
      throw new Error('Stars amount must be a positive integer');
    }

    if (amount < ENV.MIN_STAR_TRANSFER || amount > ENV.MAX_STAR_TRANSFER) {
      throw new Error(
        `Transfer amount must be between ${ENV.MIN_STAR_TRANSFER} and ${ENV.MAX_STAR_TRANSFER} Stars`
      );
    }

    if (senderId === recipientId) {
      throw new Error('Cannot transfer Stars to yourself');
    }

    // 2. Check recipient
    const recipient = await prisma.user.findUnique({
      where: { id: recipientId },
      include: { profile: true },
    });
    if (!recipient || recipient.isBanned) {
      throw new Error('Recipient user not found or is currently restricted');
    }

    const sender = await prisma.user.findUnique({
      where: { id: senderId },
      include: { profile: true },
    });
    if (!sender || sender.isBanned) {
      throw new Error('Sender account is restricted');
    }

    // 3. Idempotency Check
    if (idempotencyKey) {
      const existingTx = await prisma.starTransaction.findUnique({
        where: { idempotencyKey: `${idempotencyKey}:out` },
      });
      if (existingTx) {
        if (existingTx.referenceId !== recipientId || existingTx.amount !== -amount) throw httpError(409, 'Idempotency key already used for another transfer');
        return {
          success: true,
          transactionId: existingTx.id,
          message: 'Transfer already processed',
        };
      }
    }

    // Ensure accounts exist
    const senderAccount = await this.getOrCreateAccount(senderId);
    await this.getOrCreateAccount(recipientId);

    // 4. Atomic Database Transaction with double-spend protection
    const result = await prisma.$transaction(async (tx) => {
      // Debit sender if not unlimited
      let senderBalanceBefore = senderAccount.balance;
      let senderBalanceAfter = senderAccount.balance;

      if (!senderAccount.isUnlimited) {
        const updateResult = await tx.starAccount.updateMany({
          where: {
            userId: senderId,
            balance: { gte: amount },
          },
          data: {
            balance: { decrement: amount },
            totalSpent: { increment: amount },
          },
        });

        if (updateResult.count === 0) {
          throw new Error('Insufficient Stars balance');
        }

        const refreshedSender = await tx.starAccount.findUnique({
          where: { userId: senderId },
        });
        senderBalanceAfter = refreshedSender!.balance;
        senderBalanceBefore = senderBalanceAfter + amount;
      }

      // Credit recipient
      const updatedRecipient = await tx.starAccount.update({
        where: { userId: recipientId },
        data: {
          balance: { increment: amount },
          totalEarned: { increment: amount },
        },
      });

      const recipientBalanceBefore = updatedRecipient.balance - amount;
      const recipientBalanceAfter = updatedRecipient.balance;

      // Ledger: Sender TRANSFER_OUT
      const outTx = await tx.starTransaction.create({
        data: {
          accountId: senderAccount.id,
          userId: senderId,
          type: StarTransactionType.TRANSFER_OUT,
          amount: -amount,
          balanceBefore: senderBalanceBefore,
          balanceAfter: senderBalanceAfter,
          referenceType: 'USER',
          referenceId: recipientId,
          reason: message || `Transfer to @${recipient.username}`,
          idempotencyKey: idempotencyKey ? `${idempotencyKey}:out` : undefined,
        },
      });

      // Ledger: Recipient TRANSFER_IN
      const inTx = await tx.starTransaction.create({
        data: {
          accountId: updatedRecipient.id,
          userId: recipientId,
          type: StarTransactionType.TRANSFER_IN,
          amount: amount,
          balanceBefore: recipientBalanceBefore,
          balanceAfter: recipientBalanceAfter,
          referenceType: 'USER',
          referenceId: senderId,
          reason: message || `Transfer from @${sender.username}`,
          idempotencyKey: idempotencyKey ? `${idempotencyKey}:in` : undefined,
        },
      });

      // Create chat message if in context of a chat
      let chatMessage = null;
      if (chatId) {
        chatMessage = await tx.message.create({
          data: {
            chatId,
            senderId,
            type: 'STARS_TRANSFER',
            content: `★ ${amount} Stars`,
            attachments: {
              create: [],
            },
          },
          include: {
            sender: { include: { profile: true } },
          },
        });
      }

      return {
        transactionId: outTx.id,
        recipientTransactionId: inTx.id,
        senderBalance: senderBalanceAfter,
        recipientBalance: recipientBalanceAfter,
        chatMessage,
      };
    });

    // 5. Notify parties via WebSocket
    if (gatewayInstance) {
      gatewayInstance.notifyUser(recipientId, 'star:transfer', {
        amount,
        senderId,
        senderName: sender.profile?.displayName || sender.username,
        newBalance: result.recipientBalance,
        message,
      });

      gatewayInstance.notifyUser(senderId, 'star:transfer', {
        amount: -amount,
        recipientId,
        recipientName: recipient.profile?.displayName || recipient.username,
        newBalance: result.senderBalance,
        message,
      });

      if (chatId && result.chatMessage) {
        gatewayInstance.broadcastToChat(chatId, 'chat:message', result.chatMessage);
      }
    }

    return {
      success: true,
      transactionId: result.transactionId,
      amount,
      senderBalance: result.senderBalance,
      recipientBalance: result.recipientBalance,
    };
  }

  /**
   * Admin grants stars to a user.
   */
  async adminGrant(
    adminId: string,
    targetUserId: string,
    amount: number,
    reason: string,
    idempotencyKey?: string
  ) {
    if (!Number.isInteger(amount) || amount <= 0) {
      throw new Error('Grant amount must be a positive integer');
    }

    if (!reason || reason.trim().length === 0) {
      throw new Error('Reason is required for administrative grants');
    }

    if (idempotencyKey) {
      const existingTx = await prisma.starTransaction.findUnique({
        where: { idempotencyKey },
      });
      if (existingTx) {
        return { success: true, transactionId: existingTx.id, duplicate: true };
      }
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      include: { profile: true },
    });
    if (!targetUser) throw new Error('Target user not found');

    const targetAccount = await this.getOrCreateAccount(targetUserId);

    const result = await prisma.$transaction(async (tx) => {
      const updatedAccount = await tx.starAccount.update({
        where: { id: targetAccount.id },
        data: {
          balance: { increment: amount },
          totalEarned: { increment: amount },
        },
      });

      const txRecord = await tx.starTransaction.create({
        data: {
          accountId: targetAccount.id,
          userId: targetUserId,
          type: StarTransactionType.ADMIN_GRANT,
          amount,
          balanceBefore: updatedAccount.balance - amount,
          balanceAfter: updatedAccount.balance,
          referenceType: 'ADMIN',
          referenceId: adminId,
          reason,
          createdByAdminId: adminId,
          idempotencyKey,
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: adminId,
          action: 'ADMIN_GRANT_STARS',
          target: targetUserId,
          metadata: {
            amount,
            reason,
            transactionId: txRecord.id,
            previousBalance: updatedAccount.balance - amount,
            newBalance: updatedAccount.balance,
          },
        },
      });

      return { txRecord, newBalance: updatedAccount.balance };
    });

    if (gatewayInstance) {
      gatewayInstance.notifyUser(targetUserId, 'star:reward', {
        amount,
        balance: result.newBalance,
        message: `You received ★${amount.toLocaleString()} Stars from Administration: ${reason}`,
      });
    }

    return {
      success: true,
      transactionId: result.txRecord.id,
      amount,
      newBalance: result.newBalance,
    };
  }

  /**
   * Admin debits stars from a user.
   */
  async adminDebit(
    adminId: string,
    targetUserId: string,
    amount: number,
    reason: string
  ) {
    if (!Number.isInteger(amount) || amount <= 0) {
      throw new Error('Debit amount must be a positive integer');
    }

    const targetAccount = await this.getOrCreateAccount(targetUserId);

    const result = await prisma.$transaction(async (tx) => {
      const actualDebit = Math.min(amount, targetAccount.balance);

      const updatedAccount = await tx.starAccount.update({
        where: { id: targetAccount.id },
        data: {
          balance: { decrement: actualDebit },
          totalSpent: { increment: actualDebit },
        },
      });

      const txRecord = await tx.starTransaction.create({
        data: {
          accountId: targetAccount.id,
          userId: targetUserId,
          type: StarTransactionType.ADMIN_DEBIT,
          amount: -actualDebit,
          balanceBefore: targetAccount.balance,
          balanceAfter: updatedAccount.balance,
          referenceType: 'ADMIN',
          referenceId: adminId,
          reason,
          createdByAdminId: adminId,
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: adminId,
          action: 'ADMIN_DEBIT_STARS',
          target: targetUserId,
          metadata: {
            requestedAmount: amount,
            actualDebit,
            reason,
            transactionId: txRecord.id,
          },
        },
      });

      return { txRecord, newBalance: updatedAccount.balance };
    });

    return {
      success: true,
      transactionId: result.txRecord.id,
      amount: -amount,
      newBalance: result.newBalance,
    };
  }

  /**
   * Controlled mass reward campaign by SUPER_ADMIN (Section 15).
   */
  async executeMassCampaign(
    adminId: string,
    data: {
      title: string;
      description?: string;
      starsPerUser: number;
      recipientIds: string[];
    }
  ) {
    if (data.recipientIds.length === 0) {
      throw new Error('At least one recipient is required');
    }
    if (!Number.isInteger(data.starsPerUser) || data.starsPerUser <= 0) {
      throw new Error('Stars per user must be a positive integer');
    }

    const totalStars = data.starsPerUser * data.recipientIds.length;

    // Record campaign
    const campaign = await prisma.economyCampaign.create({
      data: {
        title: data.title,
        description: data.description,
        starsPerUser: data.starsPerUser,
        recipientCount: data.recipientIds.length,
        totalStars,
        createdByAdmin: adminId,
      },
    });

    // Process recipients
    for (const userId of data.recipientIds) {
      try {
        await this.adminGrant(
          adminId,
          userId,
          data.starsPerUser,
          `Campaign: ${data.title}`,
          `campaign:${campaign.id}:${userId}`
        );
      } catch (err) {
        console.error(`Failed to grant campaign stars to ${userId}:`, err);
      }
    }

    return {
      success: true,
      campaignId: campaign.id,
      recipientCount: data.recipientIds.length,
      totalStars,
    };
  }

  /**
   * Transaction history with filters.
   */
  async getTransactionHistory(
    userId: string,
    filter: string = 'ALL',
    limit: number = 20,
    cursor?: string
  ) {
    const where: any = { userId };

    switch (filter.toUpperCase()) {
      case 'EARNED':
        where.type = {
          in: [
            StarTransactionType.ACTIVITY_REWARD,
            StarTransactionType.SYSTEM_REWARD,
            StarTransactionType.PREMIUM_REWARD,
          ],
        };
        break;
      case 'SENT':
        where.type = StarTransactionType.TRANSFER_OUT;
        break;
      case 'RECEIVED':
        where.type = StarTransactionType.TRANSFER_IN;
        break;
      case 'GIFTS':
        where.type = StarTransactionType.GIFT_PURCHASE;
        break;
      case 'ADMIN':
        where.type = {
          in: [StarTransactionType.ADMIN_GRANT, StarTransactionType.ADMIN_DEBIT],
        };
        break;
      case 'REFUNDS':
        where.type = StarTransactionType.REFUND;
        break;
      default:
        break;
    }

    const items = await prisma.starTransaction.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      cursor: cursor ? { id: cursor } : undefined,
      skip: cursor ? 1 : 0,
    });

    const hasMore = items.length > limit;
    const records = hasMore ? items.slice(0, limit) : items;

    // Enrich with otherParty information
    const userIdsToLookup = new Set<string>();
    records.forEach((r) => {
      if (r.referenceType === 'USER' && r.referenceId) {
        userIdsToLookup.add(r.referenceId);
      }
    });

    const usersMap = new Map<string, any>();
    if (userIdsToLookup.size > 0) {
      const users = await prisma.user.findMany({
        where: { id: { in: Array.from(userIdsToLookup) } },
        include: { profile: true },
      });
      users.forEach((u) => {
        usersMap.set(u.id, {
          id: u.id,
          username: u.username,
          displayName: u.profile?.displayName || u.username,
          avatarUrl: u.profile?.avatarUrl,
        });
      });
    }

    return {
      items: records.map((r) => ({
        id: r.id,
        type: r.type,
        amount: r.amount,
        balanceBefore: r.balanceBefore,
        balanceAfter: r.balanceAfter,
        referenceType: r.referenceType,
        referenceId: r.referenceId,
        reason: r.reason,
        createdAt: r.createdAt.toISOString(),
        otherParty:
          r.referenceType === 'USER' && r.referenceId
            ? usersMap.get(r.referenceId) || null
            : null,
      })),
      nextCursor: hasMore ? records[records.length - 1].id : null,
      hasMore,
    };
  }

  /**
   * Sanitized transaction details for single item view.
   */
  async getTransactionDetails(transactionId: string, userId: string, userRole: string) {
    const tx = await prisma.starTransaction.findUnique({
      where: { id: transactionId },
    });

    if (!tx) throw new Error('Transaction not found');

    const isOwner = tx.userId === userId;
    const canViewAny = hasPermission(userRole, [], Permission.STARS_VIEW);
    if (!isOwner && !canViewAny) {
      throw new Error('Access denied to transaction details');
    }

    let otherParty = null;
    if (tx.referenceType === 'USER' && tx.referenceId) {
      const user = await prisma.user.findUnique({
        where: { id: tx.referenceId },
        include: { profile: true },
      });
      if (user) {
        otherParty = {
          id: user.id,
          username: user.username,
          displayName: user.profile?.displayName || user.username,
          avatarUrl: user.profile?.avatarUrl,
        };
      }
    }

    return {
      id: tx.id,
      type: tx.type,
      amount: tx.amount,
      balanceBefore: tx.balanceBefore,
      balanceAfter: tx.balanceAfter,
      reason: tx.reason,
      createdAt: tx.createdAt.toISOString(),
      otherParty,
      status: 'CONFIRMED',
    };
  }
}

export const starsService = new StarsService();
