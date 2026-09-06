// types/midtrans.ts — TypeScript interfaces for Midtrans Snap API integration.
// Defines request/response shapes for create-transaction and notification webhook payloads.
// These types ensure type safety across all Midtrans-related API routes and client code.

// ============================================================================
// CREATE TRANSACTION — Request payload sent from checkout page to our API route
// ============================================================================

/** Item detail yang dikirim ke Midtrans Snap API */
export interface MidtransItemDetail {
  id: string;           // Product ID
  price: number;        // Harga satuan dalam IDR (integer, tanpa desimal)
  quantity: number;     // Jumlah item
  name: string;         // Nama produk (max 50 karakter oleh Midtrans)
}

/** Customer detail untuk Midtrans Snap API */
export interface MidtransCustomerDetail {
  first_name: string;
  last_name?: string;
  email?: string;
  phone: string;
}

/** Body request dari frontend ke /api/midtrans/create-transaction */
export interface CreateTransactionRequest {
  orderId: string;
  grossAmount: number;
  itemDetails: MidtransItemDetail[];
  customerDetails: MidtransCustomerDetail;
}

/** Response dari /api/midtrans/create-transaction ke frontend */
export interface CreateTransactionResponse {
  token: string;
  redirect_url: string;
}

// ============================================================================
// NOTIFICATION WEBHOOK — Payload yang dikirim Midtrans server-to-server
// ============================================================================

/**
 * Payload notifikasi yang dikirim oleh Midtrans ke webhook URL kita.
 * Referensi: https://docs.midtrans.com/reference/handling-notifications
 *
 * PENTING: Field `signature_key` WAJIB diverifikasi sebelum memproses notifikasi.
 * Signature = SHA512(order_id + status_code + gross_amount + ServerKey)
 * Ini mencegah pihak luar mengirim notifikasi palsu ke endpoint kita.
 */
export interface MidtransNotificationPayload {
  transaction_time: string;
  transaction_status: MidtransTransactionStatus;
  transaction_id: string;
  status_message: string;
  status_code: string;
  signature_key: string;        // SHA512 hash untuk verifikasi keaslian
  payment_type: string;         // e.g. 'qris', 'bank_transfer', 'credit_card'
  order_id: string;
  merchant_id: string;
  gross_amount: string;         // String format, e.g. "35000.00"
  fraud_status?: string;        // 'accept' | 'challenge' | 'deny' (untuk credit card)
  currency: string;             // 'IDR'
}

/**
 * Semua kemungkinan transaction_status dari Midtrans.
 * Referensi: https://docs.midtrans.com/reference/transaction-status
 */
export type MidtransTransactionStatus =
  | 'capture'       // Kartu kredit berhasil di-capture (cek fraud_status juga)
  | 'settlement'    // Pembayaran berhasil dikonfirmasi (lunas)
  | 'pending'       // Menunggu pembayaran dari customer
  | 'deny'          // Pembayaran ditolak (fraud/limit)
  | 'cancel'        // Dibatalkan (oleh merchant atau timeout)
  | 'expire'        // Melewati batas waktu pembayaran
  | 'refund'        // Dana dikembalikan
  | 'partial_refund'; // Sebagian dana dikembalikan

// ============================================================================
// STORED NOTIFICATION — Format penyimpanan di JSON file server-side
// ============================================================================

/**
 * Record yang disimpan di data/midtrans-notifications.json.
 * Karena project ini belum pakai database, kita simpan notifikasi webhook
 * ke JSON file sebagai solusi paling sederhana. Frontend bisa polling via
 * /api/midtrans/order-status/[orderId] untuk mengecek status terbaru.
 *
 * TRADE-OFF: Tidak scalable untuk traffic tinggi (file I/O, race condition),
 * tapi cukup untuk MVP/testing. Migrasi ke DB saat siap production.
 */
export interface StoredNotification {
  orderId: string;
  transactionId: string;
  transactionStatus: MidtransTransactionStatus;
  paymentType: string;
  grossAmount: string;
  statusCode: string;
  fraudStatus?: string;
  updatedAt: string;            // ISO timestamp terakhir di-update
}
