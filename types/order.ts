// types/order.ts — TypeScript interfaces for order management and digital receipts.
// Supports both Sandbox simulation orders and real Midtrans Snap payment orders.

import { CartItem, CustomerInfo } from './product';

// OrderStatus — Lifecycle status untuk pesanan.
// Status sandbox tetap dipertahankan untuk backward compatibility dengan SandboxPaymentModal.
// Status Midtrans ditambahkan untuk integrasi pembayaran asli.
// OrderStatus — Lifecycle status untuk pesanan.
export type OrderStatus =
  | 'menunggu_transfer'      // Baru checkout, nunggu transfer
  | 'menunggu_verifikasi'    // Udah upload bukti, nunggu admin cek
  | 'dikonfirmasi'           // Admin konfirmasi pembayaran valid
  | 'diproses'               // Sedang dipacking
  | 'selesai'                // Sudah dikirim/selesai
  | 'dibatalkan';            // Dibatalkan admin/sistem

export interface Order {
  id: string;                 // Unique order ID (e.g. 'ord-1724400000000')
  invoiceNumber: string;      // Formatted invoice code (e.g. 'LVR-XXXX')
  customerInfo: CustomerInfo; // Customer name, phone, address, notes
  items: CartItem[];          // Array of purchased sock items with selected color variants
  totalPrice: number;         // Grand total amount in IDR (Products - Promo + PPN + Shipping)
  paymentMethod: string;      // Payment method name
  status: OrderStatus;        // Lifecycle status of order
  createdAt: string;          // Formatted date and time (WIB)
  
  // Phase 13 Fields
  promoCodeId?: string;
  shippingCourier?: string;
  shippingCost?: number;
  ppnAmount?: number;
  paymentProofUrl?: string;
  paymentDeadline?: string;
  verifiedBy?: string;
  verifiedAt?: string;
  midtransToken?: string;
}
