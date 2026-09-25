import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../prisma';
import { ENV } from '../config';
import { UserRole, ChatType, MemberRole } from '@dfz/types';

export class AuthService {
  async register(input: {
    username: string;
    password: string;
    email?: string;
    displayName?: string;
    bio?: string;
    userAgent?: string;
    ipAddress?: string;
    deviceName?: string;
  }) {
    const cleanUsername = input.username.trim().toLowerCase();
    
    // Check if username taken
    const existing = await prisma.user.findUnique({
      where: { username: cleanUsername },
    });
    if (existing) {
      const err: any = new Error('Username is already taken');
      err.status = 409;
      err.code = 'USERNAME_TAKEN';
      throw err;
    }

    if (input.email) {
      const existingEmail = await prisma.user.findUnique({
        where: { email: input.email.trim().toLowerCase() },
      });
      if (existingEmail) {
        const err: any = new Error('Email is already registered');
        err.status = 409;
        err.code = 'EMAIL_TAKEN';
        throw err;
      }
    }

    // Password hash
    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(input.password, salt);

    // Create user with profile and credential
    const user = await prisma.user.create({
      data: {
        username: cleanUsername,
        email: input.email ? input.email.trim().toLowerCase() : null,
        credential: {
          create: {
            passwordHash,
          },
        },
        profile: {
          create: {
            displayName: input.displayName || input.username,
            bio: input.bio || null,
          },
        },
      },
      include: {
        profile: true,
      },
    });

    // Auto-create personal "Saved Messages" chat
    await prisma.chat.create({
      data: {
        type: ChatType.SAVED,
        title: 'Saved Messages',
        ownerId: user.id,
        members: {
          create: {
            userId: user.id,
            role: MemberRole.OWNER,
          },
        },
      },
    });

    // Create initial session
    const session = await this.createSession(user.id, {
      userAgent: input.userAgent,
      ipAddress: input.ipAddress,
      deviceName: input.deviceName,
    });

    const tokens = this.generateTokens(user.id, user.username, user.role as UserRole, session.id);

    return {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        profile: user.profile,
        createdAt: user.createdAt,
      },
      session: {
        id: session.id,
        deviceName: session.deviceName,
      },
      ...tokens,
    };
  }

  async login(input: {
    usernameOrEmail: string;
    password: string;
    userAgent?: string;
    ipAddress?: string;
    deviceName?: string;
  }) {
    const query = input.usernameOrEmail.trim().toLowerCase();
    
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { username: query },
          { email: query },
        ],
      },
      include: {
        credential: true,
        profile: true,
      },
    });

    if (!user || !user.credential) {
      const err: any = new Error('Invalid username or password');
      err.status = 401;
      err.code = 'INVALID_CREDENTIALS';
      throw err;
    }

    if (user.isBanned) {
      const err: any = new Error(user.bannedReason || 'This account has been banned');
      err.status = 403;
      err.code = 'ACCOUNT_BANNED';
      throw err;
    }

    const isMatch = await bcrypt.compare(input.password, user.credential.passwordHash);
    if (!isMatch) {
      const err: any = new Error('Invalid username or password');
      err.status = 401;
      err.code = 'INVALID_CREDENTIALS';
      throw err;
    }

    const session = await this.createSession(user.id, {
      userAgent: input.userAgent,
      ipAddress: input.ipAddress,
      deviceName: input.deviceName,
    });

    const tokens = this.generateTokens(user.id, user.username, user.role as UserRole, session.id);

    return {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        profile: user.profile,
        createdAt: user.createdAt,
      },
      session: {
        id: session.id,
        deviceName: session.deviceName,
      },
      ...tokens,
    };
  }

  async refreshTokens(refreshToken: string) {
    try {
      const decoded = jwt.verify(refreshToken, ENV.JWT_REFRESH_SECRET) as {
        userId: string;
        sessionId: string;
      };

      const session = await prisma.session.findUnique({
        where: { id: decoded.sessionId },
        include: { user: true },
      });

      if (!session || session.isRevoked || new Date() > session.expiresAt || session.user.isBanned) {
        const err: any = new Error('Session is invalid or revoked');
        err.status = 401;
        err.code = 'INVALID_SESSION';
        throw err;
      }

      // Update session activity
      await prisma.session.update({
        where: { id: session.id },
        data: { lastActiveAt: new Date() },
      });

      return this.generateTokens(
        session.user.id,
        session.user.username,
        session.user.role as UserRole,
        session.id
      );
    } catch (error: any) {
      const err: any = new Error('Invalid refresh token');
      err.status = 401;
      err.code = 'INVALID_REFRESH_TOKEN';
      throw err;
    }
  }

  async logout(sessionId?: string) {
    if (sessionId) {
      await prisma.session.update({
        where: { id: sessionId },
        data: { isRevoked: true },
      }).catch(() => null);
    }
  }

  async getUserSessions(userId: string, currentSessionId?: string) {
    const sessions = await prisma.session.findMany({
      where: {
        userId,
        isRevoked: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { lastActiveAt: 'desc' },
    });

    return sessions.map(s => ({
      id: s.id,
      deviceName: s.deviceName || 'Web Client',
      browser: s.browser || 'Browser',
      os: s.os || 'Desktop / Mobile',
      ipAddress: s.ipAddress || 'unknown',
      lastActiveAt: s.lastActiveAt.toISOString(),
      createdAt: s.createdAt.toISOString(),
      isCurrent: s.id === currentSessionId,
    }));
  }

  async terminateSession(userId: string, sessionIdToRevoke: string) {
    const session = await prisma.session.findFirst({
      where: { id: sessionIdToRevoke, userId },
    });

    if (!session) {
      const err: any = new Error('Session not found');
      err.status = 404;
      err.code = 'SESSION_NOT_FOUND';
      throw err;
    }

    await prisma.session.update({
      where: { id: sessionIdToRevoke },
      data: { isRevoked: true },
    });

    return { message: 'Session terminated' };
  }

  async terminateOtherSessions(userId: string, currentSessionId: string) {
    await prisma.session.updateMany({
      where: {
        userId,
        id: { not: currentSessionId },
        isRevoked: false,
      },
      data: { isRevoked: true },
    });

    return { message: 'All other sessions terminated' };
  }

  async changePassword(userId: string, currentPass: string, newPass: string) {
    const credential = await prisma.credential.findUnique({
      where: { userId },
    });

    if (!credential) {
      const err: any = new Error('User credentials not found');
      err.status = 404;
      throw err;
    }

    const isMatch = await bcrypt.compare(currentPass, credential.passwordHash);
    if (!isMatch) {
      const err: any = new Error('Incorrect current password');
      err.status = 400;
      err.code = 'PASSWORD_MISMATCH';
      throw err;
    }

    const salt = await bcrypt.genSalt(12);
    const newHash = await bcrypt.hash(newPass, salt);

    await prisma.credential.update({
      where: { userId },
      data: { passwordHash: newHash },
    });

    return { message: 'Password updated successfully' };
  }

  async getMe(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });

    if (!user) {
      const err: any = new Error('User not found');
      err.status = 404;
      throw err;
    }

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      phone: user.phone,
      role: user.role,
      isBanned: user.isBanned,
      twoFactorEnabled: user.twoFactorEnabled,
      createdAt: user.createdAt.toISOString(),
      profile: user.profile ? {
        id: user.profile.id,
        userId: user.profile.userId,
        displayName: user.profile.displayName,
        bio: user.profile.bio,
        avatarUrl: user.profile.avatarUrl,
        lastSeenAt: user.profile.lastSeenAt?.toISOString() || null,
        lastSeenVisibility: user.profile.lastSeenVisibility,
        messageVisibility: user.profile.messageVisibility,
        callVisibility: user.profile.callVisibility,
        groupAddVisibility: user.profile.groupAddVisibility,
        photoVisibility: user.profile.photoVisibility,
        theme: user.profile.theme,
        language: user.profile.language,
      } : null,
    };
  }

  private async createSession(userId: string, meta: { userAgent?: string; ipAddress?: string; deviceName?: string }) {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + ENV.JWT_REFRESH_EXPIRES_IN_DAYS);

    // Simple userAgent parser
    let browser = 'Browser';
    let os = 'OS';
    const ua = meta.userAgent || '';
    if (ua.includes('Chrome')) browser = 'Chrome';
    else if (ua.includes('Firefox')) browser = 'Firefox';
    else if (ua.includes('Safari')) browser = 'Safari';
    else if (ua.includes('Edge')) browser = 'Edge';

    if (ua.includes('Windows')) os = 'Windows';
    else if (ua.includes('Macintosh')) os = 'macOS';
    else if (ua.includes('Android')) os = 'Android';
    else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';
    else if (ua.includes('Linux')) os = 'Linux';

    const deviceName = meta.deviceName || `${browser} on ${os}`;

    return prisma.session.create({
      data: {
        userId,
        tokenHash: uuidv4(),
        userAgent: meta.userAgent,
        ipAddress: meta.ipAddress,
        deviceName,
        browser,
        os,
        expiresAt,
      },
    });
  }

  private generateTokens(userId: string, username: string, role: UserRole, sessionId: string) {
    const accessToken = jwt.sign(
      { userId, username, role, sessionId },
      ENV.JWT_ACCESS_SECRET,
      { expiresIn: '15m' }
    );

    const refreshToken = jwt.sign(
      { userId, sessionId },
      ENV.JWT_REFRESH_SECRET,
      { expiresIn: `${ENV.JWT_REFRESH_EXPIRES_IN_DAYS}d` }
    );

    return {
      accessToken,
      refreshToken,
      expiresIn: 900, // 15 mins in seconds
    };
  }
}

export const authService = new AuthService();
