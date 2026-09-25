import bcrypt from 'bcryptjs';
import { PrismaClient, UserRole, ChatType, MemberRole, MessageType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding for DFZ Messenger...');

  // Clean existing data
  await prisma.reaction.deleteMany({});
  await prisma.messageReceipt.deleteMany({});
  await prisma.attachment.deleteMany({});
  await prisma.pinnedMessage.deleteMany({});
  await prisma.message.deleteMany({});
  await prisma.chatMember.deleteMany({});
  await prisma.chat.deleteMany({});
  await prisma.contact.deleteMany({});
  await prisma.session.deleteMany({});
  await prisma.credential.deleteMany({});
  await prisma.profile.deleteMany({});
  await prisma.block.deleteMany({});
  await prisma.report.deleteMany({});
  await prisma.auditLog.deleteMany({});
  await prisma.user.deleteMany({});

  const salt = await bcrypt.genSalt(12);
  const adminPassHash = await bcrypt.hash('AdminSecure2026!', salt);
  const userPassHash = await bcrypt.hash('TestPass123!', salt);

  // 1. Super Admin User
  const adminUser = await prisma.user.create({
    data: {
      username: 'admin',
      email: 'admin@dfzmessenger.local',
      role: UserRole.SUPERADMIN,
      credential: {
        create: { passwordHash: adminPassHash },
      },
      profile: {
        create: {
          displayName: 'DFZ Administrator',
          bio: 'System Administrator & Core Platform Lead',
          theme: 'dark',
          language: 'ru',
        },
      },
    },
  });

  // Admin Saved Messages
  await prisma.chat.create({
    data: {
      type: ChatType.SAVED,
      title: 'Saved Messages',
      ownerId: adminUser.id,
      members: {
        create: { userId: adminUser.id, role: MemberRole.OWNER },
      },
    },
  });

  // 2. User Alex
  const alexUser = await prisma.user.create({
    data: {
      username: 'alex_dev',
      email: 'alex@dfzmessenger.local',
      role: UserRole.USER,
      credential: {
        create: { passwordHash: userPassHash },
      },
      profile: {
        create: {
          displayName: 'Алексей Смирнов',
          bio: 'Full-Stack Software Engineer. Building next-gen web.',
          theme: 'dark',
          language: 'ru',
        },
      },
    },
  });

  // Alex Saved Messages
  await prisma.chat.create({
    data: {
      type: ChatType.SAVED,
      title: 'Saved Messages',
      ownerId: alexUser.id,
      members: {
        create: { userId: alexUser.id, role: MemberRole.OWNER },
      },
    },
  });

  // 3. User Elena
  const elenaUser = await prisma.user.create({
    data: {
      username: 'elena_ux',
      email: 'elena@dfzmessenger.local',
      role: UserRole.USER,
      credential: {
        create: { passwordHash: userPassHash },
      },
      profile: {
        create: {
          displayName: 'Елена Архипова',
          bio: 'Design Lead & Design Systems Architect.',
          theme: 'dark',
          language: 'ru',
        },
      },
    },
  });

  // Elena Saved Messages
  await prisma.chat.create({
    data: {
      type: ChatType.SAVED,
      title: 'Saved Messages',
      ownerId: elenaUser.id,
      members: {
        create: { userId: elenaUser.id, role: MemberRole.OWNER },
      },
    },
  });

  // 4. Create Mutual Contacts
  await prisma.contact.createMany({
    data: [
      { userId: adminUser.id, contactUserId: alexUser.id, nickname: 'Alex (Tech)' },
      { userId: adminUser.id, contactUserId: elenaUser.id, nickname: 'Elena (UX)' },
      { userId: alexUser.id, contactUserId: adminUser.id, nickname: 'Admin' },
      { userId: alexUser.id, contactUserId: elenaUser.id, nickname: 'Elena' },
      { userId: elenaUser.id, contactUserId: alexUser.id, nickname: 'Alex' },
    ],
  });

  // 5. Create Direct Chat (Admin <-> Alex)
  const directChat = await prisma.chat.create({
    data: {
      type: ChatType.DIRECT,
      members: {
        create: [
          { userId: adminUser.id, role: MemberRole.MEMBER },
          { userId: alexUser.id, role: MemberRole.MEMBER },
        ],
      },
    },
  });

  const m1 = await prisma.message.create({
    data: {
      chatId: directChat.id,
      senderId: adminUser.id,
      content: 'Привет, Алексей! Добро пожаловать в DFZ Messenger. Архитектура готова к работе.',
      type: MessageType.TEXT,
    },
  });

  const m2 = await prisma.message.create({
    data: {
      chatId: directChat.id,
      senderId: alexUser.id,
      replyToId: m1.id,
      content: 'Отлично! Скорость и плавность интерфейса на высоте. Проверяю realtime и WebRTC.',
      type: MessageType.TEXT,
    },
  });

  // Reaction on m2
  await prisma.reaction.create({
    data: {
      messageId: m2.id,
      userId: adminUser.id,
      emoji: '🔥',
    },
  });

  // 6. Create Group Chat "DFZ Core Team"
  const groupChat = await prisma.chat.create({
    data: {
      type: ChatType.GROUP,
      title: 'DFZ Core Team',
      description: 'Основная команда разработки DFZ Messenger: архитектура, дизайн, инфраструктура.',
      ownerId: adminUser.id,
      inviteCode: 'dfz-core',
      members: {
        create: [
          { userId: adminUser.id, role: MemberRole.OWNER },
          { userId: alexUser.id, role: MemberRole.ADMIN },
          { userId: elenaUser.id, role: MemberRole.MEMBER },
        ],
      },
    },
  });

  await prisma.message.create({
    data: {
      chatId: groupChat.id,
      senderId: adminUser.id,
      content: 'Коллеги, добро пожаловать в рабочий канал платформы DFZ Messenger! Проект запущен в работу.',
      type: MessageType.TEXT,
    },
  });

  // 7. Create Channel "DFZ News & Updates"
  const channelChat = await prisma.chat.create({
    data: {
      type: ChatType.CHANNEL,
      title: 'DFZ Updates',
      description: 'Официальные обновления и релизы экосистемы DFZ Messenger.',
      ownerId: adminUser.id,
      isPublic: true,
      inviteCode: 'dfz-news',
      members: {
        create: [
          { userId: adminUser.id, role: MemberRole.OWNER },
          { userId: alexUser.id, role: MemberRole.MEMBER },
          { userId: elenaUser.id, role: MemberRole.MEMBER },
        ],
      },
    },
  });

  await prisma.message.create({
    data: {
      chatId: channelChat.id,
      senderId: adminUser.id,
      content: '🚀 Релиз версии DFZ Messenger v1.0.0! Доступны WebSocket realtime, cursor pagination, PWA, WebRTC calls и медиа-сообщения.',
      type: MessageType.TEXT,
    },
  });

  console.log('✅ Seeding completed successfully!');
  console.log('Test Accounts:');
  console.log('1. Admin: admin / AdminSecure2026!');
  console.log('2. User 1: alex_dev / TestPass123!');
  console.log('3. User 2: elena_ux / TestPass123!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
