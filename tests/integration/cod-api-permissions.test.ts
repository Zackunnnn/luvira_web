// tests/integration/cod-api-permissions.test.ts
// ============================================================================
// FT-2 HTTP API Tests: Public Checkout COD Rejection & Status Transition Guards
// ============================================================================

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '@/lib/db';
import { POST as ordersPost } from '@/app/api/orders/route';
import { PUT as updateOrderStatus } from '@/app/api/admin/orders/[id]/status/route';
import { NextRequest } from 'next/server';
import { Role, OrderStatus, PaymentMethod } from '@prisma/client';
import { createSession } from '@/lib/auth';

describe('FT-2: HTTP API Proteksi & Penolakan COD', () => {
  let pusatRegion: any;
  let jogjaRegion: any;
  let testProduct: any;
  let testVariant: any;

  // Mock Tokens
  let resellerJogjaCookie: string;
  let adminPusatCookie: string;
  let adminJogjaCookie: string;

  beforeAll(async () => {
    pusatRegion = await prisma.region.findFirst({ where: { type: 'PUSAT' } });
    jogjaRegion = await prisma.region.findFirst({ where: { code: 'YOGYAKARTA' } });

    testProduct = await prisma.product.create({
      data: {
        name: 'Produk Uji API COD',
        slug: `prod-uji-api-cod-${Date.now()}`,
        price: 40000,
        description: 'Deskripsi kaus kaki uji COD API',
        model: 'CREW',
      },
    });

    testVariant = await prisma.productVariant.create({
      data: {
        productId: testProduct.id,
        name: 'Putih Bersih',
        hex: '#FFFFFF',
        imageUrl: '/socks/placeholder.webp',
        sku: `SKU-API-COD-${Date.now()}`,
      },
    });

    // Generate JWT sessions
    const resellerToken = await createSession({
      userId: 'usr-reseller-test',
      name: 'Reseller Test',
      email: 'reseller@test.luvira',
      role: Role.RESELLER,
      regionId: jogjaRegion.id,
    });
    resellerJogjaCookie = `luvira_session=${resellerToken}`;

    const adminPusatToken = await createSession({
      userId: 'usr-admin-pusat-test',
      name: 'Admin Pusat Test',
      email: 'admin.pusat@test.luvira',
      role: Role.ADMIN_PUSAT,
      regionId: pusatRegion.id,
    });
    adminPusatCookie = `luvira_session=${adminPusatToken}`;

    const adminJogjaToken = await createSession({
      userId: 'usr-admin-jogja-test',
      name: 'Admin Jogja Test',
      email: 'admin.jogja@test.luvira',
      role: Role.ADMIN_WILAYAH,
      regionId: jogjaRegion.id,
    });
    adminJogjaCookie = `luvira_session=${adminJogjaToken}`;
  });

  afterAll(async () => {
    if (testVariant) {
      await prisma.productVariant.delete({ where: { id: testVariant.id } });
    }
    if (testProduct) {
      await prisma.product.delete({ where: { id: testProduct.id } });
    }
  });

  it('1. Checkout Publik (POST /api/orders) MENOLAK metode bayar COD dengan HTTP 403', async () => {
    const req = new NextRequest('http://localhost:3000/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerName: 'Pembeli Usil',
        customerPhone: '081234567890',
        destination: {
          provinceName: 'DKI Jakarta',
          city: 'Jakarta Selatan',
          street: 'Jl. Sudirman No. 1',
        },
        items: [{ productId: testProduct.id, variantId: testVariant.id, quantity: 1 }],
        paymentMethod: 'COD', // Klien mencoba inject COD ke checkout publik
      }),
    });

    const res = await ordersPost(req);
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toContain('hanya dapat dibuat melalui Pesanan Manual');
  });

  it('2. Reseller DITOLAK (HTTP 403) saat mencoba menandai uang diterima / menyelesaikan pesanan COD', async () => {
    // Buat pesanan COD dummy di wilayah Jogja
    const codOrder = await prisma.order.create({
      data: {
        code: `LVR-TEST-COD-${Date.now()}`,
        regionId: jogjaRegion.id,
        status: OrderStatus.DIKIRIM,
        paymentMethod: PaymentMethod.COD,
        customerName: 'Pelanggan COD Jogja',
        customerPhone: '628123456789',
        shippingAddress: { type: 'COD', street: 'Jl. Malioboro' },
        subtotal: 40000,
        netPrice: 40000,
        ppnAmount: 4400,
        shippingCost: 0,
        totalPrice: 44400,
        isManual: true,
        expiresAt: new Date(Date.now() + 7 * 86400000),
        createdByUserId: 'usr-reseller-test',
        createdByRole: Role.RESELLER,
      },
    });

    // Reseller mencoba submit toStatus: SELESAI
    const req = new NextRequest(`http://localhost:3000/api/admin/orders/${codOrder.id}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        cookie: resellerJogjaCookie,
        Authorization: `Bearer ${resellerJogjaCookie.replace('luvira_session=', '')}`,
      },
      body: JSON.stringify({
        toStatus: OrderStatus.SELESAI,
        note: 'Reseller mencoba konfirmasi uang kas diterima',
      }),
    });

    const res = await updateOrderStatus(req, { params: Promise.resolve({ id: codOrder.id }) });
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toContain('Reseller tidak memiliki wewenang menandai uang diterima');

    // Cleanup
    await prisma.order.delete({ where: { id: codOrder.id } });
  });

  it('3. Admin wilayah lain (Admin Pusat) DITOLAK (HTTP 403) saat mencoba menyelesaikan COD wilayah Jogja', async () => {
    // Buat pesanan COD dummy di wilayah Jogja
    const codOrderJogja = await prisma.order.create({
      data: {
        code: `LVR-JOGJA-COD-${Date.now()}`,
        regionId: jogjaRegion.id,
        status: OrderStatus.DIKIRIM,
        paymentMethod: PaymentMethod.COD,
        customerName: 'Pelanggan Jogja',
        customerPhone: '628123456789',
        shippingAddress: { type: 'COD', street: 'Jl. Malioboro' },
        subtotal: 40000,
        netPrice: 40000,
        ppnAmount: 4400,
        shippingCost: 0,
        totalPrice: 44400,
        isManual: true,
        expiresAt: new Date(Date.now() + 7 * 86400000),
        createdByRole: Role.ADMIN_WILAYAH,
      },
    });

    // Admin Wilayah lain (misal user dengan region berbeda)
    const adminLainToken = await createSession({
      userId: 'usr-admin-lain-test',
      name: 'Admin Surabaya Test',
      email: 'admin.surabaya@test.luvira',
      role: Role.ADMIN_WILAYAH,
      regionId: 'some-other-region-id',
    });

    const req = new NextRequest(`http://localhost:3000/api/admin/orders/${codOrderJogja.id}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        cookie: `luvira_session=${adminLainToken}`,
        Authorization: `Bearer ${adminLainToken}`,
      },
      body: JSON.stringify({
        toStatus: OrderStatus.SELESAI,
      }),
    });

    const res = await updateOrderStatus(req, { params: Promise.resolve({ id: codOrderJogja.id }) });
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toContain('Admin wilayah lain tidak dapat menyelesaikan');

    // Cleanup
    await prisma.order.delete({ where: { id: codOrderJogja.id } });
  });
});
