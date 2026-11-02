// app/api/webhooks/fonnte/route.ts
// ============================================================================
// Webhook Callback Status Pesan Fonnte (FT-1)
// Menerima update status pesan (delivered, read, failed) dari Fonnte
// Dilindungi rahasia webhook pada URL atau Header
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { WaOutboxStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const webhookSecret = process.env.FONNTE_WEBHOOK_SECRET || process.env.CRON_SECRET || 'fonnte-hook-secret';
    const querySecret = request.nextUrl.searchParams.get('secret');
    const headerSecret = request.headers.get('x-fonnte-secret') || request.headers.get('authorization')?.replace('Bearer ', '');

    if (querySecret !== webhookSecret && headerSecret !== webhookSecret) {
      return NextResponse.json({ error: 'Unauthorized webhook request' }, { status: 401 });
    }

    const payload = await request.json().catch(() => ({}));
    const { id, status, message: statusMsg } = payload;

    if (id) {
      // Cari outbox berdasarkan providerMessageId
      const outbox = await prisma.waOutbox.findFirst({
        where: { providerMessageId: String(id) },
      });

      if (outbox) {
        let newStatus = outbox.status;
        if (status === 'delivered' || status === 'read' || status === 'sent') {
          newStatus = WaOutboxStatus.SENT;
        } else if (status === 'failed' || status === 'rejected') {
          newStatus = WaOutboxStatus.FAILED;
        }

        await prisma.waOutbox.update({
          where: { id: outbox.id },
          data: {
            status: newStatus,
            lastError: status === 'failed' ? (statusMsg || 'Pengiriman gagal dilaporkan webhook') : outbox.lastError,
          },
        });
      }
    }

    return NextResponse.json({ status: 'received' });
  } catch (error: any) {
    console.error('[Fonnte Webhook Error]', error);
    return NextResponse.json({ error: error.message || 'Webhook internal error' }, { status: 500 });
  }
}

