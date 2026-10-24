// tests/e2e/developer/e2e-12-observability.spec.ts
import { test, expect } from '@playwright/test';
import { prisma } from '@/lib/db';
import { createSession } from '@/lib/auth';
import { Role } from '@prisma/client';

test.describe('E2E-12: Observabilitas Developer & Pembatasan Akses Tulis Bisnis (Bagian 11 Plan)', () => {
  let devUser: any;
  let devToken: string;

  test.beforeAll(async () => {
    devUser = await prisma.user.upsert({
      where: { email: 'developer@luvira.id' },
      update: { isActive: true },
      create: {
        email: 'developer@luvira.id',
        name: 'Lead Developer',
        passwordHash: 'dummy-hashed',
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
  });

  test('1. Developer dapat mengakses GET /api/developer/health dan mendapatkan status sistem lengkap', async ({ request }) => {
    const res = await request.get('/api/developer/health', {
      headers: {
        Authorization: `Bearer ${devToken}`,
      },
    });

    expect(res.status()).toBe(200);
    const data = await res.json();
    expect(data.status).toBe('HEALTHY');
    expect(data.database.status).toBe('UP');
    expect(data.storage.status).toBe('UP');
    expect(data.shipping.status).toBe('UP');
    expect(data.payment.status).toBe('UP');
  });

  test('2. Developer dapat mengakses GET /api/developer/queues untuk memeriksa antrean bermasalah', async ({ request }) => {
    const res = await request.get('/api/developer/queues', {
      headers: {
        Authorization: `Bearer ${devToken}`,
      },
    });

    expect(res.status()).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty('summary');
    expect(data).toHaveProperty('queues');
    expect(typeof data.summary.stuckVerificationCount).toBe('number');
    expect(typeof data.summary.stockMismatchCount).toBe('number');
  });

  test('3. Developer dapat mengakses GET /api/developer/errors dan merekam error baru via POST', async ({ request }) => {
    // 1. Rekam error baru via POST
    const testRoute = `/test-e2e-error-${Date.now()}`;
    const postRes = await request.post('/api/developer/errors', {
      data: {
        message: 'Simulasi error Playwright E2E-12',
        route: testRoute,
        method: 'POST',
        statusCode: 500,
      },
    });
    expect(postRes.status()).toBe(200);

    // 2. Kueri error via GET
    const getRes = await request.get(`/api/developer/errors?route=${testRoute}`, {
      headers: {
        Authorization: `Bearer ${devToken}`,
      },
    });
    expect(getRes.status()).toBe(200);
    const data = await getRes.json();
    expect(data.errors.length).toBeGreaterThanOrEqual(1);
    expect(data.errors[0].route).toBe(testRoute);
  });

  test('4. Developer DILARANG Menulis Data Bisnis (Status Pesanan & HPP) - Respon 403 Forbidden', async ({ request }) => {
    // A. Percobaan mengubah status pesanan oleh Developer
    const sampleOrder = await prisma.order.findFirst();
    expect(sampleOrder).toBeDefined();

    const orderRes = await request.put(`/api/admin/orders/${sampleOrder!.id}/status`, {
      headers: {
        Authorization: `Bearer ${devToken}`,
      },
      data: {
        toStatus: 'SELESAI',
      },
    });
    expect(orderRes.status()).toBe(403);

    // B. Percobaan mengubah HPP (Harga Modal) oleh Developer
    const sampleVariant = await prisma.productVariant.findFirst();
    expect(sampleVariant).toBeDefined();

    const costRes = await request.put('/api/owner/cost-prices', {
      headers: {
        Authorization: `Bearer ${devToken}`,
      },
      data: {
        items: [{
          variantId: sampleVariant!.id,
          costPrice: 5000,
          packingCost: 500,
        }],
      },
    });
    expect(costRes.status()).toBe(403);
  });

  test('5. Pengguna Tanpa Hak Akses (Publik / Admin Wilayah) DITOLAK saat Mengakses Rute Developer', async ({ request }) => {
    // Tanpa auth header
    const anonRes = await request.get('/api/developer/health');
    expect(anonRes.status()).toBe(403);

    const anonQueueRes = await request.get('/api/developer/queues');
    expect(anonQueueRes.status()).toBe(403);
  });
});
