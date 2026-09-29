import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifySession, SESSION_COOKIE_NAME } from '@/lib/auth';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Halaman utama /dashboard dan /dashboard/login bisa diakses tanpa session, namun kita ingin auto-redirect jika sudah login
  if (pathname === '/dashboard' || pathname.startsWith('/dashboard/login')) {
    const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    const session = await verifySession(sessionCookie);
    
    if (session) {
      // Jika sudah login dan mencoba akses login/landing page, arahkan ke dashboard masing-masing
      if (session.role === 'owner') {
        return NextResponse.redirect(new URL('/dashboard/owner', request.url));
      } else {
        return NextResponse.redirect(new URL('/dashboard/admin', request.url));
      }
    }
    
    // Jika belum login, biarkan akses halaman tersebut
    return NextResponse.next();
  }

  // Cek akses ke route di dalam dashboard (kecuali root dan login yang sudah di-handle di atas)
  if (pathname.startsWith('/dashboard/')) {
    const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    const session = await verifySession(sessionCookie);

    if (!session) {
      // Jika tidak ada session, redirect ke login
      const loginUrl = new URL('/dashboard/login', request.url);
      return NextResponse.redirect(loginUrl);
    }

    // Role-based Access Control
    if (pathname.startsWith('/dashboard/owner') && session.role !== 'owner') {
      return NextResponse.redirect(new URL('/dashboard/admin', request.url));
    }
    
    // Admin tidak dilarang ke /dashboard/admin (dan owner juga boleh akses jika diperlukan)
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/dashboard'],
};
