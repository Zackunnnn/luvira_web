// app/api/cron/sheets-sync/route.ts
// ============================================================================
// Cron Endpoint: Google Sheets Auto-Sync Runner (FT-5, Asumsi F6)
// Dilindungi CRON_SECRET (hPanel Cron Jobs / Cloud Scheduler)
// Menjalankan sinkronisasi cermin satu arah untuk koneksi yang berstatus autoSync
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { syncSpreadsheetConnection } from '@/lib/integrations/sheets-sync';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  return handleSheetsCron(request);
}

export async function POST(request: NextRequest) {
  return handleSheetsCron(request);
}

async function handleSheetsCron(request: NextRequest) {
  try {
    // 1. Verifikasi Kunci Rahasia Cron
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET || 'dev-cron-secret-123';
    const querySecret = request.nextUrl.searchParams.get('secret');
    const token = authHeader?.replace('Bearer ', '') || querySecret;
    const headerSecret = request.headers.get('x-cron-secret');

    if (token !== cronSecret && headerSecret !== cronSecret) {
      return NextResponse.json(
        { error: 'Unauthorized: Invalid cron secret' },
        { status: 401 }
      );
    }

    // 2. Ambil Semua Sambungan yang Mengaktifkan Auto-Sync
    const connections = await prisma.sheetConnection.findMany({
      where: { autoSync: true },
    });

    const results: Array<{
      id: string;
      scopeType: string;
      spreadsheetId: string;
      success: boolean;
      rowsWritten?: number;
      error?: string;
    }> = [];

    let successCount = 0;
    let failureCount = 0;

    const cronActor = {
      id: 'SYSTEM_CRON',
      name: 'Cron Google Sheets Sync',
      role: 'SYSTEM',
    };

    // 3. Proses Setiap Sambungan
    for (const conn of connections) {
      try {
        const syncRes = await syncSpreadsheetConnection(conn.id, cronActor);
        if (syncRes.success) {
          successCount++;
          results.push({
            id: conn.id,
            scopeType: conn.scopeType,
            spreadsheetId: conn.spreadsheetId,
            success: true,
            rowsWritten: syncRes.rowsWritten,
          });
        } else {
          failureCount++;
          results.push({
            id: conn.id,
            scopeType: conn.scopeType,
            spreadsheetId: conn.spreadsheetId,
            success: false,
            error: syncRes.error,
          });
        }
      } catch (err: any) {
        failureCount++;
        results.push({
          id: conn.id,
          scopeType: conn.scopeType,
          spreadsheetId: conn.spreadsheetId,
          success: false,
          error: err.message,
        });
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      totalConnections: connections.length,
      syncedCount: successCount,
      failedCount: failureCount,
      results,
    });
  } catch (error: any) {
    console.error('[Cron Sheets Sync Error]', error);
    return NextResponse.json(
      { error: error.message || 'Terjadi kesalahan sistem saat cron sinkronisasi sheets.' },
      { status: 500 }
    );
  }
}

