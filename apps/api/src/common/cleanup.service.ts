import { prisma } from '../prisma';

export class DatabaseMaintenanceService {
  private timer: NodeJS.Timeout | null = null;

  startScheduledMaintenance(intervalMinutes: number = 30) {
    // Run initial cleanup after 10 seconds
    setTimeout(() => {
      this.runCleanupCycle().catch((err) =>
        console.error('[DB Maintenance] Initial run failed:', err)
      );
    }, 10000);

    // Schedule recurring cleanup
    this.timer = setInterval(() => {
      this.runCleanupCycle().catch((err) =>
        console.error('[DB Maintenance] Scheduled run failed:', err)
      );
    }, intervalMinutes * 60 * 1000);

    console.log(`🧹 Database Maintenance Service active (interval: ${intervalMinutes}m)`);
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  async runCleanupCycle() {
    const now = new Date();
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    try {
      // 1. Delete expired stories (cascades to StoryView and StoryReaction)
      const expiredStories = await prisma.story.deleteMany({
        where: {
          expiresAt: { lt: now },
        },
      });

      // 2. Delete expired user auth sessions
      const expiredSessions = await prisma.session.deleteMany({
        where: {
          expiresAt: { lt: now },
        },
      });

      // 3. Prune completed or missed call logs older than 30 days
      const prunedCalls = await prisma.callRecord.deleteMany({
        where: {
          startedAt: { lt: thirtyDaysAgo },
        },
      });

      if (expiredStories.count > 0 || expiredSessions.count > 0 || prunedCalls.count > 0) {
        console.log(
          `[DB Maintenance] Cleaned: ${expiredStories.count} expired stories, ${expiredSessions.count} expired sessions, ${prunedCalls.count} old call records.`
        );
      }
    } catch (err) {
      console.error('[DB Maintenance Error]:', err);
    }
  }
}

export const dbMaintenanceService = new DatabaseMaintenanceService();
