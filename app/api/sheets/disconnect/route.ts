// app/api/sheets/disconnect/route.ts
// ============================================================================
// Endpoint Memutuskan Sambungan Google Spreadsheet (FT-5, Asumsi F6)
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { Role, SheetScopeType } from '@prisma/client';
import { audit } from '@/lib/audit';

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
      return NextResponse.json({ error: 'Koneksi spreadsheet tidak ditemukan.' }, { status: 404 });
    }

    // Validasi izin putus sambungan
    if (user.role === Role.OWNER || user.role === Role.DEVELOPER) {
      // Owner/Developer boleh
    } else if (user.role === Role.ADMIN_PUSAT || user.role === Role.ADMIN_WILAYAH) {
      if (connection.scopeType === SheetScopeType.REGION && connection.scopeId !== user.regionId && user.regionId) {
        return NextResponse.json({ error: 'Akses ditolak.' }, { status: 403 });
      }
    } else if (user.role === Role.RESELLER) {
      if (connection.scopeType !== SheetScopeType.RESELLER || connection.scopeId !== user.id) {
        return NextResponse.json({ error: 'Akses ditolak.' }, { status: 403 });
      }
    }

    // Hapus koneksi
    await prisma.sheetConnection.delete({
      where: { id: connection.id },
    });

    // Catat audit
    await audit({
      actor: { id: user.id, name: user.name, role: user.role },
      action: 'DISCONNECT_SPREADSHEET',
      entity: 'SheetConnection',
      entityId: connection.id,
      before: {
        scopeType: connection.scopeType,
        spreadsheetId: connection.spreadsheetId,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Sambungan Google Spreadsheet berhasil diputuskan.',
    });
  } catch (error: any) {
    console.error('[Sheets Disconnect POST Error]', error);
    return NextResponse.json(
      { error: error.message || 'Terjadi kesalahan sistem saat memutuskan spreadsheet.' },
      { status: 500 }
    );
  }
}
