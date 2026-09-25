import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../prisma';
import { authGuard } from '../common/auth.guard';
import { ChatType } from '@dfz/types';

export const searchRouter = Router();

searchRouter.use(authGuard);

// 1. Global Search
searchRouter.get('/global', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const q = (req.query.q as string || '').trim().toLowerCase();
    const userId = req.user!.userId;

    if (!q || q.length < 1) {
      return res.json({
        success: true,
        data: { chats: [], users: [], messages: [] },
      });
    }

    // A. Users
    const users = await prisma.user.findMany({
      where: {
        AND: [
          { id: { not: userId } },
          { isBanned: false },
          {
            OR: [
              { username: { contains: q, mode: 'insensitive' } },
              { profile: { displayName: { contains: q, mode: 'insensitive' } } },
            ],
          },
        ],
      },
      include: { profile: true },
      take: 10,
    });

    // B. Chats (Groups & Channels user is member of or public)
    const chats = await prisma.chat.findMany({
      where: {
        AND: [
          {
            OR: [
              { members: { some: { userId } } },
              { isPublic: true },
            ],
          },
          {
            OR: [
              { title: { contains: q, mode: 'insensitive' } },
              { description: { contains: q, mode: 'insensitive' } },
            ],
          },
        ],
      },
      include: {
        members: {
          include: {
            user: { include: { profile: true } },
          },
        },
      },
      take: 10,
    });

    // C. Messages (only in user's chats)
    const messages = await prisma.message.findMany({
      where: {
        AND: [
          { chat: { members: { some: { userId } } } },
          { isDeleted: false },
          { content: { contains: q, mode: 'insensitive' } },
        ],
      },
      include: {
        sender: { include: { profile: true } },
        chat: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 15,
    });

    return res.json({
      success: true,
      data: {
        users: users.map(u => ({
          id: u.id,
          username: u.username,
          displayName: u.profile?.displayName || u.username,
          avatarUrl: u.profile?.avatarUrl,
          bio: u.profile?.bio,
        })),
        chats: chats.map(c => ({
          id: c.id,
          type: c.type,
          title: c.title,
          avatarUrl: c.avatarUrl,
          description: c.description,
          memberCount: c.members.length,
        })),
        messages: messages.map(m => ({
          id: m.id,
          chatId: m.chatId,
          chatTitle: m.chat.title || 'Direct Chat',
          senderName: m.sender.profile?.displayName || m.sender.username,
          content: m.content,
          createdAt: m.createdAt.toISOString(),
        })),
      },
    });
  } catch (err) {
    next(err);
  }
});

// 2. In-Chat Message Search
searchRouter.get('/chat/:chatId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const q = (req.query.q as string || '').trim().toLowerCase();
    const chatId = req.params.chatId;
    const userId = req.user!.userId;

    // Check membership
    const member = await prisma.chatMember.findUnique({
      where: { chatId_userId: { chatId, userId } },
    });
    if (!member) {
      return res.status(403).json({ success: false, error: { message: 'Access denied' } });
    }

    if (!q) {
      return res.json({ success: true, data: [] });
    }

    const messages = await prisma.message.findMany({
      where: {
        chatId,
        isDeleted: false,
        content: { contains: q, mode: 'insensitive' },
      },
      include: {
        sender: { include: { profile: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 30,
    });

    return res.json({
      success: true,
      data: messages.map(m => ({
        id: m.id,
        chatId: m.chatId,
        senderId: m.senderId,
        senderName: m.sender.profile?.displayName || m.sender.username,
        content: m.content,
        createdAt: m.createdAt.toISOString(),
      })),
    });
  } catch (err) {
    next(err);
  }
});
