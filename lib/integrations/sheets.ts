// lib/integrations/sheets.ts
// ============================================================================
// Adapter Google Sheets Luvira 2.0 (FT-5, Asumsi F6)
// Mode: 'mock' (default dev/test) | 'google' (Live API v4 via googleapis)
// Cermin satu arah: Menimpa tab lembar kerja secara idempoten dalam satu batch.
// ============================================================================

import { google } from 'googleapis';

export interface SheetTabPayload {
  name: string;
  rows: any[][];
}

export interface SheetSyncResult {
  success: boolean;
  tabsCreated: string[];
  rowsWritten: number;
  spreadsheetTitle?: string;
  error?: string;
}

// In-Memory Mock Store untuk lingkungan test dan simulasi
const mockSheetsStore = new Map<string, Map<string, any[][]>>();
const mockSheetsMetadata = new Map<string, { title: string }>();

/**
 * Ekstraksi ID Spreadsheet dari URL Google Sheets atau ID mentah
 */
export function extractSpreadsheetId(urlOrId: string): string {
  if (!urlOrId || typeof urlOrId !== 'string') {
    throw new Error('URL atau ID spreadsheet tidak boleh kosong.');
  }

  const trimmed = urlOrId.trim();

  // Pola URL Google Sheets: https://docs.google.com/spreadsheets/d/<ID>/...
  const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match && match[1]) {
    return match[1];
  }

  // Jika berupa ID langsung (karakter alfanumerik panjang)
  if (/^[a-zA-Z0-9-_]{20,}$/.test(trimmed)) {
    return trimmed;
  }

  throw new Error('Format URL atau ID Google Spreadsheet tidak valid. Pastikan URL diawali https://docs.google.com/spreadsheets/d/...');
}

/**
 * Helper untuk verifikasi pengujian: Ambil baris dari tab mock
 */
export function getMockSheetData(spreadsheetId: string, tabName: string): any[][] | undefined {
  const tabs = mockSheetsStore.get(spreadsheetId);
  return tabs ? tabs.get(tabName) : undefined;
}

/**
 * Helper untuk verifikasi pengujian: Ambil seluruh tab dari mock
 */
export function getAllMockSheetTabs(spreadsheetId: string): Record<string, any[][]> {
  const tabs = mockSheetsStore.get(spreadsheetId);
  const result: Record<string, any[][]> = {};
  if (tabs) {
    tabs.forEach((rows, name) => {
      result[name] = rows;
    });
  }
  return result;
}

/**
 * Bersihkan data mock sheet (dipakai sebelum / sesudah tes)
 */
export function clearMockSheets(): void {
  mockSheetsStore.clear();
  mockSheetsMetadata.clear();
}

/**
 * Buat client Google Sheets API v4 resmi
 */
