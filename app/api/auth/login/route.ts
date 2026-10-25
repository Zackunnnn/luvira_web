import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser } from '@/lib/auth';
import { Role } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = body.email || body.username;
    const password = body.password;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email dan kata sandi wajib diisi.' },
        { status: 400 }
      );
    }

    const ipAddress =
      request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      request.headers.get('x-real-ip') ||
      '127.0.0.1';

    const authResult = await authenticateUser(email, password, ipAddress);

    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { error: authResult.error || 'Login gagal.' },
        { status: 401 }
      );
    }

    let redirectUrl = '/dashboard/admin';
    if (authResult.user.role === Role.OWNER) {
      redirectUrl = '/dashboard/owner';
    } else if (authResult.user.role === Role.DEVELOPER) {
      redirectUrl = '/dashboard/developer';
    }

    return NextResponse.json(
      {
        success: true,
        user: authResult.user,
        redirect: redirectUrl,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[Login API Error]', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan sistem saat memproses login.' },
      { status: 500 }
    );
  }
}
