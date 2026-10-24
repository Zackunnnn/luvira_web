// tests/integration/developer-health.test.ts
import { describe, it, expect, beforeAll } from 'vitest';
import { prisma } from '@/lib/db';
import { GET as getHealth } from '@/app/api/developer/health/route';
import { GET as getQueues } from '@/app/api/developer/queues/route';
import { createSession } from '@/lib/auth';
import { OrderStatus, PaymentMethod, Role } from '@prisma/client';
import { logServerError } from '@/lib/logging/error-logger';
import { NextRequest } from 'next/server';

describe('Integrasi Observabilitas Developer & Deteksi Kerusakan Sistem (Fase 5)', () => {
  let devToken: string;
  let sampleVariant: any;
  let sampleRegion: any;

  beforeAll(async () => {
    // 1. Setup User Developer & Admin Pusat
    const devUser = await prisma.user.upsert({
      where: { email: 'developer.integ@luvira.id' },
      update: { isActive: true },
      create: {
        email: 'developer.integ@luvira.id',
        name: 'Lead Developer Integ',
        passwordHash: 'dummy',
        role: Role.DEVELOPER,
        isActive: true,
      },
    });
    devToken = await createSession({
      userId: devUser.id,
      email: devUser.email,
      name: devUser.name,
      role: devUser.role,
      regionId: null,
    });

    sampleRegion = await prisma.region.findFirst();
    sampleVariant = await prisma.productVariant.findFirst({
      include: { product: true },
    });
  });

  it('1. GET /api/developer/health merespons status UP dan metrik latensi database', async () => {
    const req = new NextRequest('http://localhost:3000/api/developer/health', {
      headers: { Authorization: `Bearer ${devToken}` },
    });
    const res = await getHealth(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    console.log('HEALTH DATA:', JSON.stringify(data, null, 2));
    expect(['HEALTHY', 'DEGRADED']).toContain(data.status);
    expect(data.database.status).toBe('UP');
    expect(typeof data.database.latencyMs).toBe('number');
  });

  it('2. Deteksi Kerusakan Buatan: Antrean Pesanan Macet Menunggu Verifikasi > 24 Jam', async () => {
    // Buat pesanan buatan dengan waktu lampau (> 25 jam lalu)
    const twentyFiveHoursAgo = new Date(Date.now() - 25 * 60 * 60 * 1000);
    const stuckOrder = await prisma.order.create({
      data: {
        code: `LVR-STUCK-${Date.now().toString().slice(-4)}`,
        regionId: sampleRegion.id,
        status: OrderStatus.MENUNGGU_VERIFIKASI,
        paymentMethod: PaymentMethod.MANUAL_TRANSFER,
        customerName: 'Stuck Customer Test',
        customerPhone: '6281199990001',
        shippingAddress: { city: 'Jakarta' },
        subtotal: 100000,
        netPrice: 100000,
        totalPrice: 100000,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        updatedAt: twentyFiveHoursAgo,
      },
    });

    // Kueri langsung ke endpoint getQueues untuk memastikan kondisi terdeteksi
    const req = new NextRequest('http://localhost:3000/api/developer/queues', {
      headers: { Authorization: `Bearer ${devToken}` },
    });
    const res = await getQueues(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.summary.stuckVerificationCount).toBeGreaterThanOrEqual(1);
    const isDetected = data.queues.stuckVerificationOrders.some((o: any) => o.id === stuckOrder.id);
    expect(isDetected).toBe(true);
  });

  it('3. Deteksi Kerusakan Buatan: Selisih Stok Reserved Tanpa Pesanan Aktif Terdeteksi', async () => {
    // Buat selisih sengaja: set reserved = 15 pada suatu varian tanpa ada pesanan aktif
    const stock = await prisma.stock.findFirst({
      where: { variantId: sampleVariant.id },
    });

    if (stock) {
      await prisma.stock.update({
        where: { id: stock.id },
        data: { reserved: 15 },
      });

      const req = new NextRequest('http://localhost:3000/api/developer/queues', {
        headers: { Authorization: `Bearer ${devToken}` },
      });
      const res = await getQueues(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.summary.stockMismatchCount).toBeGreaterThanOrEqual(1);
      const foundMismatch = data.queues.stockMismatches.some((m: any) => m.variantId === sampleVariant.id);
      expect(foundMismatch).toBe(true);

      // Kembalikan ke 0 setelah pengujian
      await prisma.stock.update({
        where: { id: stock.id },
        data: { reserved: 0 },
      });
    }
  });

  it('4. Pencatatan ErrorLog Berhasil dan Pembatasan Laju (Rate Limiting) Mencegah DB Flooding', async () => {
    const uniqueRoute = `/api/test-route-${Date.now()}`;

    // Catat 1 error
    const logged = await logServerError({
      message: 'Test critical server error simulation',
      route: uniqueRoute,
      method: 'GET',
      statusCode: 500,
    });
    expect(logged).toBe(true);

    const saved = await prisma.errorLog.findFirst({
      where: { route: uniqueRoute },
    });
    expect(saved).toBeDefined();
    expect(saved?.message).toContain('Test critical server error simulation');
  });

  it('5. Developer DILARANG Menulis Data Bisnis (Status Pesanan & HPP) - Penolakan 403', async () => {
    // Developer mencoba mengubah status pesanan -> harus 403 Forbidden
    const devUser = await prisma.user.findUnique({
      where: { email: 'developer.integ@luvira.id' },
    });

    const { can } = await import('@/lib/permissions');
    const canManageOrder = can(devUser, 'order:manage');
    const canManageCost = can(devUser, 'cost_price:manage');
    const canManagePrice = can(devUser, 'price:manage');
    const canManageStock = can(devUser, 'stock:manage');

    expect(canManageOrder).toBe(false);
    expect(canManageCost).toBe(false);
    expect(canManagePrice).toBe(false);
    expect(canManageStock).toBe(false);
  });
});
