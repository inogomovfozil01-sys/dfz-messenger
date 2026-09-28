import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { usersService } from './users.service';
import { authGuard } from '../common/auth.guard';
import { PrivacyVisibility } from '@dfz/types';

export const usersRouter = Router();

const updateProfileSchema = z.object({
  displayName: z.string().min(1).max(64).optional(),
  bio: z.string().max(200).optional().nullable(),
  avatarUrl: z.string().max(3000000).optional().nullable(),
  theme: z.enum(['dark', 'dim', 'light', 'system']).optional(),
  language: z.string().max(10).optional(),
  username: z.string().min(3).max(32).regex(/^[a-zA-Z0-9_]+$/).optional(),
  phone: z.string().max(32).optional().nullable(),
});

const updatePrivacySchema = z.object({
  lastSeenVisibility: z.nativeEnum(PrivacyVisibility).optional(),
  messageVisibility: z.nativeEnum(PrivacyVisibility).optional(),
  callVisibility: z.nativeEnum(PrivacyVisibility).optional(),
  groupAddVisibility: z.nativeEnum(PrivacyVisibility).optional(),
  photoVisibility: z.nativeEnum(PrivacyVisibility).optional(),
});

// Check username availability (no auth required for onboarding)
usersRouter.get('/check-username/:username', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await usersService.checkUsernameAvailable(req.params.username);
    return res.json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
});

// Search users
usersRouter.get('/search', authGuard, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const q = (req.query.q as string) || '';
    const users = await usersService.searchUsers(q, req.user!.userId);
    return res.json({
      success: true,
      data: users,
    });
  } catch (err) {
    next(err);
  }
});

// Update profile
usersRouter.put('/profile', authGuard, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = updateProfileSchema.parse(req.body);
    const updated = await usersService.updateProfile(req.user!.userId, {
      ...data,
      bio: data.bio || undefined,
      avatarUrl: data.avatarUrl || undefined,
    });

    return res.json({
      success: true,
      data: updated,
    });
  } catch (err) {
    next(err);
  }
});

// Update privacy
usersRouter.put('/privacy', authGuard, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = updatePrivacySchema.parse(req.body);
    const updated = await usersService.updatePrivacy(req.user!.userId, data);

    return res.json({
      success: true,
      data: updated,
    });
  } catch (err) {
    next(err);
  }
});

// Get user profile by ID or username
usersRouter.get('/profile/:id', authGuard, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const profile = await usersService.getProfile(req.user!.userId, req.params.id);
    return res.json({
      success: true,
      data: profile,
    });
  } catch (err) {
    next(err);
  }
});

// Block user
usersRouter.post('/block', authGuard, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { targetUserId, reason } = req.body;
    if (!targetUserId) {
      return res.status(400).json({ success: false, error: { message: 'targetUserId required' } });
    }
    const result = await usersService.blockUser(req.user!.userId, targetUserId, reason);
    return res.json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
});

// Unblock user
usersRouter.post('/unblock', authGuard, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { targetUserId } = req.body;
    if (!targetUserId) {
      return res.status(400).json({ success: false, error: { message: 'targetUserId required' } });
    }
    const result = await usersService.unblockUser(req.user!.userId, targetUserId);
    return res.json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
});

// Get blocked users
usersRouter.get('/blocked', authGuard, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const list = await usersService.getBlockedUsers(req.user!.userId);
    return res.json({
      success: true,
      data: list,
    });
  } catch (err) {
    next(err);
  }
});
