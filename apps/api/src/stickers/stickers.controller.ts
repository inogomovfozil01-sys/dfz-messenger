import { Router, Request, Response, NextFunction } from 'express';
import { stickersService } from './stickers.service';
import { authGuard } from '../common/auth.guard';

export const stickersRouter = Router();

stickersRouter.use(authGuard);

// GET /api/stickers/packs
stickersRouter.get('/packs', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const packs = await stickersService.getPacks();
    return res.json({ success: true, data: packs });
  } catch (err) {
    next(err);
  }
});
