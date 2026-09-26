import { prisma } from '../prisma';
import { gatewayInstance } from '../gateway/websocket.gateway';
import { GiftRarity } from '@dfz/types';

export interface ICollectibleProvider {
  getCollectible(id: string): Promise<any>;
  transferCollectible(id: string, fromUserId: string, toUserId: string): Promise<any>;
}

export class InternalCollectibleProvider implements ICollectibleProvider {
  async getCollectible(id: string) {
    return prisma.collectibleInstance.findUnique({
      where: { id },
      include: {
        currentOwner: { include: { profile: true } },
        originalSender: { include: { profile: true } },
        giftInstance: { include: { giftDefinition: true } },
        history: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });
  }

  async transferCollectible(id: string, fromUserId: string, toUserId: string) {
    return prisma.$transaction(async (tx) => {
      const col = await tx.collectibleInstance.findUnique({ where: { id } });
      if (!col) throw new Error('Collectible not found');
      if (col.currentOwnerId !== fromUserId) {
        throw new Error('You do not own this collectible');
      }

      const updated = await tx.collectibleInstance.update({
        where: { id },
        data: { currentOwnerId: toUserId },
        include: {
          currentOwner: { include: { profile: true } },
          originalSender: { include: { profile: true } },
        },
      });

      // Update giftInstance owner as well if linked
      if (col.giftInstanceId) {
        await tx.giftInstance.update({
          where: { id: col.giftInstanceId },
          data: { ownerId: toUserId },
        });
      }

      await tx.collectibleHistory.create({
        data: {
          collectibleId: id,
          fromUserId,
          toUserId,
          action: 'TRANSFER',
        },
      });

      return updated;
    });
  }
}

export class CollectiblesService {
  private provider: ICollectibleProvider = new InternalCollectibleProvider();

  /**
   * Get user's collectible inventory.
   */
  async getUserCollectibles(userId: string) {
    const items = await prisma.collectibleInstance.findMany({
      where: { currentOwnerId: userId },
      include: {
        giftInstance: {
          include: { giftDefinition: true },
        },
        originalSender: {
          select: {
            id: true,
            username: true,
            profile: { select: { displayName: true, avatarUrl: true } },
          },
        },
      },
      orderBy: { mintedAt: 'desc' },
    });

    return items.map((c) => ({
      id: c.id,
      uniqueNumber: c.uniqueNumber,
      editionName: c.editionName,
      background: c.background,
      modelPattern: c.modelPattern,
      symbol: c.symbol,
      rarity: c.rarity,
      totalSupply: c.totalSupply,
      mintedAt: c.mintedAt.toISOString(),
      giftName: c.giftInstance?.giftDefinition?.name || c.editionName,
      artwork: c.giftInstance?.giftDefinition?.artwork || 'crystal',
      originalSender: c.originalSender
        ? {
            id: c.originalSender.id,
            username: c.originalSender.username,
            displayName:
              c.originalSender.profile?.displayName || c.originalSender.username,
          }
        : null,
    }));
  }

  /**
   * Get collectible details with full attributes and history.
   */
  async getCollectibleDetails(collectibleId: string) {
    const col = await this.provider.getCollectible(collectibleId);
    if (!col) throw new Error('Collectible not found');

    // Enrich history with user profiles
    const userIds = new Set<string>();
    col.history.forEach((h: any) => {
      if (h.fromUserId) userIds.add(h.fromUserId);
      if (h.toUserId) userIds.add(h.toUserId);
    });

    const users = await prisma.user.findMany({
      where: { id: { in: Array.from(userIds) } },
      include: { profile: true },
    });
    const userMap = new Map(
      users.map((u) => [
        u.id,
        {
          id: u.id,
          username: u.username,
          displayName: u.profile?.displayName || u.username,
        },
      ])
    );

    return {
      id: col.id,
      uniqueNumber: col.uniqueNumber,
      editionName: col.editionName,
      background: col.background,
      modelPattern: col.modelPattern,
      symbol: col.symbol,
      rarity: col.rarity,
      totalSupply: col.totalSupply,
      mintedAt: col.mintedAt.toISOString(),
      giftName: col.giftInstance?.giftDefinition?.name || col.editionName,
      artwork: col.giftInstance?.giftDefinition?.artwork || 'crystal',
      currentOwner: {
        id: col.currentOwner.id,
        username: col.currentOwner.username,
        displayName:
          col.currentOwner.profile?.displayName || col.currentOwner.username,
        avatarUrl: col.currentOwner.profile?.avatarUrl,
      },
      originalSender: col.originalSender
        ? {
            id: col.originalSender.id,
            username: col.originalSender.username,
            displayName:
              col.originalSender.profile?.displayName || col.originalSender.username,
          }
        : null,
      history: col.history.map((h: any) => ({
        id: h.id,
        action: h.action,
        fromUser: h.fromUserId ? userMap.get(h.fromUserId) || null : null,
        toUser: userMap.get(h.toUserId) || null,
        priceStars: h.priceStars,
        createdAt: h.createdAt.toISOString(),
      })),
    };
  }

  /**
   * Transfer collectible to another user.
   */
  async transfer(currentOwnerId: string, recipientId: string, collectibleId: string) {
    if (currentOwnerId === recipientId) {
      throw new Error('Cannot transfer collectible to yourself');
    }

    const recipient = await prisma.user.findUnique({
      where: { id: recipientId },
      include: { profile: true },
    });
    if (!recipient || recipient.isBanned) {
      throw new Error('Recipient user is not available');
    }

    const updated = await this.provider.transferCollectible(
      collectibleId,
      currentOwnerId,
      recipientId
    );

    if (gatewayInstance) {
      gatewayInstance.notifyUser(recipientId, 'collectible:transferred', {
        collectibleId,
        editionName: updated.editionName,
        uniqueNumber: updated.uniqueNumber,
        fromUserId: currentOwnerId,
      });
    }

    return {
      success: true,
      collectible: updated,
    };
  }

  /**
   * Admin creates limited collectible edition.
   */
  async adminCreateEdition(adminId: string, data: {
    editionName: string;
    background: string;
    modelPattern: string;
    symbol: string;
    rarity: GiftRarity;
    totalSupply: number;
    initialOwnerId?: string;
  }) {
    const ownerId = data.initialOwnerId || adminId;

    const collectible = await prisma.collectibleInstance.create({
      data: {
        uniqueNumber: 1,
        editionName: data.editionName,
        background: data.background || 'aurora',
        modelPattern: data.modelPattern || 'crystal',
        symbol: data.symbol || 'star',
        rarity: data.rarity || GiftRarity.LEGENDARY,
        totalSupply: data.totalSupply || 1000,
        originalSenderId: adminId,
        currentOwnerId: ownerId,
      },
    });

    await prisma.collectibleHistory.create({
      data: {
        collectibleId: collectible.id,
        fromUserId: adminId,
        toUserId: ownerId,
        action: 'MINT',
      },
    });

    await prisma.auditLog.create({
      data: {
        actorId: adminId,
        action: 'ADMIN_CREATE_COLLECTIBLE_EDITION',
        target: collectible.id,
        metadata: data,
      },
    });

    return collectible;
  }
}

export const collectiblesService = new CollectiblesService();
