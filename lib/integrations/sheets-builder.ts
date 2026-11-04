// lib/integrations/sheets-builder.ts
// ============================================================================
// Pembangun Data Google Spreadsheet Luvira 2.0 (FT-5, Asumsi F6)
// Menghasilkan baris tab untuk cakupan GLOBAL (Owner), REGION (Admin), & RESELLER.
// Penegakan Privasi:
// - Pesanan Uji (isTest: true) MUTLAK DIKELUARKAN (Asumsi F5).
// - Scope REGION: Mutlak TANPA HPP / modal / laba kotor.
// - Scope RESELLER: Mutlak TANPA HPP / modal, TANPA stok gudang, TANPA alamat detail.
// - Seluruh data pelanggan disamarkan: B*** S*** & ••••1234.
// ============================================================================

import { prisma } from '@/lib/db';
import { maskCustomerName, maskPhoneNumber } from '@/lib/reseller/masking';
import { SheetTabPayload } from './sheets';
import { OrderStatus, PaymentMethod } from '@prisma/client';

export function formatWibDateTime(date: Date | string = new Date()): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return (
    new Intl.DateTimeFormat('id-ID', {
      timeZone: 'Asia/Jakarta',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).format(d) + ' WIB'
  );
}

function formatRupiah(num: number): string {
  return `Rp ${Math.round(num || 0).toLocaleString('id-ID')}`;
}

const SETTLED_STATUSES: string[] = [
  OrderStatus.DIPROSES,
  OrderStatus.DIKIRIM,
  OrderStatus.SELESAI,
];

/**
 * 1. Pembangun Data Lembar Kerja GLOBAL (Khusus Owner Luvira)
 * Mencakup ringkasan laba kotor, HPP, seluruh pesanan disamarkan, per produk, per wilayah, promo, dan stok.
 */
