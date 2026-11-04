// lib/reports/wa-report-generator.ts
// ============================================================================
// Pembangun Pesan & File Laporan WhatsApp Luvira 2.0 (FT-6, Asumsi F4, F5, F9)
// Menjamin isolasi ketat:
// - Owner: Seluruh bisnis, termasuk modal HPP & laba kotor.
// - Admin: Hanya wilayahnya, mutlak TANPA HPP & TANPA laba.
// - Reseller: Hanya pesanan berkodenya, mutlak TANPA HPP, TANPA stok gudang,
//             dan TANPA nomor HP/alamat detail pelanggan.
// - Pesanan uji (isTest: true) MUTLAK DIKELUARKAN dari semua laporan.
// ============================================================================

import { prisma } from '@/lib/db';
import { Role, OrderStatus, ReportType, SheetScopeType } from '@prisma/client';
import { formatWibDateTime } from '@/lib/integrations/sheets-builder';
import { createReportDownloadToken } from './report-token';

export interface GenerateWaReportOptions {
  userId: string;
  reportType: ReportType;
  includeSheetLink?: boolean;
  includeFile?: boolean;
  baseUrl?: string;
  targetDate?: Date;
}

export interface GeneratedWaReport {
  message: string;
  downloadUrl?: string;
  token?: string;
  periodLabel: string;
  periodKey: string;
}

function formatRp(num: number): string {
  return `Rp ${Math.round(num || 0).toLocaleString('id-ID')}`;
}

/**
 * Tentukan rentang tanggal periode berdasarkan tipe laporan (WIB)
 */
export function getReportDateRange(reportType: ReportType, referenceDate = new Date()): {
  startDate: Date;
  endDate: Date;
  periodLabel: string;
  periodKey: string;
} {
  // Hitung dalam zona waktu WIB (+7)
  const wibRef = new Date(referenceDate.getTime() + 7 * 3600 * 1000);
  const year = wibRef.getUTCFullYear();
  const month = wibRef.getUTCMonth(); // 0-11
  const date = wibRef.getUTCDate();

  let startUtc: Date;
  let endUtc: Date;
  let periodLabel = '';
  let periodKey = '';

  if (reportType === ReportType.RINGKAS_HARIAN) {
    // Hari ini WIB (00:00:00 s/d 23:59:59 WIB)
    startUtc = new Date(Date.UTC(year, month, date, 0, 0, 0) - 7 * 3600 * 1000);
    endUtc = new Date(Date.UTC(year, month, date, 23, 59, 59, 999) - 7 * 3600 * 1000);
    const dayStr = String(date).padStart(2, '0');
    const monthStr = String(month + 1).padStart(2, '0');
    periodLabel = `Hari Ini (${dayStr}/${monthStr}/${year} WIB)`;
    periodKey = `${year}-${monthStr}-${dayStr}`;
  } else if (reportType === ReportType.MINGGUAN) {
    // 7 hari terakhir s/d hari ini WIB
    startUtc = new Date(Date.UTC(year, month, date - 6, 0, 0, 0) - 7 * 3600 * 1000);
    endUtc = new Date(Date.UTC(year, month, date, 23, 59, 59, 999) - 7 * 3600 * 1000);
    // Nomor minggu ISO
    const startOfYear = new Date(Date.UTC(year, 0, 1));
    const weekNum = Math.ceil(((wibRef.getTime() - startOfYear.getTime()) / 86400000 + 1) / 7);
    periodLabel = `7 Hari Terakhir (Minggu ke-${weekNum}, ${year})`;
    periodKey = `${year}-W${String(weekNum).padStart(2, '0')}`;
  } else {
    // BULANAN: 1 bulan penuh s/d hari ini WIB
    startUtc = new Date(Date.UTC(year, month, 1, 0, 0, 0) - 7 * 3600 * 1000);
    endUtc = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999) - 7 * 3600 * 1000);
    const monthName = new Intl.DateTimeFormat('id-ID', { month: 'long', timeZone: 'Asia/Jakarta' }).format(referenceDate);
    periodLabel = `Bulan ${monthName} ${year}`;
    periodKey = `${year}-${String(month + 1).padStart(2, '0')}`;
  }

  return { startDate: startUtc, endDate: endUtc, periodLabel, periodKey };
}

/**
 * Bangkitkan teks laporan WhatsApp sesuai cakupan penerima
 */
