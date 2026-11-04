// app/api/sheets/connect/route.ts
// ============================================================================
// Endpoint Menghubungkan Google Spreadsheet (FT-5, Asumsi F6)
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { Role, SheetScopeType } from '@prisma/client';
import { can } from '@/lib/permissions';
import { extractSpreadsheetId, verifySpreadsheetAccess } from '@/lib/integrations/sheets';
import { syncSpreadsheetConnection } from '@/lib/integrations/sheets-sync';
import { audit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Tidak terautentikasi.' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { url, label, autoSync = false } = body;

    if (!url || typeof url !== 'string') {
      return NextResponse.json(
        { error: 'Tautan (URL) atau ID Google Spreadsheet wajib diisi.' },
        { status: 400 }
      );
    }

    // 1. Ekstraksi ID Spreadsheet
    let spreadsheetId: string;
    try {
      spreadsheetId = extractSpreadsheetId(url);
    } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }

    // 2. Tentukan Cakupan (Scope) Berdasarkan Peran & Izin
    let scopeType: SheetScopeType;
    let scopeId: string | null = null;

    if (user.role === Role.OWNER) {
      if (!can(user, 'sheet:manage_global')) {
        return NextResponse.json({ error: 'Izin tidak memadai.' }, { status: 403 });
      }
      scopeType = SheetScopeType.GLOBAL;
      scopeId = 'ALL';
    } else if (user.role === Role.ADMIN_PUSAT || user.role === Role.ADMIN_WILAYAH) {
      if (!can(user, 'sheet:manage_own')) {
        return NextResponse.json({ error: 'Izin tidak memadai.' }, { status: 403 });
      }
      if (user.regionId) {
        scopeType = SheetScopeType.REGION;
        scopeId = user.regionId;
      } else {
        // Admin Pusat
        scopeType = SheetScopeType.GLOBAL;
        scopeId = 'ALL';
      }
    } else if (user.role === Role.RESELLER) {
      if (!can(user, 'sheet:manage_own', { userId: user.id })) {
        return NextResponse.json({ error: 'Izin tidak memadai.' }, { status: 403 });
      }
      scopeType = SheetScopeType.RESELLER;
      scopeId = user.id;
    } else {
      return NextResponse.json({ error: 'Peran Anda tidak diizinkan menghubungkan spreadsheet.' }, { status: 403 });
    }

    // 3. Verifikasi Akses Service Account ke Spreadsheet
    const accessCheck = await verifySpreadsheetAccess(spreadsheetId);
    if (!accessCheck.success) {
      return NextResponse.json({ error: accessCheck.error }, { status: 400 });
    }

    const spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
    const finalLabel = label || accessCheck.title || `Spreadsheet Luvira (${scopeType})`;

    // 4. Upsert Data Koneksi di Database Dev
    const existing = await prisma.sheetConnection.findFirst({
      where: {
        scopeType,
        scopeId,
      },
    });

    let connection;
    if (existing) {
      connection = await prisma.sheetConnection.update({
        where: { id: existing.id },
        data: {
          spreadsheetId,
          spreadsheetUrl,
          label: finalLabel,
          autoSync: Boolean(autoSync),
          createdBy: user.id,
        },
      });
    } else {
      connection = await prisma.sheetConnection.create({
        data: {
          scopeType,
          scopeId,
          spreadsheetId,
          spreadsheetUrl,
          label: finalLabel,
          autoSync: Boolean(autoSync),
          frequency: 'HARIAN',
          createdBy: user.id,
        },
      });
    }

    // 5. Catat Audit Log
    await audit({
      actor: { id: user.id, name: user.name, role: user.role },
      action: 'CONNECT_SPREADSHEET',
      entity: 'SheetConnection',
      entityId: connection.id,
      after: {
        scopeType,
        scopeId,
        spreadsheetId,
        autoSync,
      },
    });

    // 6. Jalankan Sinkronisasi Perdana Segera
    const syncResult = await syncSpreadsheetConnection(connection.id, user);

    return NextResponse.json({
      success: true,
      message: 'Google Spreadsheet berhasil terhubung dan disinkronkan.',
      connection: syncResult.connection || connection,
      syncResult,
    });
  } catch (error: any) {
    console.error('[Sheets Connect POST Error]', error);
    return NextResponse.json(
      { error: error.message || 'Terjadi kesalahan sistem saat menghubungkan spreadsheet.' },
      { status: 500 }
    );
  }
}
