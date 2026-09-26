import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import fs from 'fs';
import { ENV } from './config';
import { prisma } from './prisma';
import { errorHandler } from './common/error-handler';
import { APP_CONFIG } from '@dfz/config';

// Routers
import { authRouter } from './auth/auth.controller';
import { usersRouter } from './users/users.controller';
import { contactsRouter } from './contacts/contacts.controller';
import { chatsRouter } from './chats/chats.controller';
import { messagesRouter } from './messages/messages.controller';
import { mediaRouter } from './media/media.controller';
import { searchRouter } from './search/search.controller';
import { moderationRouter } from './moderation/moderation.controller';
import { adminRouter } from './admin/admin.controller';
import { storiesRouter } from './stories/stories.controller';
import { pollsRouter } from './polls/polls.controller';
import { stickersRouter } from './stickers/stickers.controller';
import { previewRouter } from './preview/preview.controller';
import { economyRouter } from './economy/economy.controller';
import { callsRouter } from './calls/calls.controller';
import { foldersRouter } from './chats/folders.controller';

export const app = express();

// Security & Parsing Middlewares
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: false,
  })
);

app.use(
  cors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  })
);

app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health & System Info
app.get('/api/health', async (_req, res) => {
  let dbOk = false;
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbOk = true;
  } catch {
    dbOk = false;
  }

  return res.json({
    status: 'ok',
    app: APP_CONFIG.name,
    version: APP_CONFIG.version,
    database: dbOk ? 'healthy' : 'disconnected',
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

// Mount Modular API Routers
app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/contacts', contactsRouter);
app.use('/api/chats', chatsRouter);
app.use('/api/folders', foldersRouter);
app.use('/api/calls', callsRouter);
app.use('/api/messages', messagesRouter);
app.use('/api/media', mediaRouter);
app.use('/api/search', searchRouter);
app.use('/api/moderation', moderationRouter);
app.use('/api/admin', adminRouter);
app.use('/api/stories', storiesRouter);
app.use('/api/polls', pollsRouter);
app.use('/api/stickers', stickersRouter);
app.use('/api/preview', previewRouter);
app.use('/api/economy', economyRouter);

// Central Error Handler
app.use(errorHandler);
