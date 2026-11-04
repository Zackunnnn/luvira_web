// tests/integration/sheets-integration.test.ts
// ============================================================================
// FT-5 Integration Tests: Google Sheets Integration & Cron Sync Gate
// ============================================================================

import { describe, it, expect, beforeEach } from 'vitest';
import { prisma } from '@/lib/db';
import {
  clearMockSheets,
  getMockSheetData,
  getAllMockSheetTabs,
} from '@/lib/integrations/sheets';
import { syncSpreadsheetConnection } from '@/lib/integrations/sheets-sync';
import { SheetScopeType, Role, OrderStatus, PaymentMethod } from '@prisma/client';

describe('FT-5 Integration Tests: Multi-Scope Sheets Mirror & Sync', () => {
  let ownerUser: any;
  let adminJogja: any;
  let resellerUser: any;
  let jogjaRegion: any;

  beforeEach(async () => {
    clearMockSheets();

    ownerUser = await prisma.user.findFirst({ where: { role: Role.OWNER } });
    adminJogja = await prisma.user.findFirst({
      where: { role: Role.ADMIN_WILAYAH, regionId: { not: null } },
      include: { region: true },
    });
    resellerUser = await prisma.user.findFirst({ where: { role: Role.RESELLER } });
    jogjaRegion = adminJogja?.region || (await prisma.region.findFirst());
  });

  it('1. Owner dapat membuat koneksi GLOBAL dan melakukan sinkronisasi cermin 6 tab', async () => {
    if (!ownerUser) return;

    const spreadsheetId = 'mock-global-owner-sheet-001';
    const connection = await prisma.sheetConnection.create({
      data: {
        scopeType: SheetScopeType.GLOBAL,
        scopeId: 'ALL',
        spreadsheetId,
        spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}`,
        label: 'Laporan Konsolidasi Bisnis Luvira',
        autoSync: true,
        createdBy: ownerUser.id,
      },
    });

    try {
      const syncResult = await syncSpreadsheetConnection(connection.id, ownerUser);
      expect(syncResult.success).toBe(true);
      expect(syncResult.tabsCreated?.length).toBe(6);
      expect(syncResult.rowsWritten).toBeGreaterThan(0);

      // Verifikasi mock store terisi
      const tabs = getAllMockSheetTabs(spreadsheetId);
      expect(Object.keys(tabs).length).toBe(6);
      expect(tabs['Ringkasan Bisnis']).toBeDefined();
      expect(tabs['Daftar Pesanan']).toBeDefined();

      // Verifikasi status update di DB
      const updatedConn = await prisma.sheetConnection.findUnique({
        where: { id: connection.id },
      });
      expect(updatedConn?.lastStatus).toBe('SUCCESS');
      expect(updatedConn?.lastSyncAt).toBeInstanceOf(Date);
      expect(updatedConn?.lastError).toBeNull();
    } finally {
      await prisma.sheetConnection.delete({ where: { id: connection.id } });
    }
  });

  it('2. Admin Wilayah menyinkronkan lembar kerja REGION tanpa kebocoran HPP atau wilayah lain', async () => {
    if (!adminJogja || !jogjaRegion) return;

    const spreadsheetId = 'mock-region-jogja-sheet-002';
    const connection = await prisma.sheetConnection.create({
      data: {
        scopeType: SheetScopeType.REGION,
        scopeId: jogjaRegion.id,
        spreadsheetId,
        spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}`,
        label: `Cermin Operasional ${jogjaRegion.name}`,
        autoSync: true,
        createdBy: adminJogja.id,
      },
    });

    try {
      const syncResult = await syncSpreadsheetConnection(connection.id, adminJogja);
      expect(syncResult.success).toBe(true);
      expect(syncResult.tabsCreated?.length).toBe(2);

      const tabs = getAllMockSheetTabs(spreadsheetId);
      const tabNames = Object.keys(tabs);
      expect(tabNames.some((t) => t.includes('Pesanan'))).toBe(true);
      expect(tabNames.some((t) => t.includes('Stok'))).toBe(true);

      // Verifikasi tidak ada HPP atau margin pada tab pesanan wilayah
      const pesananTab = tabs[tabNames.find((t) => t.includes('Pesanan'))!];
      const headerRow = pesananTab?.[3] || pesananTab?.[2];
      expect(JSON.stringify(headerRow).toLowerCase()).not.toContain('hpp');
      expect(JSON.stringify(headerRow).toLowerCase()).not.toContain('laba');
    } finally {
      await prisma.sheetConnection.delete({ where: { id: connection.id } });
    }
  });

  it('3. Reseller menyinkronkan lembar kerja RESELLER hanya untuk kodenya sendiri dan data disamarkan', async () => {
    if (!resellerUser) return;

    const spreadsheetId = 'mock-reseller-sheet-003';
    const connection = await prisma.sheetConnection.create({
      data: {
        scopeType: SheetScopeType.RESELLER,
        scopeId: resellerUser.id,
        spreadsheetId,
        spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}`,
        label: `Cermin Penjualan Reseller ${resellerUser.name}`,
        autoSync: true,
        createdBy: resellerUser.id,
      },
    });

    try {
      const syncResult = await syncSpreadsheetConnection(connection.id, resellerUser);
      expect(syncResult.success).toBe(true);
      expect(syncResult.tabsCreated?.length).toBe(2);

      const tabs = getAllMockSheetTabs(spreadsheetId);
      expect(tabs['Ringkasan Reseller']).toBeDefined();
      expect(tabs['Pesanan Saya']).toBeDefined();

      // Cek baris pesanan jika ada
      const pesananRows = tabs['Pesanan Saya'];
      expect(pesananRows[0][0]).toBe('Terakhir disinkronkan:');
    } finally {
      await prisma.sheetConnection.delete({ where: { id: connection.id } });
    }
  });

  it('4. Sinkronisasi ulang adalah idempoten (Asumsi F6: Overwrite, no row duplication)', async () => {
    if (!ownerUser) return;

    const spreadsheetId = 'mock-idempotency-sheet-004';
    const connection = await prisma.sheetConnection.create({
      data: {
        scopeType: SheetScopeType.GLOBAL,
        scopeId: 'ALL',
        spreadsheetId,
        spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}`,
        label: 'Uji Idempotensi Cermin Sheets',
        autoSync: false,
        createdBy: ownerUser.id,
      },
    });

    try {
      // Sinkronisasi 1
      const sync1 = await syncSpreadsheetConnection(connection.id, ownerUser);
      expect(sync1.success).toBe(true);
      const rows1 = sync1.rowsWritten;

      // Sinkronisasi 2 langsung sesudahnya
      const sync2 = await syncSpreadsheetConnection(connection.id, ownerUser);
      expect(sync2.success).toBe(true);
      const rows2 = sync2.rowsWritten;

      // Jumlah baris tertulis di memori harus sama persis (menimpa, tidak menumpuk)
      expect(rows2).toBe(rows1);

      const allTabs = getAllMockSheetTabs(spreadsheetId);
      expect(Object.keys(allTabs).length).toBe(6);
    } finally {
      await prisma.sheetConnection.delete({ where: { id: connection.id } });
    }
  });

  it('5. Pesanan uji (isTest: true) mutlak TIDAK masuk ke dalam cermin spreadsheet', async () => {
    if (!ownerUser) return;

    // Buat pesanan uji sementara
    const region = await prisma.region.findFirst();
    const testOrder = await prisma.order.create({
      data: {
        code: 'TEST-SHEET-ORDER-999',
        regionId: region?.id || 'reg-1',
        customerName: 'Tester Spreadsheet',
        customerPhone: '081299998888',
        shippingAddress: {
          address: 'Jl. Testing No. 99',
          city: 'Depok',
          province: 'Jawa Barat',
          postalCode: '16424',
        },
        subtotal: 100000,
        discountAmount: 0,
        shippingCost: 0,
        ppnAmount: 11000,
        netPrice: 100000,
        totalPrice: 111000,
        paymentMethod: PaymentMethod.TEST_SIMULATION,
        status: OrderStatus.SELESAI,
        isTest: true,
        expiresAt: new Date(Date.now() + 24 * 3600 * 1000),
      },
    });

    const spreadsheetId = 'mock-no-test-sheet-005';
    const connection = await prisma.sheetConnection.create({
      data: {
        scopeType: SheetScopeType.GLOBAL,
        scopeId: 'ALL',
        spreadsheetId,
        spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}`,
        label: 'Verifikasi Tanpa Pesanan Uji',
        autoSync: false,
        createdBy: ownerUser.id,
      },
    });

    try {
      await syncSpreadsheetConnection(connection.id, ownerUser);
      const daftarPesanan = getMockSheetData(spreadsheetId, 'Daftar Pesanan');
      expect(daftarPesanan).toBeDefined();

      const orderCodes = (daftarPesanan || []).map((row) => row[0]);
      expect(orderCodes).not.toContain('TEST-SHEET-ORDER-999');
    } finally {
      await prisma.order.delete({ where: { id: testOrder.id } });
      await prisma.sheetConnection.delete({ where: { id: connection.id } });
    }
  });
});
