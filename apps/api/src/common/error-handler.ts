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
    return res.status(400).json({
      success: false,
      error: {
        code: 'UPLOAD_ERROR',
        message: err.message,
      },
    });
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
