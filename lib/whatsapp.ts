// lib/whatsapp.ts
// ============================================================================
// WhatsApp Normalization & Message Link Helper
// Sesuai docs/LUVIRA_2_PLAN.md Bagian 9 & 13
// ============================================================================

export const DEFAULT_STORE_WA = process.env.NEXT_PUBLIC_ADMIN_WA || '6281386829952';

export interface PhoneValidationResult {
  valid: boolean;
  normalized?: string;
  isSuspicious?: boolean;
  warning?: string;
  error?: string;
}

/**
 * Normalisasi dan validasi nomor WhatsApp di satu fungsi bersama:
 * - Hapus spasi, tanda hubung (-), dan tanda plus (+)
 * - Awalan 0 atau +62 atau 8 distandarkan ke 62
 * - Penolakan keras: format harus cocok ^628\d{8,12}$ (11-15 digit) dan bukan semua digit sama
 * - Pola mencurigakan (soft warning): akhiran 0000/1111/1234 atau pola 111222333
 */
export function validateAndNormalizeWhatsAppNumber(rawPhone: string): PhoneValidationResult {
  if (!rawPhone || typeof rawPhone !== 'string') {
    return { valid: false, error: 'Nomor WhatsApp wajib diisi.' };
  }

  // 1. Hapus spasi, tanda hubung, dan tanda plus
  let cleaned = rawPhone.replace(/[\s\-+]/g, '');

  // 2. Awalan 0 atau 8 diganti 62
  if (cleaned.startsWith('0')) {
    cleaned = '62' + cleaned.slice(1);
  } else if (cleaned.startsWith('8')) {
    cleaned = '62' + cleaned;
  }

  // 3. Penolakan keras 1: Format harus cocok ^628\d{8,12}$
  if (!/^628\d{8,12}$/.test(cleaned)) {
    return {
      valid: false,
      error: 'Nomor WhatsApp tidak valid. Harus diawali 08/628 dengan panjang 11-15 digit angka.',
    };
  }

  // 4. Penolakan keras 2: Semua digit sama (seluruh digit atau seluruh digit setelah 628)
  const subscriberPart = cleaned.slice(3);
  const isAllSameTotal = /^(\d)\1+$/.test(cleaned);
  const isAllSameSubscriber = /^(\d)\1+$/.test(subscriberPart);
  if (isAllSameTotal || isAllSameSubscriber) {
    return {
      valid: false,
      error: 'Nomor WhatsApp tidak valid (terdeteksi semua digit sama/nomor palsu).',
    };
  }

  // 5. Pola mencurigakan (Soft Warning): Akhiran 0000/1111/1234 atau pola 111222333
  const isSuspiciousEnding = /(?:0000|1111|1234)$/.test(cleaned);
  const isSuspiciousPattern = /(?:111222333)/.test(cleaned);

  if (isSuspiciousEnding || isSuspiciousPattern) {
    return {
      valid: true,
      normalized: cleaned,
      isSuspicious: true,
      warning: 'Nomor memiliki pola berulang atau akhiran sekuensial (0000/1111/1234). Pastikan nomor ini memang aktif di WhatsApp.',
    };
  }

  return {
    valid: true,
    normalized: cleaned,
    isSuspicious: false,
  };
}

/**
 * Menyamarkan nomor telepon hanya menampilkan 4 digit terakhir (contoh: ••••••••7890)
 * untuk kepatuhan privasi log dan laporan.
 */
export function maskPhoneNumber(phone?: string | null): string {
  if (!phone) return '-';
  const clean = phone.trim();
  if (clean.length <= 4) return '••••' + clean;
  return '••••••••' + clean.slice(-4);
}

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
