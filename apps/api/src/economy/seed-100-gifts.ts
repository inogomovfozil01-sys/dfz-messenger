import { PrismaClient } from '@prisma/client';
import { ALL_100_GIFTS } from './gifts-catalog-data';

const prisma = new PrismaClient();

async function main() {
  console.log(`🎁 Starting safe non-destructive seeding of all ${ALL_100_GIFTS.length} gifts into database...`);

  let added = 0;
  let updated = 0;

  for (const item of ALL_100_GIFTS) {
    const res = await prisma.giftDefinition.upsert({
      where: { slug: item.slug },
      update: {
        name: item.name,
        description: item.description,
        artwork: item.artwork,
        priceStars: item.priceStars,
        rarity: item.rarity,
        category: item.category,
        isLimited: item.isLimited,
        totalSupply: item.totalSupply ?? null,
        isPremiumOnly: !!item.isPremiumOnly,
        isCollectibleEligible: !!item.isCollectibleEligible,
        isActive: true,
      },
      create: {
        name: item.name,
        slug: item.slug,
        description: item.description,
        artwork: item.artwork,
        priceStars: item.priceStars,
        rarity: item.rarity,
        category: item.category,
        isLimited: item.isLimited,
        totalSupply: item.totalSupply ?? null,
        soldCount: 0,
        isPremiumOnly: !!item.isPremiumOnly,
        isCollectibleEligible: !!item.isCollectibleEligible,
        isActive: true,
      },
    });

    if (res.createdAt.getTime() === res.updatedAt.getTime()) {
      added++;
    } else {
      updated++;
    }
  }

  const total = await prisma.giftDefinition.count();
  console.log(`✅ Successfully seeded gifts! Total in DB: ${total} (New: ${added}, Updated: ${updated})`);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error('❌ Failed to seed 100 gifts:', err);
  process.exit(1);
});
