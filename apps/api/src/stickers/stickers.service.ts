import { prisma } from '../prisma';

export class StickersService {
  /**
   * Seed default sticker packs if database is empty
   */
  async ensureSeedPacks() {
    const count = await prisma.stickerPack.count();
    if (count > 0) return;

    // Pack 1: DFZ Expressive
    await prisma.stickerPack.create({
      data: {
        name: 'dfz-expressive',
        title: 'DFZ Expressive',
        author: 'DFZ Team',
        isOfficial: true,
        stickers: {
          create: [
            { emoji: '🔥', url: 'https://images.unsplash.com/photo-1525609004556-c46c7d6cf023?w=256&h=256&fit=crop' },
            { emoji: '🚀', url: 'https://images.unsplash.com/photo-1517976487502-d9c0287a956d?w=256&h=256&fit=crop' },
            { emoji: '🎉', url: 'https://images.unsplash.com/photo-1513151233558-d860c5398176?w=256&h=256&fit=crop' },
            { emoji: '💡', url: 'https://images.unsplash.com/photo-1507668077129-56e32842fceb?w=256&h=256&fit=crop' },
            { emoji: '❤️', url: 'https://images.unsplash.com/photo-1518199266791-5375a83190b7?w=256&h=256&fit=crop' },
            { emoji: '😎', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=256&h=256&fit=crop' },
            { emoji: '⚡', url: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=256&h=256&fit=crop' },
            { emoji: '🎯', url: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=256&h=256&fit=crop' },
          ],
        },
      },
    });

    // Pack 2: Neon Vibes
    await prisma.stickerPack.create({
      data: {
        name: 'neon-vibes',
        title: 'Neon Vibes',
        author: 'DFZ Studio',
        isOfficial: true,
        stickers: {
          create: [
            { emoji: '🌟', url: 'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?w=256&h=256&fit=crop' },
            { emoji: '💎', url: 'https://images.unsplash.com/photo-1515377905703-c4788e51af15?w=256&h=256&fit=crop' },
            { emoji: '✨', url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=256&h=256&fit=crop' },
            { emoji: '🌈', url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=256&h=256&fit=crop' },
          ],
        },
      },
    });
  }

  /**
   * Get all sticker packs with stickers
   */
  async getPacks() {
    await this.ensureSeedPacks();
    return prisma.stickerPack.findMany({
      include: {
        stickers: true,
      },
      orderBy: { createdAt: 'asc' },
    });
  }
}

export const stickersService = new StickersService();
