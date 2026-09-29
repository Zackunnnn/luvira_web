// app/api/midtrans/notification/route.ts
// ============================================================================
// API Route: POST /api/midtrans/notification
//
// WEBHOOK endpoint yang dipanggil oleh Midtrans server-to-server setiap kali
// status pembayaran berubah (settlement, pending, deny, cancel, expire, dll).
//
// KEAMANAN (KRUSIAL):
// Midtrans mengirim `signature_key` di setiap notifikasi. Kita WAJIB
// memverifikasi signature ini sebelum memproses notifikasi, karena endpoint
// ini publicly accessible — siapa saja bisa mengirim POST request ke sini.
//
// Signature = SHA512(order_id + status_code + gross_amount + ServerKey)
//
// Jika signature tidak cocok, artinya notifikasi BUKAN dari Midtrans asli
// dan harus ditolak. Ini mencegah serangan dimana pihak ketiga mengirim
// notifikasi palsu untuk mengubah status order menjadi "lunas" tanpa bayar.
//
// PENYIMPANAN:
// Karena project ini menggunakan localStorage untuk state management (Zustand)
// dan TIDAK ADA DATABASE, webhook server-side tidak bisa langsung update
// localStorage browser. Solusi:
// 1. Simpan notifikasi ke JSON file (data/midtrans-notifications.json)
// 2. Frontend polling via /api/midtrans/order-status/[orderId] untuk cek status
//
// TRADE-OFF: JSON file tidak scalable untuk traffic tinggi (race condition I/O),
// tapi cukup untuk MVP/sandbox testing. Migrasi ke database saat production.
// ============================================================================

import { NextRequest } from 'next/server';
import { createHash } from 'crypto';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { MidtransNotificationPayload, StoredNotification } from '@/types/midtrans';
import { prisma } from '@/lib/db';
import { OrderStatus } from '@/types/order';

// Path ke file penyimpanan notifikasi
const NOTIFICATIONS_DIR = join(process.cwd(), 'data');
const NOTIFICATIONS_FILE = join(NOTIFICATIONS_DIR, 'midtrans-notifications.json');

/**
 * Baca semua stored notifications dari JSON file.
 * Return array kosong jika file belum ada.
 */
