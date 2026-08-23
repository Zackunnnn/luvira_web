// types/order.ts — TypeScript interfaces for order management and digital receipts.

import { CartItem, CustomerInfo } from './product';

export type OrderStatus = 'Sandbox Verified' | 'Diproses' | 'Selesai';

export interface Order {
  id: string; // Unique order ID (e.g. 'ord-1724400000000')
  invoiceNumber: string; // Formatted invoice code (e.g. 'LVR-SBX-8492')
  customerInfo: CustomerInfo; // Customer name, phone, address, notes
  items: CartItem[]; // Array of purchased sock items with selected color variants
  totalPrice: number; // Grand total amount in IDR
  paymentMethod: string; // Payment method name (e.g. 'QRIS Luvira Instant', 'BCA Virtual Account')
  status: OrderStatus; // Lifecycle status of order
  createdAt: string; // Formatted date and time (WIB)
}