function getGoogleSheetsClient() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  let privateKey = process.env.GOOGLE_PRIVATE_KEY;

  if (!email || !privateKey) {
    throw new Error('Kredensial GOOGLE_SERVICE_ACCOUNT_EMAIL atau GOOGLE_PRIVATE_KEY belum dikonfigurasi di environment server.');
  }

  // Tangani karakter newline \n pada private key
  privateKey = privateKey.replace(/\\n/g, '\n');

  const auth = new google.auth.JWT({
    email,
    key: privateKey,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  return google.sheets({ version: 'v4', auth });
}

/**
 * Verifikasi akses ke Google Spreadsheet (apakah service account memiliki izin Editor)
 */
export async function verifySpreadsheetAccess(spreadsheetId: string): Promise<{
  success: boolean;
  title?: string;
  error?: string;
}> {
  const mode = process.env.SHEETS_MODE || 'mock';

  if (mode !== 'google') {
    // Mode Mock: Simulasi akses sukses jika ID bukan 'invalid-id'
    if (spreadsheetId.toLowerCase().includes('invalid')) {
      return {
        success: false,
        error: 'Spreadsheet tidak ditemukan atau Service Account belum diberi akses Editor.',
      };
    }
    const title = mockSheetsMetadata.get(spreadsheetId)?.title || 'Luvira 2.0 Mirror Spreadsheet [MOCK]';
    return { success: true, title };
  }

  try {
    const sheets = getGoogleSheetsClient();
    const response = await sheets.spreadsheets.get({
      spreadsheetId,
      fields: 'properties.title',
    });

    const title = response.data.properties?.title || 'Google Spreadsheet';
    return { success: true, title };
  } catch (err: any) {
    console.error('[Google Sheets Access Verification Error]', err);
    let errMsg = 'Gagal mengakses Google Spreadsheet.';
    if (err.code === 404) {
      errMsg = 'Spreadsheet tidak ditemukan. Periksa kembali ID atau tautan spreadsheet Anda.';
    } else if (err.code === 403) {
      const saEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || 'Service Account';
      errMsg = `Akses ditolak (403). Pastikan email Service Account (${saEmail}) telah ditambahkan sebagai Editor pada spreadsheet Anda.`;
    } else if (err.message) {
      errMsg = err.message;
    }
    return { success: false, error: errMsg };
  }
}

/**
 * Eksekusi Sinkronisasi Cermin Satu Arah (F6)
 * Menimpa tab lembar kerja secara idempoten dan dalam satu batch.
 */
export async function writeSpreadsheetTabs(
  spreadsheetId: string,
  tabs: SheetTabPayload[]
): Promise<SheetSyncResult> {
  const mode = process.env.SHEETS_MODE || 'mock';

  if (mode !== 'google') {
    // Mode Mock: Simpan langsung ke memori
    let sheetTabs = mockSheetsStore.get(spreadsheetId);
    if (!sheetTabs) {
      sheetTabs = new Map<string, any[][]>();
      mockSheetsStore.set(spreadsheetId, sheetTabs);
    }

    let rowsWritten = 0;
    const tabsCreated: string[] = [];

    for (const tab of tabs) {
      // Overwrite tab (cermin satu arah: hapus lalu tulis baru)
      sheetTabs.set(tab.name, tab.rows);
      tabsCreated.push(tab.name);
      rowsWritten += tab.rows.length;
    }

    if (!mockSheetsMetadata.has(spreadsheetId)) {
      mockSheetsMetadata.set(spreadsheetId, { title: 'Luvira 2.0 Mirror Spreadsheet [MOCK]' });
    }

    return {
      success: true,
      tabsCreated,
      rowsWritten,
      spreadsheetTitle: mockSheetsMetadata.get(spreadsheetId)?.title,
    };
  }

  // Mode Google Live API v4
  try {
    const sheets = getGoogleSheetsClient();

    // 1. Ambil metadata spreadsheet saat ini untuk melihat tab yang sudah ada
    const meta = await sheets.spreadsheets.get({
      spreadsheetId,
      fields: 'properties.title,sheets.properties',
    });

    const spreadsheetTitle = meta.data.properties?.title || 'Google Spreadsheet';
    const existingSheets = meta.data.sheets || [];
    const existingSheetMap = new Map<string, number>();

    existingSheets.forEach((s) => {
      if (s.properties?.title && s.properties.sheetId !== undefined && s.properties.sheetId !== null) {
        existingSheetMap.set(s.properties.title, s.properties.sheetId);
      }
    });

    // 2. Buat tab baru jika belum ada
    const addSheetRequests: any[] = [];
    for (const tab of tabs) {
      if (!existingSheetMap.has(tab.name)) {
        addSheetRequests.push({
          addSheet: {
            properties: {
              title: tab.name,
              gridProperties: {
                rowCount: Math.max(100, tab.rows.length + 20),
                columnCount: Math.max(15, tab.rows[0]?.length || 10),
              },
            },
          },
        });
      }
    }

    if (addSheetRequests.length > 0) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: { requests: addSheetRequests },
      });

      // Refresh list sheet setelah penambahan
      const updatedMeta = await sheets.spreadsheets.get({
        spreadsheetId,
        fields: 'sheets.properties',
      });
      (updatedMeta.data.sheets || []).forEach((s) => {
        if (s.properties?.title && s.properties.sheetId !== undefined && s.properties.sheetId !== null) {
          existingSheetMap.set(s.properties.title, s.properties.sheetId);
        }
      });
    }

    // 3. Bersihkan konten lama setiap tab (Clear)
    for (const tab of tabs) {
      try {
        await sheets.spreadsheets.values.clear({
          spreadsheetId,
          range: `'${tab.name}'!A1:ZZ5000`,
        });
      } catch (clearErr) {
        console.warn(`[Clear Tab Warning] ${tab.name}:`, clearErr);
      }
    }

    // 4. Tulis data baru secara Batch Update (F6: idempoten & menimpa)
    const updateData = tabs.map((tab) => ({
      range: `'${tab.name}'!A1`,
      values: tab.rows,
    }));

    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId,
      requestBody: {
        valueInputOption: 'USER_ENTERED',
        data: updateData,
      },
    });

    const tabsCreated = tabs.map((t) => t.name);
    const rowsWritten = tabs.reduce((acc, t) => acc + t.rows.length, 0);

    return {
      success: true,
      tabsCreated,
      rowsWritten,
      spreadsheetTitle,
    };
  } catch (err: any) {
    console.error('[Google Sheets Write Batch Error]', err);
    return {
      success: false,
      tabsCreated: [],
      rowsWritten: 0,
      error: err.message || 'Gagal menyinkronkan data ke Google Spreadsheet.',
    };
  }
}
