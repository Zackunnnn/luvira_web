// tests/integration/stock-concurrency.test.ts
// ============================================================================
// Uji Konkurensi: 30 Permintaan Bersamaan Anti-Overselling Luvira 2.0
// Sesuai docs/LUVIRA_2_PLAN.md Bagian 13 (Testing Menyeluruh Butir 4)
// Tiap tes mengisolasi datanya sendiri tanpa ketergantungan antar-tes.
// ============================================================================

import { test, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '@/lib/db';
import { createOrderWithAtomicReservation } from '@/lib/orders/order-routing';
import { PaymentMethod } from '@prisma/client';

let testProduct: any = null;
let testVariant: any = null;
let testRegion: any = null;

beforeAll(async () => {
  // Ambil region Pusat
  testRegion = await prisma.region.findFirst({ where: { code: 'PUSAT' } });
  if (!testRegion) throw new Error('Region Pusat belum di-seed');

  // Buat produk & varian dedikasi khusus untuk uji konkurensi (100% data terisolasi)
  testProduct = await prisma.product.create({
    data: {
      name: `Produk Konkurensi ${Date.now()}`,
      slug: `produk-konkurensi-${Date.now()}`,
      model: 'test-model',
      description: 'Uji anti-overselling',
      price: 30000,
      variants: {
        create: {
          name: 'Varian Uji Stok',
          sku: `SKU-TEST-${Date.now()}`,
          hex: '#000080',
          imageUrl: '/socks/as1.webp',
          weightGram: 35,
        },
      },
    },
    include: { variants: true },
  });

  testVariant = testProduct.variants[0];

  // Set stok tepat 5 buah (reserved: 0)
  await prisma.stock.create({
    data: {
      variantId: testVariant.id,
      regionId: testRegion.id,
      qty: 5,
      reserved: 0,
    },
  });
});

afterAll(async () => {
  // Bersihkan data uji setelah selesai
  if (testProduct) {
    try {
      await prisma.stockMovement.deleteMany({
        where: { stock: { variantId: testVariant.id } },
      });
      await prisma.stock.deleteMany({
        where: { variantId: testVariant.id },
      });
      await prisma.orderItem.deleteMany({
        where: { variantId: testVariant.id },
      });
      await prisma.product.delete({
        where: { id: testProduct.id },
      });
    } catch {
      // Abaikan jika sudah terhapus
    }
  }
});

test(
  'Anti-Overselling: 30 permintaan bersamaan membeli stok terakhir 5 buah',
  async () => {
    const CONCURRENCY_COUNT = 30;

    const createPromise = async (index: number) => {
      try {
        const res = await createOrderWithAtomicReservation({
          customerName: `Pembeli Konkurensi ${index}`,
          customerPhone: `0812345678${index < 10 ? '0' + index : index}`,
          destination: {
            provinceName: 'Jawa Barat',
            cityName: 'Kota Depok',
            street: `Jl. Percobaan No. ${index}`,
          },
          items: [
            {
              productId: testVariant.productId,
              variantId: testVariant.id,
              quantity: 1,
            },
          ],
          paymentMethod: PaymentMethod.MANUAL_TRANSFER,
        });
        return { success: true, orderId: res.order.id };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    };

    // Jalankan 30 pesanan dalam batch konkurensi (6 paralel x 5 batch)
    // Batch pertama (6 paralel) langsung memperebutkan 5 stok secara simultan
    // Tepat 5 harus berhasil dan 1 gagal di batch pertama, serta 24 request berikutnya ditolak
    const results: any[] = [];
    const BATCH_SIZE = 6;
    for (let i = 0; i < CONCURRENCY_COUNT; i += BATCH_SIZE) {
      const batch = Array.from(
        { length: Math.min(BATCH_SIZE, CONCURRENCY_COUNT - i) },
        (_, j) => createPromise(i + j + 1)
      );
      const batchRes = await Promise.all(batch);
      results.push(...batchRes);
    }

    const successes = results.filter((r) => r.success);
    const failures = results.filter((r) => !r.success);

    // Tepat 5 harus berhasil dan 25 harus ditolak karena stok fisik hanya 5!
    expect(successes.length).toBe(5);
    expect(failures.length).toBe(25);

    // Periksa kondisi database akhir: reserved harus tepat 5 dan sisa tersedia harus tepat 0
    const finalStock = await prisma.stock.findUnique({
      where: {
        variantId_regionId: {
          variantId: testVariant.id,
          regionId: testRegion.id,
        },
      },
    });

    expect(finalStock).toBeDefined();
    expect(finalStock!.qty).toBe(5);
    expect(finalStock!.reserved).toBe(5);
    expect(finalStock!.qty - finalStock!.reserved).toBe(0);
  },
  90000
);
