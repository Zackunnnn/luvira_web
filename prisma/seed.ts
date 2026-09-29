import { PrismaClient } from '@prisma/client';
import { MOCK_PRODUCTS } from '../data/products';
import { DEFAULT_SITE_CONTENT } from '../data/defaultContent';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Start seeding...');

  // 0. Seed Admin User
  console.log('Seeding User...');
  const adminPasswordHash = await bcrypt.hash('admin123', 10);
  await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      passwordHash: adminPasswordHash,
      role: 'admin',
    },
  });

  console.log('Seeding Owner User...');
  const ownerPasswordHash = await bcrypt.hash('owner123', 10);
  await prisma.user.upsert({
    where: { username: 'owner' },
    update: {},
    create: {
      username: 'owner',
      passwordHash: ownerPasswordHash,
      role: 'owner',
    },
  });

  // 1. Seed SiteContent
  console.log('Seeding SiteContent...');
  await prisma.siteContent.upsert({
    where: { id: 'singleton' },
    update: {
      hero: DEFAULT_SITE_CONTENT.hero as any,
      about: DEFAULT_SITE_CONTENT.about as any,
      features: DEFAULT_SITE_CONTENT.features as any,
      microcopy: DEFAULT_SITE_CONTENT.microcopy as any,
    },
    create: {
      id: 'singleton',
      hero: DEFAULT_SITE_CONTENT.hero as any,
      about: DEFAULT_SITE_CONTENT.about as any,
      features: DEFAULT_SITE_CONTENT.features as any,
      microcopy: DEFAULT_SITE_CONTENT.microcopy as any,
    },
  });

  // 2. Seed Products and Variants
  console.log('Seeding Products...');
  for (const p of MOCK_PRODUCTS) {
    const existingProduct = await prisma.product.findUnique({
      where: { id: p.id },
    });

    if (!existingProduct) {
      await prisma.product.create({
        data: {
          id: p.id,
          name: p.name,
          model: p.model,
          price: p.price,
          originalPrice: p.originalPrice,
          rating: p.rating,
          reviewsCount: p.reviewsCount,
          badge: p.badge,
          description: p.description,
          features: p.features,
          variants: {
            create: p.variants.map((v) => ({
              id: v.id,
              name: v.name,
              hex: v.hex,
              imageUrl: v.image,
              stock: v.stock,
            })),
          },
        },
      });
      console.log(`Created product: ${p.name}`);
    } else {
      console.log(`Product already exists: ${p.name}`);
    }
  }

  console.log('Seeding finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
