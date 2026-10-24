// proxy.ts
// ============================================================================
// Next.js 16 Middleware (Proxy) - Pelindung Rute & RBAC
// Sesuai docs/LUVIRA_2_PLAN.md Bagian 4 & 6
// ============================================================================

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifySession, SESSION_COOKIE_NAME } from '@/lib/auth';
import { Role } from '@prisma/client';

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Rute Login & Root Dashboard
  if (pathname === '/dashboard' || pathname === '/login' || pathname.startsWith('/dashboard/login')) {
    const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    const session = await verifySession(sessionCookie);

    if (session) {
      if (session.role === Role.OWNER) {
        return NextResponse.redirect(new URL('/dashboard/owner', request.url));
      }
      if (session.role === Role.DEVELOPER) {
        return NextResponse.redirect(new URL('/dashboard/developer', request.url));
      }
      return NextResponse.redirect(new URL('/dashboard/admin', request.url));
    }

    return NextResponse.next();
  }

  // 2. Proteksi Rute Dashboard Berdasarkan Peran
  if (pathname.startsWith('/dashboard/')) {
    const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    const session = await verifySession(sessionCookie);

    // Belum login -> redirect ke halaman login
    if (!session) {
      const loginUrl = new URL('/dashboard/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Role-based Access Control

    // A. Dashboard Owner: Hanya peran OWNER
    if (pathname.startsWith('/dashboard/owner')) {
      if (session.role !== Role.OWNER) {
        return NextResponse.redirect(new URL('/forbidden', request.url));
      }
    }

    // B. Dashboard Developer: Hanya peran DEVELOPER
    if (pathname.startsWith('/dashboard/developer')) {
      if (session.role !== Role.DEVELOPER) {
        return NextResponse.redirect(new URL('/forbidden', request.url));
      }
    }

    // C. Dashboard Admin: Hanya ADMIN_PUSAT, ADMIN_WILAYAH, OWNER, DEVELOPER
    if (pathname.startsWith('/dashboard/admin')) {
      const allowedAdminRoles = [
        Role.ADMIN_PUSAT,
        Role.ADMIN_WILAYAH,
        Role.OWNER,
        Role.DEVELOPER,
      ];
      if (!allowedAdminRoles.includes(session.role)) {
        return NextResponse.redirect(new URL('/forbidden', request.url));
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/dashboard', '/login'],
};
