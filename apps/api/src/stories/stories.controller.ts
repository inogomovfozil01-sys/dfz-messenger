import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { storiesService } from './stories.service';
import { authGuard } from '../common/auth.guard';
import { StoryMediaType, PrivacyVisibility } from '@dfz/types';

export const storiesRouter = Router();

storiesRouter.use(authGuard);

const createStorySchema = z.object({
  mediaUrl: z.string().min(1, 'Media URL is required'),
  mediaType: z.nativeEnum(StoryMediaType).default(StoryMediaType.IMAGE),
  caption: z.string().max(500).optional(),
  textOverlay: z.any().optional(),
  privacy: z.nativeEnum(PrivacyVisibility).default(PrivacyVisibility.EVERYONE),
});

const reactSchema = z.object({
  emoji: z.string().min(1).max(8),
});

// GET /api/stories/feed
storiesRouter.get('/feed', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const feed = await storiesService.getFeed(req.user!.id);
    return res.json({ success: true, data: feed });
  } catch (err) {
    next(err);
  }
});

// POST /api/stories
storiesRouter.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = createStorySchema.parse(req.body);
    const story = await storiesService.createStory(req.user!.id, data);
    return res.status(201).json({ success: true, data: story });
  } catch (err) {
    next(err);
  }
});

// POST /api/stories/:id/view
storiesRouter.post('/:id/view', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await storiesService.recordView(req.user!.id, req.params.id);
    return res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// POST /api/stories/:id/react
storiesRouter.post('/:id/react', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { emoji } = reactSchema.parse(req.body);
    const result = await storiesService.reactToStory(req.user!.id, req.params.id, emoji);
    return res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

// GET /api/stories/:id/analytics
storiesRouter.get('/:id/analytics', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const analytics = await storiesService.getStoryViews(req.user!.id, req.params.id);
    return res.json({ success: true, data: analytics });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/stories/:id
storiesRouter.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await storiesService.deleteStory(req.user!.id, req.params.id);
    return res.json({ success: true });
  } catch (err) {
    next(err);
  }
});
