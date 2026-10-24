// tests/unit/whatsapp.test.ts
import { test, expect } from 'vitest';
import {
  normalizeWhatsAppNumber,
  isValidWhatsAppNumber,
  getLast4Digits,
  generateOrderHelpWhatsAppUrl,
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
  expect(url).toContain('https://wa.me/6281234567890');
  expect(url).toContain('LVR-20261024-8899');
});
