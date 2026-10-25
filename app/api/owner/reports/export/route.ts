// app/api/owner/reports/export/route.ts
// ============================================================================
// API Unduh/Ekspor Laporan Bisnis & Keuangan (Owner Only)
// Format CSV / Excel Tabuler dengan judul, periode, tanggal cetak, pencetak
// Sesuai docs/LUVIRA_2_PLAN.md Bagian 4 & E2E-11
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { can } from '@/lib/permissions';
import { audit } from '@/lib/audit';
import {
  calculateFinancialSummary,
  calculateProductSales,
  calculateRegionalSales,
  calculatePromoUsage,
  generateReportCsv,
  OrderFinancialRecord,
} from '@/lib/reports/owner-reports';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 });
    }

    if (!can(user, 'reports:export')) {
      return NextResponse.json({ error: 'Akses ditolak: Hanya Owner yang dapat mengekspor laporan keuangan.' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');
    const regionIdParam = searchParams.get('regionId');

    const where: any = {};
    if (regionIdParam) where.regionId = regionIdParam;
    if (startDateParam || endDateParam) {
      where.createdAt = {};
      if (startDateParam) where.createdAt.gte = new Date(startDateParam);
      if (endDateParam) {
        const end = new Date(endDateParam);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

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

    const regions = await prisma.region.findMany({ select: { id: true, name: true } });
    const regionNames: Record<string, string> = {};
    for (const r of regions) {
      regionNames[r.id] = r.name;
    }

    const summary = calculateFinancialSummary(mappedOrders);
    const productSales = calculateProductSales(mappedOrders);
    const regionalBreakdown = calculateRegionalSales(mappedOrders, regionNames);
    const promoUsage = calculatePromoUsage(mappedOrders);

    const periodLabel = startDateParam && endDateParam
      ? `${startDateParam} s/d ${endDateParam}`
      : 'Semua Periode Transaksi';

    const now = new Date();
    const generatedAt = now.toLocaleString('id-ID', { dateStyle: 'full', timeStyle: 'short' });
    const generatedBy = `${user.name || user.email} (${user.role})`;

    const csvContent = generateReportCsv({
      periodLabel,
      generatedAt,
      generatedBy,
      summary,
      productSales,
      regionalBreakdown,
      promoUsage,
    });

    await audit({
      actor: { id: user.id, name: user.name, role: user.role },
      action: 'EXPORT_REPORT',
      entity: 'Report',
      entityId: `rep-${Date.now()}`,
      after: { periodLabel, totalOrders: summary.totalOrders, netSales: summary.netSales },
    });

    const filename = `laporan-keuangan-luvira-${now.toISOString().slice(0, 10)}.csv`;

    return new Response(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error: any) {
    console.error('[API Owner Export Error]', error);
    return NextResponse.json({ error: error.message || 'Gagal mengekspor laporan' }, { status: 500 });
  }
}
