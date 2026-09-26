import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ENV } from '../config';
import { prisma } from '../prisma';
import { UserRole } from '@dfz/types';

export interface AuthUserPayload {
  id: string;
  userId: string;
  username: string;
  role: UserRole;
  sessionId?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUserPayload;
      token?: string;
    }
  }
}

export async function authGuard(req: Request, res: Response, next: NextFunction) {
  try {
    let token = req.cookies?.dfz_access_token;

    if (!token && req.headers.authorization) {
      const parts = req.headers.authorization.split(' ');
      if (parts.length === 2 && parts[0] === 'Bearer') {
        token = parts[1];
      }
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      });
    }

    const decoded = jwt.verify(token, ENV.JWT_ACCESS_SECRET) as AuthUserPayload;

    // Check if user is banned or deleted
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, username: true, role: true, isBanned: true, bannedReason: true },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        error: { code: 'USER_NOT_FOUND', message: 'User account no longer exists' },
      });
    }

    if (user.isBanned) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'ACCOUNT_BANNED',
          message: user.bannedReason || 'This account has been suspended for violating terms of service',
        },
      });
    }

    req.user = {
      id: user.id,
      userId: user.id,
      username: user.username,
      role: user.role as UserRole,
      sessionId: decoded.sessionId,
    };
    req.token = token;

    return next();
  } catch (err: any) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: { code: 'TOKEN_EXPIRED', message: 'Session expired, please refresh token' },
      });
    }
    return res.status(401).json({
      success: false,
      error: { code: 'INVALID_TOKEN', message: 'Invalid authentication credentials' },
    });
  }
}
