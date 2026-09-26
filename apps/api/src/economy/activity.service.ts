import { prisma } from '../prisma';
import { gatewayInstance } from '../gateway/websocket.gateway';
import { ENV } from '../config';
import { StarTransactionType } from '@dfz/types';

export class ActivityRewardService {
  /**
   * Process a client activity heartbeat.
   * Server determines eligibility and increments accumulated continuous seconds.
   */
  async recordHeartbeat(
    userId: string,
    data: {
      active: boolean;
      visible: boolean;
      clientFingerprint?: string;
    }
  ) {
    const now = new Date();
    const nowMs = now.getTime();

    // 1. Get or create user activity state
    let state = await prisma.activityRewardState.findUnique({
      where: { userId },
    });

    if (!state) {
      state = await prisma.activityRewardState.create({
        data: {
          userId,
          continuousActiveSeconds: 0,
          lastHeartbeatAt: now,
          lastClientFingerprint: data.clientFingerprint,
        },
      });
      return this.formatState(state);
    }

    const lastHeartbeatMs = new Date(state.lastHeartbeatAt).getTime();
    const elapsedSeconds = Math.floor((nowMs - lastHeartbeatMs) / 1000);

    // Anti-farm rule 1: Throttle frequent heartbeats from multiple tabs or loops
    if (elapsedSeconds < ENV.ACTIVITY_HEARTBEAT_MIN_INTERVAL) {
      return this.formatState(state);
    }

    // 2. Determine eligibility
    let newContinuousSeconds = state.continuousActiveSeconds;

    if (!data.active || !data.visible) {
      // Idle tab or hidden window
      // If idle exceeds grace period, reset continuous timer
      if (elapsedSeconds > ENV.ACTIVITY_GRACE_PERIOD_SECONDS) {
        newContinuousSeconds = 0;
      }
    } else {
      // User is active and tab is visible
      if (elapsedSeconds > ENV.ACTIVITY_GRACE_PERIOD_SECONDS) {
        // Discontinuity: gap too large between heartbeats -> reset counter
        newContinuousSeconds = Math.min(elapsedSeconds, 60);
      } else {
        // Legitimate continuous increment (cap at max 60s per heartbeat interval)
        const increment = Math.min(elapsedSeconds, 60);
        newContinuousSeconds += increment;
      }
    }

    let rewarded = false;
    let newBalance = 0;

    // 3. Check if 1 continuous hour (3600 seconds) is reached!
    if (newContinuousSeconds >= ENV.ACTIVITY_REWARD_INTERVAL_SECONDS) {
      // Transactional reward issuance
      const rewardAmount = ENV.ACTIVITY_REWARD_STARS;

      await prisma.$transaction(async (tx) => {
        // Ensure star account exists
        let account = await tx.starAccount.findUnique({ where: { userId } });
        if (!account) {
          account = await tx.starAccount.create({
            data: { userId, balance: 0 },
          });
        }

        // Increment balance atomically
        const updated = await tx.starAccount.update({
          where: { id: account.id },
          data: {
            balance: { increment: rewardAmount },
            totalEarned: { increment: rewardAmount },
          },
        });
        newBalance = updated.balance;

        // Create traceable ledger entry
        const rewardDateStr = now.toISOString().slice(0, 13); // per-hour idempotency key
        await tx.starTransaction.create({
          data: {
            accountId: account.id,
            userId,
            type: StarTransactionType.ACTIVITY_REWARD,
            amount: rewardAmount,
            balanceBefore: updated.balance - rewardAmount,
            balanceAfter: updated.balance,
            referenceType: 'SYSTEM',
            referenceId: 'HOURLY_ACTIVITY',
            reason: 'Hourly continuous activity reward',
            idempotencyKey: `activity:${userId}:${rewardDateStr}:${Math.floor(nowMs / (ENV.ACTIVITY_REWARD_INTERVAL_SECONDS * 1000))}`,
          },
        });

        // Reset continuous counter and set last reward
        state = await tx.activityRewardState.update({
          where: { userId },
          data: {
            continuousActiveSeconds: newContinuousSeconds % ENV.ACTIVITY_REWARD_INTERVAL_SECONDS,
            lastHeartbeatAt: now,
            lastRewardAt: now,
            nextRewardAt: new Date(nowMs + ENV.ACTIVITY_REWARD_INTERVAL_SECONDS * 1000),
            lastClientFingerprint: data.clientFingerprint,
          },
        });

        rewarded = true;
      });

      // WebSocket notification
      if (gatewayInstance && rewarded) {
        gatewayInstance.notifyUser(userId, 'star:reward', {
          amount: rewardAmount,
          balance: newBalance,
          message: `+${rewardAmount} ★ Hourly activity reward`,
        });
      }
    } else {
      // Update state without reward
      state = await prisma.activityRewardState.update({
        where: { userId },
        data: {
          continuousActiveSeconds: newContinuousSeconds,
          lastHeartbeatAt: now,
          lastClientFingerprint: data.clientFingerprint,
        },
      });
    }

    return this.formatState(state);
  }

  /**
   * Get activity progress for UI widget.
   */
  async getActivityState(userId: string) {
    let state = await prisma.activityRewardState.findUnique({
      where: { userId },
    });

    if (!state) {
      state = await prisma.activityRewardState.create({
        data: {
          userId,
          continuousActiveSeconds: 0,
          lastHeartbeatAt: new Date(),
        },
      });
    }

    // Check if inactivity has expired grace period
    const nowMs = Date.now();
    const lastHeartbeatMs = new Date(state.lastHeartbeatAt).getTime();
    if (nowMs - lastHeartbeatMs > ENV.ACTIVITY_GRACE_PERIOD_SECONDS * 1000) {
      if (state.continuousActiveSeconds > 0) {
        state = await prisma.activityRewardState.update({
          where: { userId },
          data: { continuousActiveSeconds: 0 },
        });
      }
    }

    return this.formatState(state);
  }

  private formatState(state: any) {
    const continuous = state.continuousActiveSeconds;
    const remaining = Math.max(0, ENV.ACTIVITY_REWARD_INTERVAL_SECONDS - continuous);

    return {
      userId: state.userId,
      continuousActiveSeconds: continuous,
      remainingSeconds: remaining,
      lastHeartbeatAt: state.lastHeartbeatAt.toISOString(),
      lastRewardAt: state.lastRewardAt ? state.lastRewardAt.toISOString() : null,
      nextRewardAt: state.nextRewardAt ? state.nextRewardAt.toISOString() : null,
      isEligible: remaining < ENV.ACTIVITY_REWARD_INTERVAL_SECONDS,
      hourlyRewardAmount: ENV.ACTIVITY_REWARD_STARS,
      progressPercent: Math.min(100, Math.round((continuous / ENV.ACTIVITY_REWARD_INTERVAL_SECONDS) * 100)),
    };
  }
}

export const activityRewardService = new ActivityRewardService();
