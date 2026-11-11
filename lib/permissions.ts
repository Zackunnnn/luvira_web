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
  | 'system:error_view'

  // Fitur Tambahan (FT-0 s/d FT-6): Reseller, COD, Promo Uji, Sheets, WA
  | 'reseller:view_own_orders'
  | 'reseller:manage'
  | 'order:create_cod'
  | 'promo:assign_reseller'
  | 'promo:test_manage'
  | 'test_orders:reset'
  | 'sheet:manage_own'
  | 'sheet:manage_global'
  | 'wa:settings'
  | 'report:subscribe'
  // Role LuviBot Sub-Admin Model A
  | 'reseller:view_list_masked'
  | 'changelog:view'
  | 'changelog:create';

export interface ResourceContext {
  regionId?: string | null;
  authorId?: string | null;
  userId?: string | null;
  targetRole?: Role | null;
}

// Matriks Izin Dasar per Peran
const BASE_ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  LUVIBOT: [
    'catalog:view',
    'advice:read',
    'order:view',
    'order:manage',
    'order:track',
    'stock:view',
    'stock:manage',
    'catalog:manage',
    'price:manage',
    'promo_reseller:manage',
    'promo_region:manage',
    'promo:view',
    'payment_accounts:view',
    'settings:view',
    'reports:view_dashboard',
    'audit:view',
    'reseller:view_list_masked',
    'changelog:view',
    'changelog:create',
  ],

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
    'order:create_cod',
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
    'promo:assign_reseller',
    'reseller:manage',
    'users:manage_regional_admin', // Hanya Admin Wilayah & Reseller
    'profile:manage_own',
    'payment_accounts:view',
    'sheet:manage_own',
    'report:subscribe',
    'changelog:view',
  ],

  ADMIN_WILAYAH: [
    'catalog:view',
    'advice:read',
    'order:manage', // Hanya wilayahnya
    'order:view',
    'order:create_cod', // COD di wilayahnya
    'stock:manage', // Hanya wilayahnya
    'stock:view',
    'advice:manage', // Hanya miliknya
    'location:manage', // Hanya wilayahnya
    'promo_region:manage', // Hanya wilayahnya
    'promo:view',
    'profile:manage_own',
    'sheet:manage_own',
    'report:subscribe',
  ],

  OWNER: [
    'catalog:view',
    'advice:read',
    'order:view', // Hanya melihat semua pesanan
    'order:create_cod',
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
    'promo:assign_reseller',
    'promo:test_manage',
    'test_orders:reset',
    'reseller:manage',
    'users:manage_all_admins', // Semua admin & reseller
    'profile:manage_own',
    'payment_accounts:manage',
    'payment_accounts:view',
    'settings:manage',
    'settings:view',
    'reports:view_dashboard',
    'reports:export',
    'audit:view',
    'sheet:manage_global',
    'sheet:manage_own',
    'wa:settings',
    'report:subscribe',
    'changelog:view',
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
    'changelog:view',
  ],

  RESELLER: [
    'catalog:view',
    'advice:read',
    'profile:manage_own',
    'reseller:view_own_orders',
    'order:create_cod',
    'promo:view',
    'sheet:manage_own',
    'report:subscribe',
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

    // Mengelola akun: Admin Pusat HANYA boleh mengelola Admin Wilayah dan Reseller (A2 tetap berlaku)
    if (permission === 'users:manage_regional_admin' && resource?.targetRole) {
      if (resource.targetRole !== Role.ADMIN_WILAYAH && resource.targetRole !== Role.RESELLER) {
        return false;
      }
    }

    if (permission === 'reseller:manage' && resource?.targetRole) {
      if (resource.targetRole !== Role.RESELLER) {
        return false;
      }
    }
  }

  // 3. Developer: Tidak boleh menulis data bisnis (hanya aksi baca atau health/sistem)
  if (role === Role.DEVELOPER) {
    const writeBusinessPermissions: Permission[] = [
      'order:manage',
      'order:create_cod',
      'catalog:manage',
      'price:manage',
      'cost_price:manage',
      'stock:manage',
      'advice:manage',
      'location:manage',
      'coverage:manage',
      'promo_reseller:manage',
      'promo_region:manage',
      'promo:assign_reseller',
      'promo:test_manage',
      'test_orders:reset',
      'reseller:manage',
      'users:manage_regional_admin',
      'users:manage_all_admins',
      'payment_accounts:manage',
      'settings:manage',
      'sheet:manage_own',
      'sheet:manage_global',
      'wa:settings',
      'report:subscribe',
    ];
    if (writeBusinessPermissions.includes(permission)) {
      return false;
    }
  }

  // 4. Owner: Hanya melihat pesanan (tidak mengelola langsung di alur admin)
  if (role === Role.OWNER && permission === 'order:manage') {
    return false;
  }

  // 6. LuviBot Sub-Admin (Model A): Strict guard
  if (role === Role.LUVIBOT) {
    const forbiddenForLuviBot: Permission[] = [
      'cost_price:view',
      'cost_price:manage',
      'reports:export',
      'settings:manage',
      'users:manage_regional_admin',
      'users:manage_all_admins',
      'system:health_manage',
      'system:error_view',
      'order:create_cod',
      'promo:test_manage',
      'test_orders:reset',
      'sheet:manage_own',
      'sheet:manage_global',
      'wa:settings',
      'report:subscribe',
      'profile:manage_own',
    ];
    if (forbiddenForLuviBot.includes(permission)) {
      return false;
    }
  }

  // 5. Reseller: Hanya untuk sumber daya miliknya sendiri
  if (role === Role.RESELLER) {
    if (permission === 'sheet:manage_own' && resource?.userId) {
      if (resource.userId !== user.id) return false;
    }
    if (permission === 'report:subscribe' && resource?.userId) {
      if (resource.userId !== user.id) return false;
    }
    if (permission === 'reseller:view_own_orders' && resource?.userId) {
      if (resource.userId !== user.id) return false;
    }
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


/**
 * Helper Masking Data Pelanggan untuk Reseller (Asumsi F4):
 * Menyamarkan nama, nomor telepon/WhatsApp, email, dan alamat detail.
 */
export function maskCustomerData<T extends Record<string, any>>(data: T): T {
  const clone: any = { ...data };

  if (typeof clone.customerName === 'string' && clone.customerName.trim().length > 0) {
    const parts = clone.customerName.trim().split(/\s+/);
    clone.customerName = parts.map((p: string) => (p.length > 1 ? p[0] + '*'.repeat(p.length - 1) : p + '*')).join(' ');
  }

  if (typeof clone.customerPhone === 'string' && clone.customerPhone.length > 4) {
    const p = clone.customerPhone;
    const start = p.slice(0, 4);
    const end = p.slice(-3);
    clone.customerPhone = `${start}${'*'.repeat(Math.max(3, p.length - 7))}${end}`;
  }

  if (typeof clone.customerEmail === 'string' && clone.customerEmail.includes('@')) {
    const [userPart, domain] = clone.customerEmail.split('@');
    clone.customerEmail = `${userPart[0]}***@${domain}`;
  }

  if (typeof clone.customerAddress === 'string') {
    clone.customerAddress = '[Alamat disamarkan untuk privasi]';
  }

  return clone;
}

export function maskOrderForReseller<T extends Record<string, any>>(
  user: AuthUser | null | undefined,
  order: T
): T {
  if (user?.role !== Role.RESELLER) {
    return order;
  }
  return maskCustomerData(order);
}
