// tests/unit/changelog.test.ts
// ============================================================================
// Unit Tests: LuviBot Sub-Admin Model A & Immutable Audit Log (LuviChangeLog)
// ============================================================================

import { describe, it, expect, vi } from 'vitest';
import { can, AuthUser } from '@/lib/permissions';
import { Role } from '@prisma/client';
import { recordLuviChangeLog, formatWibDateTime } from '@/lib/changelog';
import { prisma } from '@/lib/db';

describe('LuviBot Sub-Admin Model A & LuviChangeLog', () => {
  const luvibotUser: AuthUser = {
    id: 'u-luvibot-01',
    role: Role.LUVIBOT,
    regionId: null,
  };

  const ownerUser: AuthUser = {
    id: 'u-owner-01',
    role: Role.OWNER,
    regionId: null,
  };

  const adminPusatUser: AuthUser = {
    id: 'u-pusat-01',
    role: Role.ADMIN_PUSAT,
    regionId: 'region-pusat',
  };

  const resellerUser: AuthUser = {
    id: 'u-reseller-01',
    role: Role.RESELLER,
    regionId: 'region-pusat',
  };

  const devUser: AuthUser = {
    id: 'u-dev-01',
    role: Role.DEVELOPER,
    regionId: null,
  };

  describe('formatWibDateTime', () => {
    it('memformat tanggal ke format WIB dengan benar', () => {
      const date = new Date('2026-11-11T04:30:00.000Z'); // 11:30 WIB
      const str = formatWibDateTime(date);
      expect(str).toContain('WIB');
      expect(str).toContain('11/11/2026');
      expect(str).toMatch(/11[:.]30/);
    });
  });

  describe('RBAC Permissions untuk Role LUVIBOT', () => {
    it('LUVIBOT memiliki izin operasional yang diizinkan (Model A)', () => {
      expect(can(luvibotUser, 'catalog:view')).toBe(true);
      expect(can(luvibotUser, 'price:manage')).toBe(true);
      expect(can(luvibotUser, 'catalog:manage')).toBe(true);
      expect(can(luvibotUser, 'stock:manage')).toBe(true);
      expect(can(luvibotUser, 'stock:view')).toBe(true);
      expect(can(luvibotUser, 'order:view')).toBe(true);
      expect(can(luvibotUser, 'order:manage')).toBe(true);
      expect(can(luvibotUser, 'promo_reseller:manage')).toBe(true);
      expect(can(luvibotUser, 'promo_region:manage')).toBe(true);
      expect(can(luvibotUser, 'reports:view_dashboard')).toBe(true);
      expect(can(luvibotUser, 'changelog:view')).toBe(true);
      expect(can(luvibotUser, 'changelog:create')).toBe(true);
      expect(can(luvibotUser, 'reseller:view_list_masked')).toBe(true);
    });

    it('LUVIBOT secara tegas DITOLAK dari semua aksi terlarang', () => {
      // Dilarang intip / ubah HPP
      expect(can(luvibotUser, 'cost_price:view')).toBe(false);
      expect(can(luvibotUser, 'cost_price:manage')).toBe(false);

      // Dilarang export laporan
      expect(can(luvibotUser, 'reports:export')).toBe(false);

      // Dilarang kelola akun dan role orang lain
      expect(can(luvibotUser, 'users:manage_regional_admin')).toBe(false);
      expect(can(luvibotUser, 'users:manage_all_admins')).toBe(false);
      expect(can(luvibotUser, 'profile:manage_own')).toBe(false);

      // Dilarang akses menu developer dan kesehatan sistem
      expect(can(luvibotUser, 'system:health_manage')).toBe(false);
      expect(can(luvibotUser, 'system:error_view')).toBe(false);

      // Dilarang buat pesanan COD atau ubah pengaturan sistem
      expect(can(luvibotUser, 'order:create_cod')).toBe(false);
      expect(can(luvibotUser, 'settings:manage')).toBe(false);

      // Dilarang kelola google sheets & WhatsApp settings
      expect(can(luvibotUser, 'sheet:manage_own')).toBe(false);
      expect(can(luvibotUser, 'sheet:manage_global')).toBe(false);
      expect(can(luvibotUser, 'wa:settings')).toBe(false);
      expect(can(luvibotUser, 'report:subscribe')).toBe(false);

      // Dilarang kelola / reset test orders
      expect(can(luvibotUser, 'promo:test_manage')).toBe(false);
      expect(can(luvibotUser, 'test_orders:reset')).toBe(false);
    });

    it('changelog:view hanya boleh diakses peran tertentu', () => {
      expect(can(luvibotUser, 'changelog:view')).toBe(true);
      expect(can(ownerUser, 'changelog:view')).toBe(true);
      expect(can(adminPusatUser, 'changelog:view')).toBe(true);
      expect(can(devUser, 'changelog:view')).toBe(true);

      // Reseller dan unauthenticated mutlak tidak boleh
      expect(can(resellerUser, 'changelog:view')).toBe(false);
      expect(can(null, 'changelog:view')).toBe(false);
    });

    it('reseller:view_list_masked hanya boleh diakses LUVIBOT', () => {
      expect(can(luvibotUser, 'reseller:view_list_masked')).toBe(true);
      expect(can(resellerUser, 'reseller:view_list_masked')).toBe(false);
      expect(can(devUser, 'reseller:view_list_masked')).toBe(false);
      expect(can(null, 'reseller:view_list_masked')).toBe(false);
    });
  });

  describe('recordLuviChangeLog Helper & Model A Logging', () => {
    it('menulis baris log audit dengan seluruh field wajib Model A', async () => {
      // Mock prisma.luviChangeLog.create
      const mockCreated = {
        id: 'log-uuid-1',
        logCode: 'LOG-20261111-001',
        draftId: 'DRAF-20261111-01',
        executedAtWib: '11/11/2026, 11:30:00 WIB',
        requestedBy: 'Awan',
        approvedBy: 'Awan',
        approvalTimeWib: '11/11/2026, 11:28:00 WIB',
        executedBy: 'luvibot@luvira.id (Role: LUVIBOT)',
        targetType: 'PRODUCT',
        targetId: 'prod-001',
        targetName: 'Kaus Kaki Jempol Premium',
        fieldChanged: 'price',
        oldValue: 'Rp 25.000',
        newValue: 'Rp 27.500',
        verificationResult: 'LOLOS',
        status: 'BERHASIL',
        rollbackTo: 'Rp 25.000',
        createdAt: new Date(),
      };

      const spy = vi.spyOn(prisma.luviChangeLog, 'create').mockResolvedValueOnce(mockCreated as any);

      const result = await recordLuviChangeLog({
        draftId: 'DRAF-20261111-01',
        requestedBy: 'Awan',
        approvedBy: 'Awan',
        approvalTimeWib: '11/11/2026, 11:28:00 WIB',
        executedBy: 'luvibot@luvira.id (Role: LUVIBOT)',
        targetType: 'PRODUCT',
        targetId: 'prod-001',
        targetName: 'Kaus Kaki Jempol Premium',
        fieldChanged: 'price',
        oldValue: 'Rp 25.000',
        newValue: 'Rp 27.500',
        verificationResult: 'LOLOS',
        status: 'BERHASIL',
        rollbackTo: 'Rp 25.000',
      });

      expect(spy).toHaveBeenCalled();
      expect(result.logCode).toMatch(/^LOG-/);
      expect(result.draftId).toBe('DRAF-20261111-01');
      expect(result.executedBy).toContain('LUVIBOT');
      expect(result.status).toBe('BERHASIL');

      spy.mockRestore();
    });
  });
});
