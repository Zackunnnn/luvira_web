// app/api/reseller/analytics/route.ts
// ============================================================================
// Endpoint Analitik Khusus Reseller Luvira 2.0 (FT-4)
// Filter periode, omzet kotor/bersih dari kodenya, diskon, dan tren penjualan.
// Pesanan uji (isTest: true) dieksklusikan secara mutlak (Asumsi F5).
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { Role, OrderStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 });
    }

    // Hanya Reseller, atau Owner/Admin Pusat yang boleh mengakses
    if (user.role !== Role.RESELLER && user.role !== Role.OWNER && user.role !== Role.ADMIN_PUSAT) {
      return NextResponse.json({ error: 'Akses ditolak: Hanya peran Reseller yang berhak mengakses analitik ini.' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const queryResellerId = searchParams.get('resellerId');
    const period = searchParams.get('period') || '30d';
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');

    // Jika reseller, hanya boleh melihat datanya sendiri
    const targetResellerId = user.role === Role.RESELLER ? user.id : (queryResellerId || user.id);

    // 1. Ambil seluruh promo code yang tertaut ke reseller ini
    const myPromos = await prisma.promoCode.findMany({
      where: { resellerId: targetResellerId },
      select: { id: true, code: true },
    });
    const promoIds = myPromos.map((p) => p.id);

    // 2. Tentukan rentang tanggal
    const now = new Date();
    let dateGte = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    let dateLte = new Date();

    if (period === 'today') {
      dateGte = new Date();
      dateGte.setHours(0, 0, 0, 0);
    } else if (period === '7d') {
      dateGte = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (period === '30d') {
      dateGte = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    } else if (period === 'this_month') {
      dateGte = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (period === 'custom' && startDateParam) {
      dateGte = new Date(startDateParam);
      if (endDateParam) {
        const end = new Date(endDateParam);
        end.setHours(23, 59, 59, 999);
        dateLte = end;
      }
    }

    // 3. Kueri pesanan yang terkait reseller ini:
    // Pesanan dengan kode promo reseller TERSEBUT ATAU pesanan manual COD buatan reseller itu sendiri
    const whereCondition: any = {
      isTest: false, // F5: Pesanan uji mutlak dikeluarkan
      createdAt: {
        gte: dateGte,
        lte: dateLte,
      },
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

    const orders = await prisma.order.findMany({
      where: whereCondition,
      select: {
        id: true,
        code: true,
        status: true,
        subtotal: true,
        discountAmount: true,
        netPrice: true,
        ppnAmount: true,
        shippingCost: true,
        totalPrice: true,
        paymentMethod: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // 4. Hitung metrik agregasi
    const ordersByStatus: Record<string, number> = {
      [OrderStatus.DIPROSES]: 0,
      [OrderStatus.DIKIRIM]: 0,
      [OrderStatus.SELESAI]: 0,
      [OrderStatus.DIBATALKAN]: 0,
      [OrderStatus.MENUNGGU_PEMBAYARAN]: 0,
    };

    let totalOrders = 0;
    let grossTurnover = 0;
    let netTurnover = 0;
    let totalDiscount = 0;

    // Daily trend map
    const dailyMap: Record<string, { count: number; turnover: number }> = {};

    for (const order of orders) {
      if (ordersByStatus[order.status] !== undefined) {
        ordersByStatus[order.status] += 1;
      } else {
        ordersByStatus[order.status] = 1;
      }

      // Hitung omzet hanya untuk pesanan aktif / tidak dibatalkan
      if (order.status !== OrderStatus.DIBATALKAN) {
        totalOrders += 1;
        grossTurnover += order.subtotal;
        netTurnover += order.netPrice;
        totalDiscount += order.discountAmount;

        const dayKey = new Date(order.createdAt).toISOString().slice(0, 10);
        if (!dailyMap[dayKey]) {
          dailyMap[dayKey] = { count: 0, turnover: 0 };
        }
        dailyMap[dayKey].count += 1;
        dailyMap[dayKey].turnover += order.netPrice;
      }
    }

    const dailyTrend = Object.entries(dailyMap)
      .map(([date, val]) => ({
        date,
        count: val.count,
        turnover: val.turnover,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          totalOrders,
          grossTurnover,
          netTurnover,
          totalDiscount,
          completedOrders: ordersByStatus[OrderStatus.SELESAI] || 0,
          pendingOrders: (ordersByStatus[OrderStatus.DIPROSES] || 0) + (ordersByStatus[OrderStatus.DIKIRIM] || 0),
          ordersByStatus,
        },
        dailyTrend,
        promosCount: myPromos.length,
      },
    });
  } catch (error) {
    console.error('[Reseller Analytics API Error]', error);
    return NextResponse.json({ error: 'Terjadi kesalahan sistem.' }, { status: 500 });
  }
}

