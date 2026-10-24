// app/api/admin/auth/me/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: authUser.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        regionId: true,
        phone: true,
        isActive: true,
        region: {
          select: {
            id: true,
            name: true,
            code: true,
            type: true,
            originId: true,
          },
        },
      },
    });

    if (!user || !user.isActive) {
      return NextResponse.json({ error: 'Akun tidak aktif atau tidak ditemukan' }, { status: 403 });
    }

    return NextResponse.json({ user });
  } catch (error: any) {
    console.error('[API Admin Auth Me Error]', error);
    return NextResponse.json({ error: 'Gagal mengambil data akun' }, { status: 500 });
  }
}
