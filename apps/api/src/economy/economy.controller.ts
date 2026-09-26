import { Router, Request, Response, NextFunction } from 'express';
import { authGuard } from '../common/auth.guard';
import { permissionGuard } from '../common/permission.guard';
import { roleGuard } from '../common/role.guard';
import { UserRole, Permission } from '@dfz/types';
import { starsService } from './stars.service';
import { activityRewardService } from './activity.service';
import { giftsService } from './gifts.service';
import { collectiblesService } from './collectibles.service';
import { premiumService } from './premium.service';
import { economyAnalyticsService } from './economy-analytics.service';

export const economyRouter = Router();

// All economy routes require authentication
economyRouter.use(authGuard);

// ----------------------------------------------------
// 1. Stars & Balance Endpoints
// ----------------------------------------------------

// Get my balance
economyRouter.get('/stars/balance', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await starsService.getBalance(
      req.user!.userId,
      req.user!.userId,
      req.user!.role
    );
    return res.json({ success: true, data });
  } catch (err: any) {
    return res.status(400).json({ success: false, error: { message: err.message } });
  }
});

// Get another user's balance (private by default, requires permission)
economyRouter.get('/stars/balance/:userId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await starsService.getBalance(
      req.params.userId,
      req.user!.userId,
      req.user!.role
    );
    return res.json({ success: true, data });
  } catch (err: any) {
    return res.status(403).json({ success: false, error: { message: err.message } });
  }
});

// Transfer stars to another user
economyRouter.post('/stars/transfer', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { recipientId, amount, message, chatId, idempotencyKey } = req.body;
    const parsedAmount = parseInt(amount, 10);

    const result = await starsService.transferStars(
      req.user!.userId,
      recipientId,
      parsedAmount,
      message,
      idempotencyKey,
      chatId
    );

    return res.json({ success: true, data: result });
  } catch (err: any) {
    return res.status(400).json({ success: false, error: { message: err.message } });
  }
});

// Get transaction history
economyRouter.get('/stars/history', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const filter = (req.query.filter as string) || 'ALL';
    const limit = parseInt(req.query.limit as string, 10) || 20;
    const cursor = req.query.cursor as string;

    const data = await starsService.getTransactionHistory(
      req.user!.userId,
      filter,
      limit,
      cursor
    );

    return res.json({ success: true, data });
  } catch (err: any) {
    next(err);
  }
});

// Get single transaction details
economyRouter.get('/stars/transactions/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await starsService.getTransactionDetails(
      req.params.id,
      req.user!.userId,
      req.user!.role
    );
    return res.json({ success: true, data });
  } catch (err: any) {
    return res.status(403).json({ success: false, error: { message: err.message } });
  }
});

// ----------------------------------------------------
// 2. Activity Reward Engine Endpoints
// ----------------------------------------------------

// Client activity heartbeat
economyRouter.post('/activity/heartbeat', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { active, visible, clientFingerprint } = req.body;
    const state = await activityRewardService.recordHeartbeat(req.user!.userId, {
      active: !!active,
      visible: !!visible,
      clientFingerprint,
    });
    return res.json({ success: true, data: state });
  } catch (err: any) {
    next(err);
  }
});

// Get activity reward state & timer
economyRouter.get('/activity/state', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const state = await activityRewardService.getActivityState(req.user!.userId);
    return res.json({ success: true, data: state });
  } catch (err: any) {
    next(err);
  }
});

// ----------------------------------------------------
// 3. Gifts Endpoints
// ----------------------------------------------------

// Get gift catalog
economyRouter.get('/gifts/catalog', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const category = req.query.category as string;
    const data = await giftsService.getGiftDefinitions(category);
    return res.json({ success: true, data });
  } catch (err: any) {
    next(err);
  }
});

