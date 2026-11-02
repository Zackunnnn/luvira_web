// app/api/cron/wa-dispatch/route.ts
// ============================================================================
// Cron Endpoint: WhatsApp Outbox Queue Dispatcher (FT-1)
// Dilindungi CRON_SECRET (hPanel Cron Jobs / External Ping)
// Memproses antrean WaOutbox secara terkontrol dengan jeda dan batas harian
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { dispatchWaQueue } from '@/lib/notify/queue';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  return handleDispatch(request);
}

export async function POST(request: NextRequest) {
  return handleDispatch(request);
}

async function handleDispatch(request: NextRequest) {
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

    // 2. Baca parameter opsional
    const limit = parseInt(request.nextUrl.searchParams.get('limit') || '20', 10);

    // 3. Eksekusi pengiriman antrean
    const result = await dispatchWaQueue({ limit });

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      ...result,
    });
  } catch (error: any) {
    console.error('[API Cron WA Dispatch Error]', error);
    return NextResponse.json(
      { error: error.message || 'Gagal memproses antrean WhatsApp' },
      { status: 500 }
    );
  }
}

