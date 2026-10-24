// tests/integration/region-isolation.test.ts
// ============================================================================
// Integration Test: Isolasi Wilayah Admin Wilayah
// Sesuai docs/LUVIRA_2_PLAN.md Bagian 4 & 5.2
// ============================================================================

import { describe, it, expect } from 'vitest';
import { can, buildRegionFilter, AuthUser } from '@/lib/permissions';
import { Role } from '@prisma/client';

describe('Integrasi: Isolasi Wilayah Admin (Region Isolation)', () => {
  const adminJogja: AuthUser = {
    id: 'u-jogja-1',
    email: 'admin.jogja@luvira.id',
    name: 'Admin Yogyakarta',
    role: Role.ADMIN_WILAYAH,
    regionId: 'reg-yogyakarta',
  };

  const adminPusat: AuthUser = {
    id: 'u-pusat-1',
    email: 'admin.pusat@luvira.id',
    name: 'Admin Pusat',
    role: Role.ADMIN_PUSAT,
    regionId: 'reg-pusat',
  };

  it('Admin Wilayah Yogyakarta hanya dapat mengelola pesanan wilayah Yogyakarta', () => {
    // 1. Pesanan Yogyakarta -> Boleh
    const canManageOwn = can(adminJogja, 'order:manage', { regionId: 'reg-yogyakarta' });
    expect(canManageOwn).toBe(true);

    // 2. Pesanan Pusat -> DITOLAK KERAS
    const canManagePusat = can(adminJogja, 'order:manage', { regionId: 'reg-pusat' });
    expect(canManagePusat).toBe(false);

    // 3. Pesanan wilayah lain -> DITOLAK
    const canManageOther = can(adminJogja, 'order:manage', { regionId: 'reg-surabaya' });
    expect(canManageOther).toBe(false);
  });

  it('Admin Wilayah Yogyakarta hanya dapat mengelola stok di gudang Yogyakarta', () => {
    expect(can(adminJogja, 'stock:manage', { regionId: 'reg-yogyakarta' })).toBe(true);
    expect(can(adminJogja, 'stock:manage', { regionId: 'reg-pusat' })).toBe(false);
  });

  it('Admin Wilayah Yogyakarta hanya dapat membuat promo untuk wilayah Yogyakarta', () => {
    expect(can(adminJogja, 'promo_region:manage', { regionId: 'reg-yogyakarta' })).toBe(true);
    expect(can(adminJogja, 'promo_region:manage', { regionId: 'reg-pusat' })).toBe(false);
    expect(can(adminJogja, 'promo_reseller:manage')).toBe(false); // Promo reseller hanya Pusat/Owner
  });

  it('Helper buildRegionFilter secara otomatis mengunci kueri database pada regionId milik Admin Wilayah', () => {
    const filterJogja = buildRegionFilter(adminJogja);
    expect(filterJogja).toEqual({ regionId: 'reg-yogyakarta' });

    // Kueri yang memakai filter ini dijamin tidak akan pernah mengambil data wilayah lain:
    const mockDbQuery = (filter: { regionId?: string }) => {
      const allOrders = [
        { id: 'ord-1', regionId: 'reg-yogyakarta', code: 'LVR-JOGJA-001' },
        { id: 'ord-2', regionId: 'reg-pusat', code: 'LVR-PUSAT-001' },
      ];
      return allOrders.filter((o) => !filter.regionId || o.regionId === filter.regionId);
    };

    const results = mockDbQuery(filterJogja);
    expect(results).toHaveLength(1);
    expect(results[0].code).toBe('LVR-JOGJA-001');
    expect(results.some((r) => r.regionId === 'reg-pusat')).toBe(false);
  });

  it('Admin Pusat dapat melihat pesanan semua wilayah tetapi hanya mengelola pesanan Pusat', () => {
    expect(can(adminPusat, 'order:view', { regionId: 'reg-yogyakarta' })).toBe(true);
    expect(can(adminPusat, 'order:view', { regionId: 'reg-pusat' })).toBe(true);

    expect(can(adminPusat, 'order:manage', { regionId: 'reg-pusat' })).toBe(true);
    expect(can(adminPusat, 'order:manage', { regionId: 'reg-yogyakarta' })).toBe(false);
  });
});