// Send gift
economyRouter.post('/gifts/send', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { recipientId, giftDefinitionId, message, isAnonymous, chatId, idempotencyKey } = req.body;
    const result = await giftsService.sendGift(
      req.user!.userId,
      recipientId,
      giftDefinitionId,
      {
        message,
        isAnonymous: !!isAnonymous,
        chatId,
        idempotencyKey,
      }
    );
    return res.json({ success: true, data: result });
  } catch (err: any) {
    return res.status(400).json({ success: false, error: { message: err.message } });
  }
});

// Get user profile gifts
economyRouter.get('/gifts/user/:userId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const isSelf = req.user!.userId === req.params.userId;
    const data = await giftsService.getUserGifts(req.params.userId, !isSelf);
    return res.json({ success: true, data });
  } catch (err: any) {
    next(err);
  }
});

// Toggle gift visibility on profile
economyRouter.post('/gifts/:id/visibility', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { show } = req.body;
    const updated = await giftsService.toggleProfileVisibility(
      req.user!.userId,
      req.params.id,
      !!show
    );
    return res.json({ success: true, data: updated });
  } catch (err: any) {
    return res.status(400).json({ success: false, error: { message: err.message } });
  }
});

// ----------------------------------------------------
// 4. Collectibles Endpoints
// ----------------------------------------------------

// Get my collectibles
economyRouter.get('/collectibles/my', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await collectiblesService.getUserCollectibles(req.user!.userId);
    return res.json({ success: true, data });
  } catch (err: any) {
    next(err);
  }
});

// Get collectible details (fullscreen viewer)
economyRouter.get('/collectibles/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await collectiblesService.getCollectibleDetails(req.params.id);
    return res.json({ success: true, data });
  } catch (err: any) {
    return res.status(404).json({ success: false, error: { message: err.message } });
  }
});

// Transfer collectible
economyRouter.post('/collectibles/:id/transfer', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { recipientId } = req.body;
    const result = await collectiblesService.transfer(
      req.user!.userId,
      recipientId,
      req.params.id
    );
    return res.json({ success: true, data: result });
  } catch (err: any) {
    return res.status(400).json({ success: false, error: { message: err.message } });
  }
});

// ----------------------------------------------------
// 5. DFZ Premium Endpoints
// ----------------------------------------------------

// Get my premium status
economyRouter.get('/premium/status', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await premiumService.getStatus(req.user!.userId);
    return res.json({ success: true, data });
  } catch (err: any) {
    next(err);
  }
});

// Get another user's premium status
economyRouter.get('/premium/status/:userId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await premiumService.getStatus(req.params.userId);
    return res.json({ success: true, data });
  } catch (err: any) {
    next(err);
  }
});

// Purchase premium with Stars
economyRouter.post('/premium/purchase', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { plan, idempotencyKey } = req.body;
    const data = await premiumService.purchaseWithStars(
      req.user!.userId,
      plan || 'MONTHLY',
      idempotencyKey
    );
    return res.json({ success: true, data });
  } catch (err: any) {
    return res.status(400).json({ success: false, error: { message: err.message } });
  }
});

// Gift premium to another user
economyRouter.post('/premium/gift', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { recipientId, plan, idempotencyKey, chatId } = req.body;
    const data = await premiumService.giftPremium(
      req.user!.userId,
      recipientId,
      plan || 'MONTHLY',
      idempotencyKey,
      chatId
    );
    return res.json({ success: true, data });
  } catch (err: any) {
    return res.status(400).json({ success: false, error: { message: err.message } });
  }
});

// ----------------------------------------------------
// 6. Administrative Economy Endpoints (Protected by RBAC)
// ----------------------------------------------------

// Admin metrics
economyRouter.get(
  '/admin/metrics',
  permissionGuard(Permission.ECONOMY_MANAGE),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await economyAnalyticsService.getMetrics();
      return res.json({ success: true, data });
    } catch (err: any) {
      next(err);
    }
  }
);

