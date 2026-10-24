// tests/e2e/owner/e2e-10-admin-management.spec.ts
// ============================================================================
// E2E-10: Owner Mengelola Admin & Cakupan Layanan Wilayah
// Sesuai docs/LUVIRA_2_PLAN.md Bagian 4 & 13
// ============================================================================

import { test, expect } from '@playwright/test';
import { prisma } from '@/lib/db';
import { createSession } from '@/lib/auth';
import { Role } from '@prisma/client';

test.describe('E2E-10: Owner Kelola Akun Admin & Cakupan Wilayah', () => {
  let ownerUser: any;
  let ownerToken: string;
  let jogjaRegion: any;
  let createdAdminId: string;
  let createdCoverageId: string;

  test.beforeAll(async () => {
    ownerUser = await prisma.user.findFirst({ where: { role: Role.OWNER } });
    jogjaRegion = await prisma.region.findFirst({ where: { code: 'YOGYAKARTA' } });

    expect(ownerUser).toBeDefined();
    expect(jogjaRegion).toBeDefined();

    ownerToken = await createSession({
      userId: ownerUser.id,
      email: ownerUser.email,
      name: ownerUser.name,
      role: ownerUser.role,
      regionId: ownerUser.regionId,
    });
  });

  test.afterAll(async () => {
    if (createdAdminId) {
      await prisma.user.deleteMany({ where: { id: createdAdminId } });
    }
    if (createdCoverageId) {
      await prisma.regionCoverage.deleteMany({ where: { id: createdCoverageId } });
    }
  });

  test('Owner dapat menambahkan akun Admin Wilayah baru', async ({ request }) => {
    const email = `admin.diy.${Date.now()}@luvira.id`;
    const res = await request.post('/api/owner/users', {
      headers: {
        Authorization: `Bearer ${ownerToken}`,
        'Content-Type': 'application/json',
      },
      data: {
        name: 'Admin Solo-DIY',
        email,
        password: 'PasswordBaru123!',
        role: Role.ADMIN_WILAYAH,
        regionId: jogjaRegion.id,
      },
    });

    expect(res.ok()).toBe(true);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.user.role).toBe(Role.ADMIN_WILAYAH);
    expect(data.user.regionId).toBe(jogjaRegion.id);

    createdAdminId = data.user.id;
  });

  test('Owner dapat menonaktifkan akun admin', async ({ request }) => {
    const res = await request.put('/api/owner/users', {
      headers: {
        Authorization: `Bearer ${ownerToken}`,
        'Content-Type': 'application/json',
      },
      data: {
        id: createdAdminId,
        isActive: false,
      },
    });

    expect(res.ok()).toBe(true);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.user.isActive).toBe(false);

    // Verifikasi di DB
    const dbUser = await prisma.user.findUnique({ where: { id: createdAdminId } });
    expect(dbUser!.isActive).toBe(false);
  });

  test('Owner dapat menambah cakupan layanan provinsi baru ke wilayah cabang', async ({ request }) => {
    const res = await request.post('/api/owner/coverage', {
      headers: {
        Authorization: `Bearer ${ownerToken}`,
        'Content-Type': 'application/json',
      },
      data: {
        regionId: jogjaRegion.id,
        provinceName: 'Jawa Tengah',
        provinceId: '10',
      },
    });

    expect(res.ok()).toBe(true);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.coverage.provinceName).toBe('Jawa Tengah');
    expect(data.coverage.regionId).toBe(jogjaRegion.id);

    createdCoverageId = data.coverage.id;
  });
});
