import { prisma } from '../prisma';

export function httpError(status: number, message: string) {
  return Object.assign(new Error(message), { status });
}

export async function requireMember(chatId: string, userId: string) {
  if (typeof chatId !== 'string' || !chatId) throw httpError(400, 'Chat required');
  const member = await prisma.chatMember.findUnique({ where: { chatId_userId: { chatId, userId } }, include: { chat: true } });
  if (!member) throw httpError(403, 'Chat membership required');
  return member;
}

export async function isBlocked(a: string, b: string) {
  if (a === b) return false;
  return !!await prisma.block.findFirst({ where: { OR: [{ blockerId: a, blockedId: b }, { blockerId: b, blockedId: a }] } });
}

export async function maySee(viewer: string, owner: string, visibility: string = 'EVERYONE') {
  if (viewer === owner) return true;
  if (await isBlocked(viewer, owner)) return false;
  if (visibility === 'NOBODY') return false;
  if (visibility === 'EVERYONE') return true;
  return !!await prisma.contact.findUnique({ where: { userId_contactUserId: { userId: owner, contactUserId: viewer } } });
}

export async function requireCommunication(sender: string, recipient: string, kind: 'messageVisibility' | 'callVisibility' | 'groupAddVisibility') {
  if (await isBlocked(sender, recipient)) throw Object.assign(httpError(403, 'User blocked'), { code: 'USER_BLOCKED' });
  const target = await prisma.user.findUnique({ where: { id: recipient }, include: { profile: true } });
  if (!target || target.isBanned) throw httpError(404, 'User unavailable');
  if (!await maySee(sender, recipient, target.profile?.[kind])) throw httpError(403, 'User privacy restrictions');
}

export function requireRight(member: { role: string; permissions: unknown }, right: string, membersAllowed = false) {
  if (member.role === 'OWNER') return;
  const rights = (member.permissions || {}) as Record<string, boolean>;
  if (rights[right] === false || (member.role === 'MEMBER' && !membersAllowed && rights[right] !== true)) {
    throw httpError(403, 'Insufficient chat permissions');
  }
}

export async function requirePosting(chatId: string, userId: string, type = 'TEXT') {
  const member = await requireMember(chatId, userId);
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (user?.role === 'ADMIN' || user?.role === 'SUPERADMIN') {
    return member;
  }
  requireRight(member, 'sendMessages', member.chat.type !== 'CHANNEL');
  if (type !== 'TEXT') requireRight(member, type === 'POLL' ? 'sendPolls' : type === 'STICKER' ? 'sendStickers' : 'sendMedia', member.chat.type !== 'CHANNEL');
  if (member.role === 'MEMBER') {
    const policy = await prisma.chatPolicy.findUnique({ where: { chatId } });
    if (policy) {
      if (!policy.sendMessages || (type === 'POLL' && !policy.sendPolls) || (type === 'STICKER' && !policy.sendStickers) || (!['TEXT','POLL','STICKER'].includes(type) && !policy.sendMedia)) throw httpError(403, 'Posting restricted by group settings');
      if (policy.slowModeSeconds) {
        const last = await prisma.message.findFirst({ where: { chatId, senderId: userId, createdAt: { gt: new Date(Date.now() - policy.slowModeSeconds * 1000) } } });
        if (last) throw httpError(429, 'Slow mode: wait before sending another message');
      }
    }
  }
  if (member.chat.type === 'DIRECT') {
    const other = await prisma.chatMember.findFirst({ where: { chatId, userId: { not: userId } } });
    if (other) await requireCommunication(userId, other.userId, 'messageVisibility');
  }
  return member;
}

export async function requireSession(userId: string, sessionId?: string) {
  if (!sessionId) throw httpError(401, 'Session required');
  const session = await prisma.session.findFirst({ where: { id: sessionId, userId, isRevoked: false, expiresAt: { gt: new Date() }, user: { isBanned: false } } });
  if (!session) throw httpError(401, 'Session revoked or expired');
  return session;
}
