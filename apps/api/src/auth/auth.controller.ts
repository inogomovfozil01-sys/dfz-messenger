import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authService } from './auth.service';
import { authGuard } from '../common/auth.guard';
import { rateLimiter } from '../common/rate-limiter';
import { ENV } from '../config';

export const authRouter = Router();

// Validation Schemas
const registerSchema = z.object({
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(32, 'Username cannot exceed 32 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
  password: z
    .string()
    .min(6, 'Password must be at least 6 characters')
    .max(100, 'Password is too long'),
  email: z.string().email('Invalid email address').optional().nullable(),
  displayName: z.string().max(64).optional(),
  bio: z.string().max(200).optional(),
  deviceName: z.string().optional(),
});

const loginSchema = z.object({
  usernameOrEmail: z.string().min(1, 'Username or email is required'),
  password: z.string().min(1, 'Password is required'),
  deviceName: z.string().optional(),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6).max(100),
});

// Cookie helper
function setAuthCookies(res: Response, tokens: { accessToken: string; refreshToken: string }) {
  const isProd = ENV.NODE_ENV === 'production';
  const cookieOptions = {
    httpOnly: true,
    secure: ENV.COOKIE_SECURE || isProd,
    sameSite: ENV.COOKIE_SAME_SITE,
  };

  res.cookie('dfz_access_token', tokens.accessToken, {
    ...cookieOptions,
    maxAge: 15 * 60 * 1000, // 15 mins
  });

  res.cookie('dfz_refresh_token', tokens.refreshToken, {
    ...cookieOptions,
    maxAge: ENV.JWT_REFRESH_EXPIRES_IN_DAYS * 24 * 60 * 60 * 1000,
  });
}

function clearAuthCookies(res: Response) {
  res.clearCookie('dfz_access_token');
  res.clearCookie('dfz_refresh_token');
}

// 1. Register
authRouter.post(
  '/register',
  rateLimiter({ maxRequests: 10, windowSeconds: 60, keyPrefix: 'rl_auth_reg' }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = registerSchema.parse(req.body);
      const userAgent = req.headers['user-agent'];
      const ipAddress = req.ip || req.socket.remoteAddress;

      const result = await authService.register({
        ...data,
        email: data.email || undefined,
        userAgent,
        ipAddress,
      });

      setAuthCookies(res, result);

      return res.status(201).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }
);

// 2. Login
authRouter.post(
  '/login',
  rateLimiter({ maxRequests: 15, windowSeconds: 60, keyPrefix: 'rl_auth_login' }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = loginSchema.parse(req.body);
      const userAgent = req.headers['user-agent'];
      const ipAddress = req.ip || req.socket.remoteAddress;

      const result = await authService.login({
        ...data,
        userAgent,
        ipAddress,
      });

      setAuthCookies(res, result);

      return res.json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }
);

// 3. Refresh Token
authRouter.post('/refresh', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const refreshToken = req.cookies?.dfz_refresh_token || req.body?.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        error: { code: 'NO_REFRESH_TOKEN', message: 'Refresh token not found' },
      });
    }

    const tokens = await authService.refreshTokens(refreshToken);
    setAuthCookies(res, tokens);

    return res.json({
      success: true,
      data: tokens,
    });
  } catch (err) {
    clearAuthCookies(res);
    next(err);
  }
});

// 4. Logout
authRouter.post('/logout', authGuard, async (req: Request, res: Response, next: NextFunction) => {
  try {
    await authService.logout(req.user?.sessionId);
    clearAuthCookies(res);

    return res.json({
      success: true,
      data: { message: 'Logged out successfully' },
    });
  } catch (err) {
    next(err);
  }
});

// 5. Current User (me)
authRouter.get('/me', authGuard, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await authService.getMe(req.user!.userId);
    return res.json({
      success: true,
      data: { user, currentSessionId: req.user?.sessionId },
    });
  } catch (err) {
    next(err);
  }
});

// 6. Active Sessions
authRouter.get('/sessions', authGuard, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sessions = await authService.getUserSessions(req.user!.userId, req.user?.sessionId);
    return res.json({
      success: true,
      data: sessions,
    });
  } catch (err) {
    next(err);
  }
});

// 7. Terminate specific session
authRouter.delete('/sessions/:id', authGuard, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await authService.terminateSession(req.user!.userId, req.params.id);
    return res.json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
});

// 8. Terminate other sessions
authRouter.post('/sessions/others', authGuard, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user?.sessionId) {
      return res.status(400).json({ success: false, error: { message: 'Current session ID not detected' } });
    }
    const result = await authService.terminateOtherSessions(req.user!.userId, req.user.sessionId);
    return res.json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
});

// 9. Change Password
authRouter.post('/change-password', authGuard, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);
    const result = await authService.changePassword(req.user!.userId, currentPassword, newPassword);
    return res.json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
});
