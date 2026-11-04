// tests/unit/wa-reports-scheduler.test.ts
// ============================================================================
// FT-6 Unit Tests: Penjadwal Laporan WhatsApp, Zona Waktu WIB, & Token Unduh
// ============================================================================

import { describe, it, expect } from 'vitest';
import {
  getWibComponents,
  generatePeriodKey,
  isSubscriptionDue,
} from '@/lib/reports/report-scheduler';
import {
  createReportDownloadToken,
  consumeReportDownloadToken,
  peekReportDownloadToken,
} from '@/lib/reports/report-token';
import { ReportType } from '@prisma/client';

describe('FT-6 Unit Tests: Report Scheduler & Token Engine', () => {
  describe('getWibComponents & generatePeriodKey', () => {
    it('mengonversi waktu UTC ke zona waktu Asia/Jakarta (UTC+7) secara presisi', () => {
      // 01:00 UTC = 08:00 WIB
      const utcDate = new Date('2026-11-04T01:30:00.000Z');
      const wib = getWibComponents(utcDate);

      expect(wib.hours).toBe(8);
      expect(wib.minutes).toBe(30);
      expect(wib.hhmm).toBe('08:30');
      expect(wib.year).toBe(2026);
      expect(wib.month).toBe(11);
      expect(wib.day).toBe(4);
    });

    it('menghasilkan periodKey yang sesuai untuk masing-masing tipe laporan', () => {
      const utcDate = new Date('2026-11-04T01:30:00.000Z'); // 4 Nov 2026

      const dailyKey = generatePeriodKey(ReportType.RINGKAS_HARIAN, utcDate);
      expect(dailyKey).toBe('2026-11-04');

      const weeklyKey = generatePeriodKey(ReportType.MINGGUAN, utcDate);
      expect(weeklyKey).toMatch(/^2026-W\d{2}$/);

      const monthlyKey = generatePeriodKey(ReportType.BULANAN, utcDate);
      expect(monthlyKey).toBe('2026-11');
    });

    it('mendeteksi akhir bulan untuk penanganan tanggal 31 di bulan pendek', () => {
      // 28 Feb 2026 pukul 12:00 UTC (19:00 WIB)
      const febEnd = new Date('2026-02-28T12:00:00.000Z');
      const wibFeb = getWibComponents(febEnd);
      expect(wibFeb.isEndOfMonth).toBe(true);

      // 15 Feb 2026 bukan akhir bulan
      const febMid = new Date('2026-02-15T12:00:00.000Z');
      const wibMid = getWibComponents(febMid);
      expect(wibMid.isEndOfMonth).toBe(false);
    });
  });

  describe('isSubscriptionDue (Evaluasi Jatuh Tempo & Idempotensi)', () => {
    it('mengembalikan isDue = true ketika waktu WIB cocok dan belum pernah dikirim', () => {
      // Waktu saat ini: 08:05 WIB
      const nowWib = new Date('2026-11-04T01:05:00.000Z');

      const sub = {
        reportType: ReportType.RINGKAS_HARIAN,
        sendTime: '08:00',
        isActive: true,
        lastSentPeriodKey: null,
      };

      const result = isSubscriptionDue(sub, nowWib, 30);
      expect(result.isDue).toBe(true);
      expect(result.periodKey).toBe('2026-11-04');
    });

    it('mengembalikan isDue = false jika sudah pernah terkirim di periode yang sama (Idempoten)', () => {
      const nowWib = new Date('2026-11-04T01:05:00.000Z');

      const sub = {
        reportType: ReportType.RINGKAS_HARIAN,
        sendTime: '08:00',
        isActive: true,
        lastSentPeriodKey: '2026-11-04', // Sudah terkirim hari ini
      };

      const result = isSubscriptionDue(sub, nowWib, 30);
      expect(result.isDue).toBe(false);
      expect(result.reason).toContain('sudah pernah dikirim');
    });

    it('mengembalikan isDue = false jika berada di luar jendela waktu kirim', () => {
      // Waktu saat ini: 14:00 WIB, target kirim: 08:00 WIB
      const nowWib = new Date('2026-11-04T07:00:00.000Z');

      const sub = {
        reportType: ReportType.RINGKAS_HARIAN,
        sendTime: '08:00',
        isActive: true,
        lastSentPeriodKey: null,
      };

      const result = isSubscriptionDue(sub, nowWib, 30);
      expect(result.isDue).toBe(false);
      expect(result.reason).toContain('Belum/lewat waktu kirim');
    });

    it('memvalidasi hari pengiriman untuk laporan MINGGUAN', () => {
      // Rabu, 4 Nov 2026 (dayOfWeek: 3) pukul 08:00 WIB
      const nowWib = new Date('2026-11-04T01:00:00.000Z');

      const subSenin = {
        reportType: ReportType.MINGGUAN,
        sendTime: '08:00',
        dayOfWeek: 1, // Target: Senin
        isActive: true,
        lastSentPeriodKey: null,
      };

      const subRabu = {
        reportType: ReportType.MINGGUAN,
        sendTime: '08:00',
        dayOfWeek: 3, // Target: Rabu
        isActive: true,
        lastSentPeriodKey: null,
      };

      expect(isSubscriptionDue(subSenin, nowWib).isDue).toBe(false);
      expect(isSubscriptionDue(subRabu, nowWib).isDue).toBe(true);
    });

    it('memvalidasi tanggal bulanan termasuk fallback hari terakhir bulan pendek', () => {
      // 28 Feb 2026 pukul 08:00 WIB
      const feb28 = new Date('2026-02-28T01:00:00.000Z');

      const subBulananTgl31 = {
        reportType: ReportType.BULANAN,
        sendTime: '08:00',
        dayOfMonth: 31, // Target: Tanggal 31
        isActive: true,
        lastSentPeriodKey: null,
      };

      // Karena 28 Feb adalah akhir bulan, tanggal 31 otomatis jatuh tempo
      expect(isSubscriptionDue(subBulananTgl31, feb28).isDue).toBe(true);
    });
  });

  describe('Report Download Token Engine (Asumsi F9)', () => {
    it('menghasilkan token acak yang dapat divalidasi dan sekali pakai', () => {
      const token = createReportDownloadToken({
        userId: 'user-test-123',
        scopeType: 'GLOBAL',
        reportType: 'RINGKAS_HARIAN',
      });

      expect(token).toBeDefined();
      expect(token.length).toBe(48); // 24 bytes hex

      // Peek tanpa konsumsi
      const peeked = peekReportDownloadToken(token);
      expect(peeked?.userId).toBe('user-test-123');

      // Konsumsi token pertama kali -> sukses
      const consumed = consumeReportDownloadToken(token);
      expect(consumed?.userId).toBe('user-test-123');

      // Konsumsi token kedua kali -> gagal (sekali pakai)
      const consumedAgain = consumeReportDownloadToken(token);
      expect(consumedAgain).toBeNull();
    });

    it('menolak token palsu atau tidak dikenal', () => {
      expect(consumeReportDownloadToken('fake-token-xyz')).toBeNull();
      expect(consumeReportDownloadToken('')).toBeNull();
    });
  });
});
