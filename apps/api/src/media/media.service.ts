import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { ENV } from '../config';

// Allowed MIME prefixes & types
const ALLOWED_MIME_PREFIXES = ['image/', 'video/', 'audio/', 'application/pdf', 'application/zip', 'text/'];

export class MediaService {
  private uploadDir: string;

  constructor() {
    this.uploadDir = ENV.UPLOAD_DIR;
    try {
      if (!fs.existsSync(this.uploadDir)) {
        fs.mkdirSync(this.uploadDir, { recursive: true });
      }
    } catch {
      // Safe on read-only serverless filesystems
    }
  }

  async processUploadedFile(file: Express.Multer.File, baseUrl: string) {
    // 1. Server-side MIME validation
    const mime = file.mimetype.toLowerCase();
    const isAllowed = ALLOWED_MIME_PREFIXES.some(p => mime.startsWith(p));
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

    const fileUrl = `${baseUrl}/uploads/${safeKey}`;

    return {
      storageKey: safeKey,
      originalName: file.originalname,
      mimeType: file.mimetype,
      sizeBytes: file.size,
      url: fileUrl,
    };
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
