import { prisma } from '../prisma';

export class ContactsService {
  async getContacts(userId: string) {
    const contacts = await prisma.contact.findMany({
      where: { userId },
      include: {
        contactUser: {
          include: { profile: true },
        },
      },
      orderBy: { contactUser: { username: 'asc' } },
    });

    return contacts.map(c => ({
      id: c.id,
      userId: c.userId,
      contactUserId: c.contactUserId,
      nickname: c.nickname,
      createdAt: c.createdAt.toISOString(),
      contactUser: {
        id: c.contactUser.id,
        username: c.contactUser.username,
        displayName: c.contactUser.profile?.displayName || c.contactUser.username,
        avatarUrl: c.contactUser.profile?.avatarUrl,
        bio: c.contactUser.profile?.bio,
        lastSeenAt: c.contactUser.profile?.lastSeenAt?.toISOString() || null,
      },
    }));
  }

  async addContact(userId: string, targetUserId: string, nickname?: string) {
    if (userId === targetUserId) {
      const err: any = new Error('Cannot add yourself to contacts');
      err.status = 400;
      throw err;
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
    });
    if (!targetUser) {
      const err: any = new Error('Target user not found');
      err.status = 404;
      throw err;
    }

    const contact = await prisma.contact.upsert({
      where: {
        userId_contactUserId: {
          userId,
          contactUserId: targetUserId,
        },
      },
      update: { nickname },
      create: {
        userId,
        contactUserId: targetUserId,
        nickname,
      },
      include: {
        contactUser: {
          include: { profile: true },
        },
      },
    });

    return {
      id: contact.id,
      userId: contact.userId,
      contactUserId: contact.contactUserId,
      nickname: contact.nickname,
      contactUser: {
        id: contact.contactUser.id,
        username: contact.contactUser.username,
        displayName: contact.contactUser.profile?.displayName || contact.contactUser.username,
        avatarUrl: contact.contactUser.profile?.avatarUrl,
      },
    };
  }

  async removeContact(userId: string, targetUserId: string) {
    await prisma.contact.deleteMany({
      where: {
        userId,
        contactUserId: targetUserId,
      },
    });

    return { message: 'Contact removed' };
  }
}

export const contactsService = new ContactsService();
