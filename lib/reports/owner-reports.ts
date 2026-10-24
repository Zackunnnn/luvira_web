// lib/reports/owner-reports.ts
// ============================================================================
// Modul Agregasi Laporan Keuangan, Omzet, & HPP Historis Owner Luvira 2.0
// Sesuai docs/LUVIRA_2_PLAN.md Bagian 4 & 7 & docs/PHASE_PROMPTS.md Fase 4
// ============================================================================

export interface OrderItemSnapshot {
  productName: string;
  variantName: string;
  quantity: number;
  priceEach: number;
  costEach: number; // Snapshot HPP saat transaksi
  packingEach: number; // Snapshot biaya packing saat transaksi
  subtotal: number;
}

export interface OrderFinancialRecord {
  id: string;
  code: string;
  regionId: string;
  regionName?: string;
  status: string;
  paymentMethod: string;
  createdAt: Date | string;
  subtotal: number;
  discountAmount: number;
  netPrice: number;
  ppnAmount: number;
  shippingCost: number;
  totalPrice: number;
  promoCode?: string | null;
  items: OrderItemSnapshot[];
}

export interface FinancialSummary {
  totalOrders: number;
  totalItemsSold: number;
  grossSales: number; // Subtotal kotor sebelum diskon
  totalDiscount: number;
  netSales: number; // Penjualan bersih produk (grossSales - totalDiscount)
  totalPpn: number; // PPN ditagihkan (titipan negara)
  totalShipping: number; // Ongkir dibayar pembeli (diteruskan ke kurir)
  totalRevenue: number; // Total kas masuk pembeli (netSales + totalPpn + totalShipping)
  totalCostPrice: number; // Total HPP historis dari snapshot
  totalPackingCost: number; // Total biaya kemasan historis
  totalProductionCost: number; // totalCostPrice + totalPackingCost
  grossProfit: number; // Laba kotor = netSales - totalProductionCost
  averageOrderValue: number; // Rata-rata nilai belanja per pesanan
  profitMarginPercent: number; // (grossProfit / netSales) * 100
}

export interface ProductSalesStat {
  productName: string;
  quantity: number;
  revenue: number;
  cost: number;
  profit: number;
}

export interface RegionalSalesStat {
  regionId: string;
  regionName: string;
  totalOrders: number;
  netSales: number;
  grossProfit: number;
  percentageOfSales: number;
}

export interface PromoUsageStat {
  code: string;
  timesUsed: number;
  totalDiscountGiven: number;
}

export interface ComprehensiveReport {
  periodLabel: string;
  generatedAt: string;
  generatedBy: string;
  summary: FinancialSummary;
  productSales: ProductSalesStat[];
  regionalBreakdown: RegionalSalesStat[];
  promoUsage: PromoUsageStat[];
}

/**
 * Status pesanan yang sah masuk ke dalam kalkulasi keuangan bisnis
 */
export const SETTLED_ORDER_STATUSES = ['DIPROSES', 'DIKIRIM', 'SELESAI'];

/**
 * Menghitung agregasi keuangan dari daftar pesanan
 * Menggunakan snapshot historis di OrderItem untuk kalkulasi HPP yang akurat
 */
export function calculateFinancialSummary(orders: OrderFinancialRecord[]): FinancialSummary {
  const settledOrders = orders.filter((o) => SETTLED_ORDER_STATUSES.includes(o.status));

  let totalItemsSold = 0;
  let grossSales = 0;
  let totalDiscount = 0;
  let netSales = 0;
  let totalPpn = 0;
  let totalShipping = 0;
  let totalRevenue = 0;
  let totalCostPrice = 0;
  let totalPackingCost = 0;

  for (const order of settledOrders) {
    grossSales += order.subtotal;
    totalDiscount += order.discountAmount;
    netSales += order.netPrice;
    totalPpn += order.ppnAmount;
    totalShipping += order.shippingCost;
    totalRevenue += order.totalPrice;

    for (const item of order.items) {
      totalItemsSold += item.quantity;
      totalCostPrice += item.costEach * item.quantity;
      totalPackingCost += item.packingEach * item.quantity;
    }
  }

  const totalProductionCost = totalCostPrice + totalPackingCost;
  const grossProfit = netSales - totalProductionCost;
  const totalOrders = settledOrders.length;
  const averageOrderValue = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;
  const profitMarginPercent = netSales > 0 ? Number(((grossProfit / netSales) * 100).toFixed(2)) : 0;

  return {
    totalOrders,
    totalItemsSold,
    grossSales,
    totalDiscount,
    netSales,
    totalPpn,
    totalShipping,
    totalRevenue,
    totalCostPrice,
    totalPackingCost,
    totalProductionCost,
    grossProfit,
    averageOrderValue,
    profitMarginPercent,
  };
}

