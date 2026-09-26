import { Router, Request, Response, NextFunction } from 'express';
import { callsService } from './calls.service';
import { authGuard } from '../common/auth.guard';
import { CallType } from '@dfz/types';

export const callsRouter = Router();

callsRouter.use(authGuard);

// 1. Get call history (all or missed)
callsRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const filter = (req.query.filter as 'all' | 'missed') || 'all';
    const calls = await callsService.getCallHistory(req.user!.userId, filter);
    return res.json({
      success: true,
      data: calls,
    });
  } catch (err) {
    next(err);
  }
});

// 2. Pre-flight call permission check
callsRouter.post('/check-permission', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { receiverId } = req.body;
    if (!receiverId) {
      return res.status(400).json({ success: false, error: { message: 'receiverId is required' } });
    }
    const check = await callsService.checkCallPermission(req.user!.userId, receiverId);
    return res.json({
      success: true,
      data: check,
    });
  } catch (err) {
    next(err);
  }
});

// 3. Log Call creation
callsRouter.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { chatId, receiverId, type } = req.body;
    if (!chatId || !receiverId) {
      return res.status(400).json({ success: false, error: { message: 'chatId and receiverId are required' } });
    }

    const permission = await callsService.checkCallPermission(req.user!.userId, receiverId);
    if (!permission.allowed) {
      return res.status(403).json({ success: false, error: { message: permission.reason } });
    }

    const call = await callsService.logCallStart({
      chatId,
      callerId: req.user!.userId,
      receiverId,
      type: type || CallType.AUDIO,
    });

    return res.status(201).json({
      success: true,
      data: call,
    });
  } catch (err) {
    next(err);
  }
});
