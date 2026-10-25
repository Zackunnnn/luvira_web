// app/api/admin/orders/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { can, maskProductCost } from '@/lib/permissions';
import { Role } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 });
    }

    if (!can(user, 'order:view')) {
      return NextResponse.json({ error: 'Akses ditolak: Anda tidak memiliki izin melihat pesanan.' }, { status: 403 });
    }

    const { id } = await params;

    const order = await prisma.order.findFirst({
      where: {
        OR: [{ id }, { code: id }],
      },
      include: {
        region: true,
        items: {
          include: {
            variant: {
              include: {
                product: {
                  select: { id: true, name: true, slug: true, model: true },
                },
              },
            },
          },
        },
        payments: {
          include: { account: true },
          orderBy: { createdAt: 'desc' },
        },
        statusLogs: {
          orderBy: { createdAt: 'desc' },
        },
        promoCode: true,
      },
    });

    if (!order) {
      return NextResponse.json({ error: 'Pesanan tidak ditemukan' }, { status: 404 });
    }

    // Isolasi Wilayah: Admin Wilayah dilarang melihat detail pesanan wilayah lain
    if (user.role === Role.ADMIN_WILAYAH && order.regionId !== user.regionId) {
      return NextResponse.json({ error: 'Akses ditolak: Pesanan ini berada di luar wilayah wewenang Anda.' }, { status: 403 });
    }

    return NextResponse.json({ order: maskProductCost(user, order) });
  } catch (error: any) {
    console.error('[API Admin Order Detail Error]', error);
    return NextResponse.json({ error: error.message || 'Gagal memuat detail pesanan' }, { status: 500 });
  }
}
