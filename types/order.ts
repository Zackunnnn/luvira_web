// types/order.ts — TypeScript interfaces for order management and digital receipts.
// Supports both Sandbox simulation orders and real Midtrans Snap payment orders.

import { CartItem, CustomerInfo } from './product';

// OrderStatus — Lifecycle status untuk pesanan.
// Status sandbox tetap dipertahankan untuk backward compatibility dengan SandboxPaymentModal.
// Status Midtrans ditambahkan untuk integrasi pembayaran asli.
export type OrderStatus =
  | 'Sandbox Verified'       // Simulasi sandbox berhasil (dev/testing only)
  | 'Lunas'                  // Pembayaran Midtrans berhasil (settlement/capture)
  | 'Menunggu Pembayaran'    // Transaksi pending — customer belum bayar
  | 'Gagal'                  // Pembayaran ditolak/expired/cancelled
  | 'Diproses'               // Admin sedang memproses pesanan (fulfillment)
  | 'Selesai';               // Pesanan sudah dikirim/selesai

export interface Order {
  id: string;                 // Unique order ID (e.g. 'ord-1724400000000')
  invoiceNumber: string;      // Formatted invoice code (e.g. 'LVR-SBX-8492' atau 'LVR-XXXX')
  customerInfo: CustomerInfo; // Customer name, phone, address, notes
  items: CartItem[];          // Array of purchased sock items with selected color variants
  totalPrice: number;         // Grand total amount in IDR
  paymentMethod: string;      // Payment method name (e.g. 'QRIS', 'Bank Transfer', 'QRIS Luvira Instant')
  status: OrderStatus;        // Lifecycle status of order
  createdAt: string;          // Formatted date and time (WIB)
  midtransOrderId?: string;   // Midtrans-side order_id (opsional, hanya untuk transaksi Midtrans asli)
}
