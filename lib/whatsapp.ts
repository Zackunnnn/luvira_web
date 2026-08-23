// whatsapp.ts — Helper utility for generating WhatsApp checkout deep links.
// Constructs a structured order message from cart items, customer info, and sandbox verification,
// then returns a wa.me URL that opens WhatsApp with the pre-filled message.

import { CartItem, CustomerInfo } from '@/types/product'; // TypeScript type imports

// Luvira official store WhatsApp number (Indonesian country code: 62)
const STORE_WHATSAPP_NUMBER = '6281234567890';

// SandboxPaymentDetails — Structure for verified sandbox transaction metadata
export interface SandboxPaymentDetails {
  invoiceNumber: string; // e.g. "LVR-SBX-8921"
  method: string; // e.g. "QRIS Luvira Instant" or "BCA Virtual Account"
  paidAt: string; // Formatted timestamp, e.g. "23 Aug 2026, 08:45 WIB"
}

// generateWhatsAppUrl — Creates a complete wa.me deep link with a structured order text.
// The message format supports standard checkout and Sandbox Verified payments.
//
// Parameters:
// - items: Array of CartItem objects (product + variant + quantity)
// - customerInfo: Customer delivery details (name, phone, address, notes)
// - storeNumber: Optional override for the store's WhatsApp number
// - paymentDetails: Optional sandbox payment verification details
//
// Returns: A full https://wa.me/... URL string ready to be opened in a browser
export const generateWhatsAppUrl = (
  items: CartItem[],
  customerInfo: CustomerInfo,
  storeNumber: string = STORE_WHATSAPP_NUMBER,
  paymentDetails?: SandboxPaymentDetails
): string => {
  // Currency formatter for Indonesian Rupiah (IDR) — no decimal places
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Calculate aggregate totals for the summary section
  const totalItemsCount = items.reduce((sum, item) => sum + item.quantity, 0); // Total items count
  const totalPrice = items.reduce(
    (sum, item) => sum + item.product.price * item.quantity, // Sum of all line totals
    0
  );

  // Build the numbered items list text (1. Product - Color (Qty) - Price)
  const itemsListText = items
    .map(
      (item, index) =>
        `${index + 1}. ${item.product.name} - ${item.selectedVariant.name} (${item.quantity}x) - ${formatCurrency(item.product.price * item.quantity)}`
    )
    .join('\n'); // Join with newlines

  // Construct optional payment status section if verified via sandbox
  const paymentSection = paymentDetails
    ? `⚡ *STATUS PEMBAYARAN: [SANDBOX VERIFIED - ${paymentDetails.invoiceNumber}]*\n` +
      `Metode: ${paymentDetails.method} (Lunas Simulasi)\n` +
      `Waktu: ${paymentDetails.paidAt}\n\n`
    : '';

  const priceSuffix = paymentDetails ? '(Lunas via Sandbox)' : '(Belum termasuk ongkir)';

  // Construct the full structured message text per PRD Section 8 format
  const messageText = `Halo Admin Luvira, saya ingin memesan:

${paymentSection}📦 *DETAIL PESANAN:*
${itemsListText}

💰 *TOTAL SPESIFIKASI:*
Total Items: ${totalItemsCount} pasang
Total Harga: ${formatCurrency(totalPrice)} ${priceSuffix}

👤 *DATA PEMESAN:*
Nama: ${customerInfo.name}
No. HP/WA: ${customerInfo.phone}
Alamat: ${customerInfo.address}${customerInfo.notes ? `\nCatatan: ${customerInfo.notes}` : ''}

Terima kasih!`;

  // URL-encode the message and build the final wa.me deep link
  const encodedMessage = encodeURIComponent(messageText);
  return `https://wa.me/${storeNumber}?text=${encodedMessage}`;
};
