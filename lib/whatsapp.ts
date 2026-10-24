// lib/whatsapp.ts
// ============================================================================
// WhatsApp Normalization & Message Link Helper
// Sesuai docs/LUVIRA_2_PLAN.md Bagian 9 & 13
// ============================================================================

export const DEFAULT_STORE_WA = '6281234567890';

/**
 * Menormalkan nomor telepon/WhatsApp ke format standar internasional Indonesia (62...)
 * Contoh:
 *   "0812-3456-7890"  -> "6281234567890"
 *   "+62 812 3456 7890" -> "6281234567890"
 *   "6281234567890"   -> "6281234567890"
 */
export function normalizeWhatsAppNumber(rawPhone: string): string {
  if (!rawPhone) return '';

  // 1. Hapus semua karakter non-digit kecuali tanda plus
  let cleaned = rawPhone.replace(/[^\d+]/g, '');

  // 2. Tangani prefix '+'
  if (cleaned.startsWith('+')) {
    cleaned = cleaned.slice(1);
  }

  // 3. Tangani prefix '0' (lokal Indonesia) -> ubah ke '62'
  if (cleaned.startsWith('0')) {
    cleaned = '62' + cleaned.slice(1);
  }

  // 4. Jika pengguna hanya mengetik '812...', tambahkan '62'
  if (cleaned.startsWith('8')) {
    cleaned = '62' + cleaned;
  }

  return cleaned;
}

/**
 * Validasi apakah nomor WhatsApp valid (minimal 10 digit, diawali 62)
 */
export function isValidWhatsAppNumber(phone: string): boolean {
  const normalized = normalizeWhatsAppNumber(phone);
  return /^62\d{8,13}$/.test(normalized);
}

/**
 * Mengambil 4 digit terakhir nomor WhatsApp untuk otentikasi pelacakan pesanan (A7)
 */
export function getLast4Digits(phone: string): string {
  const normalized = normalizeWhatsAppNumber(phone);
  if (normalized.length < 4) return '';
  return normalized.slice(-4);
}

/**
 * Membangun URL tautan WhatsApp untuk bantuan pesanan atau konfirmasi
 */
export function generateOrderHelpWhatsAppUrl(
  orderCode: string,
  storeNumber: string = DEFAULT_STORE_WA
): string {
  const normalizedStore = normalizeWhatsAppNumber(storeNumber);
  const text = encodeURIComponent(
    `Halo Admin Luvira, saya ingin menanyakan status pesanan saya dengan kode: *${orderCode}*. Terima kasih.`
  );
  return `https://wa.me/${normalizedStore}?text=${text}`;
}
