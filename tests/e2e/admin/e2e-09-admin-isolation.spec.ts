// tests/e2e/admin/e2e-09-admin-isolation.spec.ts
// ============================================================================
// E2E-09: Isolasi Wilayah Admin Wilayah & Proteksi Wewenang
// Admin Wilayah mencoba membuka/mengubah data wilayah lain -> ditolak (403)
// Sesuai docs/LUVIRA_2_PLAN.md Bagian 4 & 13
// ============================================================================

import { test, expect } from '@playwright/test';
import { prisma } from '@/lib/db';
import { createSession } from '@/lib/auth';
import { Role, OrderStatus, PaymentMethod } from '@prisma/client';

test.describe('E2E-09: Isolasi Wilayah & Pembatasan Wewenang Admin Wilayah', () => {
  let jogjaAdmin: any;
  let pusatAdmin: any;
  let jogjaToken: string;
  let pusatRegion: any;
  let jogjaRegion: any;
  let pusatOrder: any;

  test.beforeAll(async () => {
    pusatRegion = await prisma.region.findFirst({ where: { type: 'PUSAT' } });
    jogjaRegion = await prisma.region.findFirst({ where: { code: 'YOGYAKARTA' } });

    pusatAdmin = await prisma.user.findFirst({ where: { role: Role.ADMIN_PUSAT } });
    jogjaAdmin = await prisma.user.findFirst({ where: { role: Role.ADMIN_WILAYAH, regionId: jogjaRegion.id } });

    jogjaToken = await createSession({
      userId: jogjaAdmin.id,
      email: jogjaAdmin.email,
      name: jogjaAdmin.name,
      role: jogjaAdmin.role,
      regionId: jogjaAdmin.regionId,
    });

    // Buat pesanan wilayah Pusat untuk tes isolasi
    pusatOrder = await prisma.order.create({
      data: {
        code: `E2E09-PUS-${Date.now()}`,
        regionId: pusatRegion.id,
        status: OrderStatus.MENUNGGU_VERIFIKASI,
        paymentMethod: PaymentMethod.MANUAL_TRANSFER,
        customerName: 'Pelanggan Depok Pusat',
        customerPhone: '6281299998888',
        shippingAddress: { city: 'Kota Depok' },
        subtotal: 50000,
        netPrice: 50000,
        totalPrice: 60000,
        expiresAt: new Date(Date.now() + 86400000),
      },
    });
  });

  test.afterAll(async () => {
    if (pusatOrder) {
      await prisma.order.deleteMany({ where: { id: pusatOrder.id } });
    }
  });

  test('Admin Wilayah Yogyakarta DITOLAK (403) saat mengakses detail pesanan Pusat', async ({ request }) => {
    const res = await request.get(`/api/admin/orders/${pusatOrder.id}`, {
      headers: {
        Authorization: `Bearer ${jogjaToken}`,
      },
    });

    expect(res.status()).toBe(403);
    const data = await res.json();
    expect(data.error).toContain('Akses ditolak');
  });

  test('Daftar pesanan Admin Wilayah secara otomatis memfilter HANYA pesanan wilayahnya', async ({ request }) => {
    const res = await request.get('/api/admin/orders', {
      headers: {
        Authorization: `Bearer ${jogjaToken}`,
      },
    });

    expect(res.ok()).toBe(true);
    const data = await res.json();
    
    // Pastikan pesanan Pusat TIDAK bocor ke daftar pesanan Admin Wilayah
    const containsPusatOrder = data.orders.some((o: any) => o.id === pusatOrder.id);
    expect(containsPusatOrder).toBe(false);

    // Semua pesanan yang dikembalikan harus dari wilayah Yogyakarta
    for (const order of data.orders) {
      expect(order.regionId).toBe(jogjaRegion.id);
    }
  });

  test('Admin Wilayah DITOLAK (403) saat mencoba mengubah harga jual seragam', async ({ request }) => {
    const res = await request.put('/api/admin/pricing', {
      headers: {
        Authorization: `Bearer ${jogjaToken}`,
        'Content-Type': 'application/json',
      },
      data: {
        productId: 'any-product-id',
        price: 99999,
      },
    });

    expect(res.status()).toBe(403);
    const data = await res.json();
    expect(data.error).toContain('Akses ditolak');
  });

  test('Respons API produk untuk Admin tidak pernah membocorkan harga modal (HPP)', async ({ request }) => {
    const res = await request.get('/api/admin/products', {
      headers: {
        Authorization: `Bearer ${jogjaToken}`,
      },
    });

    expect(res.ok()).toBe(true);
    const data = await res.json();

    for (const product of data.products) {
      expect(product.costPrice).toBeUndefined();
      expect(product.packingCost).toBeUndefined();
      for (const variant of product.variants) {
        expect(variant.cost).toBeUndefined();
        expect(variant.costPrice).toBeUndefined();
        expect(variant.costEach).toBeUndefined();
      }
    }
  });
});
