import { prisma } from '../prisma';
import { StarTransactionType } from '@dfz/types';

export class EconomyAnalyticsService {
  async getMetrics() {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [
      starsCirculationAgg,
      starsIssuedTodayAgg,
      starsTransferredTodayAgg,
      activityRewardsTodayAgg,
      adminGrantsTodayAgg,
      giftsSentTotal,
      giftsSentToday,
      collectiblesTotal,
      premiumUsersCount,
      totalAccounts,
    ] = await Promise.all([
      // 1. Stars in circulation (excluding unlimited admin accounts)
      prisma.starAccount.aggregate({
        _sum: { balance: true },
        where: { isUnlimited: false },
      }),
      // 2. Stars issued today (positive amounts)
      prisma.starTransaction.aggregate({
        _sum: { amount: true },
        where: {
          amount: { gt: 0 },
          createdAt: { gte: startOfToday },
        },
      }),
      // 3. Stars transferred today
      prisma.starTransaction.aggregate({
        _sum: { amount: true },
        where: {
          type: StarTransactionType.TRANSFER_IN,
          createdAt: { gte: startOfToday },
        },
      }),
      // 4. Activity rewards today
      prisma.starTransaction.aggregate({
        _sum: { amount: true },
        _count: { id: true },
        where: {
          type: StarTransactionType.ACTIVITY_REWARD,
          createdAt: { gte: startOfToday },
        },
      }),
      // 5. Admin grants today
      prisma.starTransaction.aggregate({
        _sum: { amount: true },
        _count: { id: true },
        where: {
          type: StarTransactionType.ADMIN_GRANT,
          createdAt: { gte: startOfToday },
        },
      }),
      // 6. Gifts total
      prisma.giftInstance.count(),
      // 7. Gifts today
      prisma.giftInstance.count({
        where: { createdAt: { gte: startOfToday } },
      }),
      // 8. Collectibles total
      prisma.collectibleInstance.count(),
      // 9. Premium users count
      prisma.user.count({
        where: { isPremium: true },
      }),
      // 10. Total star accounts
      prisma.starAccount.count(),
    ]);

    return {
      starsInCirculation: starsCirculationAgg._sum.balance || 0,
      starsIssuedToday: starsIssuedTodayAgg._sum.amount || 0,
      starsTransferredToday: starsTransferredTodayAgg._sum.amount || 0,
      activityRewardsToday: {
        totalStars: activityRewardsTodayAgg._sum.amount || 0,
        rewardCount: activityRewardsTodayAgg._count.id || 0,
      },
      adminGrantsToday: {
        totalStars: adminGrantsTodayAgg._sum.amount || 0,
        grantCount: adminGrantsTodayAgg._count.id || 0,
      },
      giftsSentTotal,
      giftsSentToday,
      collectiblesTotal,
      premiumUsersCount,
      totalAccounts,
      timestamp: now.toISOString(),
    };
  }
}

export const economyAnalyticsService = new EconomyAnalyticsService();
