import { prisma } from '../prisma';

export class FoldersService {
  async getUserFolders(userId: string) {
    const folders = await prisma.chatFolder.findMany({
      where: { userId },
      orderBy: { order: 'asc' },
    });

    return folders.map((f) => ({
      id: f.id,
      userId: f.userId,
      name: f.name,
      icon: f.icon,
      filterType: f.filterType,
      chatIds: f.chatIds ? (f.chatIds as string[]) : [],
      order: f.order,
      createdAt: f.createdAt.toISOString(),
    }));
  }

  async createFolder(userId: string, data: {
    name: string;
    icon?: string;
    filterType?: string;
    chatIds?: string[];
  }) {
    const count = await prisma.chatFolder.count({ where: { userId } });

    const folder = await prisma.chatFolder.create({
      data: {
        userId,
        name: data.name.trim(),
        icon: data.icon || 'folder',
        filterType: data.filterType || 'CUSTOM',
        chatIds: data.chatIds || [],
        order: count,
      },
    });

    return {
      id: folder.id,
      userId: folder.userId,
      name: folder.name,
      icon: folder.icon,
      filterType: folder.filterType,
      chatIds: folder.chatIds ? (folder.chatIds as string[]) : [],
      order: folder.order,
      createdAt: folder.createdAt.toISOString(),
    };
  }

  async updateFolder(userId: string, folderId: string, data: {
    name?: string;
    icon?: string;
    filterType?: string;
    chatIds?: string[];
    order?: number;
  }) {
    const existing = await prisma.chatFolder.findFirst({
      where: { id: folderId, userId },
    });

    if (!existing) {
      const err: any = new Error('Folder not found');
      err.status = 404;
      throw err;
    }

    const updated = await prisma.chatFolder.update({
      where: { id: folderId },
      data: {
        ...(data.name && { name: data.name.trim() }),
        ...(data.icon !== undefined && { icon: data.icon }),
        ...(data.filterType && { filterType: data.filterType }),
        ...(data.chatIds !== undefined && { chatIds: data.chatIds }),
        ...(data.order !== undefined && { order: data.order }),
      },
    });

    return {
      id: updated.id,
      userId: updated.userId,
      name: updated.name,
      icon: updated.icon,
      filterType: updated.filterType,
      chatIds: updated.chatIds ? (updated.chatIds as string[]) : [],
      order: updated.order,
      createdAt: updated.createdAt.toISOString(),
    };
  }

  async deleteFolder(userId: string, folderId: string) {
    const existing = await prisma.chatFolder.findFirst({
      where: { id: folderId, userId },
    });

    if (!existing) {
      const err: any = new Error('Folder not found');
      err.status = 404;
      throw err;
    }

    await prisma.chatFolder.delete({
      where: { id: folderId },
    });

    return { message: 'Folder deleted' };
  }
}

export const foldersService = new FoldersService();
