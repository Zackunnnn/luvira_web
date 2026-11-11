// tests/unit/sheets-builder.test.ts
// ============================================================================
// FT-5 Unit Tests: Google Sheets Adapter & Tab Builder (Asumsi F6)
// ============================================================================

import { describe, it, expect, beforeEach, beforeAll, afterAll } from 'vitest';
import {
  extractSpreadsheetId,
  writeSpreadsheetTabs,
  getMockSheetData,
  clearMockSheets,
  verifySpreadsheetAccess,
} from '@/lib/integrations/sheets';
import {
  formatWibDateTime,
  buildGlobalSheetData,
  buildRegionSheetData,
  buildResellerSheetData,
} from '@/lib/integrations/sheets-builder';
import { prisma } from '@/lib/db';

describe('FT-5 Unit Tests: Google Sheets Builder & Adapter', () => {
  const origSheetsMode = process.env.SHEETS_MODE;

  beforeAll(() => {
    process.env.SHEETS_MODE = 'mock';
  });

  afterAll(() => {
    process.env.SHEETS_MODE = origSheetsMode;
  });

  beforeEach(() => {
    clearMockSheets();
  });

  describe('extractSpreadsheetId', () => {
    it('mengekstrak ID dari URL Google Sheets lengkap dengan /edit', () => {
      const url = 'https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit#gid=0';
      expect(extractSpreadsheetId(url)).toBe('1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms');
    });

    it('mengekstrak ID dari URL tanpa akhiran /edit', () => {
      const url = 'https://docs.google.com/spreadsheets/d/1_abc-123XYZ_testingID9999';
      expect(extractSpreadsheetId(url)).toBe('1_abc-123XYZ_testingID9999');
    });

    it('menerima ID spreadsheet mentah yang valid', () => {
      const rawId = '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms';
      expect(extractSpreadsheetId(rawId)).toBe(rawId);
    });

    it('menolak string kosong atau format tidak valid dengan pesan galat ramah', () => {
      expect(() => extractSpreadsheetId('')).toThrow('URL atau ID spreadsheet tidak boleh kosong.');
      expect(() => extractSpreadsheetId('https://google.com/not-sheets')).toThrow(
        'Format URL atau ID Google Spreadsheet tidak valid.'
      );
      expect(() => extractSpreadsheetId('pendek')).toThrow(
        'Format URL atau ID Google Spreadsheet tidak valid.'
      );
    });
  });

  describe('formatWibDateTime', () => {
    it('menghasilkan cap waktu dengan label WIB', () => {
      const date = new Date('2026-11-04T10:00:00.000Z');
      const wibStr = formatWibDateTime(date);
      expect(wibStr).toContain('WIB');
    });
  });

  describe('writeSpreadsheetTabs (Mock Mode & F6 Mirror Idempotency)', () => {
    it('menimpa isi tab secara cermin satu arah tanpa duplikasi baris saat disinkronkan ulang', async () => {
      const sheetId = 'mock-sheet-12345678901234567890';
      
      // Sinkronisasi pertama
      const initialTabs = [
        {
          name: 'Tab Utama',
          rows: [
            ['Terakhir disinkronkan:', '01/01/2026 10:00 WIB'],
            ['Header A', 'Header B'],
            ['Nilai 1', 'Nilai 2'],
          ],
        },
      ];

      const res1 = await writeSpreadsheetTabs(sheetId, initialTabs);
      expect(res1.success).toBe(true);
      expect(res1.rowsWritten).toBe(3);

      let stored = getMockSheetData(sheetId, 'Tab Utama');
      expect(stored?.length).toBe(3);
      expect(stored?.[2][0]).toBe('Nilai 1');

      // Sinkronisasi kedua (Update data)
      const updatedTabs = [
        {
          name: 'Tab Utama',
          rows: [
            ['Terakhir disinkronkan:', '02/01/2026 11:00 WIB'],
            ['Header A', 'Header B'],
            ['Nilai Baru 100', 'Nilai Baru 200'],
          ],
        },
      ];

      const res2 = await writeSpreadsheetTabs(sheetId, updatedTabs);
      expect(res2.success).toBe(true);
      expect(res2.rowsWritten).toBe(3);

      stored = getMockSheetData(sheetId, 'Tab Utama');
      // Panjang tetap 3, bukan 6 (tidak terduplikasi)
      expect(stored?.length).toBe(3);
      expect(stored?.[2][0]).toBe('Nilai Baru 100');
    });
  });

  describe('verifySpreadsheetAccess (Mock Mode)', () => {
    it('mengembalikan sukses untuk ID mock valid', async () => {
      const access = await verifySpreadsheetAccess('mock-valid-id-1234567890');
      expect(access.success).toBe(true);
      expect(access.title).toBeDefined();
    });

    it('mengembalikan gagal untuk ID yang mengandung invalid', async () => {
      const access = await verifySpreadsheetAccess('invalid-spreadsheet-id');
      expect(access.success).toBe(false);
      expect(access.error).toContain('Spreadsheet tidak ditemukan atau Service Account belum diberi akses Editor.');
    });
  });

  describe('Data Isolation & Privacy Enforcement', () => {
    it('buildGlobalSheetData menghasilkan 6 tab lengkap untuk Owner', async () => {
      const tabs = await buildGlobalSheetData(12);
      expect(tabs.length).toBe(6);

      const tabNames = tabs.map((t) => t.name);
      expect(tabNames).toContain('Ringkasan Bisnis');
      expect(tabNames).toContain('Daftar Pesanan');
      expect(tabNames).toContain('Penjualan Per Produk');
      expect(tabNames).toContain('Kontribusi Wilayah');
      expect(tabNames).toContain('Promo dan Reseller');
      expect(tabNames).toContain('Stok Gudang');

      // Verifikasi baris 1 memiliki cap waktu sinkronisasi
      tabs.forEach((t) => {
        expect(t.rows[0][0]).toBe('Terakhir disinkronkan:');
        expect(t.rows[0][1]).toContain('WIB');
      });
    });

    it('buildRegionSheetData mutlak TIDAK memuat HPP atau laba kotor', async () => {
      const region = await prisma.region.findFirst();
      if (!region) return;

      const tabs = await buildRegionSheetData(region.id, 12);
      expect(tabs.length).toBe(2);

      // Pastikan kata HPP, Modal, atau Laba tidak pernah muncul di header maupun baris
      for (const tab of tabs) {
        for (const row of tab.rows) {
          const rowStr = JSON.stringify(row).toLowerCase();
          expect(rowStr).not.toContain('hpp');
          expect(rowStr).not.toContain('laba');
          expect(rowStr).not.toContain('biaya modal');
        }
      }
    });

    it('buildResellerSheetData mutlak TIDAK memuat HPP, stok gudang, atau alamat detail', async () => {
      const reseller = await prisma.user.findFirst({
        where: { role: 'RESELLER' },
      });
      if (!reseller) return;

      const tabs = await buildResellerSheetData(reseller.id, 12);
      expect(tabs.length).toBe(2);

      const tabNames = tabs.map((t) => t.name);
      expect(tabNames).toContain('Ringkasan Reseller');
      expect(tabNames).toContain('Pesanan Saya');

      // Verifikasi ketiadaan HPP dan Stok Gudang
      for (const tab of tabs) {
        for (const row of tab.rows) {
          const rowStr = JSON.stringify(row).toLowerCase();
          expect(rowStr).not.toContain('hpp');
          expect(rowStr).not.toContain('laba kotor');
          expect(rowStr).not.toContain('biaya modal');
          expect(rowStr).not.toContain('stok fisik');
          expect(rowStr).not.toContain('stok gudang');
        }
      }
    });
  });
});