export async function generateWaReport(options: GenerateWaReportOptions): Promise<GeneratedWaReport> {
  const { userId, reportType, includeSheetLink, includeFile, baseUrl = '', targetDate = new Date() } = options;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { region: true },
  });

  if (!user) {
    throw new Error('Pengguna penerima laporan tidak ditemukan.');
  }

  const { startDate, endDate, periodLabel, periodKey } = getReportDateRange(reportType, targetDate);

  let message = '';
  let downloadUrl: string | undefined;
  let token: string | undefined;

  // 1. Cabang OWNER: Konsolidasi Finansial & Laba Kotor
  if (user.role === Role.OWNER || user.role === Role.DEVELOPER) {
    const orders = await prisma.order.findMany({
      where: {
        isTest: false,
        createdAt: { gte: startDate, lte: endDate },
      },
      include: {
        items: {
          include: {
            variant: {
              include: { cost: true },
            },
          },
        },
      },
    });

    let totalOrders = 0;
    let completedOrders = 0;
    let diprosesOrders = 0;
    let dikirimOrders = 0;
    let pendingPaymentOrders = 0;
    let pendingCodOrders = 0;
    let pendingCodRevenue = 0;

    let grossSales = 0;
    let totalDiscount = 0;
    let netSales = 0;
    let totalPpn = 0;
    let totalShipping = 0;
    let totalHpp = 0;

    for (const o of orders) {
      if (o.status !== OrderStatus.DIBATALKAN) {
        totalOrders++;
        grossSales += o.subtotal;
        totalDiscount += o.discountAmount;
        netSales += o.netPrice;
        totalPpn += o.ppnAmount;
        totalShipping += o.shippingCost;

        if (o.paymentMethod === 'COD' && o.status !== OrderStatus.SELESAI) {
          pendingCodOrders++;
          pendingCodRevenue += o.netPrice;
        }

        if (o.status === OrderStatus.SELESAI) completedOrders++;
        else if (o.status === OrderStatus.DIPROSES) diprosesOrders++;
        else if (o.status === OrderStatus.DIKIRIM) dikirimOrders++;
        else if (o.status === OrderStatus.MENUNGGU_PEMBAYARAN) pendingPaymentOrders++;

        // Hitung HPP
        for (const it of o.items) {
          const costEach = it.variant?.cost?.costPrice || it.priceEach * 0.5;
          const packEach = it.variant?.cost?.packingCost || 0;
          totalHpp += (costEach + packEach) * it.quantity;
        }
      }
    }

    const grossProfit = netSales - totalHpp;

    // Periksa stok menipis
    const lowStockCount = await prisma.stock.count({
      where: { qty: { lte: 10 } },
    });

    message = [
      `📊 *LAPORAN EKSEKUTIF LUVIRA 2.0*`,
      `📅 Periode: ${periodLabel}`,
      `⏰ Dibuat: ${formatWibDateTime(new Date())}`,
      `👤 Penerima: ${user.name} (Owner)`,
      ``,
      `💰 *RINGKASAN FINANSIAL*`,
      `• Total Pesanan: *${totalOrders} order*`,
      `• Omzet Kotor: *${formatRp(grossSales)}*`,
      `• Total Diskon: *${formatRp(totalDiscount)}*`,
      `• Omzet Bersih: *${formatRp(netSales)}*`,
      `• Total HPP & Modal: *${formatRp(totalHpp)}*`,
      `• *Laba Kotor Bisnis*: *${formatRp(grossProfit)}*`,
      `• Kas Titipan PPN: *${formatRp(totalPpn)}*`,
      `• Total Ongkir: *${formatRp(totalShipping)}*`,
      ``,
      `📦 *STATUS OPERASIONAL*`,
      `• Selesai: ${completedOrders} | Dikirim: ${dikirimOrders} | Diproses: ${diprosesOrders}`,
      `• Menunggu Bayar: ${pendingPaymentOrders}`,
      `• COD Belum Diselesaikan: *${pendingCodOrders} order (${formatRp(pendingCodRevenue)})*`,
      `• Peringatan Stok Menipis: *${lowStockCount} varian*`,
    ].join('\n');

    // Tautan Spreadsheet jika diminta
    if (includeSheetLink) {
      const sheet = await prisma.sheetConnection.findFirst({
        where: { scopeType: SheetScopeType.GLOBAL },
      });
      if (sheet) {
        message += `\n\n🔗 *Cermin Spreadsheet*: ${sheet.spreadsheetUrl}`;
      }
    }

    // Token Unduh File jika diminta
    if (includeFile) {
      token = createReportDownloadToken({
        userId: user.id,
        scopeType: 'GLOBAL',
        reportType,
      });
      downloadUrl = `${baseUrl}/api/reports/dl/${token}`;
      message += `\n📥 *Unduh File Laporan (15 mnt)*: ${downloadUrl}`;
    }
  }

  // 2. Cabang ADMIN: Operasional Wilayah (MUTLAK TANPA HPP & LABA)
  else if (user.role === Role.ADMIN_PUSAT || user.role === Role.ADMIN_WILAYAH) {
    const regionId = user.regionId;
    const regionName = user.region?.name || (user.role === Role.ADMIN_PUSAT ? 'Pusat (Seluruh Cabang)' : 'Wilayah');

    const orders = await prisma.order.findMany({
      where: {
        isTest: false,
        createdAt: { gte: startDate, lte: endDate },
        ...(regionId ? { regionId } : {}),
      },
    });

    let totalOrders = 0;
    let completedOrders = 0;
    let diprosesOrders = 0;
    let dikirimOrders = 0;
    let pendingPaymentOrders = 0;
    let pendingCodOrders = 0;
    let pendingCodRevenue = 0;
    let netSales = 0;
    let totalDiscount = 0;
    for (const o of orders) {
      if (o.status !== OrderStatus.DIBATALKAN) {
        totalOrders++;
        netSales += o.netPrice;
        totalDiscount += o.discountAmount;

        if (o.paymentMethod === 'COD' && o.status !== OrderStatus.SELESAI) {
          pendingCodOrders++;
          pendingCodRevenue += o.netPrice;
        }

        if (o.status === OrderStatus.SELESAI) completedOrders++;
        else if (o.status === OrderStatus.DIPROSES) diprosesOrders++;
        else if (o.status === OrderStatus.DIKIRIM) dikirimOrders++;
        else if (o.status === OrderStatus.MENUNGGU_PEMBAYARAN) pendingPaymentOrders++;
      }
    }

    // Stok menipis wilayah
    const lowStockCount = await prisma.stock.count({
      where: {
        qty: { lte: 10 },
        ...(regionId ? { regionId } : {}),
      },
    });

    message = [
      `📦 *LAPORAN OPERASIONAL ADMIN LUVIRA*`,
      `🏢 Gudang/Wilayah: *${regionName}*`,
      `📅 Periode: ${periodLabel}`,
      `⏰ Waktu: ${formatWibDateTime(new Date())}`,
      `👤 Penanggung Jawab: ${user.name}`,
      ``,
      `📈 *PENJUALAN WILAYAH*`,
      `• Total Pesanan: *${totalOrders} order*`,
      `• Total Omzet Bersih: *${formatRp(netSales)}*`,
      `• Diskon Terpakai: *${formatRp(totalDiscount)}*`,
      ``,
      `🚚 *STATUS PENGIRIMAN & PEMENUHAN*`,
      `• Selesai: ${completedOrders}`,
      `• Dalam Pengiriman (Dikirim): ${dikirimOrders}`,
      `• Sedang Dipacking (Diproses): ${diprosesOrders}`,
      `• Menunggu Pembayaran: ${pendingPaymentOrders}`,
      `• COD Menunggu Kas: *${pendingCodOrders} order (${formatRp(pendingCodRevenue)})*`,
      `• Stok Gudang Menipis (<=10): *${lowStockCount} varian*`,
    ].join('\n');

    if (includeSheetLink) {
      const sheet = await prisma.sheetConnection.findFirst({
        where: regionId
          ? { scopeType: SheetScopeType.REGION, scopeId: regionId }
          : { scopeType: SheetScopeType.GLOBAL },
      });
      if (sheet) {
        message += `\n\n🔗 *Cermin Spreadsheet Wilayah*: ${sheet.spreadsheetUrl}`;
      }
    }

    if (includeFile) {
      token = createReportDownloadToken({
        userId: user.id,
        scopeType: 'REGION',
        scopeId: regionId,
        reportType,
      });
      downloadUrl = `${baseUrl}/api/reports/dl/${token}`;
      message += `\n📥 *Unduh Rekap Wilayah (15 mnt)*: ${downloadUrl}`;
    }
  }

  // 3. Cabang RESELLER: Pesanan Kodenya Sendiri (MUTLAK TANPA HPP, STOK, ATAU ALAMAT DETAIL)
  else if (user.role === Role.RESELLER) {
    const myPromos = await prisma.promoCode.findMany({
      where: { resellerId: user.id },
      select: { id: true, code: true },
    });
    const promoIds = myPromos.map((p) => p.id);

    const orders = await prisma.order.findMany({
      where: {
        isTest: false,
        createdAt: { gte: startDate, lte: endDate },
        OR: [
          { createdByUserId: user.id },
          ...(promoIds.length > 0
            ? [
                { promoCodeId: { in: promoIds } },
                { secondPromoCodeId: { in: promoIds } },
              ]
            : []),
        ],
      },
    });

    let totalOrders = 0;
    let completedOrders = 0;
    let grossTurnover = 0;
    let netTurnover = 0;
    let totalDiscount = 0;

    for (const o of orders) {
      if (o.status !== OrderStatus.DIBATALKAN) {
        totalOrders++;
        grossTurnover += o.subtotal;
        netTurnover += o.netPrice;
        totalDiscount += o.discountAmount;
        if (o.status === OrderStatus.SELESAI) completedOrders++;
      }
    }

    message = [
      `🌟 *RINGKASAN PENJUALAN RESELLER LUVIRA*`,
      `📅 Periode: ${periodLabel}`,
      `⏰ Waktu: ${formatWibDateTime(new Date())}`,
      `👤 Reseller: *${user.name}*`,
      ``,
      `🎯 *KINERJA PROMO & COD SAYA*`,
      `• Total Pesanan Masuk: *${totalOrders} order*`,
      `• Pesanan Berhasil / Selesai: *${completedOrders} order*`,
      `• Nilai Transaksi Kotor: *${formatRp(grossTurnover)}*`,
      `• Omzet Penjualan Bersih: *${formatRp(netTurnover)}*`,
      `• Total Diskon Pelanggan: *${formatRp(totalDiscount)}*`,
      `• Jumlah Kode Promo Aktif: *${myPromos.length} kode*`,
      ``,
      `_Catatan Privasi: Data pelanggan disamarkan demi keamanan._`,
    ].join('\n');

    if (includeSheetLink) {
      const sheet = await prisma.sheetConnection.findFirst({
        where: { scopeType: SheetScopeType.RESELLER, scopeId: user.id },
      });
      if (sheet) {
        message += `\n\n🔗 *Cermin Spreadsheet Reseller*: ${sheet.spreadsheetUrl}`;
      }
    }

    if (includeFile) {
      token = createReportDownloadToken({
        userId: user.id,
        scopeType: 'RESELLER',
        scopeId: user.id,
        reportType,
      });
      downloadUrl = `${baseUrl}/api/reports/dl/${token}`;
      message += `\n📥 *Unduh Rekap Pesanan Saya (15 mnt)*: ${downloadUrl}`;
    }
  }

  return {
    message,
    downloadUrl,
    token,
    periodLabel,
    periodKey,
  };
}

