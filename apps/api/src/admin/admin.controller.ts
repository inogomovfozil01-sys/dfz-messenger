import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../prisma';
import { authGuard } from '../common/auth.guard';
import { roleGuard } from '../common/role.guard';
import { UserRole, ChatType } from '@dfz/types';

export const adminRouter = Router();

adminRouter.use(authGuard);
adminRouter.use(roleGuard([UserRole.ADMIN, UserRole.SUPERADMIN]));

// 1. Dashboard Metrics
adminRouter.get('/metrics', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [
      totalUsers,
      bannedUsers,
      totalChats,
      groupChats,
      channelChats,
      totalMessages,
      pendingReports,
      activeSessions,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { isBanned: true } }),
      prisma.chat.count(),
      prisma.chat.count({ where: { type: ChatType.GROUP } }),
      prisma.chat.count({ where: { type: ChatType.CHANNEL } }),
      prisma.message.count(),
      prisma.report.count({ where: { status: 'PENDING' } }),
      prisma.session.count({ where: { isRevoked: false, expiresAt: { gt: new Date() } } }),
    ]);

    return res.json({
      success: true,
      data: {
        totalUsers,
        bannedUsers,
        activeUsers: activeSessions,
        totalChats,
        groupChats,
        channelChats,
        totalMessages,
        pendingReports,
        serverUptimeSeconds: Math.floor(process.uptime()),
      },
    });
  } catch (err) {
    next(err);
  }
});

