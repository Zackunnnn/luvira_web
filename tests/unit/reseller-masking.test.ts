// tests/unit/reseller-masking.test.ts
// ============================================================================
// FT-4 Unit Tests: Reseller Privacy & Data Masking Engine
// Memverifikasi masking nama, telepon, email, alamat, dan penghapusan HPP.
// ============================================================================

import { describe, it, expect } from 'vitest';
import {
  maskCustomerName,
  maskPhoneNumber,
  maskCustomerEmail,
  sanitizeOrderForReseller,
} from '@/lib/reseller/masking';

describe('FT-4: Reseller Masking Engine Unit Tests', () => {
  describe('maskCustomerName', () => {
    it('menyamarkan nama dua kata menjadi format B*** S***', () => {
      expect(maskCustomerName('Budi Santoso')).toBe('B*** S***');
    });

    it('menyamarkan nama tiga kata secara proporsional', () => {
      expect(maskCustomerName('Ahmad Dhani Prasetyo')).toBe('A*** D*** P***');
    });

    it('menangani satu kata nama', () => {
      expect(maskCustomerName('Suharto')).toBe('S***');
    });

    it('menangani string kosong atau null secara aman', () => {
      expect(maskCustomerName('')).toBe('P***');
      expect(maskCustomerName(null)).toBe('P***');
    });
  });

  describe('maskPhoneNumber', () => {
    it('hanya menampilkan 4 digit terakhir dengan prefix peluru ••••1234', () => {
      expect(maskPhoneNumber('081234567890')).toBe('••••7890');
      expect(maskPhoneNumber('+6281987654321')).toBe('••••4321');
    });

    it('menangani nomor pendek secara graceful', () => {
      expect(maskPhoneNumber('1234')).toBe('••••1234');
      expect(maskPhoneNumber('12')).toBe('••••0012');
    });

    it('menangani null/undefined', () => {
      expect(maskPhoneNumber(null)).toBe('••••0000');
    });
  });

  describe('maskCustomerEmail', () => {
    it('menyamarkan username email', () => {
      expect(maskCustomerEmail('pelanggan@gmail.com')).toBe('p***@gmail.com');
    });

    it('menangani null', () => {
      expect(maskCustomerEmail(null)).toBeNull();
    });
  });

  describe('sanitizeOrderForReseller', () => {
    it('menghapus HPP dan biaya kemasan secara mutlak dan menyamarkan data pelanggan', () => {
      const rawOrder: any = {
        id: 'ord-123',
        code: 'LVR-2026-9999',
        customerName: 'Siti Aminah',
        customerPhone: '085712345678',
        customerEmail: 'siti@example.com',
        shippingAddress: {
          recipientName: 'Siti Aminah',
          phone: '085712345678',
          street: 'Jl. Merdeka No. 45 RT 02/05',
          districtName: 'Danurejan',
          cityName: 'Yogyakarta',
          provinceName: 'DI Yogyakarta',
          postalCode: '55211',
        },
        subtotal: 100000,
        discountAmount: 10000,
        netPrice: 90000,
        ppnAmount: 9900,
        shippingCost: 0,
        totalPrice: 99900,
        items: [
          {
            id: 'item-1',
            productName: 'Kaus Kaki Premium',
            quantity: 2,
            priceEach: 50000,
            costEach: 20000, // HPP - WAJIB DIHAPUS
            packingEach: 2000, // Biaya Packing - WAJIB DIHAPUS
            variant: {
              id: 'var-1',
              name: 'Hitam',
              cost: {
                costPrice: 20000, // HPP - WAJIB DIHAPUS
              },
            },
          },
        ],
      };

      const sanitized: any = sanitizeOrderForReseller(rawOrder);

      // Verifikasi masking pelanggan
      expect(sanitized.customerName).toBe('S*** A***');
      expect(sanitized.customerPhone).toBe('••••5678');
      expect(sanitized.customerEmail).toBe('s***@example.com');

      // Verifikasi sanitasi alamat (tidak ada jalan atau nomor telepon)
      expect(sanitized.shippingAddress.street).toBeUndefined();
      expect(sanitized.shippingAddress.postalCode).toBeUndefined();
      expect(sanitized.shippingAddress.phone).toBeUndefined();
      expect(sanitized.shippingAddress.city).toBe('Yogyakarta');
      expect(sanitized.shippingAddress.province).toBe('DI Yogyakarta');

      // Verifikasi mutlak: HPP ditiadakan
      const item = sanitized.items[0];
      expect(item.costEach).toBeUndefined();
      expect(item.packingEach).toBeUndefined();
      expect(item.costPrice).toBeUndefined();
      expect(item.packingCost).toBeUndefined();
      expect(item.variant?.cost).toBeUndefined();

      // Data penjualan umum tetap ada
      expect(item.productName).toBe('Kaus Kaki Premium');
      expect(item.priceEach).toBe(50000);
      expect(item.quantity).toBe(2);
      expect(sanitized.totalPrice).toBe(99900);
    });
  });
});
