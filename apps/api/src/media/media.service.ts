import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { ENV } from '../config';
import { prisma } from '../prisma';
import { httpError, maySee } from '../common/access';

// Inspect container signatures instead of trusting the multipart Content-Type.
export function detectMediaType(bytes: Buffer, declared: string): { mime: string; ext: string } | null {
  const hex = bytes.toString('hex');
  const ascii = bytes.toString('ascii');
  if (hex.startsWith('89504e470d0a1a0a')) return { mime: 'image/png', ext: '.png' };
  if (hex.startsWith('ffd8ff')) return { mime: 'image/jpeg', ext: '.jpg' };
  if (/^GIF8[79]a/.test(ascii)) return { mime: 'image/gif', ext: '.gif' };
  if (ascii.startsWith('RIFF') && ascii.slice(8, 12) === 'WEBP') return { mime: 'image/webp', ext: '.webp' };
  if (ascii.startsWith('RIFF') && ascii.slice(8, 12) === 'WAVE') return { mime: 'audio/wav', ext: '.wav' };
  if (ascii.startsWith('OggS')) return { mime: 'audio/ogg', ext: '.ogg' };
  if (ascii.startsWith('ID3') || (bytes[0] === 255 && (bytes[1] & 0xe0) === 0xe0)) return { mime: 'audio/mpeg', ext: '.mp3' };
  if (hex.startsWith('1a45dfa3')) return { mime: declared.startsWith('audio/') ? 'audio/webm' : 'video/webm', ext: '.webm' };
  if (ascii.slice(4, 8) === 'ftyp') return { mime: declared.startsWith('audio/') ? 'audio/mp4' : 'video/mp4', ext: '.mp4' };
  if (ascii.startsWith('%PDF-')) return { mime: 'application/pdf', ext: '.pdf' };
  if (/^504b(0304|0506|0708)/.test(hex)) return { mime: 'application/zip', ext: '.zip' };
  if (['text/plain', 'text/csv'].includes(declared) && !bytes.includes(0) && !bytes.toString('utf8').includes('\uFFFD')) return { mime: declared, ext: declared === 'text/csv' ? '.csv' : '.txt' };
  return null;
}

export async function requireOwnedMedia(userId: string, url?: string) {
  if (!url) return;
  let key: string;
  try {
    const parsed = new URL(url, 'http://dfz.local');
    const match = parsed.pathname.match(/^\/(?:api\/media\/files|uploads)\/([a-zA-Z0-9_.-]+)$/);
    if (!match || parsed.search || parsed.hash) throw new Error();
    key = match[1];
  } catch { throw httpError(400, 'Use a file uploaded to DFZ'); }
  if (!await prisma.upload.findFirst({ where: { storageKey: key, ownerId: userId } })) throw httpError(403, 'Upload ownership required');
}

export class MediaService {
  private uploadDir: string;

  constructor() {
    this.uploadDir = ENV.UPLOAD_DIR;
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  async processUploadedFile(file: Express.Multer.File, _baseUrl: string, ownerId: string) {
    // 1. Server-side MIME validation
    const head = Buffer.alloc(Math.min(file.size, 4096));
    const fd = fs.openSync(file.path, 'r');
    try { fs.readSync(fd, head, 0, head.length, 0); } finally { fs.closeSync(fd); }
    const detected = detectMediaType(head, file.mimetype.toLowerCase().split(';')[0]);
    if (!detected) {
      // Remove temporary file
      if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
      const err: any = new Error('Unsupported or invalid file content');
      err.status = 400;
      throw err;
    }

    // 2. Safe random filename without path traversal risk
    const mime = detected.mime;
    const safeKey = `${uuidv4()}${detected.ext}`;
    const targetPath = path.join(this.uploadDir, safeKey);

    // 3. Move file to final storage destination (safe across filesystems/mount points)
    try {
      fs.copyFileSync(file.path, targetPath);
      try {
        fs.unlinkSync(file.path);
      } catch {}
    } catch {
      fs.renameSync(file.path, targetPath);
    }

    try {
      await prisma.upload.create({ data: { storageKey: safeKey, ownerId, originalName: file.originalname, mimeType: mime, sizeBytes: file.size } });
    } catch (error) {
      fs.unlinkSync(targetPath);
      throw error;
    }
    // Resolve through the public API origin, never the proxy's internal Host.
    const fileUrl = `/api/media/files/${safeKey}`;

    return {
      storageKey: safeKey,
      originalName: file.originalname,
      mimeType: mime,
      sizeBytes: file.size,
      url: fileUrl,
    };
  }

  async getFile(storageKey: string, userId?: string) {
    if (!userId) throw httpError(401, 'Authentication required');
    if (!/^[a-zA-Z0-9_.-]+$/.test(storageKey) || storageKey.includes('..')) {
      throw httpError(404, 'File unavailable');
    }
    const upload = await prisma.upload.findUnique({ where: { storageKey } });
    if (!upload) throw httpError(404, 'File unavailable');
    let allowed = upload.ownerId === userId;
    if (!allowed) {
      const attachments = await prisma.attachment.findMany({
        where: { storageKey, message: { isDeleted: false, chat: { members: { some: { userId } } } } },
        select: { message: { select: { createdAt: true, chat: { select: { members: { where: { userId }, select: { clearedAt: true } } } } } } },
      });
      allowed = attachments.some(a => !a.message.chat.members[0].clearedAt || a.message.createdAt > a.message.chat.members[0].clearedAt);
    }
    const urls = [`/api/media/files/${storageKey}`, `/uploads/${storageKey}`];
    if (!allowed) {
      const profile = await prisma.profile.findUnique({ where: { userId: upload.ownerId } });
      allowed = !!profile?.avatarUrl && urls.some(url => profile.avatarUrl!.endsWith(url)) && await maySee(userId, upload.ownerId, profile.photoVisibility);
    }
    if (!allowed) {
      const chat = await prisma.chat.findFirst({ where: { OR: urls.map(url => ({ avatarUrl: { endsWith: url } })), members: { some: { userId } } } });
      allowed = !!chat;
    }
    if (!allowed) {
      const stories = await prisma.story.findMany({ where: { authorId: upload.ownerId, OR: urls.map(url => ({ mediaUrl: { endsWith: url } })), isArchived: false, expiresAt: { gt: new Date() } } });
      for (const story of stories) if (await maySee(userId, story.authorId, story.privacy)) { allowed = true; break; }
    }
    if (!allowed) throw httpError(404, 'File unavailable');
    const filePath = path.resolve(this.uploadDir, storageKey);
    if (!fs.existsSync(filePath)) {
      throw httpError(404, 'File unavailable');
    }
    return { path: filePath, mimeType: upload.mimeType };
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
