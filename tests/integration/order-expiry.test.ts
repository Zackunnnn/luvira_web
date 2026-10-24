// tests/integration/order-expiry.test.ts
// ============================================================================
// Uji Integrasi: Pelepasan Stok & Pengembalian Promo Pesanan Kedaluwarsa
// Sesuai docs/LUVIRA_2_PLAN.md Bagian 5.3, 8.4, E2E-07
// ============================================================================

import { test, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '@/lib/db';
import { createOrderWithAtomicReservation } from '@/lib/orders/order-routing';
import { OrderStatus, PaymentMethod, DiscountType } from '@prisma/client';

let testPromo: any = null;
let testVariant: any = null;
let testRegion: any = null;
let expiredOrderId = '';

beforeAll(async () => {
  testRegion = await prisma.region.findFirst({ where: { code: 'PUSAT' } });
  testVariant = await prisma.productVariant.findFirst({ include: { product: true } });

  // 1. Buat kode promo uji
  testPromo = await prisma.promoCode.create({
    data: {
      code: `EXPTEST-${Date.now()}`,
      discountType: DiscountType.FIXED,
      discountValue: 10000,
      quota: 10,
      usedCount: 0,
      isActive: true,
    },
  });

  // 2. Pastikan stok mencukupi
  await prisma.stock.upsert({
    where: {
      variantId_regionId: {
        variantId: testVariant.id,
        regionId: testRegion.id,
      },
    },
    update: { qty: 20, reserved: 0 },
    create: {
      variantId: testVariant.id,
      regionId: testRegion.id,
      qty: 20,
      reserved: 0,
    },
  });

  // 3. Buat pesanan dengan promo
  const res = await createOrderWithAtomicReservation({
    customerName: 'Pembeli Kedaluwarsa',
    customerPhone: '081299998888',
    destination: {
      provinceName: 'Jawa Barat',
      cityName: 'Kota Depok',
      street: 'Jl. Margonda Raya No. 99',
    },
    items: [
      {
        productId: testVariant.productId,
        variantId: testVariant.id,
        quantity: 3,
      },
    ],
    paymentMethod: PaymentMethod.MANUAL_TRANSFER,
    promoCodeId: testPromo.id,
  });

  expiredOrderId = res.order.id;

  // 4. Sengaja ubah expiresAt menjadi 2 jam yang lalu
  await prisma.order.update({
    where: { id: expiredOrderId },
    data: {
      expiresAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    },
  });
});

afterAll(async () => {
  // Bersihkan data promo uji
  if (testPromo) {
    await prisma.promoCode.delete({ where: { id: testPromo.id } }).catch(() => {});
  }
});

test('Order Expiry Cron: Membatalkan pesanan kedaluwarsa, melepas stok reserved, dan mengembalikan kuota promo', async () => {
  // 1. Periksa keadaan sebelum cron jalan
  const stockBefore = await prisma.stock.findUnique({
    where: {
      variantId_regionId: {
        variantId: testVariant.id,
        regionId: testRegion.id,
      },
    },
  });
  expect(stockBefore!.reserved).toBeGreaterThanOrEqual(3);

  const promoBefore = await prisma.promoCode.findUnique({
    where: { id: testPromo.id },
  });
  expect(promoBefore!.usedCount).toBe(1);

  // 2. Simulasikan pemanggilan API Cron expire-orders
  const cronUrl = 'http://localhost:3000/api/cron/expire-orders';
  const { POST } = await import('@/app/api/cron/expire-orders/route');

  const req = new Request(cronUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.CRON_SECRET || 'dev-cron-secret-123'}`,
    },
  });

  const response = await POST(req as any);
  const json = await response.json();

  expect(response.status).toBe(200);
  expect(json.success).toBe(true);
  expect(json.processedCount).toBeGreaterThanOrEqual(1);

  // 3. Verifikasi status pesanan berubah menjadi DIBATALKAN
  const updatedOrder = await prisma.order.findUnique({
    where: { id: expiredOrderId },
    include: { statusLogs: true },
  });
  expect(updatedOrder!.status).toBe(OrderStatus.DIBATALKAN);

  // 4. Verifikasi stok reserved telah berkurang (dilepas)
  const stockAfter = await prisma.stock.findUnique({
    where: {
      variantId_regionId: {
        variantId: testVariant.id,
        regionId: testRegion.id,
      },
    },
  });
  expect(stockAfter!.reserved).toBe(stockBefore!.reserved - 3);

  // 5. Verifikasi kuota promo dikembalikan (usedCount berkurang 1 menjadi 0)
  const promoAfter = await prisma.promoCode.findUnique({
    where: { id: testPromo.id },
  });
  expect(promoAfter!.usedCount).toBe(0);
});
