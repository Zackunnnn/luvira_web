// prisma/demo-seed.ts
// ============================================================================
// Luvira 2.0 - Demo Seed Data Generator
// Mengisi data realistis untuk demo ke pemilik usaha (Pak Dimas & Wann)
// Mencetak akun demo tiap peran dengan sandi acak sekali ke terminal
// Sesuai Instruksi Fase 3 SEBELUM Fase 4
// ============================================================================

import { PrismaClient, Role, RegionType, OrderStatus, PaymentMethod, PaymentVerificationStatus, PromoType, DiscountType } from '@prisma/client';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { assertDatabaseSafety } from '../lib/db-guard';

const prisma = new PrismaClient();

function generateRandomPassword(length = 12): string {
  const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

async function main() {
  console.log('🚀 [DEMO SEED] Memeriksa keamanan target database...');
  assertDatabaseSafety();

  console.log('📦 [DEMO SEED] Menyiapkan data demo realistis...');

  // 1. Wilayah
  const pusat = await prisma.region.upsert({
    where: { code: 'PUSAT' },
    update: {},
    create: {
      code: 'PUSAT',
      name: 'Pusat (Kota Depok)',
      type: RegionType.PUSAT,
      address: 'Jl. Margonda Raya No. 100, Pondok Cina, Beji, Kota Depok, Jawa Barat 16424',
      province: 'Jawa Barat',
      city: 'Kota Depok',
      district: 'Beji',
      subDistrict: 'Pondok Cina',
      postalCode: '16424',
      originId: '115', // Depok
      phone: '6281234567801',
      email: 'pusat@luvira.id',
    },
  });

  const jogja = await prisma.region.upsert({
    where: { code: 'YOGYAKARTA' },
    update: {},
    create: {
      code: 'YOGYAKARTA',
      name: 'Yogyakarta (DIY)',
      type: RegionType.WILAYAH,
      address: 'Jl. Malioboro No. 45, Sosromenduran, Gedong Tengen, Kota Yogyakarta, DI Yogyakarta 55271',
      province: 'DI Yogyakarta',
      city: 'Kota Yogyakarta',
      district: 'Gedong Tengen',
      subDistrict: 'Sosromenduran',
      postalCode: '55271',
      originId: '501', // Yogyakarta
      phone: '6281234567802',
      email: 'jogja@luvira.id',
    },
  });

  // 2. Akun Demo per Peran dengan Sandi Acak
  const roles = [
    { email: 'admin.pusat@luvira.id', name: 'Admin Pusat (Naufal)', role: Role.ADMIN_PUSAT, regionId: pusat.id },
    { email: 'admin.jogja@luvira.id', name: 'Admin Wilayah (Aisyah DIY)', role: Role.ADMIN_WILAYAH, regionId: jogja.id },
    { email: 'owner@luvira.id', name: 'Owner (Pak Dimas / Wann)', role: Role.OWNER, regionId: null },
    { email: 'developer@luvira.id', name: 'Lead Developer', role: Role.DEVELOPER, regionId: null },
  ];

  const credentials: { role: string; email: string; name: string; password: string }[] = [];

  for (const acc of roles) {
    const rawPassword = generateRandomPassword(12);
    const passwordHash = await bcrypt.hash(rawPassword, 10);

    await prisma.user.upsert({
      where: { email: acc.email },
      update: {
        passwordHash,
        name: acc.name,
        role: acc.role,
        regionId: acc.regionId,
        isActive: true,
      },
      create: {
        email: acc.email,
        name: acc.name,
        passwordHash,
        role: acc.role,
        regionId: acc.regionId,
        isActive: true,
      },
    });

    credentials.push({
      role: acc.role,
      name: acc.name,
      email: acc.email,
      password: rawPassword,
    });
  }

  // 3. Stok Produk di Pusat & Yogyakarta
  const variants = await prisma.productVariant.findMany({
    include: { product: true },
  });

  console.log(`📊 [DEMO SEED] Mengatur stok untuk ${variants.length} varian kaus kaki di 2 wilayah...`);

  for (let i = 0; i < variants.length; i++) {
    const v = variants[i];
    // Pusat selalu ada stok aman (50 pasang)
    await prisma.stock.upsert({
      where: { variantId_regionId: { variantId: v.id, regionId: pusat.id } },
      update: { qty: 50, reserved: 0 },
      create: { variantId: v.id, regionId: pusat.id, qty: 50, reserved: 0 },
    });

    // Yogyakarta: sebagian varian ada stok 25 pasang, varian pertama sengaja dibuat 0 untuk demo fallback stok ke Pusat
    const jogjaQty = i === 0 ? 0 : 25;
    await prisma.stock.upsert({
      where: { variantId_regionId: { variantId: v.id, regionId: jogja.id } },
      update: { qty: jogjaQty, reserved: 0 },
      create: { variantId: v.id, regionId: jogja.id, qty: jogjaQty, reserved: 0 },
    });
  }

  // 4. Promo Demo
  await prisma.promoCode.upsert({
    where: { code: 'RESELLER2026' },
    update: {},
    create: {
      code: 'RESELLER2026',
      type: PromoType.RESELLER,
      discountType: DiscountType.PERCENTAGE,
      discountValue: 10,
      minOrderAmount: 50000,
      quota: 500,
      isActive: true,
      resellerName: 'Kemitraan Reseller Nasional',
      resellerWaNumber: '6281234567899',
    },
  });

  await prisma.promoCode.upsert({
    where: { code: 'JOGJAISTIMEWA' },
    update: {},
    create: {
      code: 'JOGJAISTIMEWA',
      type: PromoType.WILAYAH,
      regionId: jogja.id,
      discountType: DiscountType.PERCENTAGE,
      discountValue: 15,
      minOrderAmount: 40000,
      quota: 100,
      isActive: true,
    },
  });

  // 5. Pesanan Demo dengan Beragam Status Realistis
  const sampleVariant = variants[0];
  const secondVariant = variants[1] || variants[0];

  const demoOrders = [
    {
      code: `LVR-DEMO-VERIF-${Date.now().toString().slice(-4)}`,
      regionId: pusat.id,
      status: OrderStatus.MENUNGGU_VERIFIKASI,
      paymentMethod: PaymentMethod.MANUAL_TRANSFER,
      customerName: 'Dinda Permata',
      customerPhone: '6285712345678',
      customerEmail: 'dinda@example.com',
      shippingAddress: {
        provinceName: 'Jawa Barat',
        cityName: 'Kota Depok',
        district: 'Beji',
        street: 'Jl. Margonda Raya No. 88 RT 02/05',
        postalCode: '16424',
      },
      subtotal: 70000,
      netPrice: 70000,
      shippingCost: 9000,
      totalPrice: 79000,
      proofUrl: 'https://ik.imagekit.io/luvira/proofs/test-proof-bsi.jpg',
      note: 'Transfer via BSI Mobile a.n. Dinda Permata',
    },
    {
      code: `LVR-DEMO-PROS-${Date.now().toString().slice(-4)}`,
      regionId: jogja.id,
      status: OrderStatus.DIPROSES,
      paymentMethod: PaymentMethod.MIDTRANS_SNAP,
      customerName: 'Rian Pratama',
      customerPhone: '6281398765432',
      customerEmail: 'rian@example.com',
      shippingAddress: {
        provinceName: 'DI Yogyakarta',
        cityName: 'Kota Yogyakarta',
        district: 'Gondokusuman',
        street: 'Jl. Urip Sumoharjo No. 12',
        postalCode: '55222',
      },
      subtotal: 35000,
      netPrice: 35000,
      shippingCost: 8000,
      totalPrice: 43000,
      paidAt: new Date(),
    },
    {
      code: `LVR-DEMO-KIRIM-${Date.now().toString().slice(-4)}`,
      regionId: pusat.id,
      status: OrderStatus.DIKIRIM,
      paymentMethod: PaymentMethod.MIDTRANS_SNAP,
      customerName: 'Anisa Rahmawati',
      customerPhone: '6282112341234',
      customerEmail: 'anisa@example.com',
      shippingAddress: {
        provinceName: 'DKI Jakarta',
        cityName: 'Jakarta Selatan',
        district: 'Tebet',
        street: 'Jl. Tebet Barat Dalam No. 15',
        postalCode: '12810',
      },
      subtotal: 105000,
      netPrice: 105000,
      shippingCost: 10000,
      totalPrice: 115000,
      courierCode: 'jne',
      courierService: 'REG',
      trackingNumber: 'JNE882910293847',
      paidAt: new Date(Date.now() - 86400000),
    },
    {
      code: `LVR-DEMO-PEND-${Date.now().toString().slice(-4)}`,
      regionId: pusat.id,
      status: OrderStatus.MENUNGGU_PEMBAYARAN,
      paymentMethod: PaymentMethod.MANUAL_TRANSFER,
      customerName: 'Farhan Maulana',
      customerPhone: '6281898761234',
      customerEmail: 'farhan@example.com',
      shippingAddress: {
        provinceName: 'Banten',
        cityName: 'Kota Tangerang',
        district: 'Cipondoh',
        street: 'Jl. KH Hasyim Ashari No. 20',
        postalCode: '15148',
      },
      subtotal: 35000,
      netPrice: 35000,
      shippingCost: 9000,
      totalPrice: 44000,
    },
  ];

  for (const o of demoOrders) {
    const existing = await prisma.order.findUnique({ where: { code: o.code } });
    if (!existing) {
      const createdOrder = await prisma.order.create({
        data: {
          code: o.code,
          regionId: o.regionId,
          status: o.status,
          paymentMethod: o.paymentMethod,
          customerName: o.customerName,
          customerPhone: o.customerPhone,
          customerEmail: o.customerEmail,
          shippingAddress: o.shippingAddress,
          subtotal: o.subtotal,
          netPrice: o.netPrice,
          shippingCost: o.shippingCost,
          totalPrice: o.totalPrice,
          courierCode: o.courierCode || null,
          courierService: o.courierService || null,
          trackingNumber: o.trackingNumber || null,
          paidAt: o.paidAt || null,
          expiresAt: new Date(Date.now() + 86400000),
          items: {
            create: [
              {
                variantId: sampleVariant.id,
                productName: sampleVariant.product.name,
                variantName: sampleVariant.name,
                quantity: 1,
                priceEach: sampleVariant.product.price,
                subtotal: sampleVariant.product.price,
              },
            ],
          },
        },
      });

      if (o.status === OrderStatus.MENUNGGU_VERIFIKASI && o.proofUrl) {
        await prisma.payment.create({
          data: {
            orderId: createdOrder.id,
            method: PaymentMethod.MANUAL_TRANSFER,
            amount: o.totalPrice,
            proofUrl: o.proofUrl,
            status: PaymentVerificationStatus.PENDING,
          },
        });

        await prisma.notification.create({
          data: {
            targetRole: Role.ADMIN_PUSAT,
            targetRegionId: pusat.id,
            title: `Bukti Transfer Baru #${createdOrder.code}`,
            message: `Pembeli ${o.customerName} mengunggah bukti transfer sebesar Rp ${o.totalPrice.toLocaleString('id-ID')}.`,
            linkUrl: `/dashboard/admin?orderId=${createdOrder.id}`,
          },
        });
      }
    }
  }

  // 6. Cetak Kredensial Demo ke Terminal Sekali
  console.log('\n================================================================================');
  console.log('🎉 [DEMO SEED BERHASIL] Kredensial Akun Demo Luvira 2.0:');
  console.log('CATATAN: Sandi ini di-generate secara acak dan HANYA dicetak sekali di terminal ini.');
  console.log('================================================================================\n');

  console.table(
    credentials.map((c) => ({
      Peran: c.role,
      Nama: c.name,
      Email: c.email,
      'Kata Sandi': c.password,
    }))
  );

  console.log('\n================================================================================');
  console.log('📌 Skenario Demo Siap Dijalankan! Baca panduan lengkap di docs/DEMO_GUIDE.md');
  console.log('================================================================================\n');
}

main()
  .catch((e) => {
    console.error('❌ Gagal menjalankan demo:seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
