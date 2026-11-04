// app/api/sheets/sync/route.ts
// ============================================================================
// Endpoint Sinkronisasi Manual Google Spreadsheet (FT-5, Asumsi F6)
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { Role, SheetScopeType } from '@prisma/client';
import { syncSpreadsheetConnection } from '@/lib/integrations/sheets-sync';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Tidak terautentikasi.' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { connectionId } = body;

    let connection;

    if (connectionId) {
      connection = await prisma.sheetConnection.findUnique({
        where: { id: connectionId },
      });
    } else {
      // Cari koneksi berdasarkan scope user
      if (user.role === Role.OWNER || user.role === Role.DEVELOPER) {
        connection = await prisma.sheetConnection.findFirst({
          where: { scopeType: SheetScopeType.GLOBAL },
        });
      } else if (user.role === Role.ADMIN_PUSAT || user.role === Role.ADMIN_WILAYAH) {
        if (user.regionId) {
          connection = await prisma.sheetConnection.findFirst({
            where: { scopeType: SheetScopeType.REGION, scopeId: user.regionId },
          });
        } else {
          connection = await prisma.sheetConnection.findFirst({
            where: { scopeType: SheetScopeType.GLOBAL },
          });
        }
      } else if (user.role === Role.RESELLER) {
        connection = await prisma.sheetConnection.findFirst({
          where: { scopeType: SheetScopeType.RESELLER, scopeId: user.id },
        });
      }
    }

    if (!connection) {
      return NextResponse.json(
        { error: 'Koneksi Google Spreadsheet belum ditemukan. Silakan hubungkan terlebih dahulu.' },
        { status: 404 }
      );
    }

    // Validasi Otorisasi
    if (user.role === Role.OWNER || user.role === Role.DEVELOPER) {
      // Owner/Developer boleh sync
    } else if (user.role === Role.ADMIN_PUSAT || user.role === Role.ADMIN_WILAYAH) {
      if (connection.scopeType === SheetScopeType.REGION && connection.scopeId !== user.regionId && user.regionId) {
        return NextResponse.json({ error: 'Anda hanya dapat menyinkronkan spreadsheet wilayah Anda sendiri.' }, { status: 403 });
      }
    } else if (user.role === Role.RESELLER) {
      if (connection.scopeType !== SheetScopeType.RESELLER || connection.scopeId !== user.id) {
        return NextResponse.json({ error: 'Anda hanya dapat menyinkronkan spreadsheet Anda sendiri.' }, { status: 403 });
      }
    }

    // Jalankan Sinkronisasi
    const result = await syncSpreadsheetConnection(connection.id, user);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Gagal menyinkronkan lembar kerja Google Sheets.' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Sinkronisasi lembar kerja Google Sheets berhasil diselesaikan.',
      data: result,
    });
  } catch (error: any) {
    console.error('[Sheets Sync POST Error]', error);
    return NextResponse.json(
      { error: error.message || 'Terjadi kesalahan sistem saat sinkronisasi.' },
      { status: 500 }
    );
  }
}
