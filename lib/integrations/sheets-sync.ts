// lib/integrations/sheets-sync.ts
// ============================================================================
// Engine Sinkronisasi Google Sheets Luvira 2.0 (FT-5, Asumsi F6)
// Mengorkestrasi pembacaan data terisolasi, penulisan cermin satu arah,
// dan pembaruan status serta pencatatan audit log.
// ============================================================================

import { prisma } from '@/lib/db';
import { audit } from '@/lib/audit';
import { writeSpreadsheetTabs, SheetTabPayload } from './sheets';
import {
  buildGlobalSheetData,
  buildRegionSheetData,
  buildResellerSheetData,
} from './sheets-builder';
import { SheetScopeType } from '@prisma/client';

export async function syncSpreadsheetConnection(connectionId: string, actor?: any) {
  const connection = await prisma.sheetConnection.findUnique({
    where: { id: connectionId },
    include: { createdByUser: { select: { id: true, name: true, role: true } } },
  });

  if (!connection) {
    throw new Error(`Koneksi spreadsheet dengan ID ${connectionId} tidak ditemukan.`);
  }

  try {
    let tabs: SheetTabPayload[] = [];

    // 1. Bangun Payload Tab Berdasarkan Scope
    if (connection.scopeType === SheetScopeType.GLOBAL) {
      tabs = await buildGlobalSheetData(12);
    } else if (connection.scopeType === SheetScopeType.REGION) {
      if (!connection.scopeId) {
        throw new Error('Koneksi REGION tidak memiliki target scopeId wilayah yang valid.');
      }
      tabs = await buildRegionSheetData(connection.scopeId, 12);
    } else if (connection.scopeType === SheetScopeType.RESELLER) {
      if (!connection.scopeId) {
        throw new Error('Koneksi RESELLER tidak memiliki target scopeId reseller yang valid.');
      }
      tabs = await buildResellerSheetData(connection.scopeId, 12);
    } else {
      throw new Error(`Scope type ${connection.scopeType} tidak didukung.`);
    }

    // 2. Tulis Batch ke Spreadsheet (Overwrite / Mirror)
    const writeResult = await writeSpreadsheetTabs(connection.spreadsheetId, tabs);

    if (!writeResult.success) {
      throw new Error(writeResult.error || 'Gagal menulis data ke spreadsheet.');
    }

    const now = new Date();

    // 3. Update Status Koneksi
    const updated = await prisma.sheetConnection.update({
      where: { id: connection.id },
      data: {
        lastSyncAt: now,
        lastStatus: 'SUCCESS',
        lastError: null,
      },
    });

    // 4. Catat Audit Log
    await audit({
      actor: actor || {
        id: connection.createdByUser.id,
        name: connection.createdByUser.name,
        role: connection.createdByUser.role,
      },
      action: 'SYNC_SPREADSHEET',
      entity: 'SheetConnection',
      entityId: connection.id,
      after: {
        scopeType: connection.scopeType,
        scopeId: connection.scopeId,
        spreadsheetId: connection.spreadsheetId,
        tabsCount: tabs.length,
        rowsWritten: writeResult.rowsWritten,
        syncedAt: now,
      },
    });

    return {
      success: true,
      connection: updated,
      tabsCreated: writeResult.tabsCreated,
      rowsWritten: writeResult.rowsWritten,
      spreadsheetTitle: writeResult.spreadsheetTitle,
    };
  } catch (error: any) {
    console.error(`[Spreadsheet Sync Error for ${connection.id}]:`, error);

    // Update status gagal pada database
    await prisma.sheetConnection.update({
      where: { id: connection.id },
      data: {
        lastStatus: 'FAILED',
        lastError: error.message || 'Terjadi kesalahan sistem saat sinkronisasi.',
      },
    });

    return {
      success: false,
      error: error.message || 'Gagal menyinkronkan spreadsheet.',
    };
  }
}

