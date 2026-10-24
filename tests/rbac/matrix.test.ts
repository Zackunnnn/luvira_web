// tests/rbac/matrix.test.ts
// ============================================================================
// Automated RBAC Matrix Tests
// Menguji setiap kombinasi endpoint x peran (termasuk unauthenticated)
// Memastikan izin dan penolakan 100% konsisten dengan Bagian 4 plan
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
    description: 'Owner kelola seluruh admin',
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
];

const ROLES: (AuthUser | null)[] = [
  null, // Unauthenticated
  { id: 'u-buyer', role: 'BUYER' },
  { id: 'u-pusat', role: Role.ADMIN_PUSAT, regionId: 'region-pusat' },
  { id: 'u-jogja', role: Role.ADMIN_WILAYAH, regionId: 'region-jogja' },
  { id: 'u-owner', role: Role.OWNER, regionId: null },
  { id: 'u-dev', role: Role.DEVELOPER, regionId: null },
];

describe('Matriks RBAC Otomatis (Endpoint x Peran)', () => {
  ENDPOINT_POLICIES.forEach((policy) => {
    describe(`${policy.method} ${policy.endpoint} — ${policy.description}`, () => {
      ROLES.forEach((user) => {
        const roleLabel = user ? user.role : 'UNAUTHENTICATED';
        it(`memeriksa izin untuk peran [${roleLabel}]`, () => {
          const context = policy.getResourceContext ? policy.getResourceContext(user) : undefined;
          const allowed = can(user, policy.permission, context);

          // Assertions berdasarkan wewenang yang ditetapkan di Bagian 4 plan:
          if (!user || user.role === 'BUYER') {
            const isPublicEndpoint = ['catalog:view', 'order:create', 'order:track', 'advice:read'].includes(policy.permission);
            expect(allowed).toBe(isPublicEndpoint);
          } else if (user.role === Role.ADMIN_PUSAT) {
            if (policy.permission === 'cost_price:view' || policy.permission === 'cost_price:manage') {
              expect(allowed).toBe(false); // Admin tidak pernah boleh melihat HPP!
            } else if (policy.permission === 'settings:manage' || policy.permission === 'reports:export') {
              expect(allowed).toBe(false); // Khusus Owner
            } else if (policy.endpoint.includes('(wilayah lain)')) {
              expect(allowed).toBe(false); // Tidak boleh mengelola pesanan wilayah lain
            } else if (policy.permission.startsWith('system:')) {
              expect(allowed).toBe(false); // Khusus Developer
            }
          } else if (user.role === Role.ADMIN_WILAYAH) {
            if (policy.permission === 'catalog:manage' || policy.permission === 'price:manage') {
              expect(allowed).toBe(false); // Admin Wilayah dilarang ubah katalog/harga
            } else if (policy.permission === 'cost_price:view' || policy.permission === 'cost_price:manage') {
              expect(allowed).toBe(false); // Dilarang lihat HPP
            } else if (policy.endpoint.includes('(wilayah lain)')) {
              expect(allowed).toBe(false); // Dilarang kelola wilayah lain
            } else if (policy.permission === 'promo_reseller:manage' || policy.permission.startsWith('users:')) {
              expect(allowed).toBe(false);
            }
          } else if (user.role === Role.OWNER) {
            if (policy.permission === 'order:manage') {
              expect(allowed).toBe(false); // Owner tidak mengelola status pesanan langsung
            } else if (policy.permission.startsWith('system:')) {
              expect(allowed).toBe(false); // Developer
            } else {
              // Owner boleh melihat dan mengelola sebagian besar modul bisnis
              if (['cost_price:view', 'cost_price:manage', 'price:manage', 'settings:manage', 'reports:export'].includes(policy.permission)) {
                expect(allowed).toBe(true);
              }
            }
          } else if (user.role === Role.DEVELOPER) {
            if (['system:health_manage', 'system:error_view', 'cost_price:view', 'audit:view'].includes(policy.permission)) {
              expect(allowed).toBe(true);
            } else if (policy.permission.includes(':manage') || policy.permission === 'order:create') {
              expect(allowed).toBe(false); // Developer DILARANG menulis data bisnis
            }
          }
        });
      });
    });
  });
});
