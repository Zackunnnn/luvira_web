// tests/unit/fonnte-adapter.test.ts
// ============================================================================
// Unit Tests: Fonnte WhatsApp Gateway Adapter & Templates (FT-1)
// ============================================================================

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { sendWhatsAppMessage, mapFonnteError, checkFonnteDeviceStatus } from '@/lib/notify/whatsapp';
import { templates } from '@/lib/notify/templates';

describe('Unit Test: Fonnte WhatsApp Gateway Adapter (FT-1)', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env.WA_MODE = 'mock';
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  describe('1. Pemetaan Galat Fonnte (mapFonnteError)', () => {
    it('Memetakan token tidak valid / unauthorized sebagai galat PERMANEN', () => {
      const res = mapFonnteError('invalid token', 401);
      expect(res.isTemporary).toBe(false);
      expect(res.message).toContain('Token Fonnte tidak valid');
    });

    it('Memetakan perangkat WhatsApp terputus sebagai galat SEMENTARA (retryable)', () => {
      const res = mapFonnteError('device disconnected');
      expect(res.isTemporary).toBe(true);
      expect(res.message).toContain('Perangkat WhatsApp pada Fonnte terputus');
    });

    it('Memetakan nomor tujuan tidak terdaftar sebagai galat PERMANEN', () => {
      const res = mapFonnteError('invalid target');
      expect(res.isTemporary).toBe(false);
      expect(res.message).toContain('Nomor WhatsApp tujuan tidak valid');
    });

    it('Memetakan batas laju (rate limit / quota) sebagai galat SEMENTARA', () => {
      const res = mapFonnteError('rate limit reached', 429);
      expect(res.isTemporary).toBe(true);
      expect(res.message).toContain('Batas kuota harian atau rate limit');
    });

    it('Memetakan gangguan server 500/502/503 sebagai galat SEMENTARA', () => {
      const res = mapFonnteError('Internal Server Error', 503);
      expect(res.isTemporary).toBe(true);
      expect(res.message).toContain('Server Fonnte sedang mengalami gangguan');
    });

    it('Memetakan timeout jaringan sebagai galat SEMENTARA', () => {
      const res = mapFonnteError('network timeout');
      expect(res.isTemporary).toBe(true);
      expect(res.message).toContain('timeout');
    });
  });

  describe('2. Mode Mock dan Log (Bebas Panggilan Jaringan Nyata)', () => {
    it('Mode MOCK mengembalikan status sukses dan providerMessageId simulasi', async () => {
      process.env.WA_MODE = 'mock';
      const res = await sendWhatsAppMessage({
        target: '081234567890',
        message: 'Halo Luvira!',
      });

      expect(res.success).toBe(true);
      expect(res.providerMessageId).toContain('mock-fonnte');
      expect(res.isTemporary).toBe(false);
    });

    it('Mode LOG mencatat ke console dan mengembalikan status sukses', async () => {
      process.env.WA_MODE = 'log';
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const res = await sendWhatsAppMessage({
        target: '0857-1234-5678',
        message: 'Tes mode log',
        delay: '4',
      });

      expect(res.success).toBe(true);
      expect(res.providerMessageId).toContain('log-');
      expect(consoleSpy).toHaveBeenCalled();
    });

    it('Menolak pengiriman jika nomor target kosong atau tidak valid', async () => {
      const res = await sendWhatsAppMessage({
        target: '',
        message: 'Pesan tanpa target',
      });

      expect(res.success).toBe(false);
      expect(res.reason).toContain('kosong atau tidak valid');
    });
  });

  describe('3. Panggilan API Mode Fonnte & Validasi Parameter', () => {
    it('Mengirim permintaan POST ke https://api.fonnte.com/send dengan Header Authorization langsung tanpa "Bearer"', async () => {
      process.env.WA_MODE = 'fonnte';
      process.env.FONNTE_TOKEN = 'test-fonnte-token-abc';

      let capturedUrl = '';
      let capturedHeaders: any = {};
      let capturedBody: any = null;

      global.fetch = vi.fn().mockImplementation(async (url, init) => {
        capturedUrl = String(url);
        capturedHeaders = init?.headers;
        capturedBody = init?.body;

        return {
          ok: true,
          status: 200,
          json: async () => ({
            status: true,
            id: ['msg-12345'],
            target: ['6281234567890'],
          }),
        };
      });

      const res = await sendWhatsAppMessage({
        target: '0812-3456-7890',
        message: 'Pesanan Anda telah kami terima.',
        delay: '3',
      });

      expect(capturedUrl).toBe('https://api.fonnte.com/send');
      // Token langsung tanpa "Bearer" sesuai dokumentasi Fonnte
      expect(capturedHeaders.Authorization).toBe('test-fonnte-token-abc');
      expect(capturedHeaders.Authorization).not.toContain('Bearer');

      // Target dinormalisasi ke 62...
      const bodyParams = new URLSearchParams(capturedBody);
      expect(bodyParams.get('target')).toBe('6281234567890');
      expect(bodyParams.get('countryCode')).toBe('62');

      expect(res.success).toBe(true);
      expect(res.providerMessageId).toBe('msg-12345');
    });

    it('Parameter delay dipastikan bertipe string ketika dikirim untuk target jamak', async () => {
      process.env.WA_MODE = 'fonnte';
      process.env.FONNTE_TOKEN = 'test-token';

      let capturedBody: any = null;
      global.fetch = vi.fn().mockImplementation(async (_, init) => {
        capturedBody = init?.body;
        return {
          ok: true,
          status: 200,
          json: async () => ({ status: true, id: 'multi-1' }),
        };
      });

      await sendWhatsAppMessage({
        target: ['081234567890', '085712345678'],
        message: 'Pengumuman promo',
        delay: '5',
      });

      const bodyParams = new URLSearchParams(capturedBody);
      expect(bodyParams.get('delay')).toBe('5');
      expect(typeof bodyParams.get('delay')).toBe('string');
      expect(bodyParams.get('target')).toBe('6281234567890,6285712345678');
    });

    it('checkFonnteDeviceStatus mengembalikan status simulasi saat mode non-fonnte', async () => {
      process.env.WA_MODE = 'mock';
      const status = await checkFonnteDeviceStatus();
      expect(status.status).toBe(true);
      expect(status.deviceStatus).toBe('connect');
      expect(status.quota).toBeGreaterThan(0);
    });
  });

  describe('4. Template Pesan WhatsApp Bahasa Indonesia & Awalan [UJI]', () => {
    it('Template pesanan reguler tidak menyertakan awalan [UJI]', () => {
      const msg = templates.paymentConfirmedBuyer({
        orderCode: 'LVR-20261102-1234',
        customerName: 'Anisa',
        total: 150000,
        trackUrl: 'https://luvira.id/track?code=LVR-20261102-1234',
        isTest: false,
      });

      expect(msg).not.toContain('[UJI]');
      expect(msg).toContain('LVR-20261102-1234');
      expect(msg).toContain('Rp 150.000');
      expect(msg).toContain('https://luvira.id/track?code=LVR-20261102-1234');
    });

    it('Template pesanan uji (isTest=true) WAJIB diawali awalan [UJI]', () => {
      const msgBuyer = templates.paymentConfirmedBuyer({
        orderCode: 'LVR-TEST-001',
        customerName: 'Tester',
        total: 0,
        trackUrl: 'https://luvira.id/track?code=LVR-TEST-001',
        isTest: true,
      });
      expect(msgBuyer).toContain('[UJI]');

      const msgShipped = templates.orderShippedBuyer({
        orderCode: 'LVR-TEST-001',
        customerName: 'Tester',
        courier: 'JNE',
        trackingNumber: 'TEST-RESI-123',
        trackUrl: 'https://luvira.id/track',
        isTest: true,
      });
      expect(msgShipped).toContain('[UJI]');

      const msgAdmin = templates.newOrderAdmin({
        orderCode: 'LVR-TEST-001',
        total: 75000,
        regionName: 'Pusat',
        itemsSummary: 'Kaus Kaki Emboss x1',
        paymentMethod: 'TEST_SIMULATION',
        isTest: true,
      });
      expect(msgAdmin).toContain('[UJI]');
    });

    it('Template laporan lengkap ke WA (salesReportDigest) menghasilkan ringkasan omzet dan tautan bertoken', () => {
      const msg = templates.salesReportDigest({
        dateText: '02 November 2026',
        regionName: 'Yogyakarta',
        totalOrders: 15,
        totalItems: 42,
        totalDiscount: 35000,
        totalRevenue: 1560000,
        topProducts: [{ name: 'Emboss Split Toe Hitam', qty: 20 }],
        downloadUrl: 'https://luvira.id/api/reports/dl/token123',
        isTest: false,
      });

      expect(msg).toContain('LAPORAN PENJUALAN LUVIRA');
      expect(msg).toContain('02 November 2026');
      expect(msg).toContain('15 pesanan');
      expect(msg).toContain('42 pasang/pcs');
      expect(msg).toContain('Rp 1.560.000');
      expect(msg).toContain('Emboss Split Toe Hitam: *20 pcs*');
      expect(msg).toContain('token123');
    });
  });
});

