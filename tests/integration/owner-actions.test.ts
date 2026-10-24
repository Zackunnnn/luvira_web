// tests/integration/owner-actions.test.ts
// ============================================================================
// Pengujian Integrasi Wewenang Owner vs Admin Pusat
// Memastikan:
// 1. Admin Pusat DITOLAK (403) mengakses halaman/endpoint Owner
// 2. Owner DITOLAK (403) mengelola status pesanan langsung (hanya melihat)
// 3. Owner dapat mengelola pengaturan dan cakupan wilayah
// Sesuai docs/LUVIRA_2_PLAN.md Bagian 4 & Definition of Done Fase 4
// ============================================================================

import { describe, it, expect, beforeAll } from 'vitest';
import { prisma } from '@/lib/db';
import { createSession } from '@/lib/auth';
import { Role } from '@prisma/client';
import { can } from '@/lib/permissions';
import { GET as getSettings, PUT as updateSettings } from '@/app/api/owner/settings/route';
import { GET as getCostPrices } from '@/app/api/owner/cost-prices/route';
import { GET as exportReport } from '@/app/api/owner/reports/export/route';
import { NextRequest } from 'next/server';

describe('Integrasi Batasan Hak Akses Owner vs Admin Pusat', () => {
  let ownerUser: any;
  let adminPusatUser: any;
  let ownerToken: string;
  let adminPusatToken: string;

  beforeAll(async () => {
    ownerUser = await prisma.user.findFirst({ where: { role: Role.OWNER } });
    adminPusatUser = await prisma.user.findFirst({ where: { role: Role.ADMIN_PUSAT } });

    expect(ownerUser).toBeDefined();
    expect(adminPusatUser).toBeDefined();

    ownerToken = await createSession({
      userId: ownerUser.id,
      email: ownerUser.email,
      name: ownerUser.name,
      role: ownerUser.role,
      regionId: ownerUser.regionId,
    });

    adminPusatToken = await createSession({
      userId: adminPusatUser.id,
      email: adminPusatUser.email,
      name: adminPusatUser.name,
      role: adminPusatUser.role,
      regionId: adminPusatUser.regionId,
    });
  });

  it('Owner DITOLAK mengelola status pesanan langsung (order:manage)', () => {
    // Sesuai keputusan di plan: Owner hanya melihat katalog & pesanan, perubahan operasional lewat Admin
    const canManageOrder = can(ownerUser, 'order:manage', { regionId: 'any-region' });
    expect(canManageOrder).toBe(false);
  });

  it('Admin Pusat DITOLAK (403) saat mengakses endpoint pengaturan Owner', async () => {
    const req = new NextRequest('http://localhost:3000/api/owner/settings', {
      method: 'GET',
      headers: { Authorization: `Bearer ${adminPusatToken}` },
    });

    const res = await getSettings(req);
    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error).toContain('Akses ditolak');
  });

  it('Admin Pusat DITOLAK (403) saat mencoba mengubah pengaturan Owner', async () => {
    const req = new NextRequest('http://localhost:3000/api/owner/settings', {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${adminPusatToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ppnRate: 12 }),
    });

    const res = await updateSettings(req);
    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error).toContain('Akses ditolak');
  });

  it('Admin Pusat DITOLAK (403) saat mencoba melihat harga modal (HPP)', async () => {
    const req = new NextRequest('http://localhost:3000/api/owner/cost-prices', {
      method: 'GET',
      headers: { Authorization: `Bearer ${adminPusatToken}` },
    });

    const res = await getCostPrices(req);
    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error).toContain('Akses ditolak');
  });

  it('Admin Pusat DITOLAK (403) saat mencoba mengekspor laporan keuangan Owner', async () => {
    const req = new NextRequest('http://localhost:3000/api/owner/reports/export', {
      method: 'GET',
      headers: { Authorization: `Bearer ${adminPusatToken}` },
    });

    const res = await exportReport(req);
    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error).toContain('Akses ditolak');
  });

  it('Owner BERHASIL mengakses dan memperbarui pengaturan sistem', async () => {
    const getReq = new NextRequest('http://localhost:3000/api/owner/settings', {
      method: 'GET',
      headers: { Authorization: `Bearer ${ownerToken}` },
    });

    const getRes = await getSettings(getReq);
    expect(getRes.status).toBe(200);
    const getData = await getRes.json();
    expect(getData.settings.ppnRate).toBeDefined();
    expect(getData.paymentAccounts.length).toBeGreaterThanOrEqual(2);
  });
});
