// app/api/reports/subscriptions/send-now/route.ts
// ============================================================================
// Endpoint Pengiriman Laporan WhatsApp Instan ("Kirim Sekarang") (FT-6)
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { ReportType } from '@prisma/client';
import { generateWaReport } from '@/lib/reports/wa-report-generator';
import { enqueueWhatsAppNotification } from '@/lib/notify/queue';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const {
      reportType = ReportType.RINGKAS_HARIAN,
      includeSheetLink = false,
      includeFile = false,
    } = body;

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { id: true, name: true, phone: true, role: true },
    });

    if (!dbUser?.phone) {
      return NextResponse.json(
        { error: 'Nomor WhatsApp belum terdaftar di profil Anda. Silakan atur nomor HP terlebih dahulu.' },
        { status: 400 }
      );
    }

    // Bangun pesan laporan
    const origin = request.nextUrl.origin;
    const reportData = await generateWaReport({
      userId: user.id,
      reportType,
      includeSheetLink: Boolean(includeSheetLink),
      includeFile: Boolean(includeFile),
      baseUrl: origin,
    });

    // Enqueue ke WaOutbox
    const idempotencyKey = `MANUAL_REPORT_${user.id}_${Date.now()}`;
    const enqueueResult = await enqueueWhatsAppNotification({
      target: dbUser.phone,
      message: reportData.message,
      relatedType: 'REPORT',
      relatedId: user.id,
      idempotencyKey,
    });

    if (!enqueueResult.success) {
      return NextResponse.json(
        { error: enqueueResult.error || 'Gagal memasukkan laporan ke antrean WhatsApp.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Laporan ${reportData.periodLabel} berhasil dikirim ke antrean WhatsApp (${dbUser.phone}).`,
      outboxId: enqueueResult.outboxId,
      preview: reportData.message,
    });
  } catch (error: any) {
    console.error('[Send Now Report Error]', error);
    return NextResponse.json({ error: error.message || 'Terjadi kesalahan sistem' }, { status: 500 });
  }
}