// Admin give stars
economyRouter.post(
  '/admin/stars/grant',
  permissionGuard(Permission.STARS_GRANT),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { targetUserId, amount, reason, idempotencyKey } = req.body;
      const parsedAmount = parseInt(amount, 10);
      const data = await starsService.adminGrant(
        req.user!.userId,
        targetUserId,
        parsedAmount,
        reason,
        idempotencyKey
      );
      return res.json({ success: true, data });
    } catch (err: any) {
      return res.status(400).json({ success: false, error: { message: err.message } });
    }
  }
);

// Admin debit stars
economyRouter.post(
  '/admin/stars/debit',
  permissionGuard(Permission.STARS_DEBIT),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { targetUserId, amount, reason } = req.body;
      const parsedAmount = parseInt(amount, 10);
      const data = await starsService.adminDebit(
        req.user!.userId,
        targetUserId,
        parsedAmount,
        reason
      );
      return res.json({ success: true, data });
    } catch (err: any) {
      return res.status(400).json({ success: false, error: { message: err.message } });
    }
  }
);

// SuperAdmin mass campaign
economyRouter.post(
  '/admin/campaign',
  roleGuard([UserRole.SUPERADMIN]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { title, description, starsPerUser, recipientIds } = req.body;
      const data = await starsService.executeMassCampaign(req.user!.userId, {
        title,
        description,
        starsPerUser: parseInt(starsPerUser, 10),
        recipientIds,
      });
      return res.json({ success: true, data });
    } catch (err: any) {
      return res.status(400).json({ success: false, error: { message: err.message } });
    }
  }
);

// Admin create gift definition
economyRouter.post(
  '/admin/gifts',
  permissionGuard(Permission.GIFTS_MANAGE),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await giftsService.adminCreateGift(req.user!.userId, req.body);
      return res.json({ success: true, data });
    } catch (err: any) {
      return res.status(400).json({ success: false, error: { message: err.message } });
    }
  }
);

// Admin update gift definition
economyRouter.put(
  '/admin/gifts/:id',
  permissionGuard(Permission.GIFTS_MANAGE),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await giftsService.adminUpdateGift(
        req.user!.userId,
        req.params.id,
        req.body
      );
      return res.json({ success: true, data });
    } catch (err: any) {
      return res.status(400).json({ success: false, error: { message: err.message } });
    }
  }
);

// Admin grant gift to user
economyRouter.post(
  '/admin/gifts/grant',
  permissionGuard(Permission.GIFTS_GRANT),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { targetUserId, giftDefinitionId, message } = req.body;
      const data = await giftsService.adminGrantGift(
        req.user!.userId,
        targetUserId,
        giftDefinitionId,
        message
      );
      return res.json({ success: true, data });
    } catch (err: any) {
      return res.status(400).json({ success: false, error: { message: err.message } });
    }
  }
);

// Admin create collectible edition
economyRouter.post(
  '/admin/collectibles/edition',
  permissionGuard(Permission.COLLECTIBLES_MANAGE),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await collectiblesService.adminCreateEdition(
        req.user!.userId,
        req.body
      );
      return res.json({ success: true, data });
    } catch (err: any) {
      return res.status(400).json({ success: false, error: { message: err.message } });
    }
  }
);

// Admin grant premium
economyRouter.post(
  '/admin/premium/grant',
  permissionGuard(Permission.PREMIUM_GRANT),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { targetUserId, duration, reason } = req.body;
      const data = await premiumService.adminGrant(
        req.user!.userId,
        targetUserId,
        duration || '30d',
        reason || 'Administrative Grant'
      );
      return res.json({ success: true, data });
    } catch (err: any) {
      return res.status(400).json({ success: false, error: { message: err.message } });
    }
  }
);

// Admin revoke premium
economyRouter.post(
  '/admin/premium/revoke',
  permissionGuard(Permission.PREMIUM_REVOKE),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { targetUserId, reason } = req.body;
      const data = await premiumService.adminRevoke(
        req.user!.userId,
        targetUserId,
        reason || 'Administrative Revocation'
      );
      return res.json({ success: true, data });
    } catch (err: any) {
      return res.status(400).json({ success: false, error: { message: err.message } });
    }
  }
);
