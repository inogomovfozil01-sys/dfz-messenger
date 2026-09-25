import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import os from 'os';
import { mediaService } from './media.service';
import { authGuard } from '../common/auth.guard';
import { LIMITS } from '@dfz/config';

export const mediaRouter = Router();

const upload = multer({
  dest: os.tmpdir(),
  limits: {
    fileSize: LIMITS.maxUploadSizeBytes,
  },
});

mediaRouter.use(authGuard);

// 1. Upload single file
mediaRouter.post('/upload', upload.single('file'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: { message: 'No file uploaded' } });
    }

    const host = req.get('host') || 'localhost:4000';
    const protocol = req.protocol === 'https' ? 'https' : 'http';
    const baseUrl = `${protocol}://${host}`;

    const attachment = await mediaService.processUploadedFile(req.file, baseUrl);

    return res.status(201).json({
      success: true,
      data: attachment,
    });
  } catch (err) {
    next(err);
  }
});

// 2. Upload multiple files
mediaRouter.post('/upload-multiple', upload.array('files', 10), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const files = req.files as Express.Multer.File[];
    if (!files || !files.length) {
      return res.status(400).json({ success: false, error: { message: 'No files uploaded' } });
    }

    const host = req.get('host') || 'localhost:4000';
    const protocol = req.protocol === 'https' ? 'https' : 'http';
    const baseUrl = `${protocol}://${host}`;

    const attachments = await Promise.all(
      files.map(f => mediaService.processUploadedFile(f, baseUrl))
    );

    return res.status(201).json({
      success: true,
      data: attachments,
    });
  } catch (err) {
    next(err);
  }
});

// 3. Upload voice recording
mediaRouter.post('/voice', upload.single('audio'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: { message: 'No voice file uploaded' } });
    }

    const host = req.get('host') || 'localhost:4000';
    const protocol = req.protocol === 'https' ? 'https' : 'http';
    const baseUrl = `${protocol}://${host}`;

    const attachment = await mediaService.processUploadedFile(req.file, baseUrl);
    const duration = req.body.duration ? parseInt(req.body.duration, 10) : 0;
    const waveform = mediaService.generateSyntheticWaveform(32);

    return res.status(201).json({
      success: true,
      data: {
        ...attachment,
        duration,
        waveform,
      },
    });
  } catch (err) {
    next(err);
  }
});
