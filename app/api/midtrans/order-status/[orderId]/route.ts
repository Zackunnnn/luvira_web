// app/api/midtrans/order-status/[orderId]/route.ts
// ============================================================================
// API Route: GET /api/midtrans/order-status/[orderId]
//
// Endpoint polling yang dipanggil frontend untuk mengecek status terbaru
// dari transaksi Midtrans setelah pembayaran. Membaca dari JSON file yang
// ditulis oleh webhook notification handler.
//
// FLOW:
// 1. User selesai bayar di Snap popup → onSuccess/onPending callback
// 2. Frontend polling endpoint ini untuk mendapatkan confirmed status dari webhook
// 3. Frontend update useOrderStore berdasarkan status yang dikembalikan
//
// CATATAN: Status dari Snap callback (client-side) bisa di-manipulasi user,
// sehingga status RESMI harus selalu berdasarkan webhook notification (server-side).
// ============================================================================

import { readFile } from 'fs/promises';
import { join } from 'path';
import { StoredNotification } from '@/types/midtrans';

const NOTIFICATIONS_FILE = join(process.cwd(), 'data', 'midtrans-notifications.json');

/**
 * Baca stored notifications dari JSON file.
 */
async function readNotifications(): Promise<StoredNotification[]> {
  try {
    const data = await readFile(NOTIFICATIONS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params;

    if (!orderId) {
      return Response.json(
        { error: 'orderId parameter wajib diisi' },
        { status: 400 }
      );
    }

    const notifications = await readNotifications();
    const notification = notifications.find((n) => n.orderId === orderId);

    if (!notification) {
      // Belum ada notifikasi untuk order ini — mungkin webhook belum diterima
      return Response.json(
        { error: 'Notifikasi belum diterima untuk order ini', orderId },
        { status: 404 }
      );
    }

    // ========================================================================
    // MAP MIDTRANS STATUS → LUVIRA ORDER STATUS
    // Mapping ini harus konsisten dengan yang ada di notification webhook.
    // ========================================================================
    let orderStatus: string;
    const { transactionStatus, fraudStatus } = notification;

    if (transactionStatus === 'settlement') {
      orderStatus = 'Lunas';
    } else if (transactionStatus === 'capture') {
      orderStatus = fraudStatus === 'accept' ? 'Lunas' : 'Gagal';
    } else if (transactionStatus === 'pending') {
      orderStatus = 'Menunggu Pembayaran';
    } else if (['deny', 'cancel', 'expire'].includes(transactionStatus)) {
      orderStatus = 'Gagal';
    } else {
      orderStatus = 'Menunggu Pembayaran';
    }

    return Response.json({
      orderId: notification.orderId,
      transactionId: notification.transactionId,
      transactionStatus: notification.transactionStatus,
      paymentType: notification.paymentType,
      grossAmount: notification.grossAmount,
      orderStatus,           // Mapped status Luvira (Lunas | Menunggu Pembayaran | Gagal)
      updatedAt: notification.updatedAt,
    });
  } catch (error: unknown) {
    console.error('[Order Status Check Error]', error);

    return Response.json(
      { error: 'Gagal mengecek status order' },
      { status: 500 }
    );
  }
}
