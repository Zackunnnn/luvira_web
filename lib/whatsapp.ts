// whatsapp.ts — Helper utility for generating WhatsApp checkout deep links.
// Constructs a structured order message from cart items and customer info,
// then returns a wa.me URL that opens WhatsApp with the pre-filled message.

import { CartItem, CustomerInfo } from '@/types/product'; // TypeScript type imports

// Luvira official store WhatsApp number (Indonesian country code: 62)
const STORE_WHATSAPP_NUMBER = '6281234567890';

// generateWhatsAppUrl — Creates a complete wa.me deep link with a structured order text.
// The message format follows the PRD Section 8 specification exactly.
//
// Parameters:
// - items: Array of CartItem objects (product + variant + quantity)
// - customerInfo: Customer delivery details (name, phone, address, notes)
// - storeNumber: Optional override for the store's WhatsApp number
//
// Returns: A full https://wa.me/... URL string ready to be opened in a browser
export const generateWhatsAppUrl = (
  items: CartItem[],
  customerInfo: CustomerInfo,
  storeNumber: string = STORE_WHATSAPP_NUMBER
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

  // Construct the full structured message text per PRD Section 8 format
  const messageText = `Halo Admin Luvira, saya ingin memesan:

📦 *DETAIL PESANAN:*
${itemsListText}

💰 *TOTAL SPESIFIKASI:*
Total Items: ${totalItemsCount} pasang
Total Harga: ${formatCurrency(totalPrice)} (Belum termasuk ongkir)

👤 *DATA PEMESAN:*
Nama: ${customerInfo.name}
No. HP/WA: ${customerInfo.phone}
Alamat: ${customerInfo.address}${customerInfo.notes ? `\nCatatan: ${customerInfo.notes}` : ''}

Terima kasih!`;

  // URL-encode the message and build the final wa.me deep link
  const encodedMessage = encodeURIComponent(messageText);
  return `https://wa.me/${storeNumber}?text=${encodedMessage}`;
};
