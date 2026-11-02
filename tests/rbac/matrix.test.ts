// tests/rbac/matrix.test.ts
// ============================================================================
// Automated RBAC Matrix Tests - 6 Peran + Unauthenticated
// Menguji setiap kombinasi endpoint x peran (7 subjek)
// Sesuai docs/LUVIRA_2_PLAN.md Bagian 4 & FT-0
// ============================================================================

import { describe, it, expect } from 'vitest';
import { can, AuthUser, Permission, ResourceContext } from '@/lib/permissions';
import { Role } from '@prisma/client';

interface EndpointPolicy {
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  permission: Permission;
  getResourceContext?: (user: AuthUser | null) => ResourceContext | undefined;
  description: string;
}

const ENDPOINT_POLICIES: EndpointPolicy[] = [
  // 1. Publik / Pembeli
  {
    endpoint: '/api/catalog',
    method: 'GET',
    permission: 'catalog:view',
    description: 'Lihat katalog produk',
  },
  {
    endpoint: '/api/orders',
    method: 'POST',
    permission: 'order:create',
    description: 'Buat pesanan baru',
  },
  {
    endpoint: '/api/orders/[code]',
    method: 'GET',
    permission: 'order:track',
    description: 'Lacak pesanan',
  },

  // 2. Pesanan (Admin)
  {
    endpoint: '/api/admin/orders',
    method: 'GET',
    permission: 'order:view',
    description: 'Lihat daftar pesanan',
  },
  {
    endpoint: '/api/admin/orders/[id]/status',
    method: 'PUT',
    permission: 'order:manage',
    getResourceContext: (user) => ({ regionId: user?.regionId || 'region-pusat' }),
    description: 'Kelola status pesanan wilayah sendiri',
  },
  {
    endpoint: '/api/admin/orders/[id]/status (wilayah lain)',
    method: 'PUT',
    permission: 'order:manage',
    getResourceContext: () => ({ regionId: 'region-berbeda' }),
    description: 'Kelola status pesanan wilayah lain (harus ditolak untuk Admin Wilayah)',
  },

  // 3. Produk & Harga
  {
    endpoint: '/api/admin/products',
    method: 'POST',
    permission: 'catalog:manage',
    description: 'Kelola katalog dan varian produk',
  },
  {
    endpoint: '/api/admin/pricing',
    method: 'PUT',
    permission: 'price:manage',
    description: 'Ubah harga jual seragam',
  },
  {
    endpoint: '/api/owner/cost-prices',
    method: 'GET',
    permission: 'cost_price:view',
    description: 'Lihat harga modal (HPP)',
  },
  {
    endpoint: '/api/owner/cost-prices',
    method: 'PUT',
    permission: 'cost_price:manage',
    description: 'Kelola harga modal (HPP)',
  },

  // 4. Stok
  {
    endpoint: '/api/admin/stock',
    method: 'PUT',
    permission: 'stock:manage',
    getResourceContext: (user) => ({ regionId: user?.regionId || 'region-pusat' }),
    description: 'Kelola stok wilayah sendiri',
  },

  // 5. Promo
  {
    endpoint: '/api/admin/promos/reseller',
    method: 'POST',
    permission: 'promo_reseller:manage',
    description: 'Buat promo reseller nasional',
  },
  {
    endpoint: '/api/admin/promos/region',
    method: 'POST',
    permission: 'promo_region:manage',
    getResourceContext: (user) => ({ regionId: user?.regionId || 'region-pusat' }),
    description: 'Buat promo wilayah',
  },

  // 6. Pengguna & Pengaturan
  {
    endpoint: '/api/admin/users/regional',
    method: 'POST',
    permission: 'users:manage_regional_admin',
    getResourceContext: () => ({ targetRole: Role.ADMIN_WILAYAH }),
    description: 'Admin Pusat kelola Admin Wilayah',
  },
  {
    endpoint: '/api/owner/users',
    method: 'POST',
    permission: 'users:manage_all_admins',
    description: 'Owner kelola seluruh admin & reseller',
  },
  {
    endpoint: '/api/owner/settings',
    method: 'PUT',
    permission: 'settings:manage',
    description: 'Owner kelola pengaturan',
  },
  {
    endpoint: '/api/owner/reports',
    method: 'GET',
    permission: 'reports:view_dashboard',
    description: 'Owner lihat laporan dashboard',
  },
  {
    endpoint: '/api/owner/reports/export',
    method: 'GET',
    permission: 'reports:export',
    description: 'Owner cetak / export laporan',
  },

  // 7. Developer & Observabilitas
  {
    endpoint: '/api/developer/health',
    method: 'GET',
    permission: 'system:health_manage',
    description: 'Developer kelola kesehatan modul',
  },
  {
    endpoint: '/api/developer/errors',
    method: 'GET',
    permission: 'system:error_view',
    description: 'Developer lihat error log',
  },

  // 8. Fitur Tambahan FT-0 s/d FT-6: COD, Reseller, Promo Uji, Sheets, WA
  {
    endpoint: '/api/orders/manual (COD wilayah sendiri)',
    method: 'POST',
    permission: 'order:create_cod',
    getResourceContext: (user) => ({ regionId: user?.regionId || 'region-pusat' }),
    description: 'Buat pesanan COD manual wilayah pemenuhan',
  },
  {
    endpoint: '/api/orders/manual (COD wilayah lain)',
    method: 'POST',
    permission: 'order:create_cod',
    getResourceContext: () => ({ regionId: 'region-berbeda' }),
    description: 'Buat pesanan COD wilayah lain (harus ditolak untuk Admin Wilayah)',
  },
  {
    endpoint: '/api/admin/resellers',
    method: 'POST',
    permission: 'reseller:manage',
    getResourceContext: () => ({ targetRole: Role.RESELLER }),
    description: 'Kelola akun reseller',
  },
  {
    endpoint: '/api/reseller/orders',
    method: 'GET',
    permission: 'reseller:view_own_orders',
    getResourceContext: (user) => ({ userId: user?.id }),
    description: 'Reseller lihat pesanan berkode miliknya',
  },
  {
    endpoint: '/api/admin/promos/assign-reseller',
    method: 'POST',
    permission: 'promo:assign_reseller',
    description: 'Tautkan kode promo ke reseller',
  },
  {
    endpoint: '/api/owner/promos/test',
    method: 'POST',
    permission: 'promo:test_manage',
    description: 'Owner kelola kode promo uji',
  },
  {
    endpoint: '/api/owner/test-orders/reset',
    method: 'POST',
    permission: 'test_orders:reset',
    description: 'Owner reset data pesanan uji',
  },
  {
    endpoint: '/api/sheets/connection',
    method: 'PUT',
    permission: 'sheet:manage_own',
    getResourceContext: (user) => ({ userId: user?.id }),
    description: 'Kelola spreadsheet milik sendiri / wilayah',
  },
  {
    endpoint: '/api/owner/sheets/global',
    method: 'POST',
    permission: 'sheet:manage_global',
    description: 'Owner kelola spreadsheet global',
  },
  {
    endpoint: '/api/owner/settings/wa',
    method: 'PUT',
    permission: 'wa:settings',
    description: 'Owner kelola pengaturan WhatsApp gateway',
  },
  {
    endpoint: '/api/reports/subscribe',
    method: 'POST',
    permission: 'report:subscribe',
    getResourceContext: (user) => ({ userId: user?.id }),
    description: 'Atur langganan laporan WhatsApp',
  },
];

