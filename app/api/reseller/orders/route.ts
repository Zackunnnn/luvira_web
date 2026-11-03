// app/api/reseller/orders/route.ts
// ============================================================================
// Endpoint Pesanan Reseller Luvira 2.0 (FT-4)
// Mengambil pesanan yang memakai kode promo reseller atau pesanan manual buatannya.
// DATA PELANGGAN DISAMARKAN (F4: B*** S***, ••••1234), TANPA ALAMAT LENGKAP, TANPA HPP.
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { Role } from '@prisma/client';
import { sanitizeOrderForReseller } from '@/lib/reseller/masking';

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
    const statusParam = searchParams.get('status');
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)));
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));

    // Reseller hanya boleh mengakses datanya sendiri
    const targetResellerId = user.role === Role.RESELLER ? user.id : (queryResellerId || user.id);

    // 1. Ambil seluruh promo code yang tertaut ke reseller ini
    const myPromos = await prisma.promoCode.findMany({
      where: { resellerId: targetResellerId },
      select: { id: true },
    });
    const promoIds = myPromos.map((p) => p.id);

    // 2. Filter kueri pesanan
    const whereCondition: any = {
      isTest: false, // F5: Pesanan uji mutlak dikeluarkan
      OR: [
        { createdByUserId: targetResellerId },
        ...(promoIds.length > 0
          ? [
              { promoCodeId: { in: promoIds } },
              { secondPromoCodeId: { in: promoIds } },
            ]
          : []),
      ],
    };

    if (statusParam && statusParam !== 'ALL') {
      whereCondition.status = statusParam;
    }

    const [totalCount, rawOrders] = await Promise.all([
      prisma.order.count({ where: whereCondition }),
      prisma.order.findMany({
        where: whereCondition,
        include: {
          items: {
            select: {
              id: true,
              productName: true,
              variantName: true,
              quantity: true,
              priceEach: true,
              subtotal: true,
              // costEach & packingEach SENGAJA TIDAK DI-SELECT (Zero Exposure)
            },
          },
          promoCode: { select: { id: true, code: true, discountType: true, discountValue: true } },
          secondPromoCode: { select: { id: true, code: true, discountType: true, discountValue: true } },
          region: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    // 3. Terapkan Masking Privasi Pelanggan (F4)
    const sanitizedOrders = rawOrders.map((order) => sanitizeOrderForReseller(order));

    return NextResponse.json({
      success: true,
      data: sanitizedOrders,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    console.error('[Reseller Orders API Error]', error);
    return NextResponse.json({ error: 'Terjadi kesalahan sistem.' }, { status: 500 });
  }
}
