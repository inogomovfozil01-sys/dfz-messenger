import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { ENV } from '../config';
import { prisma } from '../prisma';
import { httpError, maySee } from '../common/access';

// Allowed MIME prefixes & types
const ALLOWED_MIME_PREFIXES = ['image/', 'video/', 'audio/', 'application/pdf', 'application/zip', 'text/'];

export class MediaService {
  private uploadDir: string;

  constructor() {
    this.uploadDir = ENV.UPLOAD_DIR;
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  async processUploadedFile(file: Express.Multer.File, baseUrl: string, ownerId: string) {
    // 1. Server-side MIME validation
    const mime = file.mimetype.toLowerCase();
    const isAllowed = ALLOWED_MIME_PREFIXES.some(p => mime.startsWith(p)) && !['image/svg+xml', 'text/html', 'text/javascript'].includes(mime);
    if (!isAllowed) {
      // Remove temporary file
      if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
      const err: any = new Error(`File type '${mime}' is not supported`);
      err.status = 400;
      throw err;
    }

    // 2. Safe random filename without path traversal risk
    const ext = path.extname(file.originalname).toLowerCase().replace(/[^a-z0-9.]/gi, '');
    const safeKey = `${uuidv4()}${ext || ''}`;
    const targetPath = path.join(this.uploadDir, safeKey);

    // 3. Move file to final storage destination
    fs.renameSync(file.path, targetPath);

    await prisma.upload.create({ data: { storageKey: safeKey, ownerId, originalName: file.originalname, mimeType: mime, sizeBytes: file.size } });
    const fileUrl = `${baseUrl}/api/media/files/${safeKey}`;

    return {
      storageKey: safeKey,
      originalName: file.originalname,
      mimeType: file.mimetype,
      sizeBytes: file.size,
      url: fileUrl,
    };
  }

  async getFile(storageKey: string, userId: string) {
    if (!/^[a-zA-Z0-9_.-]+$/.test(storageKey) || storageKey.includes('..')) throw httpError(404, 'File unavailable');
    const upload = await prisma.upload.findUnique({ where: { storageKey } });
    let allowed = upload?.ownerId === userId;
    const attachment = await prisma.attachment.findFirst({ where: { storageKey, message: { isDeleted: false, chat: { members: { some: { userId } } } } } });
    allowed ||= !!attachment;
    if (!allowed) {
      const stories = await prisma.story.findMany({ where: { mediaUrl: { endsWith: `/${storageKey}` }, isArchived: false, expiresAt: { gt: new Date() } } });
      for (const story of stories) if (await maySee(userId, story.authorId, story.privacy)) { allowed = true; break; }
    }
    if (!allowed) {
      const profiles = await prisma.profile.findMany({ where: { avatarUrl: { endsWith: `/${storageKey}` } } });
      for (const p of profiles) if (await maySee(userId, p.userId, p.photoVisibility)) { allowed = true; break; }
    }
    if (!allowed) throw httpError(403, 'File unavailable');
    const filePath = path.resolve(this.uploadDir, storageKey);
    if (!fs.existsSync(filePath)) throw httpError(404, 'File unavailable');
    return { path: filePath, mimeType: upload?.mimeType || attachment?.mimeType || 'application/octet-stream' };
  }

  generateSyntheticWaveform(sampleCount = 32): number[] {
    const waveform: number[] = [];
    for (let i = 0; i < sampleCount; i++) {
      // generate natural speech curve
      const amp = Math.floor(Math.sin(i * 0.4) * 35 + Math.random() * 45 + 20);
      waveform.push(Math.max(10, Math.min(100, amp)));
    }
    return waveform;
  }
}

export const mediaService = new MediaService();