async function readNotifications(): Promise<StoredNotification[]> {
  try {
    const data = await readFile(NOTIFICATIONS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    // File belum ada atau corrupt — return array kosong
    return [];
  }
}

/**
 * Tulis notifications ke JSON file.
 * Buat directory jika belum ada.
 */
async function writeNotifications(notifications: StoredNotification[]): Promise<void> {
  await mkdir(NOTIFICATIONS_DIR, { recursive: true });
  await writeFile(NOTIFICATIONS_FILE, JSON.stringify(notifications, null, 2), 'utf-8');
}

/**
 * Verifikasi signature key dari Midtrans notification.
 *
 * CARA KERJA:
 * Midtrans menghitung: SHA512(order_id + status_code + gross_amount + ServerKey)
 * dan mengirimnya sebagai `signature_key` di payload notifikasi.
 *
 * Kita menghitung hash yang sama menggunakan ServerKey kita sendiri.
 * Jika hasil hash sama, artinya notifikasi benar-benar dari Midtrans.
 * Jika berbeda, notifikasi palsu dan HARUS ditolak.
 *
 * PENTING: Jangan pernah skip verifikasi ini di production!
 */
function verifySignature(payload: MidtransNotificationPayload): boolean {
  const serverKey = process.env.MIDTRANS_SERVER_KEY;
  if (!serverKey) {
    console.error('[Midtrans Webhook] MIDTRANS_SERVER_KEY tidak ditemukan');
    return false;
  }

  // Hitung expected signature: SHA512(order_id + status_code + gross_amount + ServerKey)
  const signatureInput = `${payload.order_id}${payload.status_code}${payload.gross_amount}${serverKey}`;
  const expectedSignature = createHash('sha512').update(signatureInput).digest('hex');

  // Bandingkan dengan signature yang dikirim Midtrans
  return expectedSignature === payload.signature_key;
}

export async function POST(request: NextRequest) {
  try {
    const payload: MidtransNotificationPayload = await request.json();

    console.log('[Midtrans Webhook] Received notification:', {
      order_id: payload.order_id,
      transaction_status: payload.transaction_status,
      payment_type: payload.payment_type,
    });

    // ========================================================================
    // STEP 1: VERIFIKASI SIGNATURE KEY
    // Ini adalah langkah keamanan PALING KRUSIAL di seluruh integrasi Midtrans.
    // Tanpa verifikasi ini, siapa saja bisa mengirim POST request ke endpoint
    // ini dengan payload palsu untuk mengubah status order menjadi "lunas".
    // ========================================================================
    if (!verifySignature(payload)) {
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

    // ========================================================================
    // STEP 2: SIMPAN NOTIFIKASI KE JSON FILE
    // Update atau insert record berdasarkan order_id.
    // Jika order_id sudah ada, update statusnya (Midtrans bisa kirim
    // beberapa notifikasi untuk 1 transaksi — misal pending → settlement).
    // ========================================================================
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

    // Cari apakah sudah ada notifikasi untuk order_id ini
    const existingIndex = notifications.findIndex((n) => n.orderId === payload.order_id);

    if (existingIndex >= 0) {
      // Update existing record
      notifications[existingIndex] = storedNotification;
    } else {
      // Insert new record
      notifications.push(storedNotification);
    }

    await writeNotifications(notifications);

    // ========================================================================
    // STEP 3: LOG STATUS MAPPING
    // Untuk debugging — log bagaimana transaction_status Midtrans di-map
    // ke status order Luvira. Mapping aktual dilakukan di frontend saat
    // polling /api/midtrans/order-status/[orderId].
    //
    // Mapping:
    // - settlement / capture (fraud_status=accept) → Lunas
    // - pending → Menunggu Pembayaran
    // - deny / cancel / expire → Gagal
    // ========================================================================
    const { transaction_status, fraud_status } = payload;
    let mappedStatus = 'unknown';

    if (transaction_status === 'settlement') {
      mappedStatus = 'Lunas';
    } else if (transaction_status === 'capture') {
      // Untuk credit card: cek fraud_status
      mappedStatus = fraud_status === 'accept' ? 'Lunas' : 'Gagal';
    } else if (transaction_status === 'pending') {
      mappedStatus = 'Menunggu Pembayaran';
    } else if (['deny', 'cancel', 'expire'].includes(transaction_status)) {
      mappedStatus = 'Gagal';
    }

    console.log(`[Midtrans Webhook] Order ${payload.order_id}: ${transaction_status} → ${mappedStatus}`);

    // ========================================================================
    // STEP 3B: UPDATE ORDER STATUS IN orders.json
    // Sync the central order store with the new status from Midtrans
    // ========================================================================
    if (mappedStatus !== 'unknown') {
      try {
        const orderUpdated = await prisma.order.update({
          where: { id: payload.order_id },
          data: { status: mappedStatus },
        });

        if (orderUpdated) {
          console.log(`[Midtrans Webhook] Successfully updated order status in DB`);
        }
      } catch (err) {
        console.error('[Midtrans Webhook] Failed to sync order status to DB:', err);
      }
    }

    // ========================================================================
    // STEP 4: RETURN 200 OK
    // Midtrans mengharapkan HTTP 200 response. Jika kita return selain 200,
    // Midtrans akan retry notifikasi secara periodik (sampai 5x).
    // ========================================================================
    return Response.json({ status: 'ok' });
  } catch (error: unknown) {
    console.error('[Midtrans Webhook Error]', error);

    const errorMessage =
      error instanceof Error ? error.message : 'Internal server error';

    // Tetap return 200 agar Midtrans tidak retry terus-menerus.
    // Error di-log untuk investigasi manual.
    return Response.json(
      { status: 'error', message: errorMessage },
      { status: 200 }
    );
  }
}