/**
 * Bangkitkan file CSV untuk route /api/reports/dl/<token>
 */
export async function generateReportCsvContent(tokenData: {
  userId: string;
  scopeType: 'GLOBAL' | 'REGION' | 'RESELLER';
  scopeId?: string | null;
  reportType: ReportType;
}): Promise<string> {
  const { startDate, endDate, periodLabel } = getReportDateRange(tokenData.reportType);

  const ordersWhere: any = {
    isTest: false,
    createdAt: { gte: startDate, lte: endDate },
  };

  if (tokenData.scopeType === 'REGION' && tokenData.scopeId) {
    ordersWhere.regionId = tokenData.scopeId;
  } else if (tokenData.scopeType === 'RESELLER') {
    const promos = await prisma.promoCode.findMany({
      where: { resellerId: tokenData.userId },
      select: { id: true },
    });
    const promoIds = promos.map((p) => p.id);
    ordersWhere.OR = [
      { createdByUserId: tokenData.userId },
      ...(promoIds.length > 0
        ? [
            { promoCodeId: { in: promoIds } },
            { secondPromoCodeId: { in: promoIds } },
          ]
        : []),
    ];
  }

  const orders = await prisma.order.findMany({
    where: ordersWhere,
    include: {
      region: { select: { name: true } },
      promoCode: { select: { code: true } },
      secondPromoCode: { select: { code: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  const headers = [
    'No',
    'Kode Pesanan',
    'Tanggal (WIB)',
    'Wilayah',
    'Status',
    'Metode Bayar',
    'Subtotal',
    'Diskon',
    'Kode Promo',
    'Total Tagihan',
  ];

  const rows = orders.map((o, idx) => {
    const promoDisplay = [o.promoCode?.code, o.secondPromoCode?.code].filter(Boolean).join(' + ') || '-';
    return [
      idx + 1,
      `"${o.code}"`,
      `"${formatWibDateTime(o.createdAt)}"`,
      `"${o.region?.name || '-'}"`,
      `"${o.status}"`,
      `"${o.paymentMethod}"`,
      o.subtotal,
      o.discountAmount,
      `"${promoDisplay}"`,
      o.totalPrice,
    ].join(',');
  });

  return [
    `LAPORAN PENJUALAN LUVIRA 2.0`,
    `Periode: ${periodLabel}`,
    `Waktu Unduh: ${formatWibDateTime()}`,
    ``,
    headers.join(','),
    ...rows,
  ].join('\n');
}
