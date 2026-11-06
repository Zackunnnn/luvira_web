// app/api/cron/reports/route.ts
// ============================================================================
// Cron Endpoint: WhatsApp Report Subscriptions Dispatcher (FT-6, Asumsi F9)
// Dilindungi CRON_SECRET (Dipanggil setiap ~15 menit oleh external cron)
// Menghitung langganan yang jatuh tempo menurut zona waktu Asia/Jakarta (WIB)
// Kunci idempoten (subscriptionId + periodKey) mencegah pengiriman ganda.
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { isSubscriptionDue } from '@/lib/reports/report-scheduler';
import { generateWaReport } from '@/lib/reports/wa-report-generator';
import { enqueueWhatsAppNotification } from '@/lib/notify/queue';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  return handleReportsCron(request);
}

export async function POST(request: NextRequest) {
  return handleReportsCron(request);
}

async function handleReportsCron(request: NextRequest) {
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

    const now = new Date();
    const origin = request.nextUrl.origin;

    // 2. Ambil semua langganan aktif
    const subscriptions = await prisma.reportSubscription.findMany({
      where: { isActive: true },
      include: {
        user: { select: { id: true, name: true, phone: true, role: true } },
      },
    });

    let enqueuedCount = 0;
    let skippedCount = 0;
    const details: Array<{
      subscriptionId: string;
      userId: string;
      userName: string;
      status: string;
      reason?: string;
    }> = [];

    // 3. Evaluasi & Proses Setiap Langganan
    for (const sub of subscriptions) {
      if (!sub.user.phone) {
        skippedCount++;
        details.push({
          subscriptionId: sub.id,
          userId: sub.userId,
          userName: sub.user.name,
          status: 'SKIPPED',
          reason: 'Nomor WhatsApp pengguna belum terdaftar.',
        });
        continue;
      }

      const dueCheck = isSubscriptionDue(sub, now);
      if (!dueCheck.isDue) {
        skippedCount++;
        details.push({
          subscriptionId: sub.id,
          userId: sub.userId,
          userName: sub.user.name,
          status: 'NOT_DUE',
          reason: dueCheck.reason,
        });
        continue;
      }

      try {
        // Bangkitkan Laporan
        const report = await generateWaReport({
          userId: sub.userId,
          reportType: sub.reportType,
          includeSheetLink: sub.includeSheetLink,
          includeFile: sub.includeFile,
          baseUrl: origin,
          targetDate: now,
        });

        // Kunci idempoten: Mencegah duplikasi jika cron dipanggil ganda
        const idempotencyKey = `SUB_${sub.id}_${dueCheck.periodKey}`;

        const enqueueResult = await enqueueWhatsAppNotification({
          target: sub.user.phone,
          message: report.message,
          relatedType: 'REPORT_SUBSCRIPTION',
          relatedId: sub.id,
          idempotencyKey,
        });

        if (enqueueResult.success) {
          enqueuedCount++;
          // Update lastSentPeriodKey
          await prisma.reportSubscription.update({
            where: { id: sub.id },
            data: { lastSentPeriodKey: dueCheck.periodKey },
          });

          details.push({
            subscriptionId: sub.id,
            userId: sub.userId,
            userName: sub.user.name,
            status: 'ENQUEUED',
          });
        } else {
          skippedCount++;
          details.push({
            subscriptionId: sub.id,
            userId: sub.userId,
            userName: sub.user.name,
            status: 'FAILED_TO_ENQUEUE',
            reason: enqueueResult.error,
          });
        }
      } catch (err: any) {
        console.error(`[Error generating report for sub ${sub.id}]:`, err);
        skippedCount++;
        details.push({
          subscriptionId: sub.id,
          userId: sub.userId,
          userName: sub.user.name,
          status: 'ERROR',
          reason: err.message,
        });
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: now.toISOString(),
      totalSubscriptions: subscriptions.length,
      enqueuedCount,
      skippedCount,
      details,
    });
  } catch (error: any) {
    console.error('[Cron Reports Error]', error);
    return NextResponse.json(
      { error: error.message || 'Terjadi kesalahan sistem pada cron laporan.' },
      { status: 500 }
    );
  }
}

