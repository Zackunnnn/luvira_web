// tests/e2e/admin/e2e-17-cod-manual-orders.spec.ts
// ============================================================================
// E2E-17: Alur Pesanan Manual COD (Admin & Reseller) Sampai Selesai
// Sesuai FT-2 dan Asumsi F1, F2, F3, F7
// ============================================================================

import { test, expect } from '@playwright/test';
import { prisma } from '@/lib/db';
import { createSession } from '@/lib/auth';
import { Role, OrderStatus, PaymentMethod } from '@prisma/client';

test.describe('E2E-17: Pesanan Manual COD Admin & Reseller Sampai Selesai', () => {
  let jogjaAdmin: any;
  let resellerUser: any;
  let adminToken: string;
  let resellerToken: string;
  let jogjaRegion: any;
  let testProduct: any;
  let testVariant: any;
  let testStock: any;
  let createdOrderId: string | null = null;

  test.beforeAll(async () => {
    jogjaRegion = await prisma.region.findFirst({ where: { code: 'YOGYAKARTA' } });
    if (!jogjaRegion) {
      throw new Error('Wilayah Yogyakarta tidak ditemukan di database.');
    }

    jogjaAdmin = await prisma.user.findFirst({
      where: { role: Role.ADMIN_WILAYAH, regionId: jogjaRegion.id },
    });
    if (!jogjaAdmin) {
      jogjaAdmin = await prisma.user.create({
        data: {
          email: `admin.jogja.${Date.now()}@luvira.test`,
          passwordHash: 'dummy-hash',
          name: 'Admin Jogja E2E',
          role: Role.ADMIN_WILAYAH,
          regionId: jogjaRegion.id,
          isActive: true,
        },
      });
    }

    resellerUser = await prisma.user.create({
      data: {
        email: `reseller.e2e.${Date.now()}@luvira.test`,
        passwordHash: 'dummy-hash',
        name: 'Reseller E2E Jogja',
        role: Role.RESELLER,
        regionId: jogjaRegion.id,
        isActive: true,
      },
    });

    adminToken = await createSession({
      userId: jogjaAdmin.id,
      email: jogjaAdmin.email,
      name: jogjaAdmin.name,
      role: jogjaAdmin.role,
      regionId: jogjaAdmin.regionId,
    });

    resellerToken = await createSession({
      userId: resellerUser.id,
      email: resellerUser.email,
      name: resellerUser.name,
      role: resellerUser.role,
      regionId: resellerUser.regionId,
    });

    testProduct = await prisma.product.create({
      data: {
        name: 'Kaus Kaki E2E COD',
        slug: `kaus-kaki-e2e-cod-${Date.now()}`,
        price: 60000,
        description: 'Kaus kaki uji coba E2E COD',
        model: 'ANKLE',
      },
    });

    testVariant = await prisma.productVariant.create({
      data: {
        productId: testProduct.id,
        name: 'Hitam E2E',
        hex: '#000000',
        imageUrl: '/socks/placeholder.webp',
        sku: `SKU-E2E-COD-${Date.now()}`,
      },
    });

    testStock = await prisma.stock.create({
      data: {
        variantId: testVariant.id,
        regionId: jogjaRegion.id,
        qty: 10,
        reserved: 0,
      },
    });
  });

  test.afterAll(async () => {
    if (createdOrderId) {
      await prisma.orderItem.deleteMany({ where: { orderId: createdOrderId } });
      await prisma.orderStatusLog.deleteMany({ where: { orderId: createdOrderId } });
      await prisma.order.deleteMany({ where: { id: createdOrderId } });
    }
    if (testStock) {
      await prisma.stockMovement.deleteMany({ where: { stockId: testStock.id } });
      await prisma.stock.deleteMany({ where: { id: testStock.id } });
    }
    if (testVariant) {
      await prisma.productVariant.deleteMany({ where: { id: testVariant.id } });
    }
    if (testProduct) {
      await prisma.product.deleteMany({ where: { id: testProduct.id } });
    }
    if (resellerUser) {
      await prisma.user.deleteMany({ where: { id: resellerUser.id } });
    }
  });

  test('1. Checkout publik MENOLAK metode bayar COD (403 Forbidden)', async ({ request }) => {
    const res = await request.post('/api/orders', {
      data: {
        customerName: 'Pembeli Usil',
        customerPhone: '081234567890',
        customerEmail: 'usil@test.com',
        destination: {
          provinceName: 'DI Yogyakarta',
          cityName: 'Kota Yogyakarta',
          districtName: 'Danurejan',
          subDistrictName: 'Bausasran',
          postalCode: '55211',
          street: 'Jl. Malioboro',
        },
        courier: {
          code: 'jne',
          service: 'REG',
          price: 15000,
          etd: '1-2',
        },
        items: [{ variantId: testVariant.id, qty: 1 }],
        paymentMethod: 'COD',
      },
    });

    expect(res.status()).toBe(403);
    const body = await res.json();
    expect(body.error).toContain('hanya dapat dibuat melalui Pesanan Manual oleh Admin atau Reseller');
  });

  test('2. Reseller membuat pesanan manual COD: ongkir Rp 0 & stok ter-reserve', async ({ request }) => {
    const res = await request.post('/api/orders/manual', {
      headers: {
        Authorization: `Bearer ${resellerToken}`,
      },
      data: {
        customerName: 'Bu Siti Rahayu',
        customerPhone: '081298765432',
        customerAddress: 'Jl. Malioboro No. 12, Jogja',
        items: [{ variantId: testVariant.id, qty: 2 }],
        notes: 'Titip di warung kopi depan',
      },
    });

    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.order.paymentMethod).toBe('COD');
    expect(body.order.shippingCost).toBe(0);
    expect(body.order.status).toBe(OrderStatus.DIPROSES);
    expect(body.order.isManual).toBe(true);

    createdOrderId = body.order.id;

    // Periksa reservasi stok
    const stockAfter = await prisma.stock.findUnique({ where: { id: testStock.id } });
    expect(stockAfter?.reserved).toBe(2);
  });

  test('3. Reseller menandai status "diserahkan" (diserahkan ke pembeli)', async ({ request }) => {
    const res = await request.put(`/api/admin/orders/${createdOrderId}/status`, {
      headers: {
        Authorization: `Bearer ${resellerToken}`,
      },
      data: {
        status: 'diserahkan',
        notes: 'Sudah diserahkan langsung ke Bu Siti di warung',
      },
    });

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.order.status).toBe(OrderStatus.DIKIRIM);
    expect(body.order.codHandedOverAt).not.toBeNull();
  });

  test('4. Reseller DITOLAK (403) saat mencoba menandai "uang diterima" / menyelesaikan', async ({ request }) => {
    const res = await request.put(`/api/admin/orders/${createdOrderId}/status`, {
      headers: {
        Authorization: `Bearer ${resellerToken}`,
      },
      data: {
        status: 'uang_diterima',
        notes: 'Reseller mau tandai uang diterima',
      },
    });

    expect(res.status()).toBe(403);
    const body = await res.json();
    expect(body.error).toContain('Wewenang ini khusus Admin Wilayah penangan');
  });

  test('5. Admin wilayah penangan menandai "uang diterima" -> pesanan selesai & stok keluar', async ({ request }) => {
    const res = await request.put(`/api/admin/orders/${createdOrderId}/status`, {
      headers: {
        Authorization: `Bearer ${adminToken}`,
      },
      data: {
        status: 'uang_diterima',
        notes: 'Setoran kas COD Rp 120.000 sudah masuk ke kas kasir Jogja',
      },
    });

    if (res.status() !== 200) {
      console.error('Test 5 Error Response:', res.status(), await res.text());
    }

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.order.status).toBe(OrderStatus.SELESAI);
    expect(body.order.codCashConfirmedAt).not.toBeNull();

    // Periksa stok fisik terpotong (qty berkurang 2, reserved kembali 0)
    const stockFinal = await prisma.stock.findUnique({ where: { id: testStock.id } });
    expect(stockFinal?.qty).toBe(8);
    expect(stockFinal?.reserved).toBe(0);
  });
});
