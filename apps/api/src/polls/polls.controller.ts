import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { pollsService } from './polls.service';
import { authGuard } from '../common/auth.guard';

export const pollsRouter = Router();

pollsRouter.use(authGuard);

const createPollSchema = z.object({
  chatId: z.string().min(1, 'chatId is required'),
  question: z.string().min(1, 'Question is required').max(300),
  options: z.array(z.string().min(1).max(100)).min(2).max(10),
  isAnonymous: z.boolean().optional(),
  allowMultiple: z.boolean().optional(),
});

const voteSchema = z.object({
  optionId: z.string().min(1, 'optionId is required'),
});

// POST /api/polls
pollsRouter.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { chatId, ...data } = createPollSchema.parse(req.body);
    const result = await pollsService.createPoll(req.user!.id, chatId, data);
    return res.status(201).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

// POST /api/polls/:id/vote
pollsRouter.post('/:id/vote', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { optionId } = voteSchema.parse(req.body);
    const result = await pollsService.vote(req.user!.id, req.params.id, optionId);
    return res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

// GET /api/polls/:id
pollsRouter.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const poll = await pollsService.getPollDetails(req.user!.id, req.params.id);
    return res.json({ success: true, data: poll });
  } catch (err) {
    next(err);
  }
});

// POST /api/polls/:id/close
pollsRouter.post('/:id/close', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const poll = await pollsService.closePoll(req.user!.id, req.params.id);
    return res.json({ success: true, data: poll });
  } catch (err) {
    next(err);
  }
});
