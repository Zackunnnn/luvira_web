// app/api/midtrans/notification/route.ts
// ============================================================================
// API Route: POST /api/midtrans/notification
//
// Webhook endpoint dari Midtrans server-to-server.
// KEAMANAN & IDEMPOTENCY:
// 1. Verifikasi SHA-512 signature key.
// 2. Konfirmasi status transaksi resmi via Core API bila tersedia.
// 3. Update bersyarat (Idempotency): status 'Lunas' TIDAK BOLEH diturunkan
//    oleh notifikasi ganda / kedaluwarsa.
// ============================================================================

import { NextRequest } from 'next/server';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { MidtransNotificationPayload, StoredNotification } from '@/types/midtrans';
import { prisma } from '@/lib/db';
import {
  verifyMidtransSignature,
  mapMidtransStatus,
  evaluateStatusTransition,
  confirmWithMidtransApi,
} from '@/lib/midtrans-webhook';

const NOTIFICATIONS_DIR = join(process.cwd(), 'data');
const NOTIFICATIONS_FILE = join(NOTIFICATIONS_DIR, 'midtrans-notifications.json');

async function readNotifications(): Promise<StoredNotification[]> {
  try {
    const data = await readFile(NOTIFICATIONS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

async function writeNotifications(notifications: StoredNotification[]): Promise<void> {
  await mkdir(NOTIFICATIONS_DIR, { recursive: true });
  await writeFile(NOTIFICATIONS_FILE, JSON.stringify(notifications, null, 2), 'utf-8');
}

export async function POST(request: NextRequest) {
  try {
    const payload: MidtransNotificationPayload = await request.json();

    console.log('[Midtrans Webhook] Received notification:', {
      order_id: payload.order_id,
      transaction_status: payload.transaction_status,
      payment_type: payload.payment_type,
    });

    // STEP 1: Verifikasi Signature Key
    const serverKey = process.env.MIDTRANS_SERVER_KEY || '';
    if (!verifyMidtransSignature(payload, serverKey)) {
      console.error('[Midtrans Webhook] SIGNATURE VERIFICATION FAILED!', {
        order_id: payload.order_id,
        received_signature: payload.signature_key?.substring(0, 20) + '...',
      });
      return Response.json(
        { error: 'Signature verification failed — notifikasi ditolak' },
        { status: 403 }
      );
    }

    console.log('[Midtrans Webhook] Signature verified ✓ for order:', payload.order_id);

    // STEP 2: Konfirmasi status via Midtrans API bila memungkinkan
    let mappedStatus = mapMidtransStatus(payload.transaction_status, payload.fraud_status);
    const confirmedApiStatus = await confirmWithMidtransApi(payload.order_id);
    if (confirmedApiStatus && confirmedApiStatus !== mappedStatus) {
      console.log(`[Midtrans Webhook] Status dikonfirmasi ulang via Core API: ${mappedStatus} -> ${confirmedApiStatus}`);
      mappedStatus = confirmedApiStatus;
    }

    // STEP 3: Simpan log notifikasi ke JSON
    const notifications = await readNotifications();
    const storedNotification: StoredNotification = {
      orderId: payload.order_id,
      transactionId: payload.transaction_id,
      transactionStatus: payload.transaction_status,
      paymentType: payload.payment_type,
      grossAmount: payload.gross_amount,
      statusCode: payload.status_code,
      fraudStatus: payload.fraud_status,
      updatedAt: new Date().toISOString(),
    };

    const existingIndex = notifications.findIndex((n) => n.orderId === payload.order_id);
    if (existingIndex >= 0) {
      notifications[existingIndex] = storedNotification;
    } else {
      notifications.push(storedNotification);
    }
    await writeNotifications(notifications);

    // STEP 4: Update status di Database dengan Proteksi Idempotency
    if (mappedStatus !== 'unknown') {
      try {
        const currentOrder = await prisma.order.findUnique({
          where: { id: payload.order_id },
          select: { id: true, status: true },
        });

        if (!currentOrder) {
          console.warn(`[Midtrans Webhook] Order dengan ID ${payload.order_id} tidak ditemukan di DB`);
        } else {
          const transition = evaluateStatusTransition(currentOrder.status, mappedStatus);

          if (!transition.shouldUpdate) {
            console.log(`[Midtrans Webhook Idempotency] ${transition.reason || 'Update diabaikan'}`);
          } else {
            const updated = await prisma.order.update({
              where: { id: payload.order_id },
              data: { status: transition.newStatus },
            });
            console.log(`[Midtrans Webhook] Status order ${updated.id} diupdate: '${currentOrder.status}' -> '${updated.status}'`);
          }
        }
      } catch (err) {
        console.error('[Midtrans Webhook] Gagal menyinkronkan status order ke DB:', err);
      }
    }

    return Response.json({ status: 'ok', mappedStatus });
  } catch (error: unknown) {
    console.error('[Midtrans Webhook Error]', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return Response.json({ status: 'error', message: errorMessage }, { status: 200 });
  }
}
