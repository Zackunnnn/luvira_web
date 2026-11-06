// tests/integration/wa-reports-integration.test.ts
// ============================================================================
// FT-6 Integration Tests: WhatsApp Reports Engine, Role Isolation, & Cron Gate
// ============================================================================

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { prisma } from '@/lib/db';
import { generateWaReport, generateReportCsvContent } from '@/lib/reports/wa-report-generator';
import { createReportDownloadToken, consumeReportDownloadToken } from '@/lib/reports/report-token';
import { Role, ReportType, OrderStatus, PaymentMethod } from '@prisma/client';

describe('FT-6 Integration Tests: WA Reports Generation & Role Isolation', () => {
  let ownerUser: any;
  let adminJogja: any;
  let resellerUser: any;
  let jogjaRegion: any;
  let testOrder: any;

  beforeEach(async () => {
    ownerUser = await prisma.user.findFirst({ where: { role: Role.OWNER } });
    adminJogja = await prisma.user.findFirst({
      where: { role: Role.ADMIN_WILAYAH, regionId: { not: null } },
      include: { region: true },
    });
    resellerUser = await prisma.user.findFirst({ where: { role: Role.RESELLER } });
    jogjaRegion = adminJogja?.region || (await prisma.region.findFirst());

    // Buat pesanan uji bertanda isTest: true untuk memastikan pesanan uji tidak bocor
    testOrder = await prisma.order.create({
      data: {
        code: `TEST-LEAK-ORDER-${Date.now()}`,
        regionId: jogjaRegion.id,
        customerName: 'Tester Bocor',
        customerPhone: '081299990000',
        shippingAddress: { address: 'Jl. Uji No. 1', city: 'Yogyakarta', province: 'DIY' },
        subtotal: 500000,
        discountAmount: 0,
        shippingCost: 0,
        ppnAmount: 55000,
        netPrice: 500000,
        totalPrice: 555000,
        paymentMethod: PaymentMethod.TEST_SIMULATION,
        status: OrderStatus.SELESAI,
        isTest: true,
        expiresAt: new Date(Date.now() + 24 * 3600 * 1000),
      },
    });
  });

  afterEach(async () => {
    if (testOrder) {
      await prisma.order.deleteMany({ where: { id: testOrder.id } });
    }
  });

  it('1. Owner menerima laporan seluruh bisnis termasuk HPP & Laba Kotor; pesanan uji tidak masuk', async () => {
    if (!ownerUser) return;

    const report = await generateWaReport({
      userId: ownerUser.id,
      reportType: ReportType.RINGKAS_HARIAN,
      includeSheetLink: true,
      includeFile: true,
      baseUrl: 'http://localhost:3000',
    });

    expect(report.message).toContain('LAPORAN EKSEKUTIF LUVIRA 2.0');
    expect(report.message).toContain('Laba Kotor Bisnis');
    expect(report.message).toContain('Total HPP & Modal');
    expect(report.message).toContain('Omzet Bersih');

    // Pesanan uji tidak masuk dalam penghitungan atau teks
    expect(report.message).not.toContain(testOrder.code);

    // Memuat tautan unduhan bertoken
    expect(report.downloadUrl).toBeDefined();
    expect(report.downloadUrl).toContain('/api/reports/dl/');
    expect(report.token).toBeDefined();
  });

  it('2. Admin Wilayah menerima laporan operasional wilayahnya; MUTLAK TANPA HPP & TANPA LABA', async () => {
    if (!adminJogja) return;

    const report = await generateWaReport({
      userId: adminJogja.id,
      reportType: ReportType.RINGKAS_HARIAN,
      includeSheetLink: true,
      includeFile: false,
    });

    expect(report.message).toContain('LAPORAN OPERASIONAL ADMIN LUVIRA');
    expect(report.message).toContain(adminJogja.region?.name || 'Gudang');

    // Mutlak tidak ada istilah HPP, Modal, atau Laba Kotor
    const lowerMsg = report.message.toLowerCase();
    expect(lowerMsg).not.toContain('hpp');
    expect(lowerMsg).not.toContain('laba kotor');
    expect(lowerMsg).not.toContain('biaya modal');
  });

  it('3. Reseller menerima laporan kinerja kodenya; MUTLAK TANPA HPP, STOK GUDANG, ATAU ALAMAT PELANGGAN', async () => {
    if (!resellerUser) return;

    const report = await generateWaReport({
      userId: resellerUser.id,
      reportType: ReportType.RINGKAS_HARIAN,
      includeSheetLink: true,
      includeFile: false,
    });

    expect(report.message).toContain('RINGKASAN PENJUALAN RESELLER LUVIRA');
    expect(report.message).toContain(resellerUser.name);

    // Mutlak tidak ada HPP, stok gudang fisik, atau alamat pelanggan
    const lowerMsg = report.message.toLowerCase();
    expect(lowerMsg).not.toContain('hpp');
    expect(lowerMsg).not.toContain('laba kotor');
    expect(lowerMsg).not.toContain('stok fisik');
    expect(lowerMsg).not.toContain('stok gudang');
    expect(lowerMsg).toContain('data pelanggan disamarkan');
  });

  it('4. Download Token dapat dikonsumsi untuk membangkitkan CSV dan menjadi kedaluwarsa setelah dipakai', async () => {
    if (!ownerUser) return;

    const token = createReportDownloadToken({
      userId: ownerUser.id,
      scopeType: 'GLOBAL',
      reportType: ReportType.RINGKAS_HARIAN,
    });

    // Konsumsi token pertama kali
    const tokenData = consumeReportDownloadToken(token);
    expect(tokenData).not.toBeNull();
    expect(tokenData?.userId).toBe(ownerUser.id);

    // Bangkitkan CSV
    const csv = await generateReportCsvContent(tokenData!);
    expect(csv).toContain('LAPORAN PENJUALAN LUVIRA 2.0');
    expect(csv).toContain('Kode Pesanan');
    // Pesanan uji tidak masuk
    expect(csv).not.toContain(testOrder.code);

    // Konsumsi kedua kali harus ditolak (sekali pakai)
    const tokenData2 = consumeReportDownloadToken(token);
    expect(tokenData2).toBeNull();
  });
});

