import { Request, Response, NextFunction } from 'express';
import { cache } from '../redis';

export function rateLimiter(options: { maxRequests: number; windowSeconds: number; keyPrefix?: string }) {
  const { maxRequests, windowSeconds, keyPrefix = 'rl' } = options;

  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
      const key = `${keyPrefix}:${ip}`;

      const current = await cache.incr(key);
      if (current === 1) {
        await cache.expire(key, windowSeconds);
      }

      if (current > maxRequests) {
        return res.status(429).json({
          success: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: `Too many requests. Please wait ${windowSeconds} seconds.`,
          },
        });
      }

      return next();
    } catch {
      // In case of any rate limiting error, fail open to avoid service disruption
      return next();
    }
  };
}
