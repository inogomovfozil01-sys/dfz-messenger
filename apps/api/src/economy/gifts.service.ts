import { prisma } from '../prisma';
import { gatewayInstance } from '../gateway/websocket.gateway';
import { StarTransactionType, GiftRarity } from '@dfz/types';
import { starsService } from './stars.service';

import { ALL_100_GIFTS } from './gifts-catalog-data';

export class GiftsService {
  /**
   * Seed default catalog of 100 gifts if missing or incomplete.
   */
  async seedDefaultGifts() {
    const count = await prisma.giftDefinition.count();
    if (count >= ALL_100_GIFTS.length) return;

    for (const item of ALL_100_GIFTS) {
      await prisma.giftDefinition.upsert({
        where: { slug: item.slug },
        update: {
          name: item.name,
          description: item.description,
          artwork: item.artwork,
          priceStars: item.priceStars,
          rarity: item.rarity,
          category: item.category,
          isLimited: item.isLimited,
          totalSupply: item.totalSupply ?? null,
          isPremiumOnly: !!item.isPremiumOnly,
          isCollectibleEligible: !!item.isCollectibleEligible,
          isActive: true,
        },
        create: {
          name: item.name,
          slug: item.slug,
          description: item.description,
          artwork: item.artwork,
          priceStars: item.priceStars,
          rarity: item.rarity,
          category: item.category,
          isLimited: item.isLimited,
          totalSupply: item.totalSupply ?? null,
          soldCount: 0,
          isPremiumOnly: !!item.isPremiumOnly,
          isCollectibleEligible: !!item.isCollectibleEligible,
          isActive: true,
        },
      });
    }
  }

  /**
   * Get all available gift definitions.
   */
  async getGiftDefinitions(category?: string, includeInactive = false) {
    await this.seedDefaultGifts();

    const where: any = {};
    if (!includeInactive) where.isActive = true;
    if (category && category !== 'all') where.category = category.toLowerCase();

    return prisma.giftDefinition.findMany({
      where,
      orderBy: [{ rarity: 'desc' }, { priceStars: 'asc' }],
    });
  }

