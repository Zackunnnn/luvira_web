// tests/unit/owner-reports.test.ts
// ============================================================================
// Pengujian Agregasi Laporan Owner (UNIT-OWNER)
// Membandingkan hasil fungsi agregasi terhadap fixture hitung manual
// Sesuai docs/LUVIRA_2_PLAN.md Bagian 4, 13 & Definition of Done Fase 4
// ============================================================================

import { describe, it, expect } from 'vitest';
import {
  calculateFinancialSummary,
  calculateProductSales,
  calculateRegionalSales,
  calculatePromoUsage,
  generateReportCsv,
  OrderFinancialRecord,
} from '@/lib/reports/owner-reports';

describe('Agregasi Laporan Keuangan Owner vs Hitung Manual (UNIT-OWNER)', () => {
  // Fixture data uji terkontrol
  const FIXTURE_ORDERS: OrderFinancialRecord[] = [
    // Order 1: Pusat, Lunas (DIPROSES)
    {
      id: 'ord-01',
      code: 'LVR-001',
      regionId: 'reg-pusat',
      regionName: 'Pusat (Kota Depok)',
      status: 'DIPROSES',
      paymentMethod: 'MANUAL_TRANSFER',
      createdAt: '2026-10-20T10:00:00Z',
      subtotal: 70000,
      discountAmount: 7000,
      netPrice: 63000,
      ppnAmount: 6930,
      shippingCost: 9000,
      totalPrice: 78930,
      promoCode: 'RESELLER2026',
      items: [
        {
          productName: 'Emboss Split Toe',
          variantName: 'Cudpahnut',
          quantity: 2,
          priceEach: 35000,
          costEach: 15000,
          packingEach: 2000,
          subtotal: 70000,
        },
      ],
    },

    // Order 2: Yogyakarta, Selesai (SELESAI)
    {
      id: 'ord-02',
      code: 'LVR-002',
      regionId: 'reg-jogja',
      regionName: 'Yogyakarta (DIY)',
      status: 'SELESAI',
      paymentMethod: 'MIDTRANS_SNAP',
      createdAt: '2026-10-21T14:30:00Z',
      subtotal: 75000,
      discountAmount: 11250,
      netPrice: 63750,
      ppnAmount: 7013,
      shippingCost: 8000,
      totalPrice: 78763,
      promoCode: 'JOGJAISTIMEWA',
      items: [
        {
          productName: 'Black Sole',
          variantName: 'Ivory Silk',
          quantity: 1,
          priceEach: 35000,
          costEach: 14000,
          packingEach: 2000,
          subtotal: 35000,
        },
        {
          productName: 'Anti-Slip Split Toe',
          variantName: 'White Marble',
          quantity: 1,
          priceEach: 40000,
          costEach: 18000,
          packingEach: 2000,
          subtotal: 40000,
        },
      ],
    },

    // Order 3: DIBATALKAN (Harus diabaikan dari perhitungan omzet & laba!)
    {
      id: 'ord-03',
      code: 'LVR-003',
      regionId: 'reg-pusat',
      regionName: 'Pusat (Kota Depok)',
      status: 'DIBATALKAN',
      paymentMethod: 'MANUAL_TRANSFER',
      createdAt: '2026-10-22T08:00:00Z',
      subtotal: 100000,
      discountAmount: 0,
      netPrice: 100000,
      ppnAmount: 11000,
      shippingCost: 10000,
      totalPrice: 121000,
      promoCode: null,
      items: [
        {
          productName: 'Black Sole Split Toe',
          variantName: 'Penelope',
          quantity: 2,
          priceEach: 50000,
          costEach: 20000,
          packingEach: 2000,
          subtotal: 100000,
        },
      ],
    },
  ];

  it('1. Perhitungan Financial Summary cocok 100% dengan hitungan manual', () => {
    const summary = calculateFinancialSummary(FIXTURE_ORDERS);

    // Hasil Harapan Hitung Manual:
    // Order dihitung: ord-01 & ord-02 (2 pesanan lunas)
    expect(summary.totalOrders).toBe(2);
    expect(summary.totalItemsSold).toBe(4); // 2 + 1 + 1

    // Penjualan Kotor (Subtotal produk): 70.000 + 75.000 = 145.000
    expect(summary.grossSales).toBe(145000);

    // Total Diskon: 7.000 + 11.250 = 18.250
    expect(summary.totalDiscount).toBe(18250);

    // Penjualan Bersih Produk (Net Sales): 63.000 + 63.750 = 126.750
    expect(summary.netSales).toBe(126750);

    // Total PPN 11%: 6.930 + 7.013 = 13.943
    expect(summary.totalPpn).toBe(13943);

    // Total Ongkir: 9.000 + 8.000 = 17.000
    expect(summary.totalShipping).toBe(17000);

    // Total Penerimaan Kas Pembeli: 78.930 + 78.763 = 157.693
    expect(summary.totalRevenue).toBe(157693);

    // HPP Historis Snapshot: (15.000*2) + (14.000*1) + (18.000*1) = 30.000 + 32.000 = 62.000
    expect(summary.totalCostPrice).toBe(62000);

    // Packing Historis Snapshot: (2.000*2) + (2.000*1) + (2.000*1) = 8.000
    expect(summary.totalPackingCost).toBe(8000);

    // Total Modal: 62.000 + 8.000 = 70.000
    expect(summary.totalProductionCost).toBe(70000);

    // Laba Kotor (Gross Profit) = Net Sales (126.750) - Total Modal (70.000) = 56.750
    expect(summary.grossProfit).toBe(56750);

    // Rata-rata Nilai Pesanan (AOV) = 157.693 / 2 = 78.847
    expect(summary.averageOrderValue).toBe(78847);

    // Marjin Laba = (56.750 / 126.750) * 100 = 44.77%
    expect(summary.profitMarginPercent).toBe(44.77);
  });

  it('2. Agregasi Penjualan per Produk mencocokkan kuantitas dan laba', () => {
    const productStats = calculateProductSales(FIXTURE_ORDERS);

    expect(productStats.length).toBe(3);

    // Produk terlaris #1: Emboss Split Toe (2 pasang)
    const emboss = productStats.find((p) => p.productName === 'Emboss Split Toe');
    expect(emboss).toBeDefined();
    expect(emboss!.quantity).toBe(2);
    expect(emboss!.revenue).toBe(70000);
    expect(emboss!.cost).toBe(34000); // (15k + 2k) * 2
    expect(emboss!.profit).toBe(36000);

    // Produk #2: Black Sole (1 pasang)
    const blackSole = productStats.find((p) => p.productName === 'Black Sole');
    expect(blackSole).toBeDefined();
    expect(blackSole!.quantity).toBe(1);
    expect(blackSole!.revenue).toBe(35000);
    expect(blackSole!.cost).toBe(16000); // 14k + 2k
    expect(blackSole!.profit).toBe(19000);

    // Produk #3: Anti-Slip Split Toe (1 pasang)
    const antiSlip = productStats.find((p) => p.productName === 'Anti-Slip Split Toe');
    expect(antiSlip).toBeDefined();
    expect(antiSlip!.quantity).toBe(1);
    expect(antiSlip!.revenue).toBe(40000);
    expect(antiSlip!.cost).toBe(20000); // 18k + 2k
    expect(antiSlip!.profit).toBe(20000);
  });

  it('3. Kontribusi Penjualan Antar Wilayah mencerminkan pembagian Pusat vs Jogja', () => {
    const regional = calculateRegionalSales(FIXTURE_ORDERS, {
      'reg-pusat': 'Pusat (Kota Depok)',
      'reg-jogja': 'Yogyakarta (DIY)',
    });

    expect(regional.length).toBe(2);

    const jogja = regional.find((r) => r.regionId === 'reg-jogja');
    const pusat = regional.find((r) => r.regionId === 'reg-pusat');

    expect(jogja!.netSales).toBe(63750);
    expect(pusat!.netSales).toBe(63000);

    // Persentase kontribusi: Jogja ~50.3%, Pusat ~49.7%
    expect(jogja!.percentageOfSales).toBeCloseTo(50.3, 1);
    expect(pusat!.percentageOfSales).toBeCloseTo(49.7, 1);
  });

  it('4. Rekap Pemakaian Promo mencatat frekuensi dan nominal diskon', () => {
    const promoStats = calculatePromoUsage(FIXTURE_ORDERS);

    expect(promoStats.length).toBe(2);
    expect(promoStats.find((p) => p.code === 'RESELLER2026')?.totalDiscountGiven).toBe(7000);
    expect(promoStats.find((p) => p.code === 'JOGJAISTIMEWA')?.totalDiscountGiven).toBe(11250);
  });

  it('5. Export CSV/Excel memuat semua metrik finansial dengan rapi', () => {
    const summary = calculateFinancialSummary(FIXTURE_ORDERS);
    const productSales = calculateProductSales(FIXTURE_ORDERS);
    const regionalBreakdown = calculateRegionalSales(FIXTURE_ORDERS);
    const promoUsage = calculatePromoUsage(FIXTURE_ORDERS);

    const csv = generateReportCsv({
      periodLabel: 'Oktober 2026',
      generatedAt: '24 Oktober 2026 18:00',
      generatedBy: 'Pak Dimas (Owner)',
      summary,
      productSales,
      regionalBreakdown,
      promoUsage,
    });

    expect(csv).toContain('LAPORAN KEUANGAN DAN PENJUALAN LUVIRA 2.0');
    expect(csv).toContain('Total Pesanan Lunas,2');
    expect(csv).toContain('Laba Kotor (Gross Profit)');
    expect(csv).toContain('Marjin Laba Kotor,44.77%');
    expect(csv).toContain('"Emboss Split Toe"');
  });
});
