// app/api/changelog/route.ts
// ============================================================================
// API Log Perubahan & Audit Trail LuviBot (Model A) - Immutable
// Sesuai docs/LUVIRA_2_PLAN.md & SOP Akses LuviBot
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { can } from '@/lib/permissions';
import { Role } from '@prisma/client';
import { recordLuviChangeLog } from '@/lib/changelog';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 });
    }

    if (!can(user, 'changelog:view')) {
      return NextResponse.json({ error: 'Akses ditolak: Anda tidak memiliki izin melihat log perubahan.' }, { status: 403 });
    }

    // Ambil log perubahan LuviBot (Model A) terbaru
    const luviLogs = await prisma.luviChangeLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return NextResponse.json({
      success: true,
      logs: luviLogs,
    });
  } catch (error: any) {
    console.error('[API Changelog GET Error]', error);
    return NextResponse.json({ error: error.message || 'Gagal memuat log perubahan' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 });
    }

    if (!can(user, 'changelog:create') && user.role !== Role.OWNER && user.role !== Role.LUVIBOT) {
      return NextResponse.json({ error: 'Akses ditolak: Tidak memiliki wewenang menulis log perubahan.' }, { status: 403 });
    }

    const body = await request.json();
    const {
      draftId,
      requestedBy,
      approvedBy,
      approvalTimeWib,
      targetType,
      targetId,
      targetName,
      fieldChanged,
      oldValue,
      newValue,
      verificationResult,
      verificationProof,
      status,
      rollbackTo,
    } = body;

    if (!draftId || !targetId || !fieldChanged) {
      return NextResponse.json({ error: 'Data draf tidak lengkap (ID Draf, Target, dan Field wajib ada).' }, { status: 400 });
    }

    const log = await recordLuviChangeLog({
      draftId,
      requestedBy: requestedBy || 'Awan',
      approvedBy: approvedBy || 'Awan',
      approvalTimeWib,
      executedBy: user.email || user.name || 'LuviBot',
      targetType: targetType || 'PRODUCT',
      targetId,
      targetName: targetName || 'Item',
      fieldChanged,
      oldValue: String(oldValue ?? ''),
      newValue: String(newValue ?? ''),
      verificationResult: verificationResult || 'LOLOS',
      verificationProof,
      status: status || 'BERHASIL',
      rollbackTo,
    });

    return NextResponse.json({
      success: true,
      message: `Log perubahan ${log.logCode} berhasil dicatat di sistem.`,
      log,
    });
  } catch (error: any) {
    console.error('[API Changelog POST Error]', error);
    return NextResponse.json({ error: error.message || 'Gagal mencatat log perubahan' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 });
    }

    // Role LUVIBOT MUTLAK DITOLAK menghapus log
    if (user.role === Role.LUVIBOT) {
      return NextResponse.json(
        { error: 'Akses ditolak: Log perubahan bersifat immutable dan DILARANG KERAS dihapus oleh role LUVIBOT.' },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: 'Operasi penghapusan log perubahan dinonaktifkan permanen demi kepatuhan audit sistem.' },
      { status: 403 }
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Gagal memproses permintaan' }, { status: 500 });
  }
}
