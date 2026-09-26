import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { ENV } from '../config';
import { prisma } from '../prisma';
import { UserRole, UserStatus, CallStatus } from '@dfz/types';
import { callsService } from '../calls/calls.service';

interface AuthenticatedSocket extends Socket {
  userId: string;
  username: string;
  role: UserRole;
}

export class WebSocketGateway {
  public io: Server;
  private onlineUsers = new Map<string, Set<string>>(); // userId -> Set of socketIds

  constructor(server: HttpServer) {
    this.io = new Server(server, {
      cors: {
        origin: [ENV.CLIENT_URL, 'http://localhost:3000', 'http://127.0.0.1:3000'],
        credentials: true,
      },
      pingTimeout: 30000,
      pingInterval: 10000,
    });

    this.setupAuthMiddleware();
    this.setupEventHandlers();
  }

  private setupAuthMiddleware() {
    this.io.use(async (socket: Socket, next) => {
      try {
        let token = socket.handshake.auth?.token;

        if (!token && socket.handshake.headers.cookie) {
          const cookies = socket.handshake.headers.cookie.split(';').reduce((res, item) => {
            const data = item.trim().split('=');
            if (data.length === 2) res[data[0]] = decodeURIComponent(data[1]);
            return res;
          }, {} as Record<string, string>);
          token = cookies['dfz_access_token'];
        }

        if (!token) {
          return next(new Error('Authentication token missing'));
        }

        const decoded = jwt.verify(token, ENV.JWT_ACCESS_SECRET) as {
          userId: string;
          username: string;
          role: UserRole;
        };

        const user = await prisma.user.findUnique({
          where: { id: decoded.userId },
          select: { id: true, username: true, role: true, isBanned: true },
        });

        if (!user || user.isBanned) {
          return next(new Error('User suspended or not found'));
        }

        (socket as AuthenticatedSocket).userId = user.id;
        (socket as AuthenticatedSocket).username = user.username;
        (socket as AuthenticatedSocket).role = user.role as UserRole;

        return next();
      } catch (err) {
        return next(new Error('Invalid socket credentials'));
      }
    });
  }

  private setupEventHandlers() {
    this.io.on('connection', (rawSocket: Socket) => {
      const socket = rawSocket as AuthenticatedSocket;
      const userId = socket.userId;
      const username = socket.username;

      // Register connection in online users map
      let userSockets = this.onlineUsers.get(userId);
      if (!userSockets) {
        userSockets = new Set();
        this.onlineUsers.set(userId, userSockets);
      }
      userSockets.add(socket.id);

      // Join individual user channel for direct alerts & signaling
      socket.join(`user:${userId}`);

      // Broadcast user online status
      this.io.emit('presence:update', {
        userId,
        status: UserStatus.ONLINE,
      });

      // 1. Join Chat room
      socket.on('chat:join', async (chatId: string) => {
        if (!chatId) return;
        socket.join(`chat:${chatId}`);
      });

      // 2. Leave Chat room
      socket.on('chat:leave', (chatId: string) => {
        if (!chatId) return;
        socket.leave(`chat:${chatId}`);
      });

      // 3. Typing indicator
      socket.on('chat:typing', (data: { chatId: string; isTyping: boolean }) => {
        if (!data?.chatId) return;
        socket.to(`chat:${data.chatId}`).emit('chat:typing', {
          chatId: data.chatId,
          userId,
          username,
          isTyping: data.isTyping,
        });
      });

      // 4. Message events
      socket.on('message:send', (data: any) => {
        if (!data?.chatId) return;
        this.io.to(`chat:${data.chatId}`).emit('message:new', data);
      });

      socket.on('message:receipt', (data: { chatId: string; messageIds: string[]; status: string }) => {
        if (!data?.chatId) return;
        socket.to(`chat:${data.chatId}`).emit('message:receipt', {
          ...data,
          userId,
        });
      });

      socket.on('reaction:update', (data: { chatId: string; messageId: string; emoji: string; action: 'add' | 'remove' }) => {
        if (!data?.chatId) return;
        this.io.to(`chat:${data.chatId}`).emit('reaction:update', {
          ...data,
          userId,
          username,
        });
      });

      // 5. WebRTC Calling Signaling
      socket.on('call:initiate', async (payload: {
        chatId: string;
        receiverId: string;
        callType: 'AUDIO' | 'VIDEO';
      }) => {
        try {
          const perm = await callsService.checkCallPermission(userId, payload.receiverId);
          if (!perm.allowed) {
            socket.emit('call:error', { message: perm.reason || 'Звонок недоступен' });
            return;
          }

          const callRecord = await callsService.logCallStart({
            chatId: payload.chatId,
            callerId: userId,
            receiverId: payload.receiverId,
            type: payload.callType as any,
          });

          this.io.to(`user:${payload.receiverId}`).emit('call:incoming', {
            callId: callRecord.id,
            chatId: payload.chatId,
            callerId: userId,
            callerUsername: username,
            callType: payload.callType,
          });
        } catch (err: any) {
          socket.emit('call:error', { message: err.message || 'Ошибка инициализации звонка' });
        }
      });

      socket.on('call:accept', async (payload: { callerId: string; callId: string }) => {
        try {
          await callsService.updateCallStatus(payload.callId, CallStatus.CONNECTED);
        } catch {}
        this.io.to(`user:${payload.callerId}`).emit('call:accepted', {
          receiverId: userId,
          callId: payload.callId,
        });
      });

      socket.on('call:reject', async (payload: { callerId: string; callId: string }) => {
        try {
          await callsService.updateCallStatus(payload.callId, CallStatus.REJECTED);
        } catch {}
        this.io.to(`user:${payload.callerId}`).emit('call:rejected', {
          receiverId: userId,
          callId: payload.callId,
        });
      });

      socket.on('call:end', async (payload: { targetUserId: string; callId?: string; durationSeconds?: number }) => {
        try {
          if (payload.callId) {
            await callsService.updateCallStatus(payload.callId, CallStatus.ENDED, payload.durationSeconds || 0);
          }
        } catch {}
        this.io.to(`user:${payload.targetUserId}`).emit('call:ended', {
          userId,
        });
      });

      socket.on('call:signal', (payload: {
        targetUserId: string;
        signal: any;
      }) => {
        this.io.to(`user:${payload.targetUserId}`).emit('call:signal', {
          senderId: userId,
          signal: payload.signal,
        });
      });

      // Disconnect handling
      socket.on('disconnect', async () => {
        const sockets = this.onlineUsers.get(userId);
        if (sockets) {
          sockets.delete(socket.id);
          if (sockets.size === 0) {
            this.onlineUsers.delete(userId);

            const now = new Date();
            await prisma.profile.updateMany({
              where: { userId },
              data: { lastSeenAt: now },
            }).catch(() => null);

            this.io.emit('presence:update', {
              userId,
              status: UserStatus.OFFLINE,
              lastSeenAt: now.toISOString(),
            });
          }
        }
      });
    });
  }

  public notifyUser(userId: string, event: string, data: any) {
    this.io.to(`user:${userId}`).emit(event, data);
  }

  public broadcastToChat(chatId: string, event: string, data: any) {
    this.io.to(`chat:${chatId}`).emit(event, data);
  }
}

export let gatewayInstance: WebSocketGateway | null = null;

export function initWebSocketGateway(server: HttpServer): WebSocketGateway {
  gatewayInstance = new WebSocketGateway(server);
  return gatewayInstance;
}
