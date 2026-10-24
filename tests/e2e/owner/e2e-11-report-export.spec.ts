// tests/e2e/owner/e2e-11-report-export.spec.ts
// ============================================================================
// E2E-11: Owner Mencetak & Mengekspor Laporan Keuangan Bisnis
// Sesuai docs/LUVIRA_2_PLAN.md Bagian 4 & 13
// ============================================================================

import { test, expect } from '@playwright/test';
import { prisma } from '@/lib/db';
import { createSession } from '@/lib/auth';
import { Role } from '@prisma/client';

test.describe('E2E-11: Owner Ekspor Laporan Finansial (CSV/Excel)', () => {
  let ownerUser: any;
  let ownerToken: string;
  let adminPusatUser: any;
  let adminPusatToken: string;

  test.beforeAll(async () => {
    ownerUser = await prisma.user.findFirst({ where: { role: Role.OWNER } });
    adminPusatUser = await prisma.user.findFirst({ where: { role: Role.ADMIN_PUSAT } });

    expect(ownerUser).toBeDefined();

    ownerToken = await createSession({
      userId: ownerUser.id,
      email: ownerUser.email,
      name: ownerUser.name,
      role: ownerUser.role,
      regionId: ownerUser.regionId,
    });

    if (adminPusatUser) {
      adminPusatToken = await createSession({
        userId: adminPusatUser.id,
        email: adminPusatUser.email,
        name: adminPusatUser.name,
        role: adminPusatUser.role,
        regionId: adminPusatUser.regionId,
      });
    }
  });

  test('Owner berhasil mengunduh file ekspor laporan keuangan', async ({ request }) => {
    const res = await request.get('/api/owner/reports/export', {
      headers: {
        Authorization: `Bearer ${ownerToken}`,
      },
    });

    expect(res.ok()).toBe(true);
    expect(res.status()).toBe(200);

    // Verifikasi Header Content-Disposition & Content-Type
    const contentType = res.headers()['content-type'];
    expect(contentType).toContain('text/csv');

    const contentDisposition = res.headers()['content-disposition'];
    expect(contentDisposition).toContain('attachment');
    expect(contentDisposition).toContain('.csv');

    // Verifikasi Konten CSV
    const body = await res.text();
    expect(body).toContain('LAPORAN KEUANGAN DAN PENJUALAN LUVIRA 2.0');
    expect(body).toContain('Periode:');
    expect(body).toContain('Tanggal Cetak:');
    expect(body).toContain('Dicetak Oleh:');
    expect(body).toContain('RINGKASAN KEUANGAN BISNIS');
    expect(body).toContain('Laba Kotor (Gross Profit)');
    expect(body).toContain('Penjualan Bersih (Net Sales)');
    expect(body).toContain('PPN 11% (Titipan Pajak)');
  });

  test('Pengguna tanpa hak akses (Admin / Publik) DITOLAK saat mengunduh laporan Owner', async ({ request }) => {
    // 1. Tanpa Login (Publik) -> 401
    const unauthRes = await request.get('/api/owner/reports/export');
    expect(unauthRes.status()).toBe(401);

    // 2. Admin Pusat -> 403
    if (adminPusatToken) {
      const adminRes = await request.get('/api/owner/reports/export', {
        headers: {
          Authorization: `Bearer ${adminPusatToken}`,
        },
      });
      expect(adminRes.status()).toBe(403);
    }
  });
});
