import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { chatsService } from './chats.service';
import { authGuard } from '../common/auth.guard';
import { MemberRole } from '@dfz/types';

export const chatsRouter = Router();

chatsRouter.use(authGuard);

const createDirectSchema = z.object({
  targetUserId: z.string().min(1, 'targetUserId is required'),
});

const createGroupSchema = z.object({
  title: z.string().min(1, 'Group title is required').max(64),
  description: z.string().max(300).optional(),
  avatarUrl: z.string().optional(),
  memberIds: z.array(z.string()).optional(),
});

const createChannelSchema = z.object({
  title: z.string().min(1, 'Channel title is required').max(64),
  description: z.string().max(300).optional(),
  avatarUrl: z.string().optional(),
  isPublic: z.boolean().optional(),
});

// 1. Get all chats for logged-in user
chatsRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const chats = await chatsService.getUserChats(req.user!.userId);
    return res.json({
      success: true,
      data: chats,
    });
  } catch (err) {
    next(err);
  }
});

// 2. Create or find Direct chat
chatsRouter.post('/direct', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { targetUserId } = createDirectSchema.parse(req.body);
    const chat = await chatsService.createDirectChat(req.user!.userId, targetUserId);
    return res.status(201).json({
      success: true,
      data: chat,
    });
  } catch (err) {
    next(err);
  }
});

// 3. Create Group
chatsRouter.post('/group', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = createGroupSchema.parse(req.body);
    const chat = await chatsService.createGroup(req.user!.userId, data);
    return res.status(201).json({
      success: true,
      data: chat,
    });
  } catch (err) {
    next(err);
  }
});

// 4. Create Channel
chatsRouter.post('/channel', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = createChannelSchema.parse(req.body);
    const chat = await chatsService.createChannel(req.user!.userId, data);
    return res.status(201).json({
      success: true,
      data: chat,
    });
  } catch (err) {
    next(err);
  }
});

// 5. Get chat by ID
chatsRouter.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const chat = await chatsService.getChatById(req.params.id, req.user!.userId);
    return res.json({
      success: true,
      data: chat,
    });
  } catch (err) {
    next(err);
  }
});

// 6. Add member to group/channel
chatsRouter.post('/:id/members', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { targetUserId, role } = req.body;
    if (!targetUserId) {
      return res.status(400).json({ success: false, error: { message: 'targetUserId is required' } });
    }
    const updated = await chatsService.addMember(
      req.params.id,
      req.user!.userId,
      targetUserId,
      role || MemberRole.MEMBER
    );
    return res.json({
      success: true,
      data: updated,
    });
  } catch (err) {
    next(err);
  }
});

// 7. Remove member or leave chat
chatsRouter.delete('/:id/members/:targetUserId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await chatsService.removeMember(
      req.params.id,
      req.user!.userId,
      req.params.targetUserId
    );
    return res.json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
});

// 8. Toggle Pin Chat
chatsRouter.post('/:id/pin', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { isPinned } = req.body;
    const result = await chatsService.togglePinChat(req.params.id, req.user!.userId, !!isPinned);
    return res.json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
});

// 9. Toggle Mute Chat
chatsRouter.post('/:id/mute', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { isMuted, mutedUntil } = req.body;
    const result = await chatsService.toggleMuteChat(
      req.params.id,
      req.user!.userId,
      !!isMuted,
      mutedUntil ? new Date(mutedUntil) : undefined
    );
    return res.json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
});

// 10. Toggle Archive Chat
chatsRouter.post('/:id/archive', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { isArchived } = req.body;
    const result = await chatsService.toggleArchiveChat(req.params.id, req.user!.userId, !!isArchived);
    return res.json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
});

// 11. Get Topics
chatsRouter.get('/:id/topics', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const topics = await chatsService.getTopics(req.params.id, req.user!.userId);
    return res.json({ success: true, data: topics });
  } catch (err) {
    next(err);
  }
});

// 12. Create Topic
chatsRouter.post('/:id/topics', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { title, icon, color } = req.body;
    if (!title || typeof title !== 'string') {
      return res.status(400).json({ success: false, error: { message: 'Title is required' } });
    }
    const topic = await chatsService.createTopic(req.params.id, req.user!.userId, { title, icon, color });
    return res.status(201).json({ success: true, data: topic });
  } catch (err) {
    next(err);
  }
});

// 13. Close Topic
chatsRouter.post('/:id/topics/:topicId/close', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await chatsService.closeTopic(req.params.id, req.params.topicId, req.user!.userId);
    return res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

// 14. Update Chat (Group / Channel settings)
chatsRouter.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const updated = await chatsService.updateChat(req.params.id, req.user!.userId, req.body);
    return res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

// 15. Update Member role & permissions
chatsRouter.put('/:id/members/:targetUserId/role', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { role, customTitle, permissions } = req.body;
    const updated = await chatsService.updateMember(req.params.id, req.user!.userId, req.params.targetUserId, {
      role,
      customTitle,
      permissions,
    });
    return res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

// 16. Delete Chat
chatsRouter.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await chatsService.deleteChat(req.params.id, req.user!.userId);
    return res.json(result);
  } catch (err) {
    next(err);
  }
});

// 17. Clear History
chatsRouter.post('/:id/clear', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await chatsService.clearHistory(req.params.id, req.user!.userId);
    return res.json(result);
  } catch (err) {
    next(err);
  }
});

// 18. Regenerate invite code
chatsRouter.post('/:id/invite-link', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await chatsService.regenerateInviteCode(req.params.id, req.user!.userId);
    return res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

// 19. Get Chat Shared Media
chatsRouter.get('/:id/media', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const category = (req.query.category as 'media' | 'files' | 'voice' | 'links') || 'media';
    const items = await chatsService.getChatMedia(req.params.id, req.user!.userId, category);
    return res.json({ success: true, data: items });
  } catch (err) {
    next(err);
  }
});

