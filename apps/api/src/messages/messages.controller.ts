import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { messagesService } from './messages.service';
import { authGuard } from '../common/auth.guard';
import { MessageType, ReceiptStatus } from '@dfz/types';

export const messagesRouter = Router();

messagesRouter.use(authGuard);

const sendMessageSchema = z.object({
  chatId: z.string().min(1, 'chatId required'),
  content: z.string().max(4096).default(''),
  type: z.nativeEnum(MessageType).optional(),
  replyToId: z.string().optional(),
  idempotencyKey: z.string().optional(),
  attachments: z.array(z.object({
    originalName: z.string(),
    mimeType: z.string(),
    sizeBytes: z.number(),
    storageKey: z.string(),
    url: z.string(),
    thumbnailUrl: z.string().optional(),
    duration: z.number().optional(),
    waveform: z.array(z.number()).optional(),
    width: z.number().optional(),
    height: z.number().optional(),
  })).optional(),
});

// 1. Get messages with cursor pagination
messagesRouter.get('/chat/:chatId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const cursor = (req.query.cursor as string) || undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 40;
    const direction = (req.query.direction as 'before' | 'after') || 'before';

    const result = await messagesService.getMessages(req.params.chatId, req.user!.userId, {
      cursor,
      limit,
      direction,
    });

    return res.json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
});

// 2. Send message
messagesRouter.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = sendMessageSchema.parse(req.body);
    const message = await messagesService.sendMessage(req.user!.userId, data);

    return res.status(201).json({
      success: true,
      data: message,
    });
  } catch (err) {
    next(err);
  }
});

// 3. Edit message
messagesRouter.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { content } = req.body;
    if (typeof content !== 'string' || !content.trim()) {
      return res.status(400).json({ success: false, error: { message: 'Message content cannot be empty' } });
    }
    const updated = await messagesService.editMessage(req.user!.userId, req.params.id, content.trim());
    return res.json({
      success: true,
      data: updated,
    });
  } catch (err) {
    next(err);
  }
});

// 4. Delete message
messagesRouter.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await messagesService.deleteMessage(req.user!.userId, req.params.id);
    return res.json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
});

// 5. Add reaction
messagesRouter.post('/:id/reactions', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { emoji } = req.body;
    if (!emoji || typeof emoji !== 'string') {
      return res.status(400).json({ success: false, error: { message: 'Emoji required' } });
    }
    const result = await messagesService.addReaction(req.user!.userId, req.params.id, emoji.trim());
    return res.json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
});

// 6. Remove reaction
messagesRouter.delete('/:id/reactions/:emoji', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await messagesService.removeReaction(req.user!.userId, req.params.id, req.params.emoji);
    return res.json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
});

// 7. Receipts
messagesRouter.post('/receipts', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { chatId, messageIds, status } = req.body;
    if (!chatId || !Array.isArray(messageIds)) {
      return res.status(400).json({ success: false, error: { message: 'chatId and messageIds array required' } });
    }
    const result = await messagesService.markReceipt(
      req.user!.userId,
      chatId,
      messageIds,
      status || ReceiptStatus.READ
    );
    return res.json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
});

// 8. Pin message
messagesRouter.post('/:id/pin', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { chatId } = req.body;
    if (!chatId) {
      return res.status(400).json({ success: false, error: { message: 'chatId required' } });
    }
    const result = await messagesService.pinMessage(chatId, req.params.id, req.user!.userId);
    return res.json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
});

// 9. Unpin message
messagesRouter.delete('/:id/pin', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const chatId = req.query.chatId as string;
    if (!chatId) {
      return res.status(400).json({ success: false, error: { message: 'chatId query param required' } });
    }
    const result = await messagesService.unpinMessage(chatId, req.params.id, req.user!.userId);
    return res.json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
});
