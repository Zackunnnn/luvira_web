// tests/integration/test-promos.test.ts
// ============================================================================
// Test Suite: FT-3 Kode Promo Uji & Bypass Midtrans
// Sesuai Prompt 06 & docs/LUVIRA_2_PLAN.md
// ============================================================================

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '@/lib/db';
import { NextRequest } from 'next/server';
import { POST as createAdminPromo } from '@/app/api/admin/promos/route';
import { POST as validatePromo } from '@/app/api/promos/validate/route';
import { POST as createOrder } from '@/app/api/orders/route';
import { POST as simulatePayment } from '@/app/api/test/orders/[id]/simulate-payment/route';
import { GET as getReports } from '@/app/api/owner/reports/route';
import { POST as resetTestOrders } from '@/app/api/owner/test-orders/reset/route';
import { createSession } from '@/lib/auth';
import { Role, PromoKind, DiscountType, OrderStatus, PaymentMethod } from '@prisma/client';

describe('FT-3: Kode Promo Uji (Testing Promo) & Simulasi Pembayaran QR', () => {
  let ownerUser: any;
  let adminPusatUser: any;
  let pusatRegion: any;
  let jogjaRegion: any;
  let testProduct: any;
  let testVariant: any;

  let ownerCookie: string;
  let adminPusatCookie: string;

  const createdTestingPromoCode = `UJI-${Date.now().toString().slice(-6)}`;
  let testOrderId: string;
  let testOrderCode: string;

  beforeAll(async () => {
    pusatRegion = await prisma.region.findFirst({ where: { type: 'PUSAT' } });
    jogjaRegion = await prisma.region.findFirst({ where: { code: 'YOGYAKARTA' } });

    // Enable test promo in settings
    await prisma.setting.upsert({
      where: { key: 'testPromoEnabled' },
      update: { value: true },
      create: { key: 'testPromoEnabled', value: true },
    });

    // Owner user
    ownerUser = await prisma.user.findFirst({ where: { role: Role.OWNER } });
    if (!ownerUser) {
      ownerUser = await prisma.user.create({
        data: {
          email: 'owner.testpromo@luvira.id',
          name: 'Owner Promo Test',
          passwordHash: 'dummy',
          role: Role.OWNER,
        },
      });
    }

    // Admin Pusat user
    adminPusatUser = await prisma.user.findFirst({ where: { role: Role.ADMIN_PUSAT } });
    if (!adminPusatUser) {
      adminPusatUser = await prisma.user.create({
        data: {
          email: 'adminpusat.testpromo@luvira.id',
          name: 'Admin Pusat Promo Test',
          passwordHash: 'dummy',
          role: Role.ADMIN_PUSAT,
          regionId: pusatRegion.id,
        },
      });
    }

    const ownerToken = await createSession({
      userId: ownerUser.id,
      email: ownerUser.email,
      name: ownerUser.name,
      role: ownerUser.role,
      regionId: null,
    });
    ownerCookie = `luvira_session=${ownerToken}`;

    const adminToken = await createSession({
      userId: adminPusatUser.id,
      email: adminPusatUser.email,
      name: adminPusatUser.name,
      role: adminPusatUser.role,
      regionId: adminPusatUser.regionId,
    });
    adminPusatCookie = `luvira_session=${adminToken}`;

    // Test product & variant
    testProduct = await prisma.product.create({
      data: {
        name: 'Kaus Kaki Uji FT-3',
        slug: `kaus-kaki-uji-ft3-${Date.now()}`,
        price: 35000,
        description: 'Product for testing promo flow',
        model: 'ANKLE',
      },
    });

    testVariant = await prisma.productVariant.create({
      data: {
        productId: testProduct.id,
        name: 'Varian Uji FT-3',
        sku: `SKU-FT3-${Date.now()}`,
        hex: '#111111',
        imageUrl: '/socks/placeholder.webp',
        weightGram: 35,
      },
    });

    // Stock in Pusat
    await prisma.stock.upsert({
      where: {
        variantId_regionId: {
          regionId: pusatRegion.id,
          variantId: testVariant.id,
        },
      },
      update: { qty: 50 },
      create: {
        regionId: pusatRegion.id,
        variantId: testVariant.id,
        qty: 50,
      },
    });
  });

  afterAll(async () => {
    // Cleanup created promo & orders
    await prisma.orderStatusLog.deleteMany({
      where: { order: { isTest: true } },
    });
    await prisma.orderItem.deleteMany({
      where: { order: { isTest: true } },
    });
    await prisma.order.deleteMany({
      where: { isTest: true },
    });
    await prisma.promoCode.deleteMany({
      where: { code: createdTestingPromoCode },
    });

    if (testVariant) {
      await prisma.stock.deleteMany({ where: { variantId: testVariant.id } });
      await prisma.productVariant.delete({ where: { id: testVariant.id } });
    }
    if (testProduct) {
      await prisma.product.delete({ where: { id: testProduct.id } });
    }
  });

  it('TC-TP-01: Non-owner (Admin Pusat) is rejected (403) from creating TESTING promo code', async () => {
    const req = new NextRequest('http://localhost:3000/api/admin/promos', {
      method: 'POST',
      headers: {
        cookie: adminPusatCookie,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        code: `ADMIN-${Date.now()}`,
        discountType: DiscountType.FIXED,
        discountValue: 10000,
        kind: PromoKind.TESTING,
        maxUses: 10,
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
      }),
    });

    const res = await createAdminPromo(req);
    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error).toContain('Hanya Owner');
  });

  it('TC-TP-02: Owner cannot create TESTING promo exceeding 7 days expiration or 20 quota', async () => {
    // Quota > 20
    const reqQuota = new NextRequest('http://localhost:3000/api/admin/promos', {
      method: 'POST',
      headers: {
        cookie: ownerCookie,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        code: `FAIL-QUOTA-${Date.now()}`,
        discountType: DiscountType.FIXED,
        discountValue: 5000,
        kind: PromoKind.TESTING,
        maxUses: 25, // > 20
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
      }),
    });

    const resQuota = await createAdminPromo(reqQuota);
    expect(resQuota.status).toBe(400);
    const dataQuota = await resQuota.json();
    expect(dataQuota.error).toContain('maksimal 20');

    // Expiration > 7 days
    const reqExp = new NextRequest('http://localhost:3000/api/admin/promos', {
      method: 'POST',
      headers: {
        cookie: ownerCookie,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        code: `FAIL-EXP-${Date.now()}`,
        discountType: DiscountType.FIXED,
        discountValue: 5000,
        kind: PromoKind.TESTING,
        maxUses: 10,
        expiresAt: new Date(Date.now() + 10 * 86400000).toISOString(), // 10 days
      }),
    });

    const resExp = await createAdminPromo(reqExp);
    expect(resExp.status).toBe(400);
    const dataExp = await resExp.json();
    expect(dataExp.error).toContain('lebih dari 7 hari');
  });

  it('TC-TP-03: Owner can create a valid TESTING promo code', async () => {
    const expiresAt = new Date(Date.now() + 3 * 86400000).toISOString(); // 3 days
    const req = new NextRequest('http://localhost:3000/api/admin/promos', {
      method: 'POST',
      headers: {
        cookie: ownerCookie,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        code: createdTestingPromoCode,
        discountType: DiscountType.FIXED,
        discountValue: 10000,
        kind: PromoKind.TESTING,
        maxUses: 10,
        expiresAt,
      }),
    });

    const res = await createAdminPromo(req);
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.promo).toBeDefined();
    expect(data.promo.code).toBe(createdTestingPromoCode);
    expect(data.promo.kind).toBe(PromoKind.TESTING);
  });

  it('TC-TP-04: /api/promos/validate recognizes TESTING promo and flags isTest: true', async () => {
    const req = new NextRequest('http://localhost:3000/api/promos/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: createdTestingPromoCode,
        subtotal: 50000,
      }),
    });

    const res = await validatePromo(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.data.kind).toBe('TESTING');
    expect(data.data.isTest).toBe(true);
  });

  it('TC-TP-05: Checkout with TESTING promo creates order with isTest=true & TEST_SIMULATION', async () => {
    const req = new NextRequest('http://localhost:3000/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer: {
          name: 'Tester FT-3',
          whatsapp: '081299887766',
        },
        destination: {
          provinceName: 'Jawa Barat',
          cityName: 'Kota Depok',
          districtName: 'Beji',
          subDistrictName: 'Kemirimuka',
          postalCode: '16423',
          street: 'Jl. Margonda Raya No. 123',
        },
        shipping: {
          courier: 'jne',
          service: 'REG',
          cost: 10000,
          etd: '1-2 hari',
        },
        paymentMethod: 'MIDTRANS', // Client requests Midtrans, but test promo must force TEST_SIMULATION
        promoCode: createdTestingPromoCode,
        items: [
          {
            productId: testProduct.id,
            variantId: testVariant.id,
            quantity: 1,
            unitPrice: 35000,
          },
        ],
        waConsent: true,
      }),
    });

    const res = await createOrder(req);
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.order).toBeDefined();
    expect(data.order.isTest).toBe(true);
    expect(data.order.paymentMethod).toBe(PaymentMethod.TEST_SIMULATION);
    expect(data.simulationQrPayload).toBe(`LUVIRA-UJI:${data.order.code}`);
    expect(data.snapToken).toBeUndefined(); // Bypassed Midtrans!

    testOrderId = data.order.id;
    testOrderCode = data.order.code;
  });

  it('TC-TP-06: /api/test/orders/[id]/simulate-payment marks order DIPROSES', async () => {
    expect(testOrderId).toBeDefined();

    const req = new NextRequest(`http://localhost:3000/api/test/orders/${testOrderId}/simulate-payment`, {
      method: 'POST',
    });

    const res = await simulatePayment(req, { params: Promise.resolve({ id: testOrderId }) });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.order.status).toBe(OrderStatus.DIPROSES);

    // Verify in DB
    const dbOrder = await prisma.order.findUnique({
      where: { id: testOrderId },
      include: { statusLogs: true },
    });
    expect(dbOrder?.status).toBe(OrderStatus.DIPROSES);
    const hasLog = dbOrder?.statusLogs.some((l) => (l.note || (l as any).notes)?.includes('Simulasi pembayaran promo uji'));
    expect(hasLog).toBe(true);
  });

  it('TC-TP-07: Owner financial reports strictly exclude test orders (isTest=false)', async () => {
    const req = new NextRequest('http://localhost:3000/api/owner/reports?type=daily', {
      headers: { cookie: ownerCookie },
    });

    const res = await getReports(req);
    expect(res.status).toBe(200);
    const data = await res.json();

    if (data.records && data.records.length > 0) {
      const foundTestOrder = data.records.find((r: any) => r.orderCode === testOrderCode || r.isTest === true);
      expect(foundTestOrder).toBeUndefined();
    }
  });

  it('TC-TP-08: Owner can reset test orders cleanly via /api/owner/test-orders/reset', async () => {
    const req = new NextRequest('http://localhost:3000/api/owner/test-orders/reset', {
      method: 'POST',
      headers: { cookie: ownerCookie },
    });

    const res = await resetTestOrders(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.deletedCount).toBeGreaterThanOrEqual(1);

    // Verify test order is completely deleted from DB
    const deletedOrder = await prisma.order.findUnique({ where: { id: testOrderId } });
    expect(deletedOrder).toBeNull();
  });
});
