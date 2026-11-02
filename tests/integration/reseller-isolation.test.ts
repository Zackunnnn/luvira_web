// tests/integration/reseller-isolation.test.ts
// ============================================================================
// Integration Test: Isolasi Reseller (FT-0, Asumsi F4, F7, F8)
// 1. Reseller dilarang mengakses data & aksi peran lain (HPP, kelola katalog, kelola stok, akun lain)
// 2. Reseller hanya melihat pesanannya sendiri dengan data pelanggan disamarkan (F4)
// 3. Reseller tidak melihat promo milik reseller lain
// 4. Admin Pusat tidak boleh menyentuh Owner/Developer/Admin Pusat lain (A2)
// ============================================================================

import { describe, it, expect } from 'vitest';
import { can, maskOrderForReseller, maskCustomerData, AuthUser } from '@/lib/permissions';
import { Role } from '@prisma/client';

describe('Integrasi: Isolasi Reseller (Reseller Isolation & RBAC Protection)', () => {
  const resellerA: AuthUser = {
    id: 'u-reseller-a',
    name: 'Reseller Alpha',
    email: 'alpha@reseller.luvira.id',
    role: Role.RESELLER,
    regionId: 'reg-pusat',
  };

  const resellerB: AuthUser = {
    id: 'u-reseller-b',
    name: 'Reseller Beta',
    email: 'beta@reseller.luvira.id',
    role: Role.RESELLER,
    regionId: 'reg-yogyakarta',
  };

  const adminPusat: AuthUser = {
    id: 'u-pusat-1',
    name: 'Admin Pusat',
    email: 'pusat@luvira.id',
    role: Role.ADMIN_PUSAT,
    regionId: 'reg-pusat',
  };

  const adminWilayah: AuthUser = {
    id: 'u-wilayah-jogja',
    name: 'Admin Wilayah Jogja',
    email: 'jogja@luvira.id',
    role: Role.ADMIN_WILAYAH,
    regionId: 'reg-yogyakarta',
  };

  const owner: AuthUser = {
    id: 'u-owner-1',
    name: 'Owner Luvira',
    email: 'owner@luvira.id',
    role: Role.OWNER,
  };

  describe('1. Larangan Akses Peran Lain bagi Reseller', () => {
    it('Reseller DILARANG melihat atau mengelola harga modal (HPP / cost price)', () => {
      expect(can(resellerA, 'cost_price:view')).toBe(false);
      expect(can(resellerA, 'cost_price:manage')).toBe(false);
    });

    it('Reseller DILARANG mengelola katalog produk atau harga jual', () => {
      expect(can(resellerA, 'catalog:manage')).toBe(false);
      expect(can(resellerA, 'price:manage')).toBe(false);
    });

    it('Reseller DILARANG mengelola atau melihat stok gudang secara langsung', () => {
      expect(can(resellerA, 'stock:manage')).toBe(false);
      expect(can(resellerA, 'stock:view')).toBe(false);
    });

    it('Reseller DILARANG mengelola pengguna atau reseller lain', () => {
      expect(can(resellerA, 'users:manage_regional_admin')).toBe(false);
      expect(can(resellerA, 'users:manage_all_admins')).toBe(false);
      expect(can(resellerA, 'reseller:manage')).toBe(false);
    });

    it('Reseller DILARANG mengelola kode promo uji coba atau reset pesanan uji', () => {
      expect(can(resellerA, 'promo:test_manage')).toBe(false);
      expect(can(resellerA, 'test_orders:reset')).toBe(false);
    });

    it('Reseller DILARANG mengakses spreadsheet global atau pengaturan WA gateway', () => {
      expect(can(resellerA, 'sheet:manage_global')).toBe(false);
      expect(can(resellerA, 'wa:settings')).toBe(false);
    });
  });

  describe('2. Isolasi Pesanan & Penyamaran Data Pelanggan (F4)', () => {
    it('Reseller hanya boleh melihat pesanannya sendiri (berdasarkan userId pembuat / penaut)', () => {
      // Pesanan milik sendiri -> Boleh
      expect(can(resellerA, 'reseller:view_own_orders', { userId: resellerA.id })).toBe(true);

      // Pesanan milik Reseller lain -> DITOLAK KERAS
      expect(can(resellerA, 'reseller:view_own_orders', { userId: resellerB.id })).toBe(false);
    });

    it('maskCustomerData menyamarkan nama, nomor telepon, email, dan alamat jalan', () => {
      const rawCustomer = {
        customerName: 'Budi Santoso',
        customerPhone: '6281234567890',
        customerEmail: 'budi.santoso@example.com',
        customerAddress: 'Jl. Malioboro No. 45, Danurejan, Yogyakarta',
      };

      const masked = maskCustomerData(rawCustomer);

      // Nama disamarkan
      expect(masked.customerName).not.toBe('Budi Santoso');
      expect(masked.customerName).toContain('B');
      expect(masked.customerName).toContain('*');

      // Nomor telepon disamarkan tengahnya
      expect(masked.customerPhone).not.toBe('6281234567890');
      expect(masked.customerPhone).toContain('****');
      expect(masked.customerPhone.startsWith('6281')).toBe(true);
      expect(masked.customerPhone.endsWith('890')).toBe(true);

      // Email disamarkan
      expect(masked.customerEmail).not.toBe('budi.santoso@example.com');
      expect(masked.customerEmail).toContain('***@example.com');

      // Alamat jalan disamarkan
      expect(masked.customerAddress).toContain('disamarkan');
    });

    it('maskOrderForReseller otomatis menyamarkan data jika role adalah RESELLER, dan membiarkan utuh jika ADMIN/OWNER', () => {
      const rawOrder = {
        id: 'ord-123',
        customerName: 'Siti Rahmawati',
        customerPhone: '085712345678',
        customerEmail: 'siti@gmail.com',
        customerAddress: 'Komplek Griya Indah Blok C2',
        total: 125000,
      };

      const forReseller = maskOrderForReseller(resellerA, rawOrder);
      expect(forReseller.customerName).not.toBe('Siti Rahmawati');
      expect(forReseller.customerPhone).toContain('****');

      const forAdmin = maskOrderForReseller(adminPusat, rawOrder);
      expect(forAdmin.customerName).toBe('Siti Rahmawati');
      expect(forAdmin.customerPhone).toBe('085712345678');
    });
  });

  describe('3. Isolasi Akun & Izin Pembuatan Reseller (F8 & A2)', () => {
    it('Owner dan Admin Pusat dapat mengelola akun Reseller', () => {
      expect(can(owner, 'reseller:manage', { targetRole: Role.RESELLER })).toBe(true);
      expect(can(adminPusat, 'reseller:manage', { targetRole: Role.RESELLER })).toBe(true);
    });

    it('Admin Wilayah dan Reseller DILARANG mengelola akun Reseller', () => {
      expect(can(adminWilayah, 'reseller:manage', { targetRole: Role.RESELLER })).toBe(false);
      expect(can(resellerA, 'reseller:manage', { targetRole: Role.RESELLER })).toBe(false);
    });

    it('Admin Pusat DILARANG menyentuh akun Owner, Developer, atau Admin Pusat lain (Aturan A2)', () => {
      expect(can(adminPusat, 'users:manage_regional_admin', { targetRole: Role.OWNER })).toBe(false);
      expect(can(adminPusat, 'users:manage_regional_admin', { targetRole: Role.DEVELOPER })).toBe(false);
      expect(can(adminPusat, 'users:manage_regional_admin', { targetRole: Role.ADMIN_PUSAT })).toBe(false);
      expect(can(adminPusat, 'reseller:manage', { targetRole: Role.ADMIN_PUSAT })).toBe(false);
    });
  });
});
