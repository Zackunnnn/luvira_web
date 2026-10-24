// scripts/import-mysql.ts
// ============================================================================
// Skrip Migrasi & Impor Data dari JSON Backup Neon ke Database MySQL Hostinger
// Menjaga integritas relasi tabel, nilai uang, tanggal, dan format JSON features.
// ============================================================================

import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();
const BACKUP_DIR = path.join(process.cwd(), 'backups');

function readBackupFile<T>(tableName: string): T[] {
  const filePath = path.join(BACKUP_DIR, `${tableName}.json`);
  if (!fs.existsSync(filePath)) {
    console.warn(`[WARN] File backup ${filePath} tidak ditemukan.`);
    return [];
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

async function main() {
  console.log('=== MEMULAI IMPORT DATA KE DATABASE MYSQL ===\n');

  // 1. Import Product
  const products = readBackupFile<any>('Product');
  console.log(`Mengimpor ${products.length} data Product...`);
  for (const prod of products) {
    await prisma.product.upsert({
      where: { id: prod.id },
      update: {},
      create: {
        id: prod.id,
        name: prod.name,
        model: prod.model,
        price: prod.price,
        originalPrice: prod.originalPrice,
        rating: prod.rating,
        reviewsCount: prod.reviewsCount,
        badge: prod.badge,
        description: prod.description,
        features: prod.features, // Prisma serialize otomatis ke Json di MySQL
        createdAt: new Date(prod.createdAt),
        updatedAt: new Date(prod.updatedAt),
        costPrice: prod.costPrice || 0,
        packingCost: prod.packingCost || 0,
      },
    });
  }

  // 2. Import ColorVariant
  const variants = readBackupFile<any>('ColorVariant');
  console.log(`Mengimpor ${variants.length} data ColorVariant...`);
  for (const v of variants) {
    await prisma.colorVariant.upsert({
      where: { id: v.id },
      update: {},
      create: {
        id: v.id,
        productId: v.productId,
        name: v.name,
        hex: v.hex,
        imageUrl: v.imageUrl,
        stock: v.stock,
      },
    });
  }

  // 3. Import SiteContent
  const contents = readBackupFile<any>('SiteContent');
  console.log(`Mengimpor ${contents.length} data SiteContent...`);
  for (const c of contents) {
    await prisma.siteContent.upsert({
      where: { id: c.id },
      update: {},
      create: {
        id: c.id,
        hero: c.hero,
        about: c.about,
        features: c.features,
        microcopy: c.microcopy,
        updatedAt: new Date(c.updatedAt),
      },
    });
  }

  // 4. Import User (admin & owner)
  const users = readBackupFile<any>('User');
  console.log(`Mengimpor ${users.length} data User...`);
  for (const u of users) {
    await prisma.user.upsert({
      where: { username: u.username },
      update: {},
      create: {
        id: u.id,
        username: u.username,
        passwordHash: u.passwordHash,
        role: u.role,
        createdAt: new Date(u.createdAt),
      },
    });
  }

  // 5. Import PromoCode
  const promos = readBackupFile<any>('PromoCode');
  console.log(`Mengimpor ${promos.length} data PromoCode...`);
  for (const p of promos) {
    await prisma.promoCode.upsert({
      where: { code: p.code },
      update: {},
      create: {
        id: p.id,
        code: p.code,
        discountType: p.discountType,
        discountValue: p.discountValue,
        resellerName: p.resellerName,
        resellerWaNumber: p.resellerWaNumber,
        commissionType: p.commissionType,
        commissionValue: p.commissionValue,
        quota: p.quota,
        usedCount: p.usedCount,
        expiresAt: p.expiresAt ? new Date(p.expiresAt) : null,
        isActive: p.isActive,
        isFreeShipping: p.isFreeShipping ?? false,
        isFreeTax: p.isFreeTax ?? false,
      },
    });
  }

  // 6. Import Order & OrderItem
  const orders = readBackupFile<any>('Order');
  const orderItems = readBackupFile<any>('OrderItem');
  console.log(`Mengimpor ${orders.length} Order dan ${orderItems.length} OrderItem...`);
  
  for (const o of orders) {
    await prisma.order.upsert({
      where: { id: o.id },
      update: {},
      create: {
        id: o.id,
        customerName: o.customerName,
        customerPhone: o.customerPhone,
        customerAddress: o.customerAddress,
        status: o.status,
        promoCodeId: o.promoCodeId,
        shippingCourier: o.shippingCourier,
        shippingCost: o.shippingCost,
        ppnAmount: o.ppnAmount,
        paymentProofUrl: o.paymentProofUrl,
        paymentDeadline: o.paymentDeadline ? new Date(o.paymentDeadline) : null,
        verifiedBy: o.verifiedBy,
        verifiedAt: o.verifiedAt ? new Date(o.verifiedAt) : null,
        paymentMethod: o.paymentMethod || 'manual',
        midtransToken: o.midtransToken,
        createdAt: new Date(o.createdAt),
      },
    });
  }

  for (const item of orderItems) {
    await prisma.orderItem.upsert({
      where: { id: item.id },
      update: {},
      create: {
        id: item.id,
        orderId: item.orderId,
        productId: item.productId,
        variantId: item.variantId,
        quantity: item.quantity,
        priceEach: item.priceEach,
        costEach: item.costEach || 0,
        packingEach: item.packingEach || 0,
      },
    });
  }

  // 7. Verifikasi Integritas Pasca-Impor
  console.log('\n=== VERIFIKASI INTEGRITAS DATA SETELAH IMPOR ===\n');
  const countProduct = await prisma.product.count();
  const countVariant = await prisma.colorVariant.count();
  const countContent = await prisma.siteContent.count();
  const countUser = await prisma.user.count();
  const countPromo = await prisma.promoCode.count();
  const countOrder = await prisma.order.count();
  const countItem = await prisma.orderItem.count();

  const verificationTable = [
    { Tabel: 'Product', 'Target (Backup)': products.length, 'Aktual (DB)': countProduct, Status: countProduct === products.length ? 'OK' : 'MISMATCH' },
    { Tabel: 'ColorVariant', 'Target (Backup)': variants.length, 'Aktual (DB)': countVariant, Status: countVariant === variants.length ? 'OK' : 'MISMATCH' },
    { Tabel: 'SiteContent', 'Target (Backup)': contents.length, 'Aktual (DB)': countContent, Status: countContent === contents.length ? 'OK' : 'MISMATCH' },
    { Tabel: 'User', 'Target (Backup)': users.length, 'Aktual (DB)': countUser, Status: countUser === users.length ? 'OK' : 'MISMATCH' },
    { Tabel: 'PromoCode', 'Target (Backup)': promos.length, 'Aktual (DB)': countPromo, Status: countPromo === promos.length ? 'OK' : 'MISMATCH' },
    { Tabel: 'Order', 'Target (Backup)': orders.length, 'Aktual (DB)': countOrder, Status: countOrder === orders.length ? 'OK' : 'MISMATCH' },
    { Tabel: 'OrderItem', 'Target (Backup)': orderItems.length, 'Aktual (DB)': countItem, Status: countItem === orderItems.length ? 'OK' : 'MISMATCH' },
  ];

  console.table(verificationTable);
  console.log('\nImpor dan verifikasi selesai dengan sukses!');
}

main()
  .catch((e) => {
    console.error('Fatal error saat impor:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
