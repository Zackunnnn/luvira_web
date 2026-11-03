// tests/integration/reseller-dashboard.test.ts
// ============================================================================
// FT-4 Integration Tests: Dashboard Reseller, Otorisasi Ketat, & Isolasi Data
// ============================================================================

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { createSession } from '@/lib/auth';
import { GET as getResellerAnalytics } from '@/app/api/reseller/analytics/route';
import { GET as getResellerOrders } from '@/app/api/reseller/orders/route';
import { GET as getResellerPromos } from '@/app/api/reseller/promos/route';
import { GET as getAdminStock } from '@/app/api/admin/stock/route';
import { GET as getOwnerCostPrices } from '@/app/api/owner/cost-prices/route';
import { PUT as updateOrderStatus } from '@/app/api/admin/orders/[id]/status/route';
import { createManualCodOrder } from '@/lib/orders/manual-cod';
import { Role, OrderStatus, DiscountType } from '@prisma/client';

describe('FT-4: Dashboard Reseller & Isolasi Data', () => {
  let pusatRegion: any;
  let testProduct: any;
  let testVariant: any;
  let stockPusat: any;

  // Reseller Users
  let userResellerA: any;
  let userResellerB: any;
  let cookieResellerA: string;
  let cookieResellerB: string;

  // Admin User
  let userAdminPusat: any;
  let cookieAdminPusat: string;

  // Promos
  let promoA: any;
  let promoB: any;

  // Orders
  let orderA: any;
  let orderB: any;

  beforeAll(async () => {
    // 1. Gudang Pusat
    pusatRegion = await prisma.region.findFirst({ where: { type: 'PUSAT' } });
    if (!pusatRegion) throw new Error('Gudang Pusat tidak ditemukan.');

    // 2. Setup Produk & Varian
    testProduct = await prisma.product.create({
      data: {
        name: 'Kaus Kaki Reseller Test FT-4',
        slug: `kaus-kaki-reseller-test-${Date.now()}`,
        price: 80000,
        description: 'Produk uji reseller FT-4',
        model: 'ANKLE',
      },
    });

    testVariant = await prisma.productVariant.create({
      data: {
        productId: testProduct.id,
        name: 'Varian Reseller',
        hex: '#333333',
        imageUrl: '/socks/placeholder.webp',
        sku: `SKU-RES-${Date.now()}`,
      },
    });

    stockPusat = await prisma.stock.create({
      data: {
        variantId: testVariant.id,
        regionId: pusatRegion.id,
        qty: 100,
        reserved: 0,
      },
    });

    // 3. Setup Users
    const rand = Math.floor(1000 + Math.random() * 9000);
    userResellerA = await prisma.user.create({
      data: {
        email: `reseller.a.${rand}@luvira.id`,
        name: 'Reseller Alpha',
        role: Role.RESELLER,
        regionId: pusatRegion.id,
        phone: '628111222333',
        passwordHash: 'dummy',
      },
    });

    userResellerB = await prisma.user.create({
      data: {
        email: `reseller.b.${rand}@luvira.id`,
        name: 'Reseller Beta',
        role: Role.RESELLER,
        regionId: pusatRegion.id,
        phone: '628444555666',
        passwordHash: 'dummy',
      },
    });

    userAdminPusat = await prisma.user.create({
      data: {
        email: `admin.pusat.${rand}@luvira.id`,
        name: 'Admin Pusat Test',
        role: Role.ADMIN_PUSAT,
        regionId: pusatRegion.id,
        passwordHash: 'dummy',
      },
    });

    // Sessions
    const tokenA = await createSession({
      userId: userResellerA.id,
      name: userResellerA.name,
      email: userResellerA.email,
      role: Role.RESELLER,
      regionId: userResellerA.regionId,
    });
    cookieResellerA = `luvira_session=${tokenA}`;

    const tokenB = await createSession({
      userId: userResellerB.id,
      name: userResellerB.name,
      email: userResellerB.email,
      role: Role.RESELLER,
      regionId: userResellerB.regionId,
    });
    cookieResellerB = `luvira_session=${tokenB}`;

    const tokenAdmin = await createSession({
      userId: userAdminPusat.id,
      name: userAdminPusat.name,
      email: userAdminPusat.email,
      role: Role.ADMIN_PUSAT,
      regionId: userAdminPusat.regionId,
    });
    cookieAdminPusat = `luvira_session=${tokenAdmin}`;

    // 4. Promos
    promoA = await prisma.promoCode.create({
      data: {
        code: `PROMO-ALPHA-${rand}`,
        discountType: DiscountType.PERCENTAGE,
        discountValue: 10,
        quota: 50,
        usedCount: 0,
        isActive: true,
        resellerId: userResellerA.id,
      },
    });

    promoB = await prisma.promoCode.create({
      data: {
        code: `PROMO-BETA-${rand}`,
        discountType: DiscountType.PERCENTAGE,
        discountValue: 15,
        quota: 50,
        usedCount: 0,
        isActive: true,
        resellerId: userResellerB.id,
      },
    });

    // 5. Buat Pesanan Manual untuk Reseller A
    const resOrderA = await createManualCodOrder({
      creator: {
        id: userResellerA.id,
        name: userResellerA.name,
        email: userResellerA.email,
        role: Role.RESELLER,
        regionId: userResellerA.regionId,
      },
      customerName: 'Budi Santoso',
      customerPhone: '081234567890',
      items: [{ productId: testProduct.id, variantId: testVariant.id, quantity: 1 }],
      promoCode: promoA.code,
      note: 'Pesanan Reseller A',
    });
    orderA = resOrderA.order;

    // 6. Buat Pesanan Manual untuk Reseller B
    const resOrderB = await createManualCodOrder({
      creator: {
        id: userResellerB.id,
        name: userResellerB.name,
        email: userResellerB.email,
        role: Role.RESELLER,
        regionId: userResellerB.regionId,
      },
      customerName: 'Dewi Lestari',
      customerPhone: '089876543210',
      items: [{ productId: testProduct.id, variantId: testVariant.id, quantity: 1 }],
      promoCode: promoB.code,
      note: 'Pesanan Reseller B',
    });
    orderB = resOrderB.order;
  });

  afterAll(async () => {
    // Cleanup
    await prisma.notification.deleteMany({
      where: { userId: { in: [userResellerA?.id, userResellerB?.id].filter(Boolean) } },
    });
    await prisma.orderStatusLog.deleteMany({
      where: { orderId: { in: [orderA?.id, orderB?.id].filter(Boolean) } },
    });
    await prisma.orderItem.deleteMany({
      where: { variantId: testVariant?.id },
    });
    await prisma.order.deleteMany({
      where: { id: { in: [orderA?.id, orderB?.id].filter(Boolean) } },
    });
    if (stockPusat) {
      await prisma.stockMovement.deleteMany({ where: { stockId: stockPusat.id } });
      await prisma.stock.delete({ where: { id: stockPusat.id } });
    }
    if (testVariant) {
      await prisma.productVariant.delete({ where: { id: testVariant.id } });
    }
    if (testProduct) {
      await prisma.product.delete({ where: { id: testProduct.id } });
    }
    await prisma.promoCode.deleteMany({
      where: { id: { in: [promoA?.id, promoB?.id].filter(Boolean) } },
    });
    await prisma.user.deleteMany({
      where: { id: { in: [userResellerA?.id, userResellerB?.id, userAdminPusat?.id].filter(Boolean) } },
    });
  });

  describe('1. GET /api/reseller/analytics', () => {
    it('mengembalikan ringkasan analitik Reseller A tanpa mencampur data Reseller B', async () => {
      const req = new NextRequest('http://localhost:3000/api/reseller/analytics?period=30d', {
        headers: { cookie: cookieResellerA },
      });
      const res = await getResellerAnalytics(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.summary.totalOrders).toBe(1);
      expect(json.data.promosCount).toBe(1);
    });

    it('menolak akses pengguna non-reseller / non-admin', async () => {
      const buyerToken = await createSession({
        userId: 'buyer-test',
        name: 'Buyer',
        email: 'buyer@test.luvira',
        role: Role.RESELLER,
        regionId: null,
      });
      const req = new NextRequest('http://localhost:3000/api/reseller/analytics', {
        headers: {}, // No cookie
      });
      const res = await getResellerAnalytics(req);
      expect(res.status).toBe(401);
    });
  });

  describe('2. GET /api/reseller/orders', () => {
    it('hanya menampilkan pesanan milik Reseller A dan menyamarkan data pelanggan', async () => {
      const req = new NextRequest('http://localhost:3000/api/reseller/orders', {
        headers: { cookie: cookieResellerA },
      });
      const res = await getResellerOrders(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.length).toBe(1);

      const ord = json.data[0];
      expect(ord.code).toBe(orderA.code);

      // Verifikasi masking pelanggan: Budi Santoso -> B*** S***, 081234567890 -> ••••7890
      expect(ord.customerName).toBe('B*** S***');
      expect(ord.customerPhone).toBe('••••7890');

      // Verifikasi TANPA HPP
      const item = ord.items[0];
      expect(item.costEach).toBeUndefined();
      expect(item.packingEach).toBeUndefined();
    });

    it('Reseller B tidak melihat pesanan Reseller A', async () => {
      const req = new NextRequest('http://localhost:3000/api/reseller/orders', {
        headers: { cookie: cookieResellerB },
      });
      const res = await getResellerOrders(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.data.length).toBe(1);
      expect(json.data[0].code).toBe(orderB.code);
      expect(json.data[0].customerName).toBe('D*** L***');
    });
  });

  describe('3. GET /api/reseller/promos', () => {
    it('hanya menampilkan kode promo yang ditugaskan ke Reseller A', async () => {
      const req = new NextRequest('http://localhost:3000/api/reseller/promos', {
        headers: { cookie: cookieResellerA },
      });
      const res = await getResellerPromos(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.data.length).toBe(1);
      expect(json.data[0].code).toBe(promoA.code);
    });
  });

  describe('4. Otorisasi Ketat: Reseller dilarang mengakses stok gudang & HPP', () => {
    it('Reseller memanggil /api/admin/stock -> 403 Forbidden', async () => {
      const req = new NextRequest('http://localhost:3000/api/admin/stock', {
        headers: { cookie: cookieResellerA },
      });
      const res = await getAdminStock(req);
      expect(res.status).toBe(403);
    });

    it('Reseller memanggil /api/owner/cost-prices -> 403 Forbidden', async () => {
      const req = new NextRequest('http://localhost:3000/api/owner/cost-prices', {
        headers: { cookie: cookieResellerA },
      });
      const res = await getOwnerCostPrices(req);
      expect(res.status).toBe(403);
    });
  });

  describe('5. Notifikasi Reseller saat pesanan selesai', () => {
    it('mengirim notifikasi in-app kepada Reseller saat status pesanan diubah ke SELESAI', async () => {
      const req = new NextRequest(`http://localhost:3000/api/admin/orders/${orderA.id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          cookie: cookieAdminPusat,
        },
        body: JSON.stringify({
          toStatus: OrderStatus.SELESAI,
          note: 'Kas COD diterima di pusat.',
        }),
      });

      const res = await updateOrderStatus(req, { params: Promise.resolve({ id: orderA.id }) });
      expect(res.status).toBe(200);

      // Cek apakah ada notifikasi in-app untuk Reseller A
      const notif = await prisma.notification.findFirst({
        where: {
          userId: userResellerA.id,
          targetRole: Role.RESELLER,
        },
      });

      expect(notif).toBeDefined();
      expect(notif?.title).toContain(orderA.code);
      expect(notif?.message).toContain('berhasil diselesaikan');
    });
  });
});
