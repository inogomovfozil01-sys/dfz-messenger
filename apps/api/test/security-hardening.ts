import './require-local-db';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { app } from '../src/app';
import { prisma } from '../src/prisma';
import { ENV } from '../src/config';
import { authService } from '../src/auth/auth.service';
import { chatsService } from '../src/chats/chats.service';
import { messagesService } from '../src/messages/messages.service';
import { usersService } from '../src/users/users.service';
import { storiesService } from '../src/stories/stories.service';
import { mediaService, detectMediaType } from '../src/media/media.service';
import { maySee, requireSession } from '../src/common/access';
import { PrivacyVisibility, MessageType } from '@dfz/types';

const users: string[] = [], chats: string[] = [], files: string[] = [];
const server = app.listen(0, '127.0.0.1');
let checks = 0;
async function check(name: string, run: () => Promise<void>) {
  await run(); checks++; console.log(`PASS ${name}`);
}
async function main() {
  await new Promise<void>(resolve => server.listening ? resolve() : server.once('listening', resolve));
  const address = server.address() as { port: number };
  const base = `http://127.0.0.1:${address.port}`;
  const register = async (label: string) => {
    const user = await authService.register({ username: `sec_${label}_${randomUUID().slice(0, 8)}`, password: 'RegressionPassword123!' });
    users.push(user.user.id); return user;
  };
  const a = await register('owner'), b = await register('peer'), c = await register('outsider');
  const get = (key: string, token?: string) => fetch(`${base}/api/media/files/${key}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  const key = `${randomUUID()}.png`;
  files.push(path.join(ENV.UPLOAD_DIR, key));
  fs.writeFileSync(files[0], Buffer.from('89504e470d0a1a0a', 'hex'));
  await prisma.upload.create({ data: { storageKey: key, ownerId: a.user.id, originalName: 'private.png', mimeType: 'image/png', sizeBytes: 8 } });
  const url = `/api/media/files/${key}`;
  const chat = await chatsService.createDirectChat(a.user.id, b.user.id); chats.push(chat.id);
  const message = await messagesService.sendMessage(a.user.id, { chatId: chat.id, content: 'Private attachment', type: MessageType.IMAGE, attachments: [{ storageKey: key, originalName: 'x', mimeType: 'image/png', sizeBytes: 8, url }] });

  await check('concurrent message retries persist exactly once', async () => {
    const request = { chatId: chat.id, content: 'Retry race', idempotencyKey: randomUUID() };
    const results = await Promise.all(Array.from({ length: 8 }, () => messagesService.sendMessage(a.user.id, request)));
    assert.equal(new Set(results.map(result => result.id)).size, 1);
    assert.equal(await prisma.message.count({ where: { chatId: chat.id, senderId: a.user.id, idempotencyKey: request.idempotencyKey } }), 1);
    const peerMessage = await messagesService.sendMessage(b.user.id, request);
    assert.notEqual(peerMessage.id, results[0].id);
  });

  await check('anonymous media rejected', async () => { assert.equal((await get(key)).status, 401); });
  await check('uploads behind proxy return portable URLs and support cookie-authenticated ranges', async () => {
    const form = new FormData();
    form.append('file', new Blob([Buffer.from('89504e470d0a1a0a', 'hex')], { type: 'image/png' }), 'proxy.png');
    const response = await fetch(`${base}/api/media/upload`, { method: 'POST', headers: { Cookie: `dfz_access_token=${a.accessToken}` }, body: form });
    assert.equal(response.status, 201);
    const { data } = await response.json() as any;
    files.push(path.join(ENV.UPLOAD_DIR, data.storageKey));
    assert.equal(data.url, `/api/media/files/${data.storageKey}`);
    const download = await fetch(`${base}${data.url}`, { headers: { Cookie: `dfz_access_token=${a.accessToken}`, Range: 'bytes=0-3' } });
    assert.equal(download.status, 206);
    assert.equal(download.headers.get('content-range'), 'bytes 0-3/8');
    assert.equal(download.headers.get('cache-control'), 'private, no-store');
    assert.deepEqual(Buffer.from(await download.arrayBuffer()), Buffer.from('89504e47', 'hex'));
    assert.equal((await fetch(`${base}${data.url}`)).status, 401);
    assert.equal((await get(data.storageKey, c.accessToken)).status, 404);
  });
  await check('URL bearer token rejected', async () => { assert.equal((await fetch(`${base}${url}?token=${a.accessToken}`)).status, 401); });
  await check('owner and chat recipient can read; private cache headers', async () => {
    for (const token of [a.accessToken, b.accessToken]) { const response = await get(key, token); assert.equal(response.status, 200); assert.equal(response.headers.get('cache-control'), 'private, no-store'); }
  });
  await check('unrelated user denied', async () => { assert.equal((await get(key, c.accessToken)).status, 404); });
  await check('cleared history no longer grants attachment access', async () => {
    await prisma.chatMember.update({ where: { chatId_userId: { chatId: chat.id, userId: b.user.id } }, data: { clearedAt: new Date(Date.now() + 1000) } });
    assert.equal((await get(key, b.accessToken)).status, 404);
    await prisma.chatMember.update({ where: { chatId_userId: { chatId: chat.id, userId: b.user.id } }, data: { clearedAt: null } });
  });
  await check('deleted message no longer grants attachment access', async () => {
    await prisma.message.update({ where: { id: message.id }, data: { isDeleted: true } });
    assert.equal((await get(key, b.accessToken)).status, 404);
  });
  await check('cannot publish another user upload as avatar or story', async () => {
    await assert.rejects(usersService.updateProfile(c.user.id, { avatarUrl: url }), { status: 403 });
    await assert.rejects(storiesService.createStory(c.user.id, { mediaUrl: url }), { status: 403 });
    await assert.rejects(chatsService.createGroup(c.user.id, { title: 'Denied', avatarUrl: url }), { status: 403 });
  });
  await check('private avatar respects owner contact list', async () => {
    await usersService.updateProfile(a.user.id, { avatarUrl: url });
    await usersService.updatePrivacy(a.user.id, { photoVisibility: PrivacyVisibility.CONTACTS });
    await prisma.contact.create({ data: { userId: c.user.id, contactUserId: a.user.id } });
    assert.equal(await maySee(c.user.id, a.user.id, 'CONTACTS'), false);
    assert.equal((await get(key, c.accessToken)).status, 404);
    await prisma.contact.create({ data: { userId: a.user.id, contactUserId: b.user.id } });
    assert.equal((await get(key, b.accessToken)).status, 200);
  });
  await check('blocked user cannot read avatar', async () => {
    await prisma.block.create({ data: { blockerId: a.user.id, blockedId: b.user.id } });
    assert.equal((await get(key, b.accessToken)).status, 404);
    await prisma.block.deleteMany({ where: { blockerId: a.user.id, blockedId: b.user.id } });
  });
  await check('private stories reject unrelated admins', async () => {
    const story = await storiesService.createStory(a.user.id, { mediaUrl: url, privacy: PrivacyVisibility.NOBODY });
    await prisma.user.update({ where: { id: c.user.id }, data: { role: 'ADMIN' } });
    await assert.rejects(storiesService.requireAccess(c.user.id, story.id), { status: 403 });
    const feed = await storiesService.getFeed(c.user.id);
    assert.ok(!JSON.stringify(feed).includes(story.id));
  });
  await check('platform admin still obeys group posting policy', async () => {
    const group = await chatsService.createGroup(a.user.id, { title: 'Restricted', memberIds: [c.user.id] }); chats.push(group.id);
    await prisma.chatPolicy.create({ data: { chatId: group.id, sendMessages: false } });
    await assert.rejects(messagesService.sendMessage(c.user.id, { chatId: group.id, content: 'Denied' }), { status: 403 });
  });
  await check('cross-origin mutation rejected before authentication', async () => {
    const response = await fetch(`${base}/api/auth/login`, { method: 'POST', headers: { Origin: 'https://attacker.invalid', 'Content-Type': 'application/json' }, body: '{}' });
    assert.equal(response.status, 403); assert.equal((await response.json() as any).error.code, 'CSRF_REJECTED');
  });
  await check('file signatures override spoofed MIME and reject HTML/SVG', async () => {
    assert.equal(detectMediaType(Buffer.from('89504e470d0a1a0a', 'hex'), 'text/html')?.mime, 'image/png');
    assert.equal(detectMediaType(Buffer.from('<svg onload="alert(1)">'), 'image/png'), null);
    assert.equal(detectMediaType(Buffer.from('<script>alert(1)</script>'), 'text/html'), null);
    const temp = path.join(ENV.UPLOAD_DIR, `${randomUUID()}.tmp`); files.push(temp);
    fs.writeFileSync(temp, '<svg onload="alert(1)">');
    await assert.rejects(mediaService.processUploadedFile({ path: temp, size: fs.statSync(temp).size, mimetype: 'image/png', originalname: 'photo.png' } as Express.Multer.File, base, a.user.id), { status: 400 });
    assert.equal(fs.existsSync(temp), false);
  });
  await check('refresh rotates and stores only hash', async () => {
    const tokens = await authService.refreshTokens(a.refreshToken);
    assert.notEqual(tokens.refreshToken, a.refreshToken);
    const session = await prisma.session.findUniqueOrThrow({ where: { id: a.session.id } });
    assert.match(session.tokenHash, /^[a-f0-9]{64}$/);
    const next = await authService.refreshTokens(tokens.refreshToken);
    assert.notEqual(tokens.refreshToken, next.refreshToken);
  });
  await check('replayed refresh revokes entire session including media', async () => {
    await assert.rejects(authService.refreshTokens(a.refreshToken), { status: 401 });
    await assert.rejects(requireSession(a.user.id, a.session.id), { status: 401 });
    assert.equal((await get(key, a.accessToken)).status, 401);
  });
  await check('concurrent refresh cannot redeem same token twice', async () => {
    const results = await Promise.allSettled([authService.refreshTokens(b.refreshToken), authService.refreshTokens(b.refreshToken)]);
    assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
    assert.equal(results.filter(r => r.status === 'rejected').length, 1);
    await assert.rejects(requireSession(b.user.id, b.session.id), { status: 401 });
  });
  console.log(`${checks} security regressions passed`);
}
main().catch(error => { console.error(error); process.exitCode = 1; }).finally(async () => {
  server.close();
  await prisma.chat.deleteMany({ where: { id: { in: chats } } });
  await prisma.upload.deleteMany({ where: { ownerId: { in: users } } });
  await prisma.user.deleteMany({ where: { id: { in: users } } });
  for (const file of files) if (fs.existsSync(file)) fs.unlinkSync(file);
  await prisma.$disconnect();
  process.exit(process.exitCode || 0);
});