// 2. User list
adminRouter.get('/users', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 20;
    const search = (req.query.search as string || '').trim().toLowerCase();

    const where: any = {};
    if (search) {
      where.OR = [
        { username: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { profile: { displayName: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        include: {
          profile: true,
          starAccount: true,
          _count: {
            select: { messages: true, chatMemberships: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return res.json({
      success: true,
      data: {
        items: users.map((u: any) => ({
          id: u.id,
          username: u.username,
          displayName: u.profile?.displayName || u.username,
          avatarUrl: u.profile?.avatarUrl,
          email: u.email,
          role: u.role,
          isBanned: u.isBanned,
          bannedReason: u.bannedReason,
          isPremium: u.isPremium,
          premiumUntil: u.premiumUntil ? u.premiumUntil.toISOString() : null,
          starBalance: u.starAccount?.balance || 0,
          isUnlimitedStars: u.starAccount?.isUnlimited || false,
          messagesCount: u._count.messages,
          chatsCount: u._count.chatMemberships,
          createdAt: u.createdAt.toISOString(),
          lastSeenAt: u.profile?.lastSeenAt?.toISOString() || null,
        })),
        total,
        page,
        limit,
      },
    });
  } catch (err) {
    next(err);
  }
});

// 2.1 Administrative User Profile (Section 7)
adminRouter.get('/users/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const targetUserId = req.params.id;

    const user = await prisma.user.findUnique({
      where: { id: targetUserId },
      include: {
        profile: true,
        starAccount: {
          include: {
            transactions: {
              orderBy: { createdAt: 'desc' },
              take: 10,
            },
          },
        },
        ownedGifts: {
          include: {
            giftDefinition: true,
          },
          orderBy: { receivedAt: 'desc' },
        },
        ownedCollectibles: {
          orderBy: { mintedAt: 'desc' },
        },
        sessions: {
          where: { isRevoked: false },
          orderBy: { lastActiveAt: 'desc' },
          take: 5,
        },
        _count: {
          select: {
            messages: true,
            chatMemberships: true,
            reportsFiled: true,
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ success: false, error: { message: 'User not found' } });
    }

    // Fetch audit history targeting this user
    const auditHistory = await prisma.auditLog.findMany({
      where: { target: targetUserId },
      include: {
        actor: {
          select: { id: true, username: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    return res.json({
      success: true,
      data: {
        general: {
          id: user.id,
          username: user.username,
          displayName: user.profile?.displayName || user.username,
          avatarUrl: user.profile?.avatarUrl,
          email: user.email,
          phone: user.phone,
          bio: user.profile?.bio,
          role: user.role,
          createdAt: user.createdAt.toISOString(),
          lastSeenAt: user.profile?.lastSeenAt?.toISOString() || null,
        },
        account: {
          isBanned: user.isBanned,
          bannedReason: user.bannedReason,
          twoFactorEnabled: user.twoFactorEnabled,
          messagesCount: user._count.messages,
          chatsCount: user._count.chatMemberships,
        },
        premium: {
          isPremium: user.isPremium,
          premiumUntil: user.premiumUntil ? user.premiumUntil.toISOString() : null,
          premiumType: user.premiumType,
        },
        stars: {
          balance: user.starAccount?.balance || 0,
          isUnlimited: user.starAccount?.isUnlimited || false,
          totalEarned: user.starAccount?.totalEarned || 0,
          totalSpent: user.starAccount?.totalSpent || 0,
          recentTransactions: user.starAccount?.transactions.map((t: any) => ({
            id: t.id,
            type: t.type,
            amount: t.amount,
            reason: t.reason,
            createdAt: t.createdAt.toISOString(),
          })) || [],
        },
        gifts: user.ownedGifts.map((g: any) => ({
          id: g.id,
          name: g.giftDefinition.name,
          artwork: g.giftDefinition.artwork,
          rarity: g.giftDefinition.rarity,
          serialNumber: g.serialNumber,
          message: g.message,
          receivedAt: g.receivedAt.toISOString(),
        })),
        collectibles: user.ownedCollectibles.map((c: any) => ({
          id: c.id,
          editionName: c.editionName,
          uniqueNumber: c.uniqueNumber,
          rarity: c.rarity,
          mintedAt: c.mintedAt.toISOString(),
        })),
        security: {
          activeSessionsCount: user.sessions.length,
          recentSessions: user.sessions.map((s: any) => ({
            id: s.id,
            deviceName: s.deviceName,
            browser: s.browser,
            os: s.os,
            ipAddress: s.ipAddress,
            lastActiveAt: s.lastActiveAt.toISOString(),
          })),
        },
        auditHistory: auditHistory.map((a: any) => ({
          id: a.id,
          action: a.action,
          actorUsername: a.actor.username,
          metadata: a.metadata,
          createdAt: a.createdAt.toISOString(),
        })),
      },
    });
  } catch (err) {
    next(err);
  }
});

// 3. Ban User
adminRouter.post('/users/:id/ban', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const targetUserId = req.params.id;
    const { reason } = req.body;

    // Check if target is admin
    const target = await prisma.user.findUnique({ where: { id: targetUserId } });
    if (!target) {
      return res.status(404).json({ success: false, error: { message: 'User not found' } });
    }
    if (target.role === UserRole.SUPERADMIN) {
      return res.status(403).json({ success: false, error: { message: 'Cannot ban SUPERADMIN' } });
    }

    // Ban user and revoke all active sessions
    await prisma.$transaction([
      prisma.user.update({
        where: { id: targetUserId },
        data: {
          isBanned: true,
          bannedReason: reason || 'Violation of Community Guidelines',
        },
      }),
      prisma.session.updateMany({
        where: { userId: targetUserId },
        data: { isRevoked: true },
      }),
      prisma.auditLog.create({
        data: {
          actorId: req.user!.userId,
          action: 'BAN_USER',
          target: targetUserId,
          metadata: { reason },
          ipAddress: req.ip,
        },
      }),
    ]);

    return res.json({
      success: true,
      data: { message: 'User has been banned and all active sessions revoked' },
    });
  } catch (err) {
    next(err);
  }
});

// 4. Unban User
adminRouter.post('/users/:id/unban', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const targetUserId = req.params.id;

    await prisma.$transaction([
      prisma.user.update({
        where: { id: targetUserId },
        data: {
          isBanned: false,
          bannedReason: null,
        },
      }),
      prisma.auditLog.create({
        data: {
          actorId: req.user!.userId,
          action: 'UNBAN_USER',
          target: targetUserId,
          ipAddress: req.ip,
        },
      }),
    ]);

    return res.json({
      success: true,
      data: { message: 'User unbanned successfully' },
    });
  } catch (err) {
    next(err);
  }
});

// 5. Change Role
adminRouter.post('/users/:id/role', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { role } = req.body;
    const targetUserId = req.params.id;

    if (!Object.values(UserRole).includes(role)) {
      return res.status(400).json({ success: false, error: { message: 'Invalid role' } });
    }

    const target = await prisma.user.findUnique({ where: { id: targetUserId } });
    if (!target) {
      return res.status(404).json({ success: false, error: { message: 'User not found' } });
    }

    // Super Admin Protection (Section 69):
    if (target.role === UserRole.SUPERADMIN && req.user!.role !== UserRole.SUPERADMIN) {
      return res.status(403).json({
        success: false,
        error: { message: 'Cannot demote or modify SUPERADMIN role' },
      });
    }

    if (role === UserRole.SUPERADMIN && req.user!.role !== UserRole.SUPERADMIN) {
      return res.status(403).json({
        success: false,
        error: { message: 'Only SUPERADMIN can assign the SUPERADMIN role' },
      });
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id: targetUserId },
        data: { role },
      }),
      prisma.auditLog.create({
        data: {
          actorId: req.user!.userId,
          action: 'CHANGE_ROLE',
          target: targetUserId,
          metadata: { newRole: role, previousRole: target.role },
          ipAddress: req.ip,
        },
      }),
    ]);

    return res.json({
      success: true,
      data: { message: `Role changed to ${role}` },
    });
  } catch (err) {
    next(err);
  }
});

// 6. Audit Logs
adminRouter.get('/audit-logs', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const logs = await prisma.auditLog.findMany({
      include: {
        actor: {
          include: { profile: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return res.json({
      success: true,
      data: logs.map((l: any) => ({
        id: l.id,
        actor: {
          id: l.actor.id,
          username: l.actor.username,
          displayName: l.actor.profile?.displayName,
        },
        action: l.action,
        target: l.target,
        metadata: l.metadata,
        ipAddress: l.ipAddress,
        createdAt: l.createdAt.toISOString(),
      })),
    });
  } catch (err) {
    next(err);
  }
});