  /**
   * Send a gift from sender to recipient.
   */
  async sendGift(
    senderId: string,
    recipientId: string,
    giftDefinitionId: string,
    options: {
      message?: string;
      isAnonymous?: boolean;
      chatId?: string;
      idempotencyKey?: string;
    } = {}
  ) {
    if (senderId === recipientId) {
      throw new Error('You cannot send a gift to yourself');
    }

    const recipient = await prisma.user.findUnique({
      where: { id: recipientId },
      include: { profile: true },
    });
    if (!recipient || recipient.isBanned) {
      throw new Error('Recipient user is not available');
    }

    const sender = await prisma.user.findUnique({
      where: { id: senderId },
      include: { profile: true },
    });
    if (!sender || sender.isBanned) {
      throw new Error('Sender is not available');
    }

    const giftDef = await prisma.giftDefinition.findUnique({
      where: { id: giftDefinitionId },
    });
    if (!giftDef || !giftDef.isActive) {
      throw new Error('Gift is not available');
    }

    // Check availability dates
    const now = new Date();
    if (giftDef.availableFrom && giftDef.availableFrom > now) {
      throw new Error('Gift is not yet available');
    }
    if (giftDef.availableUntil && giftDef.availableUntil < now) {
      throw new Error('Gift availability has ended');
    }

    // Check sender star account
    const senderAccount = await starsService.getOrCreateAccount(senderId);

    // Concurrency-safe atomic transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Check & allocate limited supply atomically
      let serialNumber: number | null = null;
      if (giftDef.isLimited && giftDef.totalSupply) {
        const updateDef = await tx.giftDefinition.updateMany({
          where: {
            id: giftDefinitionId,
            soldCount: { lt: giftDef.totalSupply },
          },
          data: {
            soldCount: { increment: 1 },
          },
        });

        if (updateDef.count === 0) {
          throw new Error('Gift edition is sold out');
        }

        const refreshed = await tx.giftDefinition.findUnique({
          where: { id: giftDefinitionId },
        });
        serialNumber = refreshed!.soldCount;
      } else {
        await tx.giftDefinition.update({
          where: { id: giftDefinitionId },
          data: { soldCount: { increment: 1 } },
        });
      }

      // 2. Deduct Stars from sender (unless sender is unlimited)
      let senderBalanceBefore = senderAccount.balance;
      let senderBalanceAfter = senderAccount.balance;

      if (!senderAccount.isUnlimited) {
        const updateAccount = await tx.starAccount.updateMany({
          where: {
            userId: senderId,
            balance: { gte: giftDef.priceStars },
          },
          data: {
            balance: { decrement: giftDef.priceStars },
            totalSpent: { increment: giftDef.priceStars },
          },
        });

        if (updateAccount.count === 0) {
          throw new Error('Insufficient Stars balance to purchase this gift');
        }

        const refreshedAcc = await tx.starAccount.findUnique({
          where: { userId: senderId },
        });
        senderBalanceAfter = refreshedAcc!.balance;
      }

      // 3. Ledger record for gift purchase
      await tx.starTransaction.create({
        data: {
          accountId: senderAccount.id,
          userId: senderId,
          type: StarTransactionType.GIFT_PURCHASE,
          amount: -giftDef.priceStars,
          balanceBefore: senderBalanceBefore,
          balanceAfter: senderBalanceAfter,
          referenceType: 'GIFT',
          referenceId: giftDef.id,
          reason: `Gift "${giftDef.name}" to @${recipient.username}`,
          idempotencyKey: options.idempotencyKey,
        },
      });

      // 4. Create GiftInstance
      const giftInstance = await tx.giftInstance.create({
        data: {
          giftDefinitionId: giftDef.id,
          ownerId: recipientId,
          senderId: options.isAnonymous ? null : senderId,
          message: options.message ? options.message.slice(0, 200) : null,
          serialNumber,
          isAnonymous: !!options.isAnonymous,
          showOnProfile: true,
        },
        include: {
          giftDefinition: true,
          sender: { include: { profile: true } },
          owner: { include: { profile: true } },
        },
      });

      // 5. If collectible eligible, create CollectibleInstance
      let collectible = null;
      if (giftDef.isCollectibleEligible) {
        collectible = await tx.collectibleInstance.create({
          data: {
            uniqueNumber: serialNumber || Math.floor(Math.random() * 1000) + 1,
            editionName: `${giftDef.name} Edition`,
            background: giftDef.slug === 'crystal-dragon' ? 'aurora' : 'nebula',
            modelPattern: giftDef.slug,
            symbol: 'star',
            rarity: giftDef.rarity,
            totalSupply: giftDef.totalSupply || 1000,
            giftInstanceId: giftInstance.id,
            originalSenderId: options.isAnonymous ? null : senderId,
            currentOwnerId: recipientId,
          },
        });

        await tx.collectibleHistory.create({
          data: {
            collectibleId: collectible.id,
            fromUserId: options.isAnonymous ? null : senderId,
            toUserId: recipientId,
            action: 'MINT',
            priceStars: giftDef.priceStars,
          },
        });
      }

      // 6. Create Chat Message if chatId provided
      let chatMessage = null;
      if (options.chatId) {
        const fromLabel = options.isAnonymous
          ? 'Анонимный отправитель'
          : sender.profile?.displayName || sender.username;

        chatMessage = await tx.message.create({
          data: {
            chatId: options.chatId,
            senderId,
            type: 'GIFT',
            content: `Подарок: ${giftDef.name}`,
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
        giftInstance,
        collectible,
        senderBalance: senderBalanceAfter,
        chatMessage,
      };
    });

    // Notify via WebSocket
    if (gatewayInstance) {
      gatewayInstance.notifyUser(recipientId, 'gift:received', {
        giftInstance: result.giftInstance,
        senderName: options.isAnonymous
          ? 'Аноним'
          : sender.profile?.displayName || sender.username,
      });

      if (options.chatId && result.chatMessage) {
        gatewayInstance.broadcastToChat(options.chatId, 'chat:message', result.chatMessage);
      }
    }

    return {
      success: true,
      giftInstance: result.giftInstance,
      collectible: result.collectible,
      senderBalance: result.senderBalance,
    };
  }

  /**
   * Admin grants a gift to a user without charging Stars.
   */
  async adminGrantGift(
    adminId: string,
    targetUserId: string,
    giftDefinitionId: string,
    message?: string
  ) {
    const giftDef = await prisma.giftDefinition.findUnique({
      where: { id: giftDefinitionId },
    });
    if (!giftDef) throw new Error('Gift not found');

    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      include: { profile: true },
    });
    if (!targetUser) throw new Error('Target user not found');

    const result = await prisma.$transaction(async (tx) => {
      let serialNumber: number | null = null;
      if (giftDef.isLimited && giftDef.totalSupply) {
        await tx.giftDefinition.update({
          where: { id: giftDefinitionId },
          data: { soldCount: { increment: 1 } },
        });
        const ref = await tx.giftDefinition.findUnique({ where: { id: giftDefinitionId } });
        serialNumber = ref!.soldCount;
      }

      const instance = await tx.giftInstance.create({
        data: {
          giftDefinitionId: giftDef.id,
          ownerId: targetUserId,
          senderId: adminId,
          message: message || 'Administrative Award',
          serialNumber,
          isAnonymous: false,
          showOnProfile: true,
        },
        include: {
          giftDefinition: true,
          sender: { include: { profile: true } },
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: adminId,
          action: 'ADMIN_GIFT_GRANT',
          target: targetUserId,
          metadata: {
            giftDefinitionId: giftDef.id,
            giftName: giftDef.name,
            giftInstanceId: instance.id,
            reason: message,
          },
        },
      });

      return instance;
    });