const ROLES: (AuthUser | null)[] = [
  null, // Unauthenticated
  { id: 'u-buyer', role: 'BUYER' },
  { id: 'u-pusat', role: Role.ADMIN_PUSAT, regionId: 'region-pusat' },
  { id: 'u-jogja', role: Role.ADMIN_WILAYAH, regionId: 'region-jogja' },
  { id: 'u-owner', role: Role.OWNER, regionId: null },
  { id: 'u-dev', role: Role.DEVELOPER, regionId: null },
  { id: 'u-reseller', role: Role.RESELLER, regionId: 'region-pusat' },
];

describe('Matriks RBAC Otomatis (6 Peran + Unauthenticated)', () => {
  ENDPOINT_POLICIES.forEach((policy) => {
    describe(`${policy.method} ${policy.endpoint} — ${policy.description}`, () => {
      ROLES.forEach((user) => {
        const roleLabel = user ? user.role : 'UNAUTHENTICATED';
        it(`memeriksa izin untuk peran [${roleLabel}]`, () => {
          const context = policy.getResourceContext ? policy.getResourceContext(user) : undefined;
          const allowed = can(user, policy.permission, context);

          // 1. Publik / BUYER / Unauthenticated
          if (!user || user.role === 'BUYER') {
            const isPublicEndpoint = ['catalog:view', 'order:create', 'order:track', 'advice:read'].includes(policy.permission);
            expect(allowed).toBe(isPublicEndpoint);
          }
          // 2. ADMIN_PUSAT
          else if (user.role === Role.ADMIN_PUSAT) {
            if (policy.permission === 'cost_price:view' || policy.permission === 'cost_price:manage') {
              expect(allowed).toBe(false); // Admin dilarang intip HPP
            } else if (['settings:manage', 'reports:export', 'promo:test_manage', 'test_orders:reset', 'sheet:manage_global', 'wa:settings'].includes(policy.permission)) {
              expect(allowed).toBe(false); // Khusus Owner
            } else if (policy.endpoint.includes('(wilayah lain)')) {
              expect(allowed).toBe(false); // Dilarang kelola pesanan wilayah lain
            } else if (policy.permission.startsWith('system:')) {
              expect(allowed).toBe(false); // Khusus Developer
            } else if (policy.permission === 'reseller:view_own_orders') {
              expect(allowed).toBe(false); // Khusus Reseller
            } else if (['catalog:view', 'advice:read', 'order:view', 'order:manage', 'order:create_cod', 'catalog:manage', 'price:manage', 'stock:manage', 'stock:view', 'promo_reseller:manage', 'promo_region:manage', 'users:manage_regional_admin', 'reseller:manage', 'promo:assign_reseller', 'sheet:manage_own', 'report:subscribe'].includes(policy.permission)) {
              expect(allowed).toBe(true);
            }
          }
          // 3. ADMIN_WILAYAH
          else if (user.role === Role.ADMIN_WILAYAH) {
            if (['catalog:manage', 'price:manage', 'cost_price:view', 'cost_price:manage', 'promo_reseller:manage', 'users:manage_regional_admin', 'users:manage_all_admins', 'reseller:manage', 'promo:assign_reseller', 'promo:test_manage', 'test_orders:reset', 'sheet:manage_global', 'wa:settings', 'reseller:view_own_orders'].includes(policy.permission)) {
              expect(allowed).toBe(false);
            } else if (policy.endpoint.includes('wilayah lain')) {
              expect(allowed).toBe(false); // Dilarang di wilayah lain
            } else if (policy.permission.startsWith('system:')) {
              expect(allowed).toBe(false);
            } else if (['order:manage', 'stock:manage', 'order:create_cod', 'promo_region:manage', 'sheet:manage_own', 'report:subscribe'].includes(policy.permission) && !policy.endpoint.includes('wilayah lain')) {
              expect(allowed).toBe(true);
            }
          }
          // 4. OWNER
          else if (user.role === Role.OWNER) {
            if (policy.permission === 'order:manage') {
              expect(allowed).toBe(false); // Owner tidak mengelola status pesanan operasional
            } else if (policy.permission.startsWith('system:')) {
              expect(allowed).toBe(false); // Developer
            } else if (policy.permission === 'reseller:view_own_orders') {
              expect(allowed).toBe(false); // Khusus Reseller
            } else if (['cost_price:view', 'cost_price:manage', 'price:manage', 'settings:manage', 'reports:export', 'reseller:manage', 'order:create_cod', 'promo:assign_reseller', 'promo:test_manage', 'test_orders:reset', 'sheet:manage_global', 'sheet:manage_own', 'wa:settings', 'report:subscribe', 'users:manage_all_admins'].includes(policy.permission)) {
              expect(allowed).toBe(true);
            }
          }
          // 5. DEVELOPER
          else if (user.role === Role.DEVELOPER) {
            if (['system:health_manage', 'system:error_view', 'cost_price:view', 'audit:view'].includes(policy.permission)) {
              expect(allowed).toBe(true);
            } else if (policy.permission.includes(':manage') || policy.permission === 'order:create' || policy.permission === 'order:create_cod' || policy.permission === 'test_orders:reset') {
              expect(allowed).toBe(false); // Developer dilarang menulis data bisnis
            }
          }
          // 6. RESELLER
          else if (user.role === Role.RESELLER) {
            const resellerAllowed = [
              'catalog:view',
              'advice:read',
              'profile:manage_own',
              'order:create_cod',
              'reseller:view_own_orders',
              'promo:view',
              'sheet:manage_own',
              'report:subscribe',
            ].includes(policy.permission);

            expect(allowed).toBe(resellerAllowed);
          }
        });
      });
    });
  });
});
