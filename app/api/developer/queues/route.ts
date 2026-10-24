// app/api/developer/queues/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { OrderStatus, Role } from '@prisma/client';
import { recordAuditLog } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user || user.role !== Role.DEVELOPER) {
    return NextResponse.json({ error: 'Akses ditolak. Khusus Peran Developer.' }, { status: 403 });
  }

  // 1. Audit Log
  await recordAuditLog({
    actorId: user.id,
    actorName: user.name || 'Lead Developer',
    actorRole: user.role,
    action: 'DEVELOPER_VIEW_QUEUES',
    entity: 'ProblemQueues',
    entityId: 'global',
    before: null,
    after: { timestamp: new Date().toISOString() },
  });

  const now = new Date();
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);

  // 2. Pesanan Menunggu Verifikasi > 24 Jam
  const stuckVerificationOrders = await prisma.order.findMany({
    where: {
      status: OrderStatus.MENUNGGU_VERIFIKASI,
      updatedAt: { lte: twentyFourHoursAgo },
    },
    select: {
      id: true,
      code: true,
      customerName: true,
      totalPrice: true,
      updatedAt: true,
      region: { select: { name: true, code: true } },
    },
    orderBy: { updatedAt: 'asc' },
  });

  // 3. Pesanan Diproses > 3 Hari tanpa Nomor Resi
  const stuckProcessingOrders = await prisma.order.findMany({
    where: {
      status: OrderStatus.DIPROSES,
      OR: [
        { trackingNumber: null },
        { trackingNumber: '' },
      ],
      updatedAt: { lte: threeDaysAgo },
    },
    select: {
      id: true,
      code: true,
      customerName: true,
      totalPrice: true,
      updatedAt: true,
      region: { select: { name: true, code: true } },
    },
    orderBy: { updatedAt: 'asc' },
  });

  // 4. Deteksi Selisih Stok Reserved vs Pesanan Aktif
  // Pesanan aktif yang menahan stok: MENUNGGU_PEMBAYARAN, MENUNGGU_VERIFIKASI, DIPROSES
  const activeOrders = await prisma.order.findMany({
    where: {
      status: {
        in: [
          OrderStatus.MENUNGGU_PEMBAYARAN,
          OrderStatus.MENUNGGU_VERIFIKASI,
          OrderStatus.DIPROSES,
        ],
      },
    },
    select: {
      regionId: true,
      items: {
        select: {
          variantId: true,
          quantity: true,
        },
      },
    },
  });

  // Hitung expected reserved per [variantId_regionId]
  const expectedReservedMap = new Map<string, number>();
  for (const ord of activeOrders) {
    for (const itm of ord.items) {
      const key = `${itm.variantId}_${ord.regionId}`;
      const curr = expectedReservedMap.get(key) || 0;
      expectedReservedMap.set(key, curr + itm.quantity);
    }
  }

  // Ambil semua stok di DB yang reserved > 0 atau ada pesanan aktif
  const allStocks = await prisma.stock.findMany({
    where: {
      OR: [
        { reserved: { gt: 0 } },
      ],
    },
    include: {
      variant: { include: { product: true } },
      region: true,
    },
  });

  const stockMismatches: Array<{
    variantId: string;
    productName: string;
    variantName: string;
    regionName: string;
    actualReserved: number;
    expectedReserved: number;
    delta: number;
  }> = [];

  // Periksa stock yang ada di DB
  const processedKeys = new Set<string>();
  for (const st of allStocks) {
    const key = `${st.variantId}_${st.regionId}`;
    processedKeys.add(key);
    const expected = expectedReservedMap.get(key) || 0;
    if (st.reserved !== expected) {
      stockMismatches.push({
        variantId: st.variantId,
        productName: st.variant.product.name,
        variantName: st.variant.name,
        regionName: st.region.name,
        actualReserved: st.reserved,
        expectedReserved: expected,
        delta: st.reserved - expected,
      });
    }
  }

  // Periksa jika ada pesanan aktif tapi reserved di DB adalah 0
  for (const [key, expected] of expectedReservedMap.entries()) {
    if (!processedKeys.has(key)) {
      const [variantId, regionId] = key.split('_');
      const st = await prisma.stock.findUnique({
        where: { variantId_regionId: { variantId, regionId } },
        include: { variant: { include: { product: true } }, region: true },
      });
      if (st && st.reserved !== expected) {
        stockMismatches.push({
          variantId: st.variantId,
          productName: st.variant.product.name,
          variantName: st.variant.name,
          regionName: st.region.name,
          actualReserved: st.reserved,
          expectedReserved: expected,
          delta: st.reserved - expected,
        });
      }
    }
  }

  const hasIssues =
    stuckVerificationOrders.length > 0 ||
    stuckProcessingOrders.length > 0 ||
    stockMismatches.length > 0;

  return NextResponse.json({
    status: hasIssues ? 'HAS_ISSUES' : 'CLEAN',
    timestamp: now.toISOString(),
    summary: {
      stuckVerificationCount: stuckVerificationOrders.length,
      stuckProcessingCount: stuckProcessingOrders.length,
      stockMismatchCount: stockMismatches.length,
    },
    queues: {
      stuckVerificationOrders,
      stuckProcessingOrders,
      stockMismatches,
    },
  });
}
