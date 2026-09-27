import { prisma } from '../prisma';
import { gatewayInstance } from '../gateway/websocket.gateway';
import { ENV } from '../config';
export class ActivityRewardService {
  async recordHeartbeat(userId: string, data: { active: boolean; visible: boolean; clientFingerprint?: string }) {
    const result = await prisma.$transaction(async tx => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`activity:${userId}`}))`;
      const now = new Date();
      const state = await tx.activityRewardState.upsert({ where: { userId }, update: {}, create: { userId, lastHeartbeatAt: now } });
      const elapsed = Math.floor((now.getTime() - state.lastHeartbeatAt.getTime()) / 1000);
      if (elapsed < ENV.ACTIVITY_HEARTBEAT_MIN_INTERVAL) return { state, reward: 0, balance: 0 };
      let seconds = elapsed > ENV.ACTIVITY_GRACE_PERIOD_SECONDS ? 0 : state.continuousActiveSeconds;
      if (data.active === true && data.visible === true && elapsed <= ENV.ACTIVITY_GRACE_PERIOD_SECONDS) seconds += Math.min(elapsed, 60);
      let reward = 0, balance = 0;
      if (seconds >= ENV.ACTIVITY_REWARD_INTERVAL_SECONDS) {
        reward = ENV.ACTIVITY_REWARD_STARS;
        const user = await tx.user.findUniqueOrThrow({ where: { id: userId }, select: { role: true } });
        const account = await tx.starAccount.upsert({ where: { userId }, update: { balance: { increment: reward }, totalEarned: { increment: reward } }, create: { userId, balance: reward, totalEarned: reward, isUnlimited: ['ADMIN','SUPERADMIN'].includes(user.role) } });
        balance = account.balance;
        await tx.starTransaction.create({ data: { userId, accountId: account.id, type: 'ACTIVITY_REWARD', amount: reward, balanceBefore: balance - reward, balanceAfter: balance, referenceType: 'SYSTEM', reason: 'Eligible activity hour', idempotencyKey: `activity:${userId}:${state.lastRewardAt?.getTime() || 0}` } });
        seconds -= ENV.ACTIVITY_REWARD_INTERVAL_SECONDS;
      }
      return { state: await tx.activityRewardState.update({ where: { userId }, data: { continuousActiveSeconds: seconds, lastHeartbeatAt: now, ...(reward && { lastRewardAt: now }), lastClientFingerprint: data.clientFingerprint } }), reward, balance };
    });
    if (result.reward) gatewayInstance?.notifyUser(userId, 'star:reward', { amount: result.reward, balance: result.balance, message: `+${result.reward} Stars` });
    return this.formatState(result.state);
  }
  async getActivityState(userId: string) {
    const state = await prisma.activityRewardState.upsert({ where: { userId }, update: {}, create: { userId } });
    return this.formatState(state);
  }
  private formatState(state: any) {
    const continuous = Date.now() - state.lastHeartbeatAt.getTime() > ENV.ACTIVITY_GRACE_PERIOD_SECONDS * 1000 ? 0 : state.continuousActiveSeconds;
    const remaining = Math.max(0, ENV.ACTIVITY_REWARD_INTERVAL_SECONDS - continuous);
    return { userId: state.userId, continuousActiveSeconds: continuous, remainingSeconds: remaining, lastHeartbeatAt: state.lastHeartbeatAt.toISOString(), lastRewardAt: state.lastRewardAt?.toISOString() || null, nextRewardAt: null, isEligible: continuous > 0, hourlyRewardAmount: ENV.ACTIVITY_REWARD_STARS, progressPercent: Math.min(100, Math.round(continuous / ENV.ACTIVITY_REWARD_INTERVAL_SECONDS * 100)) };
  }
}
export const activityRewardService = new ActivityRewardService();
