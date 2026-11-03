// app/api/reseller/promos/route.ts
// ============================================================================
// Endpoint Daftar Kode Promo Saya untuk Reseller (FT-4)
// Menampilkan daftar kode promo yang tertaut ke reseller (hanya-baca):
// kode, jenis diskon, nilai, kuota tersisa/total, masa berlaku, status aktif.
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { Role } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 });
    }

    if (user.role !== Role.RESELLER && user.role !== Role.OWNER && user.role !== Role.ADMIN_PUSAT) {
      return NextResponse.json({ error: 'Akses ditolak: Hanya peran Reseller yang berhak mengakses endpoint ini.' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const queryResellerId = searchParams.get('resellerId');
    const targetResellerId = user.role === Role.RESELLER ? user.id : (queryResellerId || user.id);

    const promos = await prisma.promoCode.findMany({
      where: { resellerId: targetResellerId },
      select: {
        id: true,
        code: true,
        discountType: true,
        discountValue: true,
        maxDiscountAmount: true,
        quota: true,
        usedCount: true,
        expiresAt: true,
        isActive: true,
        createdAt: true,
        region: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const mappedPromos = promos.map((p) => ({
      ...p,
      quotaRemaining: p.quota > 0 ? Math.max(0, p.quota - p.usedCount) : 'Tak Terbatas',
      isExpired: p.expiresAt ? new Date(p.expiresAt).getTime() < Date.now() : false,
    }));

    return NextResponse.json({
      success: true,
      data: mappedPromos,
    });
  } catch (error) {
    console.error('[Reseller Promos API Error]', error);
    return NextResponse.json({ error: 'Terjadi kesalahan sistem.' }, { status: 500 });
  }
}
