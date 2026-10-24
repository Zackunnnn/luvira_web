// lib/midtrans-webhook.ts
// ============================================================================
// Midtrans Webhook Helper & Idempotency Rules Luvira 2.0
// Sesuai docs/LUVIRA_2_PLAN.md Bagian 5.3 & 8.2
// ============================================================================

import { createHash } from 'crypto';
import { OrderStatus } from '@prisma/client';

export const FINAL_PAID_STATUS = OrderStatus.DIPROSES;

export interface WebhookPayloadLike {
  order_id: string;
  status_code: string;
  gross_amount: string;
  signature_key?: string;
  transaction_status: string;
  fraud_status?: string;
  payment_type?: string;
  transaction_id?: string;
}

/**
 * Memverifikasi signature_key yang dikirim Midtrans webhook.
 * Signature = SHA512(order_id + status_code + gross_amount + ServerKey)
 */
export function verifyMidtransSignature(
  payload: Pick<WebhookPayloadLike, 'order_id' | 'status_code' | 'gross_amount' | 'signature_key'>,
  serverKey: string
): boolean {
  if (!serverKey) return false;
  const signatureInput = `${payload.order_id}${payload.status_code}${payload.gross_amount}${serverKey}`;
  const expectedSignature = createHash('sha512').update(signatureInput).digest('hex');
  return expectedSignature === payload.signature_key;
}

/**
 * Mengonversi status transaksi Midtrans ke status OrderStatus Prisma Luvira.
 */
export function mapMidtransStatusToOrderStatus(
  transactionStatus: string,
  fraudStatus?: string
): OrderStatus | 'UNKNOWN' {
  const ts = transactionStatus.toLowerCase();
  const fs = fraudStatus ? fraudStatus.toLowerCase() : 'accept';

  if (ts === 'settlement') {
    return OrderStatus.DIPROSES; // Lunas & masuk antrean proses
  }

  if (ts === 'capture') {
    return fs === 'accept' ? OrderStatus.DIPROSES : OrderStatus.DIBATALKAN;
  }

  if (ts === 'pending') {
    return OrderStatus.MENUNGGU_PEMBAYARAN;
  }

  if (['deny', 'cancel', 'expire'].includes(ts)) {
    return OrderStatus.DIBATALKAN;
  }

  return 'UNKNOWN';
}

// Alias untuk backward compatibility
export const mapMidtransStatus = (transactionStatus: string, fraudStatus?: string) => {
  const res = mapMidtransStatusToOrderStatus(transactionStatus, fraudStatus);
  if (res === OrderStatus.DIPROSES) return 'Lunas';
  if (res === OrderStatus.MENUNGGU_PEMBAYARAN) return 'Menunggu Pembayaran';
  if (res === OrderStatus.DIBATALKAN) return 'Gagal';
  return 'unknown';
};

/**
 * Mengevaluasi apakah status pesanan boleh diperbarui (Guard Idempotency & Anti-Downgrade).
 * Menjamin status yang sudah lunas (DIPROSES, DIKIRIM, SELESAI) TIDAK BOLEH diturunkan.
 */
export function evaluateStatusTransition(
  currentStatus: OrderStatus,
  targetStatus: OrderStatus
): { shouldUpdate: boolean; newStatus: OrderStatus; reason?: string } {
  // Jika status sama persis -> idempoten, abaikan tanpa error
  if (currentStatus === targetStatus) {
    return {
      shouldUpdate: false,
      newStatus: currentStatus,
      reason: `Pesanan sudah berada pada status ${currentStatus} (idempoten).`,
    };
  }

  // Jika pesanan sudah lunas / diproses / dikirim / selesai
  const terminalOrPaidStatuses: OrderStatus[] = [
    OrderStatus.DIPROSES,
    OrderStatus.DIKIRIM,
    OrderStatus.SELESAI,
  ];

  if (terminalOrPaidStatuses.includes(currentStatus)) {
    if (targetStatus === OrderStatus.MENUNGGU_PEMBAYARAN || targetStatus === OrderStatus.DIBATALKAN) {
      return {
        shouldUpdate: false,
        newStatus: currentStatus,
        reason: `Pesanan sudah berstatus '${currentStatus}'. Notifikasi '${targetStatus}' diabaikan untuk mencegah penurunan status lunas.`,
      };
    }
  }

  // Jika pesanan sudah DIBATALKAN, tidak boleh berubah ke status lain kecuali ada verifikasi khusus
  if (currentStatus === OrderStatus.DIBATALKAN && targetStatus !== OrderStatus.DIPROSES) {
    return {
      shouldUpdate: false,
      newStatus: currentStatus,
      reason: 'Pesanan sudah dibatalkan.',
    };
  }

  return { shouldUpdate: true, newStatus: targetStatus };
}
