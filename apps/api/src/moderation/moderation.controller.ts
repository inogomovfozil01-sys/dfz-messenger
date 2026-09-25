import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma';
import { authGuard } from '../common/auth.guard';
import { roleGuard } from '../common/role.guard';
import { ReportReason, ReportStatus, UserRole } from '@dfz/types';

export const moderationRouter = Router();

moderationRouter.use(authGuard);

const createReportSchema = z.object({
  targetType: z.enum(['USER', 'CHAT', 'MESSAGE']),
  targetId: z.string().min(1),
  reason: z.nativeEnum(ReportReason),
  comment: z.string().max(500).optional(),
});

// 1. Submit a report
moderationRouter.post('/report', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = createReportSchema.parse(req.body);
    const report = await prisma.report.create({
      data: {
        reporterId: req.user!.userId,
        targetType: data.targetType,
        targetId: data.targetId,
        reason: data.reason,
        comment: data.comment || null,
      },
    });

    return res.status(201).json({
      success: true,
      data: { id: report.id, message: 'Report submitted for moderation review' },
    });
  } catch (err) {
    next(err);
  }
});

// 2. Moderation queue (Moderators & Admins)
moderationRouter.get(
  '/queue',
  roleGuard([UserRole.MODERATOR, UserRole.ADMIN, UserRole.SUPERADMIN]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const status = (req.query.status as ReportStatus) || ReportStatus.PENDING;
      const reports = await prisma.report.findMany({
        where: { status },
        include: {
          reporter: {
            include: { profile: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });

      return res.json({
        success: true,
        data: reports.map(r => ({
          id: r.id,
          reporter: {
            id: r.reporter.id,
            username: r.reporter.username,
            displayName: r.reporter.profile?.displayName,
          },
          targetType: r.targetType,
          targetId: r.targetId,
          reason: r.reason,
          comment: r.comment,
          status: r.status,
          createdAt: r.createdAt.toISOString(),
        })),
      });
    } catch (err) {
      next(err);
    }
  }
);

// 3. Resolve report
moderationRouter.put(
  '/reports/:id',
  roleGuard([UserRole.MODERATOR, UserRole.ADMIN, UserRole.SUPERADMIN]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { status } = req.body;
      const report = await prisma.report.update({
        where: { id: req.params.id },
        data: {
          status,
          reviewedBy: req.user!.userId,
        },
      });

      return res.json({
        success: true,
        data: report,
      });
    } catch (err) {
      next(err);
    }
  }
);
