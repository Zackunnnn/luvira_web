// lib/midtrans-webhook.ts
// ============================================================================
// Midtrans Webhook Helper & Idempotency Engine
// ============================================================================

import { createHash } from 'crypto';
import { MidtransNotificationPayload } from '@/types/midtrans';
import { coreApi } from '@/lib/midtrans';

export const FINAL_PAID_STATUS = 'Lunas';

/**
 * Memverifikasi signature_key yang dikirim Midtrans webhook.
 * Signature = SHA512(order_id + status_code + gross_amount + ServerKey)
 */
export function verifyMidtransSignature(
  payload: Pick<MidtransNotificationPayload, 'order_id' | 'status_code' | 'gross_amount' | 'signature_key'>,
  serverKey: string
): boolean {
  if (!serverKey) return false;
  const signatureInput = `${payload.order_id}${payload.status_code}${payload.gross_amount}${serverKey}`;
  const expectedSignature = createHash('sha512').update(signatureInput).digest('hex');
  return expectedSignature === payload.signature_key;
}

/**
 * Mengonversi status transaksi Midtrans ke status pesanan sistem Luvira.
 */
export function mapMidtransStatus(transactionStatus: string, fraudStatus?: string): string {
  if (transactionStatus === 'settlement') {
    return FINAL_PAID_STATUS;
  }
  if (transactionStatus === 'capture') {
    return fraudStatus === 'accept' ? FINAL_PAID_STATUS : 'Gagal';
  }
  if (transactionStatus === 'pending') {
    return 'Menunggu Pembayaran';
  }
  if (['deny', 'cancel', 'expire'].includes(transactionStatus)) {
    return 'Gagal';
  }
  return 'unknown';
}

/**
 * Mengevaluasi apakah status pesanan boleh diperbarui (Guard Idempotency).
 * Menjamin status 'Lunas' TIDAK BOLEH turun/tertimpa oleh notifikasi kadaluwarsa/ganda.
 */
export function evaluateStatusTransition(
  currentStatus: string | null | undefined,
  incomingStatus: string
): { shouldUpdate: boolean; newStatus: string; reason?: string } {
  if (!incomingStatus || incomingStatus === 'unknown') {
    return { shouldUpdate: false, newStatus: currentStatus || 'unknown', reason: 'Unknown incoming status' };
  }

  // Jika order sudah Lunas, status tidak boleh turun (misal notifikasi pending/expire terlambat)
  if (currentStatus === FINAL_PAID_STATUS) {
    if (incomingStatus !== FINAL_PAID_STATUS) {
      return {
        shouldUpdate: false,
        newStatus: currentStatus,
        reason: `Pesanan sudah berstatus '${FINAL_PAID_STATUS}'. Notifikasi '${incomingStatus}' diabaikan untuk mencegah penurunan status.`,
      };
    }
    return {
      shouldUpdate: false,
      newStatus: currentStatus,
      reason: 'Pesanan sudah berstatus lunas (notifikasi ganda/idempoten).',
    };
  }

  // Jika status sama persis, tidak perlu update DB ulang
  if (currentStatus === incomingStatus) {
    return {
      shouldUpdate: false,
      newStatus: currentStatus,
      reason: 'Status pesanan sudah sesuai (idempoten).',
    };
  }

  return {
    shouldUpdate: true,
    newStatus: incomingStatus,
  };
}

/**
 * Opsional: Mengonfirmasi status transaksi langsung ke server Midtrans via API
 * untuk memvalidasi payload webhook.
 */
export async function confirmWithMidtransApi(orderId: string): Promise<string | null> {
  if (!coreApi) return null;
  try {
    const statusResponse = await coreApi.transaction.status(orderId);
    if (statusResponse && statusResponse.transaction_status) {
      return mapMidtransStatus(statusResponse.transaction_status, statusResponse.fraud_status);
    }
  } catch (err) {
    console.warn(`[Midtrans API Confirm] Gagal mengecek status langsung untuk order ${orderId}:`, err);
  }
  return null;
}
