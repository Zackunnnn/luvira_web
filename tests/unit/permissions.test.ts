// tests/unit/permissions.test.ts
import { describe, it, expect } from 'vitest';
import { can, buildRegionFilter, maskProductCost, AuthUser } from '@/lib/permissions';
import { Role } from '@prisma/client';

describe('Permissions & RBAC (can()) Unit Tests', () => {
  const buyerUser: AuthUser = { id: 'buyer-1', role: 'BUYER' };
  const adminPusat: AuthUser = { id: 'admin-pusat', role: Role.ADMIN_PUSAT, regionId: 'region-pusat' };
  const adminJogja: AuthUser = { id: 'admin-jogja', role: Role.ADMIN_WILAYAH, regionId: 'region-jogja' };
  const ownerUser: AuthUser = { id: 'owner-1', role: Role.OWNER, regionId: null };
  const devUser: AuthUser = { id: 'dev-1', role: Role.DEVELOPER, regionId: null };
  const resellerUser: AuthUser = { id: 'reseller-1', role: Role.RESELLER, regionId: 'region-pusat' };
  const inactiveAdmin: AuthUser = { id: 'admin-deact', role: Role.ADMIN_PUSAT, regionId: 'region-pusat', isActive: false };

  describe('1. Akses Pengguna Publik / Pembeli (BUYER)', () => {
    it('bisa melihat katalog, membaca artikel, membuat pesanan, dan melacak', () => {
      expect(can(buyerUser, 'catalog:view')).toBe(true);
      expect(can(null, 'catalog:view')).toBe(true);
      expect(can(buyerUser, 'advice:read')).toBe(true);
      expect(can(buyerUser, 'order:create')).toBe(true);
      expect(can(buyerUser, 'order:track')).toBe(true);
    });

    it('dilarang mengelola katalog, stok, pesanan, promo, atau melihat harga modal', () => {
      expect(can(buyerUser, 'catalog:manage')).toBe(false);
      expect(can(buyerUser, 'stock:manage')).toBe(false);
      expect(can(buyerUser, 'order:manage')).toBe(false);
      expect(can(buyerUser, 'cost_price:view')).toBe(false);
      expect(can(buyerUser, 'reports:view_dashboard')).toBe(false);
      expect(can(buyerUser, 'order:create_cod')).toBe(false);
    });
  });

  describe('2. Akses Admin Pusat (ADMIN_PUSAT)', () => {
    it('bisa mengelola katalog, harga jual, dan stok', () => {
      expect(can(adminPusat, 'catalog:manage')).toBe(true);
      expect(can(adminPusat, 'price:manage')).toBe(true);
      expect(can(adminPusat, 'stock:manage')).toBe(true);
      expect(can(adminPusat, 'order:create_cod')).toBe(true);
    });

    it('bisa mengelola pesanan wilayah Pusat, tapi dilarang mengelola pesanan wilayah lain', () => {
      expect(can(adminPusat, 'order:manage', { regionId: 'region-pusat' })).toBe(true);
      expect(can(adminPusat, 'order:manage', { regionId: 'region-jogja' })).toBe(false);
      expect(can(adminPusat, 'order:view', { regionId: 'region-jogja' })).toBe(true);
    });

    it('boleh mengelola akun Admin Wilayah dan Reseller, bukan Owner, Developer, atau sesama Admin Pusat', () => {
      expect(can(adminPusat, 'users:manage_regional_admin', { targetRole: Role.ADMIN_WILAYAH })).toBe(true);
      expect(can(adminPusat, 'users:manage_regional_admin', { targetRole: Role.RESELLER })).toBe(true);
      expect(can(adminPusat, 'reseller:manage', { targetRole: Role.RESELLER })).toBe(true);
      expect(can(adminPusat, 'users:manage_regional_admin', { targetRole: Role.OWNER })).toBe(false);
      expect(can(adminPusat, 'users:manage_regional_admin', { targetRole: Role.DEVELOPER })).toBe(false);
      expect(can(adminPusat, 'users:manage_regional_admin', { targetRole: Role.ADMIN_PUSAT })).toBe(false);
    });

    it('boleh menautkan kode promo ke reseller', () => {
      expect(can(adminPusat, 'promo:assign_reseller')).toBe(true);
    });

    it('dilarang melihat harga modal (HPP), promo uji, reset uji, dan wa settings', () => {
      expect(can(adminPusat, 'cost_price:view')).toBe(false);
      expect(can(adminPusat, 'cost_price:manage')).toBe(false);
      expect(can(adminPusat, 'settings:manage')).toBe(false);
      expect(can(adminPusat, 'reports:export')).toBe(false);
      expect(can(adminPusat, 'promo:test_manage')).toBe(false);
      expect(can(adminPusat, 'test_orders:reset')).toBe(false);
      expect(can(adminPusat, 'sheet:manage_global')).toBe(false);
      expect(can(adminPusat, 'wa:settings')).toBe(false);
    });
  });

  describe('3. Akses Admin Wilayah (ADMIN_WILAYAH)', () => {
    it('hanya boleh mengelola pesanan dan stok di wilayahnya sendiri', () => {
      expect(can(adminJogja, 'order:manage', { regionId: 'region-jogja' })).toBe(true);
      expect(can(adminJogja, 'order:manage', { regionId: 'region-pusat' })).toBe(false);
      expect(can(adminJogja, 'order:manage', { regionId: 'region-lain' })).toBe(false);

      expect(can(adminJogja, 'stock:manage', { regionId: 'region-jogja' })).toBe(true);
      expect(can(adminJogja, 'stock:manage', { regionId: 'region-pusat' })).toBe(false);
    });

    it('bisa membuat pesanan COD di wilayahnya sendiri', () => {
      expect(can(adminJogja, 'order:create_cod', { regionId: 'region-jogja' })).toBe(true);
      expect(can(adminJogja, 'order:create_cod', { regionId: 'region-pusat' })).toBe(false);
    });

    it('hanya boleh mengelola nasihat yang ia tulis sendiri', () => {
      expect(can(adminJogja, 'advice:manage', { authorId: 'admin-jogja', regionId: 'region-jogja' })).toBe(true);
      expect(can(adminJogja, 'advice:manage', { authorId: 'admin-pusat', regionId: 'region-jogja' })).toBe(false);
    });

    it('dilarang mengubah harga jual, mengelola katalog, dan melihat HPP', () => {
      expect(can(adminJogja, 'catalog:manage')).toBe(false);
      expect(can(adminJogja, 'price:manage')).toBe(false);
      expect(can(adminJogja, 'cost_price:view')).toBe(false);
      expect(can(adminJogja, 'users:manage_regional_admin')).toBe(false);
      expect(can(adminJogja, 'reseller:manage')).toBe(false);
      expect(can(adminJogja, 'promo:assign_reseller')).toBe(false);
      expect(can(adminJogja, 'promo:test_manage')).toBe(false);
    });
  });

  describe('4. Akses Owner (OWNER)', () => {
    it('bisa mengelola harga jual seragam dan harga modal (HPP)', () => {
      expect(can(ownerUser, 'price:manage')).toBe(true);
      expect(can(ownerUser, 'cost_price:view')).toBe(true);
      expect(can(ownerUser, 'cost_price:manage')).toBe(true);
    });

    it('bisa mengelola semua fitur tambahan: reseller, promo uji, reset uji, wa settings, sheet global', () => {
      expect(can(ownerUser, 'reseller:manage')).toBe(true);
      expect(can(ownerUser, 'order:create_cod')).toBe(true);
      expect(can(ownerUser, 'promo:assign_reseller')).toBe(true);
      expect(can(ownerUser, 'promo:test_manage')).toBe(true);
      expect(can(ownerUser, 'test_orders:reset')).toBe(true);
      expect(can(ownerUser, 'sheet:manage_global')).toBe(true);
      expect(can(ownerUser, 'sheet:manage_own')).toBe(true);
      expect(can(ownerUser, 'wa:settings')).toBe(true);
      expect(can(ownerUser, 'report:subscribe')).toBe(true);
    });

    it('bisa melihat semua pesanan dan laporan, mengelola pengaturan dan semua akun admin', () => {
      expect(can(ownerUser, 'order:view')).toBe(true);
      expect(can(ownerUser, 'reports:view_dashboard')).toBe(true);
      expect(can(ownerUser, 'reports:export')).toBe(true);
      expect(can(ownerUser, 'settings:manage')).toBe(true);
      expect(can(ownerUser, 'users:manage_all_admins')).toBe(true);
    });

    it('hanya melihat alur pesanan (tidak mengelola langsung di alur admin)', () => {
      expect(can(ownerUser, 'order:manage')).toBe(false);
    });
  });

  describe('5. Akses Developer (DEVELOPER)', () => {
    it('bisa melihat kesehatan modul, error log, audit log, dan HPP untuk audit', () => {
      expect(can(devUser, 'system:health_manage')).toBe(true);
      expect(can(devUser, 'system:error_view')).toBe(true);
      expect(can(devUser, 'audit:view')).toBe(true);
      expect(can(devUser, 'cost_price:view')).toBe(true);
    });

    it('dilarang menulis data bisnis (katalog, pesanan, harga, stok, promo, pengguna, COD, sheets, WA)', () => {
      expect(can(devUser, 'catalog:manage')).toBe(false);
      expect(can(devUser, 'order:manage')).toBe(false);
      expect(can(devUser, 'order:create_cod')).toBe(false);
      expect(can(devUser, 'price:manage')).toBe(false);
      expect(can(devUser, 'stock:manage')).toBe(false);
      expect(can(devUser, 'users:manage_all_admins')).toBe(false);
      expect(can(devUser, 'settings:manage')).toBe(false);
      expect(can(devUser, 'reseller:manage')).toBe(false);
      expect(can(devUser, 'wa:settings')).toBe(false);
      expect(can(devUser, 'sheet:manage_global')).toBe(false);
    });
  });

  describe('6. Akses Reseller (RESELLER) - Peran ke-6', () => {
    it('bisa melihat katalog, membaca artikel, mengelola profil sendiri, dan membuat pesanan COD', () => {
      expect(can(resellerUser, 'catalog:view')).toBe(true);
      expect(can(resellerUser, 'advice:read')).toBe(true);
      expect(can(resellerUser, 'profile:manage_own')).toBe(true);
      expect(can(resellerUser, 'order:create_cod')).toBe(true);
      expect(can(resellerUser, 'promo:view')).toBe(true);
    });

    it('bisa melihat pesanan miliknya sendiri, kelola sheet sendiri, dan langganan WA sendiri', () => {
      expect(can(resellerUser, 'reseller:view_own_orders', { userId: 'reseller-1' })).toBe(true);
      expect(can(resellerUser, 'reseller:view_own_orders', { userId: 'reseller-lain' })).toBe(false);

      expect(can(resellerUser, 'sheet:manage_own', { userId: 'reseller-1' })).toBe(true);
      expect(can(resellerUser, 'sheet:manage_own', { userId: 'reseller-lain' })).toBe(false);

      expect(can(resellerUser, 'report:subscribe', { userId: 'reseller-1' })).toBe(true);
      expect(can(resellerUser, 'report:subscribe', { userId: 'reseller-lain' })).toBe(false);
    });

    it('dilarang keras mengakses HPP, stok gudang, kelola katalog, dan dashboard owner/admin', () => {
      expect(can(resellerUser, 'cost_price:view')).toBe(false);
      expect(can(resellerUser, 'cost_price:manage')).toBe(false);
      expect(can(resellerUser, 'stock:view')).toBe(false);
      expect(can(resellerUser, 'stock:manage')).toBe(false);
      expect(can(resellerUser, 'catalog:manage')).toBe(false);
      expect(can(resellerUser, 'order:manage')).toBe(false);
      expect(can(resellerUser, 'reports:view_dashboard')).toBe(false);
      expect(can(resellerUser, 'reports:export')).toBe(false);
      expect(can(resellerUser, 'settings:manage')).toBe(false);
      expect(can(resellerUser, 'reseller:manage')).toBe(false);
      expect(can(resellerUser, 'promo:test_manage')).toBe(false);
      expect(can(resellerUser, 'test_orders:reset')).toBe(false);
      expect(can(resellerUser, 'sheet:manage_global')).toBe(false);
      expect(can(resellerUser, 'wa:settings')).toBe(false);
    });
  });

  describe('7. Akun Non-Aktif', () => {
    it('dilarang melakukan apa pun meskipun memiliki peran admin atau reseller', () => {
      expect(can(inactiveAdmin, 'catalog:view')).toBe(false);
      expect(can(inactiveAdmin, 'order:view')).toBe(false);
      expect(can(inactiveAdmin, 'catalog:manage')).toBe(false);
      expect(can(inactiveAdmin, 'price:manage')).toBe(false);
      expect(can(inactiveAdmin, 'order:create_cod')).toBe(false);
    });
  });

  describe('8. Helper Region Filter & Masking HPP', () => {
    it('buildRegionFilter otomatis menambahkan regionId untuk Admin Wilayah', () => {
      expect(buildRegionFilter(adminJogja)).toEqual({ regionId: 'region-jogja' });
      expect(buildRegionFilter(adminPusat)).toEqual({});
      expect(buildRegionFilter(ownerUser)).toEqual({});
      expect(buildRegionFilter(resellerUser)).toEqual({});
      expect(buildRegionFilter(null)).toEqual({});
    });

    it('maskProductCost menghapus cost/costPrice/packingCost untuk Admin, Reseller, dan Pembeli', () => {
      const mockProduct = {
        id: 'p1',
        name: 'Kaos Kaki',
        price: 35000,
        costPrice: 15000,
        packingCost: 2000,
        cost: { costPrice: 15000, packingCost: 2000 },
        variants: [
          { id: 'v1', name: 'Hitam', costPrice: 15000, packingCost: 2000 },
        ],
      };

      const maskedForReseller = maskProductCost(resellerUser, mockProduct);
      expect(maskedForReseller.costPrice).toBeUndefined();
      expect(maskedForReseller.packingCost).toBeUndefined();
      expect(maskedForReseller.cost).toBeUndefined();
      expect(maskedForReseller.variants[0].costPrice).toBeUndefined();

      const maskedForAdmin = maskProductCost(adminPusat, mockProduct);
      expect(maskedForAdmin.costPrice).toBeUndefined();
      expect(maskedForAdmin.packingCost).toBeUndefined();
      expect(maskedForAdmin.cost).toBeUndefined();
      expect(maskedForAdmin.variants[0].costPrice).toBeUndefined();

      const maskedForBuyer = maskProductCost(buyerUser, mockProduct);
      expect(maskedForBuyer.costPrice).toBeUndefined();

      const unmaskedForOwner = maskProductCost(ownerUser, mockProduct);
      expect(unmaskedForOwner.costPrice).toBe(15000);
      expect(unmaskedForOwner.cost).toBeDefined();

      const unmaskedForDev = maskProductCost(devUser, mockProduct);
      expect(unmaskedForDev.costPrice).toBe(15000);
    });
  });
});
