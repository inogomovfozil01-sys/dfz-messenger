import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { previewService } from './preview.service';
import { authGuard } from '../common/auth.guard';

export const previewRouter = Router();

previewRouter.use(authGuard);

const previewQuerySchema = z.object({
  url: z.string().url('Invalid URL format'),
});

// GET /api/preview?url=https://example.com
previewRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { url } = previewQuerySchema.parse(req.query);
    const data = await previewService.getLinkPreview(url);
    return res.json({ success: true, data });
  } catch (err: any) {
    return res.status(400).json({
      success: false,
      error: { code: 'PREVIEW_FAILED', message: err.message || 'Failed to fetch link preview' },
    });
  }
});
