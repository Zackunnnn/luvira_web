// app/api/sheets/connection/route.ts
// ============================================================================
// Endpoint Status & Detail Koneksi Google Spreadsheet (FT-5, Asumsi F6)
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { Role, SheetScopeType } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 });
    }

    const serviceAccountEmail =
      process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || 'luvira-sheets-sync@luvira-2.iam.gserviceaccount.com';

    const url = new URL(request.url);
    const viewAll = url.searchParams.get('all') === 'true';

    // 1. Owner & Developer dapat melihat daftar semua sambungan jika parameter ?all=true
    if (viewAll && (user.role === Role.OWNER || user.role === Role.DEVELOPER)) {
      const connections = await prisma.sheetConnection.findMany({
        include: {
          createdByUser: {
            select: { id: true, name: true, role: true, email: true },
          },
        },
        orderBy: { updatedAt: 'desc' },
      });

      return NextResponse.json({
        success: true,
        serviceAccountEmail,
        connections,
      });
    }

    // 2. Filter koneksi berdasarkan cakupan peran pengguna
    let connection = null;

    if (user.role === Role.OWNER || user.role === Role.DEVELOPER) {
      connection = await prisma.sheetConnection.findFirst({
        where: { scopeType: SheetScopeType.GLOBAL },
        include: {
          createdByUser: { select: { id: true, name: true, role: true } },
        },
        orderBy: { updatedAt: 'desc' },
      });
    } else if (user.role === Role.ADMIN_PUSAT || user.role === Role.ADMIN_WILAYAH) {
      if (user.regionId) {
        connection = await prisma.sheetConnection.findFirst({
          where: {
            scopeType: SheetScopeType.REGION,
            scopeId: user.regionId,
          },
          include: {
            createdByUser: { select: { id: true, name: true, role: true } },
          },
          orderBy: { updatedAt: 'desc' },
        });
      } else {
        // Admin Pusat tanpa regionId
        connection = await prisma.sheetConnection.findFirst({
          where: { scopeType: SheetScopeType.GLOBAL },
          include: {
            createdByUser: { select: { id: true, name: true, role: true } },
          },
          orderBy: { updatedAt: 'desc' },
        });
      }
    } else if (user.role === Role.RESELLER) {
      connection = await prisma.sheetConnection.findFirst({
        where: {
          scopeType: SheetScopeType.RESELLER,
          scopeId: user.id,
        },
        include: {
          createdByUser: { select: { id: true, name: true, role: true } },
        },
        orderBy: { updatedAt: 'desc' },
      });
    }

    return NextResponse.json({
      success: true,
      serviceAccountEmail,
      connection,
    });
  } catch (error: any) {
    console.error('[Sheets Connection GET Error]', error);
    return NextResponse.json({ error: 'Terjadi kesalahan sistem saat mengambil data koneksi.' }, { status: 500 });
  }
}
