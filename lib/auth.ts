// lib/auth.ts
// ============================================================================
// Auth & Session Management Luvira 2.0
// Mendukung 4 peran: ADMIN_PUSAT, ADMIN_WILAYAH, OWNER, DEVELOPER
// Sesuai docs/LUVIRA_2_PLAN.md Bagian 6 & 10
// ============================================================================

import { jwtVerify, SignJWT } from 'jose';
import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';
import { Role } from '@prisma/client';
import { prisma } from './db';
import { audit } from './audit';

const SECRET_KEY = new TextEncoder().encode(
  process.env.JWT_SECRET || 'luvira_default_secret_key_change_me_in_production'
);

export const SESSION_COOKIE_NAME = 'luvira_session';
export const MAX_LOGIN_ATTEMPTS = 5;
export const LOCKOUT_DURATION_MINUTES = 15;

export interface SessionPayload {
  userId: string;
  email: string;
  name: string;
  role: Role;
  regionId: string | null;
  [key: string]: any;
}

export async function createSession(payload: SessionPayload): Promise<string> {
  const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 hari

  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(SECRET_KEY);

  try {
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      expires,
      sameSite: 'lax',
      path: '/',
    });
  } catch {
    // Di luar konteks request Next.js (mis. pengujian unit/integrasi), token tetap dikembalikan
  }

  return token;
}

export async function verifySession(token: string | undefined = ''): Promise<SessionPayload | null> {
  try {
    if (!token) return null;
    const { payload } = await jwtVerify(token, SECRET_KEY, {
      algorithms: ['HS256'],
    });
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export async function isOwner(): Promise<boolean> {
  const session = await getSession();
  return session?.role === Role.OWNER;
}

export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

export async function getSession(): Promise<SessionPayload | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    return verifySession(token);
  } catch {
    return null;
  }
}

export async function getAuthUser(request?: any): Promise<import('./permissions').AuthUser | null> {
  let token: string | undefined;
  if (request) {
    const authHeader = typeof request.headers?.get === 'function' ? request.headers.get('authorization') : null;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7).trim();
    }
  }
  if (!token) {
    try {
      const cookieStore = await cookies();
      token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    } catch {
      // Ignore if cookies() cannot be accessed
    }
  }
  const payload = await verifySession(token);
  if (!payload) return null;

  return {
    id: payload.userId,
    email: payload.email,
    name: payload.name,
    role: payload.role,
    regionId: payload.regionId,
  };
}

export interface LoginResult {
  success: boolean;
  user?: {
    id: string;
    email: string;
    name: string;
    role: Role;
    regionId: string | null;
  };
  error?: string;
  token?: string;
}

export async function authenticateUser(
  email: string,
  rawPassword: string,
  ipAddress?: string
): Promise<LoginResult> {
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase().trim() },
    include: { region: true },
  });

  if (!user) {
    return { success: false, error: 'Email atau kata sandi tidak cocok.' };
  }

  // 1. Cek status aktif
  if (!user.isActive) {
    return {
      success: false,
      error: 'Akun Anda telah dinonaktifkan. Silakan hubungi Administrator atau Owner.',
    };
  }

  // 2. Cek apakah terkunci karena gagal berulang
  const now = new Date();
  if (user.lockedUntil && user.lockedUntil > now) {
    const minutesLeft = Math.ceil((user.lockedUntil.getTime() - now.getTime()) / 60000);
    return {
      success: false,
      error: `Akun terkunci sementara karena terlalu banyak percobaan gagal. Silakan coba lagi dalam ${minutesLeft} menit.`,
    };
  }

  // 3. Verifikasi kata sandi
  const isMatch = await bcrypt.compare(rawPassword, user.passwordHash);
  if (!isMatch) {
    const newAttempts = user.failedLoginAttempts + 1;
    const shouldLock = newAttempts >= MAX_LOGIN_ATTEMPTS;
    const lockedUntil = shouldLock
      ? new Date(Date.now() + LOCKOUT_DURATION_MINUTES * 60 * 1000)
      : null;

    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: shouldLock ? 0 : newAttempts,
        lockedUntil,
      },
    });

    if (shouldLock) {
      await audit({
        actor: { id: user.id, name: user.name, role: user.role, ipAddress },
        action: 'LOCKOUT',
        entity: 'User',
        entityId: user.id,
        before: { failedLoginAttempts: newAttempts },
        after: { lockedUntil },
      });
      return {
        success: false,
        error: `Terlalu banyak percobaan login yang gagal. Akun dikunci selama ${LOCKOUT_DURATION_MINUTES} menit.`,
      };
    }

    return { success: false, error: 'Email atau kata sandi tidak cocok.' };
  }

  // 4. Login berhasil: Reset percobaan gagal & update lastLoginAt
  await prisma.user.update({
    where: { id: user.id },
    data: {
      failedLoginAttempts: 0,
      lockedUntil: null,
      lastLoginAt: now,
    },
  });

  const sessionPayload: SessionPayload = {
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    regionId: user.regionId,
  };

  const token = await createSession(sessionPayload);

  await audit({
    actor: { id: user.id, name: user.name, role: user.role, ipAddress },
    action: 'LOGIN',
    entity: 'User',
    entityId: user.id,
    after: { loginAt: now },
  });

  return {
    success: true,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      regionId: user.regionId,
    },
    token,
  };
}

export async function changeUserPassword(
  userId: string,
  oldPassword: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return { success: false, error: 'Pengguna tidak ditemukan.' };

  const isMatch = await bcrypt.compare(oldPassword, user.passwordHash);
  if (!isMatch) return { success: false, error: 'Kata sandi lama tidak cocok.' };

  if (newPassword.length < 8) {
    return { success: false, error: 'Kata sandi baru minimal 8 karakter.' };
  }

  const newHash = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: newHash },
  });

  await audit({
    actor: { id: user.id, name: user.name, role: user.role },
    action: 'PASSWORD_CHANGE',
    entity: 'User',
    entityId: userId,
  });

  return { success: true };
}
