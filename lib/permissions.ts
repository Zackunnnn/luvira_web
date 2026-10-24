// lib/permissions.ts
// ============================================================================
// Single Source of Truth Otorisasi dan Hak Akses Luvira 2.0
// Sesuai docs/LUVIRA_2_PLAN.md Bagian 4
// ============================================================================

import { Role } from '@prisma/client';

export type UserRole = Role | 'BUYER';

export interface AuthUser {
  id: string;
  email?: string;
  name?: string;
  role: UserRole;
  regionId?: string | null;
  isActive?: boolean;
}

export type Permission =
  // Belanja & Pesanan
  | 'catalog:view'
  | 'advice:read'
  | 'order:create'
  | 'order:track'
  | 'order:manage'
  | 'order:view'

  // Katalog, Stok, Harga
  | 'catalog:manage'
  | 'price:manage'
  | 'cost_price:view'
  | 'cost_price:manage'
  | 'stock:manage'
  | 'stock:view'

  // Konten, Wilayah, Promo
  | 'advice:manage'
  | 'location:manage'
  | 'coverage:manage'
  | 'promo_reseller:manage'
  | 'promo_region:manage'
  | 'promo:view'

  // Pengguna, Laporan, Sistem
  | 'users:manage_regional_admin'
  | 'users:manage_all_admins'
  | 'profile:manage_own'
  | 'payment_accounts:manage'
  | 'payment_accounts:view'
  | 'settings:manage'
  | 'settings:view'
  | 'reports:view_dashboard'
  | 'reports:export'
  | 'audit:view'
  | 'system:health_manage'
  | 'system:error_view';

export interface ResourceContext {
  regionId?: string | null;
  authorId?: string | null;
  userId?: string | null;
  targetRole?: Role | null;
}

// Matriks Izin Dasar per Peran
const BASE_ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  BUYER: [
    'catalog:view',
    'advice:read',
    'order:create',
    'order:track',
  ],

  ADMIN_PUSAT: [
    'catalog:view',
    'advice:read',
    'order:view',
    'order:manage', // Mengelola pesanan Pusat, melihat wilayah lain
    'catalog:manage',
    'price:manage',
    'stock:manage', // Stok Pusat
    'stock:view',
    'advice:manage', // Semua nasihat
    'location:manage', // Semua wilayah
    'coverage:manage',
    'promo_reseller:manage',
    'promo_region:manage',
    'promo:view',
    'users:manage_regional_admin', // Hanya Admin Wilayah
    'profile:manage_own',
    'payment_accounts:view',
  ],

  ADMIN_WILAYAH: [
    'catalog:view',
    'advice:read',
    'order:manage', // Hanya wilayahnya
    'order:view',
    'stock:manage', // Hanya wilayahnya
    'stock:view',
    'advice:manage', // Hanya miliknya
    'location:manage', // Hanya wilayahnya
    'promo_region:manage', // Hanya wilayahnya
    'promo:view',
    'profile:manage_own',
  ],

  OWNER: [
    'catalog:view',
    'advice:read',
    'order:view', // Hanya melihat semua pesanan
    'stock:view',
    'price:manage', // Mengatur harga jual seragam
    'cost_price:manage', // Mengatur harga modal
    'cost_price:view',
    'advice:manage', // Melihat dan mengelola nasihat
    'location:manage',
    'coverage:manage',
    'promo_reseller:manage',
    'promo_region:manage',
    'promo:view',
    'users:manage_all_admins', // Semua admin
    'profile:manage_own',
    'payment_accounts:manage',
    'payment_accounts:view',
    'settings:manage',
    'settings:view',
    'reports:view_dashboard',
    'reports:export',
    'audit:view',
  ],

  DEVELOPER: [
    'catalog:view',
    'advice:read',
    'order:view',
    'stock:view',
    'cost_price:view', // Boleh melihat HPP untuk pemeriksaan/audit
    'promo:view',
    'profile:manage_own',
    'payment_accounts:view',
    'settings:view',
    'reports:view_dashboard',
    'audit:view',
    'system:health_manage',
    'system:error_view',
  ],
};

/**
 * Single source of truth untuk memeriksa apakah seorang pengguna
 * memiliki wewenang untuk aksi tertentu pada sumber daya tertentu.
 */
