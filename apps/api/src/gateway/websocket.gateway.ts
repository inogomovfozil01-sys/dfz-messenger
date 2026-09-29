import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { ENV } from '../config';
import { prisma } from '../prisma';
import { CallStatus } from '@dfz/types';
import { callsService } from '../calls/calls.service';
import { requireSession, requireMember, requirePosting, requireCommunication, maySee, httpError } from '../common/access';

export class WebSocketGateway {
  public io: Server;
  private onlineUsers = new Map<string, Set<string>>();
  constructor(server: HttpServer) {
    const origins = [ENV.CLIENT_URL, ...(ENV.NODE_ENV === 'production' ? [] : ['http://localhost:3000', 'http://127.0.0.1:3000'])];
    this.io = new Server(server, {
      cors: { origin: origins, credentials: true }, maxHttpBufferSize: 65536,
      allowRequest: (req, callback) => callback(null, !req.headers.origin || origins.includes(req.headers.origin)),
    });
    this.io.use(async (socket, next) => {
      try {
        const cookies = Object.fromEntries((socket.handshake.headers.cookie || '').split(';').filter(s => s.includes('=')).map(s => { const i = s.indexOf('='); return [s.slice(0, i).trim(), decodeURIComponent(s.slice(i + 1))]; }));
        const decoded = jwt.verify(socket.handshake.auth?.token || cookies.dfz_access_token || '', ENV.JWT_ACCESS_SECRET) as { userId: string; sessionId: string; exp: number };
        await requireSession(decoded.userId, decoded.sessionId);
        socket.data = decoded;
        next();
      } catch { next(new Error('Session unavailable')); }
    });
    this.io.on('connection', socket => {
      const userId: string = socket.data.userId;
      const sessions = this.onlineUsers.get(userId) || new Set<string>();
      sessions.add(socket.id); this.onlineUsers.set(userId, sessions);
      socket.join(`user:${userId}`);
      const expiry = setTimeout(() => socket.disconnect(true), Math.max(1, socket.data.exp * 1000 - Date.now()));
      const sessionCheck = setInterval(() => { requireSession(userId, socket.data.sessionId).catch(() => socket.disconnect(true)); }, 15000);
      void this.publishPresence(userId, 'ONLINE');
      let windowStart = Date.now(), eventCount = 0;
      socket.use(async (_packet, next) => {
        try {
          if (Date.now() - windowStart > 10000) { windowStart = Date.now(); eventCount = 0; }
          if (++eventCount > 100) throw httpError(429, 'Too many events');
          await requireSession(userId, socket.data.sessionId);
          next();
        } catch { socket.disconnect(true); }
      });
      const handle = (event: string, fn: (data: any) => Promise<void>) => socket.on(event, (data: any) => {
        Promise.resolve().then(() => fn(data)).catch(() => socket.emit(event.startsWith('call:') ? 'call:error' : 'operation:error', { message: 'Операция недоступна', event }));
      });
      handle('chat:join', async chatId => { await requireMember(chatId, userId); await socket.join(`chat:${chatId}`); });
      handle('chat:leave', async chatId => { if (typeof chatId === 'string') await socket.leave(`chat:${chatId}`); });
      handle('chat:typing', async data => {
        await requirePosting(data.chatId, userId);
        const user = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { username: true } });
        socket.to(`chat:${data.chatId}`).emit('chat:typing', { chatId: data.chatId, userId, username: user.username, isTyping: data.isTyping === true });
      });
      // Persisted messages, reactions and receipts are published exclusively by HTTP handlers.
      handle('call:initiate', async data => {
        if (!['AUDIO', 'VIDEO'].includes(data.callType)) throw httpError(400, 'Invalid call type');
        const busy = await prisma.call.findFirst({ where: { status: { in: ['RINGING', 'CONNECTED'] }, OR: [{ callerId: userId }, { receiverId: userId }, { callerId: data.receiverId }, { receiverId: data.receiverId }], createdAt: { gt: new Date(Date.now() - 120000) } } });
        if (busy) throw httpError(409, 'User is busy');
        const call = await callsService.logCallStart({ chatId: data.chatId, callerId: userId, receiverId: data.receiverId, type: data.callType });
        const user = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { username: true } });
        this.notifyUser(data.receiverId, 'call:incoming', { callId: call.id, chatId: call.chatId, callerId: userId, callerUsername: user.username, callType: call.type });
        this.notifyUser(userId, 'call:outgoing', { callId: call.id });
        const timeout = setTimeout(async () => {
          const result = await prisma.call.updateMany({ where: { id: call.id, status: 'RINGING' }, data: { status: 'MISSED', endedAt: new Date() } }).catch(() => null);
          if (result?.count) { this.notifyUser(userId, 'call:ended', { callId: call.id }); this.notifyUser(data.receiverId, 'call:ended', { callId: call.id }); }
        }, 45000); timeout.unref();
      });
      for (const event of ['call:accept', 'call:reject']) handle(event, async data => {
        const call = await prisma.call.findFirst({ where: { id: data.callId, receiverId: userId, status: 'RINGING' } });
        if (!call) throw httpError(403, 'Call unavailable');
        await requireCommunication(call.callerId, userId, 'callVisibility');
        await callsService.updateCallStatus(call.id, event === 'call:accept' ? CallStatus.CONNECTED : CallStatus.REJECTED);
        this.notifyUser(call.callerId, event === 'call:accept' ? 'call:accepted' : 'call:rejected', { receiverId: userId, callId: call.id });
      });
      handle('call:end', async data => {
        const call = await this.activeCall(userId, data.targetUserId, data.callId);
        await callsService.updateCallStatus(call.id, CallStatus.ENDED, call.startedAt ? Math.max(0, Math.floor((Date.now() - call.startedAt.getTime()) / 1000)) : 0);
        this.notifyUser(call.callerId === userId ? call.receiverId! : call.callerId, 'call:ended', { callId: call.id });
      });
      handle('call:signal', async data => {
        const call = await this.activeCall(userId, data.targetUserId);
        if (call.status !== 'CONNECTED') throw httpError(403, 'Call not accepted');
        await requireCommunication(call.callerId, call.receiverId!, 'callVisibility');
        this.notifyUser(data.targetUserId, 'call:signal', { senderId: userId, callId: call.id, signal: data.signal });
      });
      socket.on('disconnect', () => {
        clearTimeout(expiry); clearInterval(sessionCheck);
        const set = this.onlineUsers.get(userId); set?.delete(socket.id);
        if (!set?.size) {
          this.onlineUsers.delete(userId);
          void prisma.profile.updateMany({ where: { userId }, data: { lastSeenAt: new Date() } }).catch(() => null);
          void this.publishPresence(userId, 'OFFLINE');
        }
      });
    });
  }
  private async activeCall(userId: string, targetId: string, callId?: string) {
    if (typeof targetId !== 'string') throw httpError(400, 'Target required');
    const call = await prisma.call.findFirst({ where: { ...(callId && { id: callId }), status: { in: ['RINGING', 'CONNECTED'] }, OR: [{ callerId: userId, receiverId: targetId }, { callerId: targetId, receiverId: userId }] }, orderBy: { createdAt: 'desc' } });
    if (!call) throw httpError(403, 'Call unavailable');
    return call;
  }
  private async publishPresence(userId: string, status: string) {
    try {
      const profile = await prisma.profile.findUnique({ where: { userId } });
      for (const viewer of this.onlineUsers.keys()) if (await maySee(viewer, userId, profile?.lastSeenVisibility)) this.notifyUser(viewer, 'presence:update', { userId, status, lastSeenAt: status === 'OFFLINE' ? new Date().toISOString() : null });
    } catch { /* Presence is ephemeral. */ }
  }
  public isOnline(userId: string) { return this.onlineUsers.has(userId); }
  public notifyUser(userId: string, event: string, data: any) { this.io.to(`user:${userId}`).emit(event, data); }
  public async broadcastToChat(chatId: string, event: string, data: any) {
    const members = await prisma.chatMember.findMany({ where: { chatId }, select: { userId: true } });
    this.io.to(members.map(m => `user:${m.userId}`)).emit(event, data);
  }
}
export let gatewayInstance: WebSocketGateway | null = null;
export function initWebSocketGateway(server: HttpServer) { gatewayInstance = new WebSocketGateway(server); return gatewayInstance; }
