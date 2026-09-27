import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma';
import { authGuard } from '../common/auth.guard';
import { requireMember, requireRight, httpError } from '../common/access';
import { gatewayInstance } from '../gateway/websocket.gateway';

export const managementRouter = Router();
managementRouter.use(authGuard);
const policySchema = z.object({ sendMessages: z.boolean().optional(), sendMedia: z.boolean().optional(), sendStickers: z.boolean().optional(), sendPolls: z.boolean().optional(), embedLinks: z.boolean().optional(), addMembers: z.boolean().optional(), pinMessages: z.boolean().optional(), changeInfo: z.boolean().optional(), slowModeSeconds: z.number().int().min(0).max(3600).optional(), reactions: z.boolean().optional(), signMessages: z.boolean().optional(), protectedContent: z.boolean().optional() });
const wrap = (fn: any) => (req: any, res: any, next: any) => Promise.resolve(fn(req, res)).catch(next);
const manage = async (chatId: string, userId: string) => { const member = await requireMember(chatId, userId); if (!['GROUP','CHANNEL'].includes(member.chat.type)) throw httpError(400, 'Group or channel required'); requireRight(member, 'changeInfo'); return member; };
managementRouter.get('/chats/:id/policy', wrap(async (req: any, res: any) => { await requireMember(req.params.id, req.user.userId); res.json({ success: true, data: await prisma.chatPolicy.upsert({ where: { chatId: req.params.id }, create: { chatId: req.params.id }, update: {} }) }); }));
managementRouter.put('/chats/:id/policy', wrap(async (req: any, res: any) => {
  await manage(req.params.id, req.user.userId); const data = policySchema.parse(req.body);
  const result = await prisma.$transaction(async tx => {
    const before = await tx.chatPolicy.findUnique({ where: { chatId: req.params.id } });
    const after = await tx.chatPolicy.upsert({ where: { chatId: req.params.id }, create: { chatId: req.params.id, ...data }, update: data });
    await tx.auditLog.create({ data: { actorId: req.user.userId, action: 'CHAT_POLICY_UPDATED', target: req.params.id, metadata: { before, after } } });
    return after;
  });
  await gatewayInstance?.broadcastToChat(req.params.id, 'chat:updated', { chatId: req.params.id });
  res.json({ success: true, data: result });
}));
managementRouter.get('/chats/:id/invites', wrap(async (req: any, res: any) => { await manage(req.params.id, req.user.userId); res.json({ success: true, data: await prisma.chatInvite.findMany({ where: { chatId: req.params.id }, orderBy: { createdAt: 'desc' } }) }); }));
managementRouter.post('/chats/:id/invites', wrap(async (req: any, res: any) => {
  await manage(req.params.id, req.user.userId);
  const data = z.object({ name: z.string().trim().min(1).max(80), expiresAt: z.string().datetime().optional(), usageLimit: z.number().int().positive().max(100000).optional(), approvalRequired: z.boolean().default(false) }).parse(req.body);
  if (data.expiresAt && new Date(data.expiresAt) <= new Date()) throw httpError(400, 'Expiration must be in the future');
  const result = await prisma.chatInvite.create({ data: { ...data, chatId: req.params.id } });
  res.status(201).json({ success: true, data: result });
}));
managementRouter.delete('/chats/:id/invites/:inviteId', wrap(async (req: any, res: any) => { await manage(req.params.id, req.user.userId); await prisma.chatInvite.updateMany({ where: { id: req.params.inviteId, chatId: req.params.id }, data: { revokedAt: new Date() } }); res.json({ success: true }); }));
managementRouter.post('/invites/:code/join', wrap(async (req: any, res: any) => {
  const userId = req.user.userId;
  const result = await prisma.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${req.params.code}))`;
    const invite = await tx.chatInvite.findUnique({ where: { code: req.params.code } });
    if (!invite || invite.revokedAt || invite.expiresAt && invite.expiresAt <= new Date()) throw httpError(404, 'Invite unavailable');
    const existing = await tx.chatMember.findUnique({ where: { chatId_userId: { chatId: invite.chatId, userId } } });
    if (existing) return { chatId: invite.chatId, status: 'JOINED' };
    const pending = await tx.joinRequest.findUnique({ where: { chatId_userId: { chatId: invite.chatId, userId } } });
    if (pending?.status === 'PENDING') return { chatId: invite.chatId, status: 'PENDING' };
    if (invite.usageLimit && invite.usedCount >= invite.usageLimit) throw httpError(409, 'Invite exhausted');
    await tx.chatInvite.update({ where: { id: invite.id }, data: { usedCount: { increment: 1 } } });
    if (invite.approvalRequired) {
      await tx.joinRequest.upsert({ where: { chatId_userId: { chatId: invite.chatId, userId } }, update: { status: 'PENDING' }, create: { chatId: invite.chatId, userId } });
      return { chatId: invite.chatId, status: 'PENDING' };
    }
    await tx.chatMember.create({ data: { chatId: invite.chatId, userId } });
    return { chatId: invite.chatId, status: 'JOINED' };
  });
  res.json({ success: true, data: result });
}));
managementRouter.get('/chats/:id/join-requests', wrap(async (req: any, res: any) => {
  await manage(req.params.id, req.user.userId);
  const requests = await prisma.joinRequest.findMany({ where: { chatId: req.params.id, status: 'PENDING' } });
  res.json({ success: true, data: await Promise.all(requests.map(async r => ({ ...r, user: await prisma.user.findUnique({ where: { id: r.userId }, select: { id: true, username: true } }) }))) });
}));
managementRouter.put('/chats/:id/join-requests/:requestId', wrap(async (req: any, res: any) => {
  await manage(req.params.id, req.user.userId);
  const { approve } = z.object({ approve: z.boolean() }).parse(req.body);
  await prisma.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${req.params.requestId}))`;
    const request = await tx.joinRequest.findFirst({ where: { id: req.params.requestId, chatId: req.params.id, status: 'PENDING' } });
    if (!request) throw httpError(404, 'Request unavailable');
    await tx.joinRequest.update({ where: { id: request.id }, data: { status: approve ? 'APPROVED' : 'REJECTED' } });
    if (approve) await tx.chatMember.upsert({ where: { chatId_userId: { chatId: request.chatId, userId: request.userId } }, update: {}, create: { chatId: request.chatId, userId: request.userId } });
    await tx.auditLog.create({ data: { actorId: req.user.userId, action: approve ? 'JOIN_APPROVED' : 'JOIN_REJECTED', target: request.chatId, metadata: { userId: request.userId } } });
  });
  res.json({ success: true });
}));
managementRouter.get('/chats/:id/recent-actions', wrap(async (req: any, res: any) => { await manage(req.params.id, req.user.userId); res.json({ success: true, data: await prisma.auditLog.findMany({ where: { target: req.params.id }, orderBy: { createdAt: 'desc' }, take: 50 }) }); }));
managementRouter.get('/chats/:id/draft', wrap(async (req: any, res: any) => { await requireMember(req.params.id, req.user.userId); res.json({ success: true, data: await prisma.draft.findUnique({ where: { chatId_userId: { chatId: req.params.id, userId: req.user.userId } } }) }); }));
managementRouter.put('/chats/:id/draft', wrap(async (req: any, res: any) => {
  await requireMember(req.params.id, req.user.userId); const data = z.object({ content: z.string().max(4096) }).parse(req.body);
  const draft = await prisma.draft.upsert({ where: { chatId_userId: { chatId: req.params.id, userId: req.user.userId } }, update: data, create: { chatId: req.params.id, userId: req.user.userId, ...data } });
  gatewayInstance?.notifyUser(req.user.userId, 'draft:updated', draft); res.json({ success: true, data: draft });
}));
const settingsSchema = z.object({ notifyPrivate: z.boolean().optional(), notifyGroups: z.boolean().optional(), notifyChannels: z.boolean().optional(), notifyPreview: z.boolean().optional(), notifySound: z.boolean().optional(), density: z.enum(['comfortable','compact']).optional(), textSize: z.number().int().min(12).max(24).optional(), reducedMotion: z.boolean().optional(), autoDownloadWifi: z.boolean().optional(), autoDownloadMobile: z.boolean().optional() });
managementRouter.get('/settings', wrap(async (req: any, res: any) => res.json({ success: true, data: await prisma.userSettings.upsert({ where: { userId: req.user.userId }, create: { userId: req.user.userId }, update: {} }) })));
managementRouter.put('/settings', wrap(async (req: any, res: any) => { const data = settingsSchema.parse(req.body); res.json({ success: true, data: await prisma.userSettings.upsert({ where: { userId: req.user.userId }, create: { userId: req.user.userId, ...data }, update: data }) }); }));