export function can(
  user: AuthUser | null | undefined,
  permission: Permission,
  resource?: ResourceContext
): boolean {
  if (!user) {
    // Pengguna tanpa login / publik dianggap sebagai BUYER (guest)
    return BASE_ROLE_PERMISSIONS.BUYER.includes(permission);
  }

  // Akun nonaktif tidak punya izin apa pun
  if (user.isActive === false) {
    return false;
  }

  const role = user.role;
  const allowedPermissions = BASE_ROLE_PERMISSIONS[role] || [];
  if (!allowedPermissions.includes(permission)) {
    return false;
  }

  // Pemeriksaan Kontekstual Sumber Daya (Wilayah, Kepemilikan, Batas Peran)

  // 1. Admin Wilayah: Isolasi wilayah mutlak
  if (role === Role.ADMIN_WILAYAH) {
    if (resource?.regionId !== undefined && resource.regionId !== null) {
      if (resource.regionId !== user.regionId) {
        return false; // Wilayah lain mutlak ditolak!
      }
    }

    // Nasihat: Admin Wilayah hanya boleh mengelola nasihat miliknya
    if (permission === 'advice:manage' && resource?.authorId) {
      if (resource.authorId !== user.id) {
        return false;
      }
    }
  }

  // 2. Admin Pusat:
  if (role === Role.ADMIN_PUSAT) {
    // Mengelola pesanan hanya untuk Pusat (wilayah lain hanya view)
    if (permission === 'order:manage' && resource?.regionId) {
      if (resource.regionId !== user.regionId) {
        return false;
      }
    }

    // Mengelola akun admin: Admin Pusat HANYA boleh mengelola Admin Wilayah (bukan sesama Admin Pusat, Owner, atau Developer)
    if (permission === 'users:manage_regional_admin' && resource?.targetRole) {
      if (resource.targetRole !== Role.ADMIN_WILAYAH) {
        return false;
      }
    }
  }

  // 3. Developer: Tidak boleh menulis data bisnis (hanya aksi baca atau health/sistem)
  if (role === Role.DEVELOPER) {
    const writeBusinessPermissions: Permission[] = [
      'order:manage',
      'catalog:manage',
      'price:manage',
      'cost_price:manage',
      'stock:manage',
      'advice:manage',
      'location:manage',
      'coverage:manage',
      'promo_reseller:manage',
      'promo_region:manage',
      'users:manage_regional_admin',
      'users:manage_all_admins',
      'payment_accounts:manage',
      'settings:manage',
    ];
    if (writeBusinessPermissions.includes(permission)) {
      return false;
    }
  }

  // 4. Owner: Hanya melihat pesanan (tidak mengelola langsung di alur admin)
  if (role === Role.OWNER && permission === 'order:manage') {
    return false;
  }

  return true;
}

/**
 * Helper kueri Prisma: Otomatis menambahkan filter wilayah untuk Admin Wilayah
 */
export function buildRegionFilter(user: AuthUser | null | undefined): { regionId?: string } {
  if (!user) return {};
  if (user.role === Role.ADMIN_WILAYAH && user.regionId) {
    return { regionId: user.regionId };
  }
  return {};
}

/**
 * Helper Masking Harga Modal (HPP):
 * Menghapus kolom harga modal jika pengguna BUKAN Owner atau Developer.
 */
export function canViewCostPrice(user: AuthUser | null | undefined): boolean {
  if (!user) return false;
  return can(user, 'cost_price:view');
}

export function maskProductCost<T extends Record<string, any>>(
  user: AuthUser | null | undefined,
  product: T
): T {
  if (canViewCostPrice(user)) {
    return product;
  }

  // Buat kloningan aman tanpa cost / costPrice / packingCost
  const clone = { ...product };
  if ('cost' in clone) delete clone.cost;
  if ('costPrice' in clone) delete clone.costPrice;
  if ('costEach' in clone) delete clone.costEach;
  if ('packingCost' in clone) delete clone.packingCost;
  if ('packingEach' in clone) delete clone.packingEach;

  if (Array.isArray((clone as any).variants)) {
    (clone as any).variants = (clone as any).variants.map((v: any) => maskProductCost(user, v));
  }

  if (Array.isArray((clone as any).items)) {
    (clone as any).items = (clone as any).items.map((i: any) => maskProductCost(user, i));
  }

  return clone;
}