export async function buildGlobalSheetData(monthsLimit = 12): Promise<SheetTabPayload[]> {
  const cutoffDate = new Date();
  cutoffDate.setMonth(cutoffDate.getMonth() - monthsLimit);

  // A. Ambil seluruh pesanan non-uji dalam rentang batas bulan
  const orders = await prisma.order.findMany({
    where: {
      isTest: false,
      createdAt: { gte: cutoffDate },
    },
    include: {
      region: { select: { name: true } },
      promoCode: { select: { code: true, resellerId: true, discountType: true } },
      secondPromoCode: { select: { code: true, resellerId: true, discountType: true } },
      items: {
        include: {
          variant: {
            include: {
              cost: true,
              product: { select: { name: true } },
            },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  // B. Ambil data stok gudang seluruh wilayah
  const stocks = await prisma.stock.findMany({
    include: {
      region: { select: { name: true } },
      variant: {
        include: {
          product: { select: { name: true } },
        },
      },
    },
    orderBy: [{ region: { name: 'asc' } }, { variant: { name: 'asc' } }],
  });

  // C. Agregasi Metrik Finansial
  let totalOrders = 0;
  let totalItemsSold = 0;
  let grossSales = 0;
  let totalDiscount = 0;
  let netSales = 0;
  let totalPpn = 0;
  let totalShipping = 0;
  let totalRevenue = 0;
  let totalCostPrice = 0;
  let totalPackingCost = 0;
  let pendingCodRevenue = 0;

  // Agregasi Produk & Wilayah
  const productAgg: Record<string, { qty: number; revenue: number; cost: number }> = {};
  const regionAgg: Record<string, { count: number; net: number; cost: number }> = {};
  const promoAgg: Record<string, { count: number; discount: number; reseller?: string }> = {};

  for (const o of orders) {
    const isCod = o.paymentMethod === PaymentMethod.COD;
    if (isCod && o.status !== OrderStatus.SELESAI) {
      pendingCodRevenue += o.totalPrice;
    }

    if (SETTLED_STATUSES.includes(o.status)) {
      totalOrders += 1;
      grossSales += o.subtotal;
      totalDiscount += o.discountAmount;
      netSales += o.netPrice;
      totalPpn += o.ppnAmount;
      totalShipping += o.shippingCost;
      totalRevenue += o.totalPrice;

      const regName = o.region?.name || 'Pusat';
      if (!regionAgg[regName]) regionAgg[regName] = { count: 0, net: 0, cost: 0 };
      regionAgg[regName].count += 1;
      regionAgg[regName].net += o.netPrice;

      // Item breakdown
      for (const item of o.items) {
        totalItemsSold += item.quantity;
        const itemCost = (item.costEach || 0) * item.quantity;
        const itemPacking = (item.packingEach || 0) * item.quantity;
        totalCostPrice += itemCost;
        totalPackingCost += itemPacking;
        regionAgg[regName].cost += itemCost + itemPacking;

        const prodKey = `${item.productName} - ${item.variantName}`;
        if (!productAgg[prodKey]) productAgg[prodKey] = { qty: 0, revenue: 0, cost: 0 };
        productAgg[prodKey].qty += item.quantity;
        productAgg[prodKey].revenue += item.subtotal;
        productAgg[prodKey].cost += itemCost + itemPacking;
      }

      // Promo breakdown
      const activePromos = [o.promoCode, o.secondPromoCode].filter(Boolean);
      for (const pr of activePromos) {
        if (!pr) continue;
        if (!promoAgg[pr.code]) {
          promoAgg[pr.code] = { count: 0, discount: 0, reseller: pr.resellerId || undefined };
        }
        promoAgg[pr.code].count += 1;
        promoAgg[pr.code].discount += Math.round(o.discountAmount / activePromos.length);
      }
    }
  }

  const grossProfit = netSales - (totalCostPrice + totalPackingCost);
  const profitMargin = netSales > 0 ? Number(((grossProfit / netSales) * 100).toFixed(1)) : 0;
  const aov = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;

  // TAB 1: Ringkasan Bisnis
  const ringkasanRows: any[][] = [
    ['Terakhir disinkronkan:', formatWibDateTime()],
    ['Catatan Keamanan:', 'Cermin data 1-arah otomatis Luvira 2.0. Dilarang mengedit tab ini langsung.'],
    [],
    ['METRIK FINANSIAL BISNIS', 'NILAI'],
    ['Total Pesanan Lunas / Terealisasi', totalOrders],
    ['Total Kaus Kaki Terjual (Pasang)', totalItemsSold],
    ['Penjualan Kotor (Subtotal Produk)', formatRupiah(grossSales)],
    ['Total Diskon Diberikan', formatRupiah(totalDiscount)],
    ['Penjualan Bersih (Net Sales Produk)', formatRupiah(netSales)],
    ['PPN 11% (Titipan Kas Pajak)', formatRupiah(totalPpn)],
    ['Ongkos Kirim Diteruskan ke Kurir', formatRupiah(totalShipping)],
    ['Total Penerimaan Kas Pembeli', formatRupiah(totalRevenue)],
    ['Total HPP Modal Produk (Cost Price)', formatRupiah(totalCostPrice)],
    ['Total Biaya Kemasan (Packing Cost)', formatRupiah(totalPackingCost)],
    ['Total Beban Pokok Penjualan (HPP Historis)', formatRupiah(totalCostPrice + totalPackingCost)],
    ['Laba Kotor (Gross Profit)', formatRupiah(grossProfit)],
    ['Marjin Laba Kotor (%)', `${profitMargin}%`],
    ['Rata-rata Nilai Pesanan (AOV)', formatRupiah(aov)],
    ['Kas Tertahan COD Belum Diselesaikan', formatRupiah(pendingCodRevenue)],
  ];

  // TAB 2: Pesanan (Data Pelanggan Disamarkan F4)
  const pesananHeader = [
    'Kode Pesanan',
    'Tanggal (WIB)',
    'Wilayah Gudang',
    'Pelanggan',
    'WhatsApp',
    'Status',
    'Metode Bayar',
    'Subtotal',
    'Diskon',
    'Kode Promo',
    'Ongkir',
    'PPN 11%',
    'Total Tagihan',
    'Kurir',
    'No Resi',
  ];

  const pesananRows: any[][] = [
    ['Terakhir disinkronkan:', formatWibDateTime()],
    [],
    pesananHeader,
    ...orders.map((o) => {
      const promoDisplay = [o.promoCode?.code, o.secondPromoCode?.code].filter(Boolean).join(' + ') || '-';
      return [
        o.code,
        formatWibDateTime(o.createdAt),
        o.region?.name || '-',
        maskCustomerName(o.customerName),
        maskPhoneNumber(o.customerPhone),
        o.status,
        o.paymentMethod === 'COD' ? 'COD' : o.paymentMethod.replace('_', ' '),
        o.subtotal,
        o.discountAmount,
        promoDisplay,
        o.shippingCost,
        o.ppnAmount,
        o.totalPrice,
        o.courierCode || '-',
        o.trackingNumber || '-',
      ];
    }),
  ];

  // TAB 3: Per Produk
  const produkHeader = ['Nama Produk & Varian', 'Qty Terjual', 'Omzet Penjualan', 'Total HPP & Packing', 'Laba Produk'];
  const produkRows: any[][] = [
    ['Terakhir disinkronkan:', formatWibDateTime()],
    [],
    produkHeader,
    ...Object.entries(productAgg).map(([name, val]) => [
      name,
      val.qty,
      val.revenue,
      val.cost,
      val.revenue - val.cost,
    ]),
  ];

  // TAB 4: Per Wilayah
  const wilayahHeader = ['Wilayah Gudang', 'Jumlah Pesanan', 'Penjualan Bersih', 'Laba Kotor', 'Kontribusi (%)'];
  const wilayahRows: any[][] = [
    ['Terakhir disinkronkan:', formatWibDateTime()],
    [],
    wilayahHeader,
    ...Object.entries(regionAgg).map(([name, val]) => {
      const kontribusi = netSales > 0 ? Number(((val.net / netSales) * 100).toFixed(1)) : 0;
      return [name, val.count, val.net, val.net - val.cost, `${kontribusi}%`];
    }),
  ];

  // TAB 5: Promo & Reseller
  const promoHeader = ['Kode Promo', 'Tipe', 'Jumlah Pemakaian', 'Total Diskon Diberikan'];
  const promoRows: any[][] = [
    ['Terakhir disinkronkan:', formatWibDateTime()],
    [],
    promoHeader,
    ...Object.entries(promoAgg).map(([code, val]) => [
      code,
      val.reseller ? 'Reseller Promo' : 'Promo Umum',
      val.count,
      val.discount,
    ]),
  ];

  // TAB 6: Stok Wilayah
  const stokHeader = ['Nama Produk', 'Varian', 'Wilayah Gudang', 'Stok Fisik', 'Stok Ter-reserve', 'Stok Tersedia'];
  const stokRows: any[][] = [
    ['Terakhir disinkronkan:', formatWibDateTime()],
    [],
    stokHeader,
    ...stocks.map((s) => [
      s.variant.product.name,
      s.variant.name,
      s.region.name,
      s.qty,
      s.reserved,
      s.qty - s.reserved,
    ]),
  ];

  return [
    { name: 'Ringkasan Bisnis', rows: ringkasanRows },
    { name: 'Daftar Pesanan', rows: pesananRows },
    { name: 'Penjualan Per Produk', rows: produkRows },
    { name: 'Kontribusi Wilayah', rows: wilayahRows },
    { name: 'Promo dan Reseller', rows: promoRows },
    { name: 'Stok Gudang', rows: stokRows },
  ];
}

/**
 * 2. Pembangun Data Lembar Kerja REGION (Khusus Admin Wilayah / Admin Pusat)
 * Mutlak HANYA wilayah bersangkutan.
 * Mutlak TANPA HPP, TANPA kemasan, TANPA laba kotor.
 */
export async function buildRegionSheetData(regionId: string, monthsLimit = 12): Promise<SheetTabPayload[]> {
  const cutoffDate = new Date();
  cutoffDate.setMonth(cutoffDate.getMonth() - monthsLimit);

  const region = await prisma.region.findUnique({
    where: { id: regionId },
    select: { id: true, name: true },
  });

  if (!region) {
    throw new Error('Wilayah tidak ditemukan.');
  }

  // Pesanan khusus wilayah ini, non-uji
  const orders = await prisma.order.findMany({
    where: {
      regionId,
      isTest: false,
      createdAt: { gte: cutoffDate },
    },
    include: {
      promoCode: { select: { code: true } },
      secondPromoCode: { select: { code: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  // Stok khusus wilayah ini
  const stocks = await prisma.stock.findMany({
    where: { regionId },
    include: {
      variant: {
        include: {
          product: { select: { name: true } },
        },
      },
    },
    orderBy: { variant: { name: 'asc' } },
  });

  // Tab Pesanan Wilayah
  const pesananHeader = [
    'Kode Pesanan',
    'Tanggal (WIB)',
    'Pelanggan',
    'WhatsApp',
    'Status',
    'Metode Bayar',
    'Subtotal',
    'Diskon',
    'Kode Promo',
    'Ongkir',
    'PPN 11%',
    'Total Tagihan',
    'Kurir',
    'No Resi',
  ];

  const pesananRows: any[][] = [
    ['Terakhir disinkronkan:', formatWibDateTime()],
    ['Wilayah Gudang:', region.name],
    [],
    pesananHeader,
    ...orders.map((o) => {
      const promoDisplay = [o.promoCode?.code, o.secondPromoCode?.code].filter(Boolean).join(' + ') || '-';
      return [
        o.code,
        formatWibDateTime(o.createdAt),
        maskCustomerName(o.customerName),
        maskPhoneNumber(o.customerPhone),
        o.status,
        o.paymentMethod === 'COD' ? 'COD' : o.paymentMethod.replace('_', ' '),
        o.subtotal,
        o.discountAmount,
        promoDisplay,
        o.shippingCost,
        o.ppnAmount,
        o.totalPrice,
        o.courierCode || '-',
        o.trackingNumber || '-',
      ];
    }),
  ];

  // Tab Stok Wilayah
  const stokHeader = ['Nama Produk', 'Varian', 'Gudang Wilayah', 'Stok Fisik', 'Stok Ter-reserve', 'Stok Tersedia'];
  const stokRows: any[][] = [
    ['Terakhir disinkronkan:', formatWibDateTime()],
    ['Wilayah Gudang:', region.name],
    [],
    stokHeader,
    ...stocks.map((s) => [
      s.variant.product.name,
      s.variant.name,
      region.name,
      s.qty,
      s.reserved,
      s.qty - s.reserved,
    ]),
  ];

  return [
    { name: `Pesanan ${region.name}`, rows: pesananRows },
    { name: `Stok ${region.name}`, rows: stokRows },
  ];
}

/**
 * 3. Pembangun Data Lembar Kerja RESELLER
 * Khusus pesanan yang menggunakan kode promo reseller ATAU pesanan manual buatannya.
 * Mutlak TANPA HPP, TANPA modal, TANPA stok gudang, TANPA alamat detail.
 * Seluruh data pelanggan disamarkan: B*** S*** & ••••1234.
 */
export async function buildResellerSheetData(resellerId: string, monthsLimit = 12): Promise<SheetTabPayload[]> {
  const cutoffDate = new Date();
  cutoffDate.setMonth(cutoffDate.getMonth() - monthsLimit);

  // Ambil seluruh promo reseller
  const myPromos = await prisma.promoCode.findMany({
    where: { resellerId },
    select: { id: true, code: true },
  });
  const promoIds = myPromos.map((p) => p.id);

  // Kueri pesanan
  const orders = await prisma.order.findMany({
    where: {
      isTest: false,
      createdAt: { gte: cutoffDate },
      OR: [
        { createdByUserId: resellerId },
        ...(promoIds.length > 0
          ? [
              { promoCodeId: { in: promoIds } },
              { secondPromoCodeId: { in: promoIds } },
            ]
          : []),
      ],
    },
    include: {
      promoCode: { select: { code: true } },
      secondPromoCode: { select: { code: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  // Hitung ringkasan reseller
  let totalOrders = 0;
  let grossTurnover = 0;
  let netTurnover = 0;
  let totalDiscount = 0;
  let completedOrders = 0;

  for (const o of orders) {
    if (o.status !== OrderStatus.DIBATALKAN) {
      totalOrders += 1;
      grossTurnover += o.subtotal;
      netTurnover += o.netPrice;
      totalDiscount += o.discountAmount;
      if (o.status === OrderStatus.SELESAI) {
        completedOrders += 1;
      }
    }
  }

  // TAB 1: Ringkasan Reseller
  const ringkasanRows: any[][] = [
    ['Terakhir disinkronkan:', formatWibDateTime()],
    ['Catatan Privasi:', 'Cermin data 1-arah resmi Reseller Luvira 2.0. Data pelanggan disamarkan.'],
    [],
    ['METRIK RESELLER', 'NILAI'],
    ['Total Pesanan Aktif', totalOrders],
    ['Pesanan Selesai / Diterima', completedOrders],
    ['Omzet Kotor (Sebelum Diskon)', formatRupiah(grossTurnover)],
    ['Omzet Bersih Penjualan', formatRupiah(netTurnover)],
    ['Total Diskon Diberikan ke Pelanggan', formatRupiah(totalDiscount)],
    ['Jumlah Kode Promo Tertaut', myPromos.length],
  ];

  // TAB 2: Pesanan Saya
  const pesananHeader = [
    'Kode Pesanan',
    'Tanggal (WIB)',
    'Pelanggan',
    'WhatsApp',
    'Status',
    'Metode Bayar',
    'Subtotal',
    'Diskon',
    'Kode Promo',
    'Total Tagihan',
  ];

  const pesananRows: any[][] = [
    ['Terakhir disinkronkan:', formatWibDateTime()],
    [],
    pesananHeader,
    ...orders.map((o) => {
      const promoDisplay = [o.promoCode?.code, o.secondPromoCode?.code].filter(Boolean).join(' + ') || '-';
      return [
        o.code,
        formatWibDateTime(o.createdAt),
        maskCustomerName(o.customerName),
        maskPhoneNumber(o.customerPhone),
        o.status,
        o.paymentMethod === 'COD' ? 'COD' : o.paymentMethod.replace('_', ' '),
        o.subtotal,
        o.discountAmount,
        promoDisplay,
        o.totalPrice,
      ];
    }),
  ];

  return [
    { name: 'Ringkasan Reseller', rows: ringkasanRows },
    { name: 'Pesanan Saya', rows: pesananRows },
  ];
}
