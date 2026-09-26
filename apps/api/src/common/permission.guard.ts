import { Request, Response, NextFunction } from 'express';
import { UserRole, Permission } from '@dfz/types';
import { prisma } from '../prisma';
import './auth.guard';

export const ROLE_DEFAULT_PERMISSIONS: Record<string, string[]> = {
  [UserRole.SUPERADMIN]: Object.values(Permission),
  [UserRole.ADMIN]: [
    Permission.STARS_VIEW,
    Permission.STARS_GRANT,
    Permission.STARS_DEBIT,
    Permission.STARS_UNLIMITED,
    Permission.PREMIUM_VIEW,
    Permission.PREMIUM_GRANT,
    Permission.PREMIUM_REVOKE,
    Permission.GIFTS_VIEW,
    Permission.GIFTS_MANAGE,
    Permission.GIFTS_GRANT,
    Permission.COLLECTIBLES_VIEW,
    Permission.COLLECTIBLES_MANAGE,
    Permission.COLLECTIBLES_GRANT,
    Permission.USERS_VIEW,
    Permission.USERS_MANAGE,
    Permission.MODERATION_MANAGE,
    Permission.ECONOMY_MANAGE,
  ],
  [UserRole.MODERATOR]: [
    Permission.USERS_VIEW,
    Permission.MODERATION_MANAGE,
  ],
  [UserRole.USER]: [],
};

export function hasPermission(role: string, userPermissions: string[], required: string): boolean {
  if (role === UserRole.SUPERADMIN) return true;
  const rolePerms = ROLE_DEFAULT_PERMISSIONS[role] || [];
  return rolePerms.includes(required) || userPermissions.includes(required);
}

export function permissionGuard(requiredPermission: Permission | string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      });
    }

    const role = req.user.role;
    if (role === UserRole.SUPERADMIN) {
      return next();
    }

    try {
      // Check role default
      const rolePerms = ROLE_DEFAULT_PERMISSIONS[role] || [];
      if (rolePerms.includes(requiredPermission)) {
        return next();
      }

      // Check custom DB permissions
      const dbPerm = await prisma.userPermission.findUnique({
        where: {
          userId_permission: {
            userId: req.user.userId,
            permission: requiredPermission,
          },
        },
      });

      if (dbPerm) {
        return next();
      }

      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: `Permission denied: ${requiredPermission} is required`,
        },
      });
    } catch (err) {
      next(err);
    }
  };
}