    if (gatewayInstance) {
      gatewayInstance.notifyUser(targetUserId, 'gift:received', {
        giftInstance: result,
        senderName: 'Administration',
      });
    }

    return { success: true, giftInstance: result };
  }

  /**
   * Get gifts owned by a user for profile display.
   */
  async getUserGifts(targetUserId: string, onlyVisibleOnProfile = false) {
    const where: any = { ownerId: targetUserId };
    if (onlyVisibleOnProfile) where.showOnProfile = true;

    const items = await prisma.giftInstance.findMany({
      where,
      include: {
        giftDefinition: true,
        sender: {
          select: {
            id: true,
            username: true,
            profile: {
              select: { displayName: true, avatarUrl: true },
            },
          },
        },
        collectible: true,
      },
      orderBy: { receivedAt: 'desc' },
    });

    // Sanitize anonymous gifts
    return items.map((g) => ({
      id: g.id,
      giftDefinition: g.giftDefinition,
      message: g.message,
      serialNumber: g.serialNumber,
      isAnonymous: g.isAnonymous,
      showOnProfile: g.showOnProfile,
      receivedAt: g.receivedAt.toISOString(),
      sender: g.isAnonymous
        ? null
        : g.sender
        ? {
            id: g.sender.id,
            username: g.sender.username,
            displayName: g.sender.profile?.displayName || g.sender.username,
            avatarUrl: g.sender.profile?.avatarUrl,
          }
        : null,
      collectible: g.collectible
        ? {
            id: g.collectible.id,
            uniqueNumber: g.collectible.uniqueNumber,
            editionName: g.collectible.editionName,
            rarity: g.collectible.rarity,
            totalSupply: g.collectible.totalSupply,
          }
        : null,
    }));
  }

  /**
   * Toggle visibility of a gift on user's profile.
   */
  async toggleProfileVisibility(userId: string, giftInstanceId: string, show: boolean) {
    const gift = await prisma.giftInstance.findUnique({
      where: { id: giftInstanceId },
    });
    if (!gift || gift.ownerId !== userId) {
      throw new Error('Gift not found or you are not the owner');
    }

    return prisma.giftInstance.update({
      where: { id: giftInstanceId },
      data: { showOnProfile: show },
    });
  }

  /**
   * Admin creates a new gift definition.
   */
  async adminCreateGift(adminId: string, data: any) {
    const created = await prisma.giftDefinition.create({
      data: {
        name: data.name,
        slug: data.slug || data.name.toLowerCase().replace(/\s+/g, '-'),
        description: data.description,
        artwork: data.artwork || 'crystal',
        priceStars: parseInt(data.priceStars, 10),
        rarity: data.rarity || GiftRarity.COMMON,
        category: data.category || 'popular',
        isLimited: !!data.isLimited,
        totalSupply: data.totalSupply ? parseInt(data.totalSupply, 10) : null,
        isPremiumOnly: !!data.isPremiumOnly,
        isCollectibleEligible: !!data.isCollectibleEligible,
        isActive: data.isActive !== false,
      },
    });

    await prisma.auditLog.create({
      data: {
        actorId: adminId,
        action: 'ADMIN_CREATE_GIFT',
        target: created.id,
        metadata: { name: created.name, priceStars: created.priceStars },
      },
    });

    return created;
  }

  /**
   * Admin updates a gift definition.
   */
  async adminUpdateGift(adminId: string, giftId: string, data: any) {
    const updated = await prisma.giftDefinition.update({
      where: { id: giftId },
      data: {
        name: data.name,
        description: data.description,
        priceStars: data.priceStars ? parseInt(data.priceStars, 10) : undefined,
        rarity: data.rarity,
        category: data.category,
        isActive: data.isActive,
        isPremiumOnly: data.isPremiumOnly,
        isCollectibleEligible: data.isCollectibleEligible,
        totalSupply: data.totalSupply ? parseInt(data.totalSupply, 10) : undefined,
      },
    });

    await prisma.auditLog.create({
      data: {
        actorId: adminId,
        action: 'ADMIN_UPDATE_GIFT',
        target: giftId,
        metadata: data,
      },
    });

    return updated;
  }
}

export const giftsService = new GiftsService();
