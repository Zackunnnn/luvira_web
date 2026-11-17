// tests/unit/whatsapp.test.ts
import { test, expect } from 'vitest';
import {
  normalizeWhatsAppNumber,
  isValidWhatsAppNumber,
  getLast4Digits,
  generateOrderHelpWhatsAppUrl,
  validateAndNormalizeWhatsAppNumber,
  maskPhoneNumber,
  DEFAULT_STORE_WA,
} from '@/lib/whatsapp';

test('WhatsApp Helper: Normalisasi format nomor telepon ke standar internasional Indonesia (62...)', () => {
  expect(normalizeWhatsAppNumber('0812-3456-7890')).toBe('6281234567890');
  expect(normalizeWhatsAppNumber('+62 812 3456 7890')).toBe('6281234567890');
  expect(normalizeWhatsAppNumber('6281234567890')).toBe('6281234567890');
  expect(normalizeWhatsAppNumber('81234567890')).toBe('6281234567890');
  expect(normalizeWhatsAppNumber('0857-1122-3344')).toBe('6285711223344');
  expect(normalizeWhatsAppNumber('')).toBe('');
});

test('WhatsApp Helper: Validasi nomor WhatsApp', () => {
  expect(isValidWhatsAppNumber('081234567890')).toBe(true);
  expect(isValidWhatsAppNumber('+6281234567890')).toBe(true);
  expect(isValidWhatsAppNumber('12345')).toBe(false);
  expect(isValidWhatsAppNumber('abcde')).toBe(false);
});

test('WhatsApp Helper: Ekstraksi 4 digit terakhir nomor WhatsApp untuk otentikasi pelacakan pesanan (A7)', () => {
  expect(getLast4Digits('0812-3456-7890')).toBe('7890');
  expect(getLast4Digits('+62 812 9988 1234')).toBe('1234');
  expect(getLast4Digits('085712345678')).toBe('5678');
  expect(getLast4Digits('12')).toBe('');
});

test('WhatsApp Helper: Pembuatan tautan wa.me bantuan pesanan resmi', () => {
  const url = generateOrderHelpWhatsAppUrl('LVR-20261024-8899', DEFAULT_STORE_WA);
  expect(url).toContain(`https://wa.me/${DEFAULT_STORE_WA}`);
  expect(url).toContain('LVR-20261024-8899');
});

test('WhatsApp Helper: Normalisasi dan validasi nomor WhatsApp di satu fungsi bersama', () => {
  // Format valid normal
  const res1 = validateAndNormalizeWhatsAppNumber('0812-3456-7890');
  expect(res1.valid).toBe(true);
  expect(res1.normalized).toBe('6281234567890');
  expect(res1.isSuspicious).toBe(false);

  const res2 = validateAndNormalizeWhatsAppNumber('+62 857 9988 7766');
  expect(res2.valid).toBe(true);
  expect(res2.normalized).toBe('6285799887766');
  expect(res2.isSuspicious).toBe(false);

  // Penolakan keras: Format salah (bukan 628, atau bukan seluler)
  const errShort = validateAndNormalizeWhatsAppNumber('0812345');
  expect(errShort.valid).toBe(false);
  expect(errShort.error).toBeDefined();

  const errPrefix = validateAndNormalizeWhatsAppNumber('021-5556667');
  expect(errPrefix.valid).toBe(false);
  expect(errPrefix.error).toBeDefined();

  const errEmpty = validateAndNormalizeWhatsAppNumber('');
  expect(errEmpty.valid).toBe(false);

  // Penolakan keras: Semua digit sama (nomor palsu total)
  const errAllSame1 = validateAndNormalizeWhatsAppNumber('088888888888');
  expect(errAllSame1.valid).toBe(false);
  expect(errAllSame1.error).toContain('semua digit sama');

  const errAllSame2 = validateAndNormalizeWhatsAppNumber('62811111111111');
  expect(errAllSame2.valid).toBe(false);
  expect(errAllSame2.error).toContain('semua digit sama');

  // Pola mencurigakan (Soft Warning): valid=true, isSuspicious=true
  const warnEnding0 = validateAndNormalizeWhatsAppNumber('081234560000');
  expect(warnEnding0.valid).toBe(true);
  expect(warnEnding0.isSuspicious).toBe(true);
  expect(warnEnding0.warning).toBeDefined();

  const warnEnding1 = validateAndNormalizeWhatsAppNumber('081234561111');
  expect(warnEnding1.valid).toBe(true);
  expect(warnEnding1.isSuspicious).toBe(true);

  const warnEnding1234 = validateAndNormalizeWhatsAppNumber('081234561234');
  expect(warnEnding1234.valid).toBe(true);
  expect(warnEnding1234.isSuspicious).toBe(true);

  const warnPattern = validateAndNormalizeWhatsAppNumber('081112223334');
  expect(warnPattern.valid).toBe(true);
  expect(warnPattern.isSuspicious).toBe(true);
});

test('WhatsApp Helper: Masking nomor telepon hanya menampilkan 4 digit terakhir', () => {
  expect(maskPhoneNumber('6281234567890')).toBe('••••••••7890');
  expect(maskPhoneNumber('085799881234')).toBe('••••••••1234');
  expect(maskPhoneNumber(null)).toBe('-');
  expect(maskPhoneNumber('')).toBe('-');
});
