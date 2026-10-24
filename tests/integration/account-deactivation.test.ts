// tests/integration/account-deactivation.test.ts
// ============================================================================
// Integration Test: Penolakan Akun Nonaktif
// Sesuai docs/LUVIRA_2_PLAN.md Bagian 4 & 10
// ============================================================================

import { describe, it, expect } from 'vitest';
import { can, AuthUser } from '@/lib/permissions';
import { authenticateUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { Role } from '@prisma/client';

describe('Integrasi: Penolakan Akun Non-Aktif (Account Deactivation)', () => {
  it('fungsi can() menolak seluruh izin jika user.isActive bernilai false', () => {
    const inactiveUser: AuthUser = {
      id: 'u-inactive-1',
      role: Role.ADMIN_PUSAT,
      isActive: false,
    };

    expect(can(inactiveUser, 'catalog:view')).toBe(false);
    expect(can(inactiveUser, 'catalog:manage')).toBe(false);
    expect(can(inactiveUser, 'order:view')).toBe(false);
    expect(can(inactiveUser, 'order:manage')).toBe(false);
    expect(can(inactiveUser, 'price:manage')).toBe(false);
    expect(can(inactiveUser, 'reports:view_dashboard')).toBe(false);
    expect(can(inactiveUser, 'system:health_manage')).toBe(false);
  });

  it('authenticateUser menolak login jika akun ditemukan tetapi isActive: false', async () => {
    // Siapkan akun nonaktif di database jika belum ada
    const email = 'nonaktif.test@luvira.id';
    await prisma.user.upsert({
      where: { email },
      update: { isActive: false },
      create: {
        email,
        name: 'User Nonaktif Test',
        passwordHash: '$2a$10$N9qo8uLOickgx2ZMRZoMye.IuNlU8nKzZq2l9u1J59B63B6712345',
        role: Role.ADMIN_WILAYAH,
        isActive: false,
      },
    });

    const result = await authenticateUser(email, 'password123');
    expect(result.success).toBe(false);
    expect(result.error).toContain('dinonaktifkan');
    expect(result.token).toBeUndefined();
  });
});
