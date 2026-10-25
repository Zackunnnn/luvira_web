// app/api/owner/reports/route.ts
// ============================================================================
// API Laporan Keuangan, Omzet, Produk Terlaris & Traffic (Dashboard Owner)
// Sesuai docs/LUVIRA_2_PLAN.md Bagian 4 & docs/PHASE_PROMPTS.md Fase 4
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { can } from '@/lib/permissions';
import {
  calculateFinancialSummary,
  calculateProductSales,
  calculateRegionalSales,
  calculatePromoUsage,
  OrderFinancialRecord,
} from '@/lib/reports/owner-reports';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 });
    }

    if (!can(user, 'reports:view_dashboard')) {
      return NextResponse.json({ error: 'Akses ditolak: Hanya Owner yang dapat mengakses laporan bisnis ini.' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');
    const regionIdParam = searchParams.get('regionId');

    const where: any = {};
    if (regionIdParam) {
      where.regionId = regionIdParam;
    }

    if (startDateParam || endDateParam) {
      where.createdAt = {};
      if (startDateParam) where.createdAt.gte = new Date(startDateParam);
      if (endDateParam) {
        const end = new Date(endDateParam);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    // Ambil pesanan dengan snapshot item
    const rawOrders = await prisma.order.findMany({
      where,
      include: {
        items: true,
        region: { select: { id: true, name: true, code: true } },
        promoCode: { select: { code: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const mappedOrders: OrderFinancialRecord[] = rawOrders.map((o) => ({
      id: o.id,
      code: o.code,
      regionId: o.regionId,
      regionName: o.region.name,
      status: o.status,
      paymentMethod: o.paymentMethod,
      createdAt: o.createdAt,
      subtotal: o.subtotal,
      discountAmount: o.discountAmount,
      netPrice: o.netPrice,
      ppnAmount: o.ppnAmount,
      shippingCost: o.shippingCost,
      totalPrice: o.totalPrice,
      promoCode: o.promoCode?.code || null,
      items: o.items.map((i) => ({
        productName: i.productName,
        variantName: i.variantName,
        quantity: i.quantity,
        priceEach: i.priceEach,
        costEach: i.costEach,
        packingEach: i.packingEach,
        subtotal: i.subtotal,
      })),
    }));

    // Ambil nama wilayah untuk laporan
    const regions = await prisma.region.findMany({
      select: { id: true, name: true },
    });
    const regionNames: Record<string, string> = {};
    for (const r of regions) {
      regionNames[r.id] = r.name;
    }

    // Kalkulasi agregasi finansial
    const summary = calculateFinancialSummary(mappedOrders);
    const productSales = calculateProductSales(mappedOrders);
    const regionalBreakdown = calculateRegionalSales(mappedOrders, regionNames);
    const promoUsage = calculatePromoUsage(mappedOrders);

    // Ambil status stok dan stok menipis
    const thresholdSetting = await prisma.setting.findUnique({
      where: { key: 'lowStockThreshold' },
    });
    const lowStockThreshold = typeof thresholdSetting?.value === 'number' ? thresholdSetting.value : 10;

    const allStocks = await prisma.stock.findMany({
      include: {
        region: { select: { name: true } },
        variant: {
          include: { product: { select: { name: true } } },
        },
      },
    });

    const lowStockItems = allStocks
      .filter((s) => s.qty - s.reserved <= lowStockThreshold)
      .map((s) => ({
        variantId: s.variantId,
        productName: s.variant.product.name,
        variantName: s.variant.name,
        regionName: s.region.name,
        availableStock: s.qty - s.reserved,
      }));

    // Ambil data traffic harian terbaru
    const trafficLogs = await prisma.dailyTraffic.findMany({
      orderBy: { date: 'desc' },
      take: 14,
    });

    const totalViews = trafficLogs.reduce((acc, curr) => acc + curr.views, 0);
    const totalVisitors = trafficLogs.reduce((acc, curr) => acc + curr.uniqueVisitors, 0);

    return NextResponse.json({
      summary,
      productSales: productSales.slice(0, 10),
      regionalBreakdown,
      promoUsage,
      stocks: {
        totalTracked: allStocks.length,
        lowStockCount: lowStockItems.length,
        lowStockItems,
      },
      traffic: {
        totalViews,
        totalVisitors,
        recent: trafficLogs,
      },
    });
  } catch (error: any) {
    console.error('[API Owner Reports Error]', error);
    return NextResponse.json({ error: error.message || 'Gagal memuat laporan Owner' }, { status: 500 });
  }
}
