const fs = require('fs');
function edit(p, fn) { const before = fs.readFileSync(p, 'utf8').replace(/\r\n/g, '\n'); const after = fn(before); fs.writeFileSync(p, after); }
function replace(s, a, b) { if (!s.includes(a)) throw new Error('Missing anchor: ' + a.slice(0, 100)); return s.replace(a, b); }
edit('apps/api/src/common/auth.guard.ts', s => replace(replace(s, "import jwt from 'jsonwebtoken';", "import jwt from 'jsonwebtoken';\nimport { requireSession } from './access';"), '    // Check if user is banned or deleted', '    await requireSession(decoded.userId, decoded.sessionId);\n\n    // Check if user is banned or deleted'));
edit('apps/api/src/messages/messages.service.ts', s => {
  s = "import { requireMember, requirePosting, requireRight, httpError } from '../common/access';\n" + s;
  s = replace(s, 'const limit = Math.min(options.limit || 40, 100);', 'const limit = Math.max(1, Math.min(options.limit || 40, 100));');
  s = replace(s, '        isDeleted: false,\n        topicId:', '        isDeleted: false,\n        ...(membership?.clearedAt && { createdAt: { gt: membership.clearedAt } }),\n        topicId:');
  s = replace(s, '    // 1. Check idempotency if provided', `    await requirePosting(data.chatId, userId, data.type);
    if (data.replyToId && !await prisma.message.findFirst({ where: { id: data.replyToId, chatId: data.chatId, isDeleted: false } })) throw httpError(400, 'Reply must reference a message in this chat');
    if (data.topicId && !await prisma.topic.findFirst({ where: { id: data.topicId, chatId: data.chatId, isClosed: false } })) throw httpError(400, 'Topic unavailable');
    // 1. Check idempotency if provided`);
  s = replace(s, '    if (msg.senderId !== userId) {', '    await requirePosting(msg.chatId, userId);\n    if (msg.senderId !== userId) {');
  s = replace(s, '    if (!isSender && !isAdmin) {', "    if (!membership) throw httpError(403, 'Chat membership required');\n    if (isAdmin && !isSender) requireRight(membership, 'deleteMessages');\n    if (!isSender && !isAdmin) {");
  s = replace(s, '    if (!messageIds.length) return { updatedCount: 0 };', `    await requireMember(chatId, userId);
    if (!['READ', 'DELIVERED'].includes(status) || messageIds.length > 200 || messageIds.some(id => typeof id !== 'string')) throw httpError(400, 'Invalid receipt');
    if (!messageIds.length) return { updatedCount: 0 };
    const valid = await prisma.message.count({ where: { id: { in: messageIds }, chatId, isDeleted: false } });
    if (valid !== new Set(messageIds).size) throw httpError(403, 'Receipt references inaccessible messages');`);
  s = replace(s, '        update: { status },', "        update: status === 'READ' ? { status } : {},");
  s = replace(s, '    const pinned = await prisma.pinnedMessage.upsert({', "    requireRight(member, 'pinMessages', chat.type === 'DIRECT' || chat.type === 'SAVED');\n    if (!await prisma.message.findFirst({ where: { id: messageId, chatId, isDeleted: false } })) throw httpError(400, 'Message does not belong to chat');\n    const pinned = await prisma.pinnedMessage.upsert({");
  s = replace(s, '  async unpinMessage(chatId: string, messageId: string, userId: string) {', "  async unpinMessage(chatId: string, messageId: string, userId: string) {\n    const member = await requireMember(chatId, userId);\n    requireRight(member, 'pinMessages', member.chat.type === 'DIRECT' || member.chat.type === 'SAVED');");
  return s;
});
edit('apps/api/prisma/schema.prisma', s => replace(s, '  joinedAt    DateTime    @default(now())', '  clearedAt   DateTime?\n  joinedAt    DateTime    @default(now())'));
edit('apps/api/src/chats/chats.service.ts', s => {
  s = "import { requireCommunication, requireMember, requireRight, httpError } from '../common/access';\n" + s;
  s = replace(s, '    // Check if target is blocked or blocked us', "    await requireCommunication(currentUserId, targetUserId, 'messageVisibility');\n    // Check if target is blocked or blocked us");
  s = replace(s, 'for (const mId of data.memberIds)', 'for (const mId of new Set(data.memberIds))');
  s = replace(s, '          membersToCreate.push', "          await requireCommunication(ownerId, mId, 'groupAddVisibility');\n          membersToCreate.push");
  s = replace(s, '    const alreadyMember = chat.members.find', "    if (!['GROUP', 'CHANNEL'].includes(chat.type)) throw httpError(403, 'Cannot add members to private conversation');\n    requireRight(actorMembership, 'inviteUsers', chat.type === 'GROUP');\n    if (role !== MemberRole.MEMBER) throw httpError(403, 'Use owner role management to promote members');\n    await requireCommunication(actorId, targetUserId, 'groupAddVisibility');\n    const alreadyMember = chat.members.find");
  s = replace(s, '    // Role checks', "    if (target.role === 'OWNER') throw httpError(403, 'Transfer ownership or delete the group before leaving');\n    if (actorId !== targetUserId) requireRight(actor, 'banUsers');\n    if (actor.role === 'ADMIN' && target.role === 'ADMIN' && actorId !== targetUserId) throw httpError(403, 'Only owner can remove admins');\n    // Role checks");
  s = replace(s, "    return { message: 'Member removed successfully' };", "    gatewayInstance?.io.in(`user:${targetUserId}`).socketsLeave(`chat:${chatId}`);\n    return { message: 'Member removed successfully' };");
  s = replace(s, '    const topic = await prisma.topic.create({', "    requireRight(membership, 'manageTopics');\n    const topic = await prisma.topic.create({");
  s = replace(s, '    const updated = await prisma.chat.update({', "    requireRight(membership, 'changeInfo');\n    const updated = await prisma.chat.update({");
  s = replace(s, '    const updated = await prisma.chatMember.update({', "    if (targetUserId === chat.ownerId || data.role === MemberRole.OWNER) throw httpError(403, 'Ownership cannot be changed here');\n    const updated = await prisma.chatMember.update({");
  s = replace(s, 'data: { joinedAt: new Date() }', 'data: { clearedAt: new Date() }');
  return s;
});
edit('apps/api/src/polls/polls.service.ts', s => {
  s = "import { requirePosting, requireMember } from '../common/access';\n" + s;
  s = replace(s, '    // Transaction: Create message', "    await requirePosting(chatId, userId, 'POLL');\n    // Transaction: Create message");
  s = replace(s, '    if (poll.isClosed) {', '    await requireMember(poll.chatId, userId);\n    if (poll.isClosed) {');
  return s;
});
