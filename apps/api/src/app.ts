import { authGuard } from './common/auth.guard';
import { mediaService } from './media/media.service';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import path from 'path';
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
import { managementRouter } from './chats/management.controller';

const app = express();

// Ensure uploads folder exists
if (!fs.existsSync(ENV.UPLOAD_DIR)) {
  fs.mkdirSync(ENV.UPLOAD_DIR, { recursive: true });
}

// Security & Parsing Middlewares
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: false, // Managed at client/proxy level
  })
);

app.use(
  cors({
    origin: [ENV.CLIENT_URL, 'http://localhost:3000', 'http://127.0.0.1:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  })
);

app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static uploads serving
app.use('/uploads', authGuard, async (req, res, next) => { try { const file = await mediaService.getFile(req.path.slice(1), req.user!.userId); res.setHeader('Cache-Control', 'private, no-store'); res.setHeader('Content-Security-Policy', "default-src 'none'; sandbox" ); res.sendFile(file.path); } catch (err) { next(err); } });

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
app.use('/api', managementRouter);
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

export { app };
