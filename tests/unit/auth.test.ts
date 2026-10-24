// tests/unit/auth.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  verifySession,
  authenticateUser,
  MAX_LOGIN_ATTEMPTS,
  LOCKOUT_DURATION_MINUTES,
} from '@/lib/auth';
import { prisma } from '@/lib/db';
import { Role } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { SignJWT } from 'jose';

describe('Auth & Session Unit Tests', () => {
  const secretKey = new TextEncoder().encode(
    process.env.JWT_SECRET || 'luvira_default_secret_key_change_me_in_production'
  );

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('JWT Session Verification', () => {
    it('mengembalikan payload yang valid jika token sah', async () => {
      const payload = {
        userId: 'u1',
        email: 'owner@luvira.id',
        name: 'Owner',
        role: Role.OWNER,
        regionId: null,
      };

      const token = await new SignJWT(payload)
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('1h')
        .sign(secretKey);

      const verified = await verifySession(token);
      expect(verified).not.toBeNull();
      expect(verified?.email).toBe('owner@luvira.id');
      expect(verified?.role).toBe(Role.OWNER);
    });

    it('mengembalikan null jika token tidak ada, rusak, atau dipalsukan', async () => {
      expect(await verifySession('')).toBeNull();
      expect(await verifySession('invalid.jwt.token')).toBeNull();

      const fakeSecret = new TextEncoder().encode('wrong_secret_key');
      const fakeToken = await new SignJWT({ userId: 'u1' })
        .setProtectedHeader({ alg: 'HS256' })
        .sign(fakeSecret);

      expect(await verifySession(fakeToken)).toBeNull();
    });
  });

  describe('Authentication & Account Lockout Logic', () => {
    it('menolak login jika email tidak ditemukan', async () => {
      vi.spyOn(prisma.user, 'findUnique').mockResolvedValue(null);

      const res = await authenticateUser('unknown@luvira.id', 'password123');
      expect(res.success).toBe(false);
      expect(res.error).toBe('Email atau kata sandi tidak cocok.');
    });

    it('menolak login jika akun dinonaktifkan (isActive: false)', async () => {
      vi.spyOn(prisma.user, 'findUnique').mockResolvedValue({
        id: 'u-deact',
        email: 'deact@luvira.id',
        name: 'Nonaktif',
        passwordHash: 'hash',
        role: Role.ADMIN_WILAYAH,
        regionId: 'reg-1',
        isActive: false,
        failedLoginAttempts: 0,
        lockedUntil: null,
        lastLoginAt: null,
        phone: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      const res = await authenticateUser('deact@luvira.id', 'password123');
      expect(res.success).toBe(false);
      expect(res.error).toContain('dinonaktifkan');
    });

    it('menolak login dan mencatat percobaan gagal jika kata sandi salah', async () => {
      const validHash = await bcrypt.hash('benar123', 10);
      const updateSpy = vi.spyOn(prisma.user, 'update').mockResolvedValue({} as any);

      vi.spyOn(prisma.user, 'findUnique').mockResolvedValue({
        id: 'u-1',
        email: 'admin@luvira.id',
        name: 'Admin',
        passwordHash: validHash,
        role: Role.ADMIN_PUSAT,
        regionId: 'reg-1',
        isActive: true,
        failedLoginAttempts: 2,
        lockedUntil: null,
        lastLoginAt: null,
        phone: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      const res = await authenticateUser('admin@luvira.id', 'salah123');
      expect(res.success).toBe(false);
      expect(updateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            failedLoginAttempts: 3,
          }),
        })
      );
    });

    it(`mengunci akun jika percobaan gagal mencapai batas maksimum (${MAX_LOGIN_ATTEMPTS})`, async () => {
      const validHash = await bcrypt.hash('benar123', 10);
      const updateSpy = vi.spyOn(prisma.user, 'update').mockResolvedValue({} as any);
      vi.spyOn(prisma.auditLog, 'create').mockResolvedValue({} as any);

      vi.spyOn(prisma.user, 'findUnique').mockResolvedValue({
        id: 'u-lock',
        email: 'admin@luvira.id',
        name: 'Admin',
        passwordHash: validHash,
        role: Role.ADMIN_PUSAT,
        regionId: 'reg-1',
        isActive: true,
        failedLoginAttempts: MAX_LOGIN_ATTEMPTS - 1,
        lockedUntil: null,
        lastLoginAt: null,
        phone: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      const res = await authenticateUser('admin@luvira.id', 'salah123');
      expect(res.success).toBe(false);
      expect(res.error).toContain(`dikunci selama ${LOCKOUT_DURATION_MINUTES} menit`);
      expect(updateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            lockedUntil: expect.any(Date),
          }),
        })
      );
    });

    it('menolak login jika akun sedang dalam masa penguncian (lockedUntil aktif)', async () => {
      const lockedDate = new Date(Date.now() + 10 * 60 * 1000); // 10 menit ke depan
      vi.spyOn(prisma.user, 'findUnique').mockResolvedValue({
        id: 'u-lock',
        email: 'admin@luvira.id',
        name: 'Admin',
        passwordHash: 'hash',
        role: Role.ADMIN_PUSAT,
        regionId: 'reg-1',
        isActive: true,
        failedLoginAttempts: 0,
        lockedUntil: lockedDate,
        lastLoginAt: null,
        phone: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      const res = await authenticateUser('admin@luvira.id', 'apapun');
      expect(res.success).toBe(false);
      expect(res.error).toContain('Akun terkunci sementara');
    });
  });
});