/**
 * Menghitung penjualan per produk terlaris
 */
export function calculateProductSales(orders: OrderFinancialRecord[]): ProductSalesStat[] {
  const settledOrders = orders.filter((o) => SETTLED_ORDER_STATUSES.includes(o.status));
  const productMap: Record<string, ProductSalesStat> = {};

  for (const order of settledOrders) {
    for (const item of order.items) {
      const key = item.productName;
      if (!productMap[key]) {
        productMap[key] = {
          productName: key,
          quantity: 0,
          revenue: 0,
          cost: 0,
          profit: 0,
        };
      }
      const itemRevenue = item.priceEach * item.quantity;
      const itemCost = (item.costEach + item.packingEach) * item.quantity;

      productMap[key].quantity += item.quantity;
      productMap[key].revenue += itemRevenue;
      productMap[key].cost += itemCost;
      productMap[key].profit += itemRevenue - itemCost;
    }
  }

  return Object.values(productMap).sort((a, b) => b.quantity - a.quantity);
}

/**
 * Menghitung kontribusi penjualan antar wilayah
 */
export function calculateRegionalSales(
  orders: OrderFinancialRecord[],
  regionNames: Record<string, string> = {}
): RegionalSalesStat[] {
  const settledOrders = orders.filter((o) => SETTLED_ORDER_STATUSES.includes(o.status));
  const summary = calculateFinancialSummary(orders);
  const regionMap: Record<string, { orders: number; netSales: number; cost: number }> = {};

  for (const order of settledOrders) {
    const regId = order.regionId || 'unknown';
    if (!regionMap[regId]) {
      regionMap[regId] = { orders: 0, netSales: 0, cost: 0 };
    }
    regionMap[regId].orders += 1;
    regionMap[regId].netSales += order.netPrice;

    for (const item of order.items) {
      regionMap[regId].cost += (item.costEach + item.packingEach) * item.quantity;
    }
  }

  return Object.entries(regionMap).map(([regionId, data]) => {
    const grossProfit = data.netSales - data.cost;
    const percentage = summary.netSales > 0 ? Number(((data.netSales / summary.netSales) * 100).toFixed(1)) : 0;
    return {
      regionId,
      regionName: regionNames[regionId] || regionId,
      totalOrders: data.orders,
      netSales: data.netSales,
      grossProfit,
      percentageOfSales: percentage,
    };
  }).sort((a, b) => b.netSales - a.netSales);
}

/**
 * Menghitung pemakaian promo
 */
export function calculatePromoUsage(orders: OrderFinancialRecord[]): PromoUsageStat[] {
  const settledOrders = orders.filter((o) => SETTLED_ORDER_STATUSES.includes(o.status));
  const promoMap: Record<string, { count: number; totalDiscount: number }> = {};

  for (const order of settledOrders) {
    if (order.promoCode && order.discountAmount > 0) {
      if (!promoMap[order.promoCode]) {
        promoMap[order.promoCode] = { count: 0, totalDiscount: 0 };
      }
      promoMap[order.promoCode].count += 1;
      promoMap[order.promoCode].totalDiscount += order.discountAmount;
    }
  }

  return Object.entries(promoMap).map(([code, data]) => ({
    code,
    timesUsed: data.count,
    totalDiscountGiven: data.totalDiscount,
  })).sort((a, b) => b.timesUsed - a.timesUsed);
}

