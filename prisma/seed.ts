// prisma/seed.ts
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import {
  PrismaClient,
  Role,
  RegionType,
  PromoType,
  DiscountType,
  StockMovementType,
} from '@prisma/client';
import { assertDatabaseSafety } from '../lib/db-guard';

const prisma = new PrismaClient();

function generateRandomPassword(): string {
  return crypto.randomBytes(6).toString('hex') + 'Luv1!';
}

async function main() {
  assertDatabaseSafety();
  console.log('--- [LUVIRA 2.0 SEED] Memulai Seeding Database Staging/Dev ---');

  // 1. Wilayah
  console.log('[Seed] 1. Menyiapkan Wilayah Gudang...');
  const pusat = await prisma.region.upsert({
    where: { code: 'PUSAT' },
    update: {
      name: 'Pusat (Kota Depok)',
      type: RegionType.PUSAT,
      originId: '25976', // Kota Depok (Komerce ID: Beji Depok)
      address: '[PLACEHOLDER] Jl. Margonda Raya No. 100, Beji, Kota Depok',
      province: 'Jawa Barat',
      city: 'Kota Depok',
      district: 'Beji',
      subDistrict: 'Kemirimuka',
      postalCode: '16423',
      phone: '081234567890',
      email: 'pusat@luvira.id',
      isActive: true,
    },
    create: {
      name: 'Pusat (Kota Depok)',
      code: 'PUSAT',
      type: RegionType.PUSAT,
      originId: '25976',
      address: '[PLACEHOLDER] Jl. Margonda Raya No. 100, Beji, Kota Depok',
      province: 'Jawa Barat',
      city: 'Kota Depok',
      district: 'Beji',
      subDistrict: 'Kemirimuka',
      postalCode: '16423',
      phone: '081234567890',
      email: 'pusat@luvira.id',
      isActive: true,
    },
  });

  const yogya = await prisma.region.upsert({
    where: { code: 'YOGYAKARTA' },
    update: {
      name: 'Yogyakarta (DIY)',
      type: RegionType.WILAYAH,
      originId: '31405', // Kota Yogyakarta (Komerce ID: Danurejan)
      address: '[PLACEHOLDER] Jl. Malioboro No. 45, Danurejan, Kota Yogyakarta',
      province: 'DI Yogyakarta',
      city: 'Kota Yogyakarta',
      district: 'Danurejan',
      subDistrict: 'Suryatmajan',
      postalCode: '55213',
      phone: '081298765432',
      email: 'jogja@luvira.id',
      isActive: true,
    },
    create: {
      name: 'Yogyakarta (DIY)',
      code: 'YOGYAKARTA',
      type: RegionType.WILAYAH,
      originId: '31405',
      address: '[PLACEHOLDER] Jl. Malioboro No. 45, Danurejan, Kota Yogyakarta',
      province: 'DI Yogyakarta',
      city: 'Kota Yogyakarta',
      district: 'Danurejan',
      subDistrict: 'Suryatmajan',
      postalCode: '55213',
      phone: '081298765432',
      email: 'jogja@luvira.id',
      isActive: true,
    },
  });

  // 2. Cakupan Wilayah Layanan
  console.log('[Seed] 2. Menyiapkan Cakupan Wilayah (RegionCoverage)...');
  await prisma.regionCoverage.deleteMany(); // Reset coverage table

  await prisma.regionCoverage.create({
    data: {
      regionId: yogya.id,
      provinceName: 'DI Yogyakarta',
      cityName: null,
      isDefault: false,
    },
  });

  await prisma.regionCoverage.create({
    data: {
      regionId: pusat.id,
      provinceName: 'Seluruh Indonesia',
      cityName: null,
      isDefault: true, // Default fallback jika di luar DIY
    },
  });

  // 3. Akun Pengguna 5 Peran
  console.log('[Seed] 3. Menyiapkan Akun untuk 4 Peran Sistem...');
  const usersToSeed = [
    {
      email: 'admin.pusat@luvira.id',
      name: 'Admin Pusat Depok',
      role: Role.ADMIN_PUSAT,
      regionId: pusat.id,
    },
    {
      email: 'admin.jogja@luvira.id',
      name: 'Admin Wilayah Yogyakarta',
      role: Role.ADMIN_WILAYAH,
      regionId: yogya.id,
    },
    {
      email: 'owner@luvira.id',
      name: 'Pak Dimas / Wann (Owner)',
      role: Role.OWNER,
      regionId: null,
    },
    {
      email: 'dev@luvira.id',
      name: 'Senior Developer',
      role: Role.DEVELOPER,
      regionId: null,
    },
    {
      email: 'developer@luvira.id',
      name: 'Senior Developer (Alias)',
      role: Role.DEVELOPER,
      regionId: null,
    },
  ];

  const DEFAULT_SEED_PASSWORDS: Record<string, string> = {
    'owner@luvira.id': process.env.SEED_OWNER_PASSWORD || 'LuviraOwner2026!',
    'admin.pusat@luvira.id': process.env.SEED_PUSAT_PASSWORD || 'LuviraPusat2026!',
    'admin.jogja@luvira.id': process.env.SEED_JOGJA_PASSWORD || 'LuviraJogja2026!',
    'dev@luvira.id': process.env.SEED_DEV_PASSWORD || 'LuviraDev2026!',
    'developer@luvira.id': process.env.SEED_DEV_PASSWORD || 'LuviraDev2026!',
  };

  const credentialsLog: { email: string; role: Role; password: string }[] = [];

  for (const u of usersToSeed) {
    const rawPass =
      process.env.FORCE_RANDOM_SEED_PASSWORDS === 'true'
        ? generateRandomPassword()
        : DEFAULT_SEED_PASSWORDS[u.email] || generateRandomPassword();
    const hash = await bcrypt.hash(rawPass, 10);
    await prisma.user.upsert({
      where: { email: u.email },
      update: {
        name: u.name,
        role: u.role,
        regionId: u.regionId,
        passwordHash: hash,
        isActive: true,
      },
      create: {
        email: u.email,
        name: u.name,
        role: u.role,
        regionId: u.regionId,
        passwordHash: hash,
        isActive: true,
      },
    });
    credentialsLog.push({ email: u.email, role: u.role, password: rawPass });
  }

  // 4. Rekening Transfer Manual
  console.log('[Seed] 4. Menyiapkan Rekening Pembayaran...');
  await prisma.paymentAccount.deleteMany();
  await prisma.paymentAccount.createMany({
    data: [
      {
        bankName: 'Jago Syariah',
        accountNumber: '509366156008',
        accountHolder: 'Muhammad Naufal Ammr Dzakwan',
        isActive: true,
      },
      {
        bankName: 'BSI',
        accountNumber: '7239477938',
        accountHolder: 'Muhammad Naufal Ammr Dzakwan',
        isActive: true,
      },
    ],
  });

  // 5. Pengaturan Sistem (Settings)
  console.log('[Seed] 5. Menyiapkan Pengaturan Awal (Settings)...');
  const defaultSettings = [
    { key: 'ppnRate', value: { rate: 11 }, description: 'Tarif PPN dalam persen (11%)' },
    { key: 'maxDiscountPercent', value: { max: 50 }, description: 'Batas diskon promo maksimum' },
    {
      key: 'activeCouriers',
      value: { couriers: ['jne', 'pos', 'tiki', 'sicepat', 'jnt'] },
      description: 'Daftar kurir yang didukung',
    },
    { key: 'lowStockThreshold', value: { threshold: 10 }, description: 'Ambang batas peringatan stok menipis' },
    { key: 'packageWeightGram', value: { weight: 0 }, description: 'Berat kemasan tambahan (gram)' },
  ];

  for (const s of defaultSettings) {
    await prisma.setting.upsert({
      where: { key: s.key },
      update: { value: s.value, description: s.description },
      create: { key: s.key, value: s.value, description: s.description },
    });
  }

  // 6. Migrasi Produk & Varian dari Cadangan Backups
  console.log('[Seed] 6. Memigrasikan Data Produk & Varian dari backups/...');
  const backupsProdPath = path.resolve(process.cwd(), 'backups/Product.json');
  const backupsVarPath = path.resolve(process.cwd(), 'backups/ColorVariant.json');

  if (fs.existsSync(backupsProdPath) && fs.existsSync(backupsVarPath)) {
    const rawProds = JSON.parse(fs.readFileSync(backupsProdPath, 'utf8'));
    const rawVars = JSON.parse(fs.readFileSync(backupsVarPath, 'utf8'));

    const varsByProd = new Map<string, any[]>();
    for (const v of rawVars) {
      if (!varsByProd.has(v.productId)) varsByProd.set(v.productId, []);
      varsByProd.get(v.productId)!.push(v);
    }

    for (const p of rawProds) {
      const slug = p.model || p.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const product = await prisma.product.upsert({
        where: { slug },
        update: {
          name: p.name,
          model: p.model,
          description: p.description,
          price: p.price,
          originalPrice: p.originalPrice,
          rating: p.rating || 5.0,
          reviewsCount: p.reviewsCount || 0,
          badge: p.badge,
          features: p.features || [],
          isActive: true,
        },
        create: {
          id: p.id,
          name: p.name,
          slug,
          model: p.model,
          description: p.description,
          price: p.price,
          originalPrice: p.originalPrice,
          rating: p.rating || 5.0,
          reviewsCount: p.reviewsCount || 0,
          badge: p.badge,
          features: p.features || [],
          isActive: true,
        },
      });

      const pVars = varsByProd.get(p.id) || [];
      for (const v of pVars) {
        // Tentukan SKU dan foto lokal sesuai pemetaan
        const legacyUrl = v.imageUrl || '';
        const match = legacyUrl.match(/-(as\d+|bsst\d+|bs\d+|est\d+|e\d+)_/i);
        const code = match ? match[1].toLowerCase() : v.id.slice(-5);
        const sku = `LVR-${slug.toUpperCase().slice(0, 4)}-${v.name.toUpperCase().replace(/\s+/g, '').slice(0, 4)}-${code.toUpperCase()}`;
        const localPhotoPath = match ? `/socks/${code}.webp` : legacyUrl;

        const variant = await prisma.productVariant.upsert({
          where: { sku },
          update: {
            name: v.name,
            hex: v.hex,
            weightGram: 35, // Default 35 gram
            imageUrl: localPhotoPath,
            legacyImageUrl: legacyUrl,
            isActive: true,
          },
          create: {
            id: v.id,
            productId: product.id,
            name: v.name,
            hex: v.hex,
            sku,
            weightGram: 35,
            imageUrl: localPhotoPath,
            legacyImageUrl: legacyUrl,
            isActive: true,
          },
        });

        // 7. Harga Modal Terpisah (ProductCost)
        await prisma.productCost.upsert({
          where: { variantId: variant.id },
          update: {
            costPrice: p.costPrice || 15000,
            packingCost: p.packingCost || 2000,
          },
          create: {
            variantId: variant.id,
            costPrice: p.costPrice || 15000,
            packingCost: p.packingCost || 2000,
          },
        });

        // 8. Stok per Wilayah (Pusat & Yogyakarta)
        // Stok Pusat: 50 pasang, Stok Yogyakarta: 25 pasang
        const pusatStock = await prisma.stock.upsert({
          where: {
            variantId_regionId: {
              variantId: variant.id,
              regionId: pusat.id,
            },
          },
          update: { qty: 50, reserved: 0 },
          create: {
            variantId: variant.id,
            regionId: pusat.id,
            qty: 50,
            reserved: 0,
          },
        });

        const jogjaStock = await prisma.stock.upsert({
          where: {
            variantId_regionId: {
              variantId: variant.id,
              regionId: yogya.id,
            },
          },
          update: { qty: 25, reserved: 0 },
          create: {
            variantId: variant.id,
            regionId: yogya.id,
            qty: 25,
            reserved: 0,
          },
        });

        // Catat StockMovement awal
        await prisma.stockMovement.createMany({
          data: [
            {
              stockId: pusatStock.id,
              type: StockMovementType.IN,
              qtyChange: 50,
              balanceAfter: 50,
              reason: 'Initial Seed Gudang Pusat',
              actorId: null,
            },
            {
              stockId: jogjaStock.id,
              type: StockMovementType.IN,
              qtyChange: 25,
              balanceAfter: 25,
              reason: 'Initial Seed Gudang Yogyakarta',
              actorId: null,
            },
          ],
        });
      }
    }
  }

  // 9. Kode Promo Awal
  console.log('[Seed] 9. Menyiapkan Kode Promo Reseller & Wilayah...');
  await prisma.promoCode.upsert({
    where: { code: 'RESELLER2026' },
    update: {
      type: PromoType.RESELLER,
      discountType: DiscountType.PERCENTAGE,
      discountValue: 10,
      minOrderAmount: 50000,
      quota: 100,
      isActive: true,
      resellerName: 'Mitra Reseller Nasional',
      resellerWaNumber: '628123456789',
    },
    create: {
      code: 'RESELLER2026',
      type: PromoType.RESELLER,
      discountType: DiscountType.PERCENTAGE,
      discountValue: 10,
      minOrderAmount: 50000,
      quota: 100,
      isActive: true,
      resellerName: 'Mitra Reseller Nasional',
      resellerWaNumber: '628123456789',
    },
  });

  await prisma.promoCode.upsert({
    where: { code: 'JOGJAISTIMEWA' },
    update: {
      type: PromoType.WILAYAH,
      regionId: yogya.id,
      discountType: DiscountType.PERCENTAGE,
      discountValue: 15,
      maxDiscountAmount: 25000,
      minOrderAmount: 40000,
      quota: 50,
      isActive: true,
    },
    create: {
      code: 'JOGJAISTIMEWA',
      type: PromoType.WILAYAH,
      regionId: yogya.id,
      discountType: DiscountType.PERCENTAGE,
      discountValue: 15,
      maxDiscountAmount: 25000,
      minOrderAmount: 40000,
      quota: 50,
      isActive: true,
    },
  });

  console.log('================================================================');
  console.log('  LUVIRA 2.0 SEEDING SUKSES');
  console.log('================================================================');
  console.log('  Kredensial Akun Contoh (Dicetak Sekali di Terminal):');
  for (const c of credentialsLog) {
    console.log(`  - [${c.role.padEnd(13)}] ${c.email.padEnd(25)} Sandi: ${c.password}`);
  }
  console.log('================================================================');
  console.log('  Produk: 5 | Varian: 26 | Stok Pusat & Jogja Aktif | 2 Rekening Asli');
  console.log('================================================================');
}

main()
  .catch((e) => {
    console.error('[Seed Error]', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
