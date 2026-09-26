import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export function errorHandler(err: any, req: Request, res: Response, _next: NextFunction) {
  // Handle Zod validation errors
  if (err instanceof ZodError) {
    const details = err.errors.map(e => ({
      field: e.path.join('.'),
      message: e.message,
    }));
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request data provided',
        details,
      },
    });
  }

  // Handle Multer upload errors
  if (err.name === 'MulterError') {
    return res.status(err.code === 'LIMIT_FILE_SIZE' ? 413 : 400).json({
      success: false,
      error: {
        code: 'UPLOAD_ERROR',
        message: err.message,
      },
    });
  }

  if (err.code === 'P2002' || err.code === 'P2025') {
    return res.status(err.code === 'P2002' ? 409 : 404).json({ success: false, error: { code: err.code === 'P2002' ? 'CONFLICT' : 'NOT_FOUND', message: err.code === 'P2002' ? 'Запись уже существует' : 'Запись не найдена' } });
  }

  // Handle standard HTTP status errors
  const status = typeof err.status === 'number' ? err.status : 500;
  const message = status === 500 ? 'Internal server error occurred' : err.message || 'An error occurred';
  const code = err.code || 'SERVER_ERROR';

  if (status === 500) {
    console.error('Unhandled Server Error:', {
      url: req.originalUrl,
      method: req.method,
      error: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    });
  }

  return res.status(status).json({
    success: false,
    error: {
      code,
      message,
    },
  });
}