/**
 * Menghasilkan data format CSV / Excel tabuler dari laporan komprehensif
 */
export function generateReportCsv(report: ComprehensiveReport): string {
  const lines: string[] = [];

  lines.push(`LAPORAN KEUANGAN DAN PENJUALAN LUVIRA 2.0`);
  lines.push(`Periode: ${report.periodLabel}`);
  lines.push(`Tanggal Cetak: ${report.generatedAt}`);
  lines.push(`Dicetak Oleh: ${report.generatedBy}`);
  lines.push('');

  // 1. Ringkasan Finansial
  lines.push('--- RINGKASAN KEUANGAN BISNIS ---');
  lines.push(`Metrik,Nilai`);
  lines.push(`Total Pesanan Lunas,${report.summary.totalOrders}`);
  lines.push(`Total Kaus Kaki Terjual (Pasang),${report.summary.totalItemsSold}`);
  lines.push(`Penjualan Kotor (Subtotal),Rp ${report.summary.grossSales.toLocaleString('id-ID')}`);
  lines.push(`Diskon Diberikan,Rp ${report.summary.totalDiscount.toLocaleString('id-ID')}`);
  lines.push(`Penjualan Bersih (Net Sales),Rp ${report.summary.netSales.toLocaleString('id-ID')}`);
  lines.push(`PPN 11% (Titipan Pajak),Rp ${report.summary.totalPpn.toLocaleString('id-ID')}`);
  lines.push(`Ongkos Kirim Diteruskan,Rp ${report.summary.totalShipping.toLocaleString('id-ID')}`);
  lines.push(`Total Penerimaan Kas Pembeli,Rp ${report.summary.totalRevenue.toLocaleString('id-ID')}`);
  lines.push(`Total HPP Produk (Cost Price),Rp ${report.summary.totalCostPrice.toLocaleString('id-ID')}`);
  lines.push(`Total Biaya Kemasan (Packing Cost),Rp ${report.summary.totalPackingCost.toLocaleString('id-ID')}`);
  lines.push(`Total Biaya Modal Historis,Rp ${report.summary.totalProductionCost.toLocaleString('id-ID')}`);
  lines.push(`Laba Kotor (Gross Profit),Rp ${report.summary.grossProfit.toLocaleString('id-ID')}`);
  lines.push(`Rata-rata Nilai Pesanan (AOV),Rp ${report.summary.averageOrderValue.toLocaleString('id-ID')}`);
  lines.push(`Marjin Laba Kotor,${report.summary.profitMarginPercent}%`);
  lines.push('');

  // 2. Per Produk
  lines.push('--- PENJUALAN PER PRODUK ---');
  lines.push(`Nama Produk,Qty Terjual,Omzet Produk,Total HPP & Packing,Laba Produk`);
  for (const p of report.productSales) {
    lines.push(`"${p.productName}",${p.quantity},Rp ${p.revenue.toLocaleString('id-ID')},Rp ${p.cost.toLocaleString('id-ID')},Rp ${p.profit.toLocaleString('id-ID')}`);
  }
  lines.push('');

  // 3. Antar Wilayah
  lines.push('--- KONTRIBUSI PENJUALAN ANTAR WILAYAH ---');
  lines.push(`Wilayah,Jumlah Pesanan,Penjualan Bersih,Laba Kotor,Kontribusi (%)`);
  for (const r of report.regionalBreakdown) {
    lines.push(`"${r.regionName}",${r.totalOrders},Rp ${r.netSales.toLocaleString('id-ID')},Rp ${r.grossProfit.toLocaleString('id-ID')},${r.percentageOfSales}%`);
  }
  lines.push('');

  // 4. Promo
  lines.push('--- PENGGUNAAN KODE PROMO ---');
  lines.push(`Kode Promo,Jumlah Pemakaian,Total Diskon Diberikan`);
  for (const pr of report.promoUsage) {
    lines.push(`"${pr.code}",${pr.timesUsed},Rp ${pr.totalDiscountGiven.toLocaleString('id-ID')}`);
  }

  return lines.join('\n');
}
