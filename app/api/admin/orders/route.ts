// app/api/admin/orders/route.ts
// ============================================================================
// API Daftar Pesanan Sisi Admin
// Mendukung filter status, tanggal, metode bayar, pencarian, dan isolasi wilayah
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { can, maskProductCost } from '@/lib/permissions';
import { OrderStatus, PaymentMethod, Role } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 });
    }

    if (!can(user, 'order:view')) {
      return NextResponse.json({ error: 'Akses ditolak: Anda tidak memiliki izin melihat pesanan.' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const statusParam = searchParams.get('status');
    const paymentMethodParam = searchParams.get('paymentMethod');
    const regionParam = searchParams.get('regionId');
    const query = searchParams.get('q')?.trim();
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get('limit') || '50', 10)));
    const skip = (page - 1) * limit;

    const where: any = {};

    // 1. Isolasi Wilayah: Admin Wilayah HANYA boleh melihat pesanannya sendiri
    if (user.role === Role.ADMIN_WILAYAH) {
      where.regionId = user.regionId;
    } else if (regionParam) {
      where.regionId = regionParam;
    }

    // 2. Filter Status
    if (statusParam && Object.values(OrderStatus).includes(statusParam as OrderStatus)) {
      where.status = statusParam as OrderStatus;
    }

    // 3. Filter Metode Pembayaran
    if (paymentMethodParam && Object.values(PaymentMethod).includes(paymentMethodParam as PaymentMethod)) {
      where.paymentMethod = paymentMethodParam as PaymentMethod;
    }

    // 4. Pencarian teks (Kode, Nama, WhatsApp)
    if (query) {
      where.OR = [
        { code: { contains: query, mode: 'insensitive' } },
        { customerName: { contains: query, mode: 'insensitive' } },
        { customerPhone: { contains: query } },
      ];
    }

    // 5. Rentang tanggal
    if (startDateParam || endDateParam) {
      where.createdAt = {};
      if (startDateParam) where.createdAt.gte = new Date(startDateParam);
      if (endDateParam) {
        const end = new Date(endDateParam);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          region: {
            select: { id: true, name: true, code: true, type: true },
          },
          items: {
            include: {
              variant: {
                select: {
                  id: true,
                  name: true,
                  sku: true,
                  imageUrl: true,
                  weightGram: true,
                },
              },
            },
          },
          payments: {
            orderBy: { createdAt: 'desc' },
          },
          statusLogs: {
            orderBy: { createdAt: 'desc' },
            take: 5,
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.order.count({ where }),
    ]);

    // Masking harga modal (HPP) untuk peran Admin & Publik
    const safeOrders = orders.map((order) => maskProductCost(user, order));

    // Ringkasan pesanan yang butuh tindakan untuk dashboard
    const actionCounts = await prisma.order.groupBy({
      by: ['status'],
      where: user.role === Role.ADMIN_WILAYAH && user.regionId ? { regionId: user.regionId } : {},
      _count: { _all: true },
    });

    const pendingVerification = actionCounts.find((c) => c.status === OrderStatus.MENUNGGU_VERIFIKASI)?._count?._all || 0;
    const processing = actionCounts.find((c) => c.status === OrderStatus.DIPROSES)?._count?._all || 0;

    return NextResponse.json({
      orders: safeOrders,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      summary: {
        needsVerification: pendingVerification,
        needsShipping: processing,
      },
    });
  } catch (error: any) {
    console.error('[API Admin Orders GET Error]', error);
    return NextResponse.json({ error: error.message || 'Gagal memuat daftar pesanan' }, { status: 500 });
  }
}
