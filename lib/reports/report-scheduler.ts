// lib/reports/report-scheduler.ts
// ============================================================================
// Penjadwal & Evaluator Langganan Laporan WhatsApp Luvira 2.0 (FT-6)
// Memeriksa waktu jatuh tempo menurut zona waktu Asia/Jakarta (WIB)
// Menghasilkan kunci idempoten (subscriptionId + periodKey) agar tidak ganda.
// ============================================================================

import { ReportType } from '@prisma/client';

export interface DueEvaluationResult {
  isDue: boolean;
  periodKey: string;
  reason?: string;
}

/**
 * Konversi waktu UTC ke komponen tanggal & jam di Asia/Jakarta (WIB)
 */
export function getWibComponents(date = new Date()): {
  year: number;
  month: number; // 1-12
  day: number; // 1-31
  dayOfWeek: number; // 0 (Minggu) - 6 (Sabtu)
  hours: number;
  minutes: number;
  hhmm: string;
  isEndOfMonth: boolean;
} {
  // Asia/Jakarta selalu UTC+7 tanpa DST
  const wibTime = new Date(date.getTime() + 7 * 3600 * 1000);

  const year = wibTime.getUTCFullYear();
  const month = wibTime.getUTCMonth() + 1;
  const day = wibTime.getUTCDate();
  const dayOfWeek = wibTime.getUTCDay();
  const hours = wibTime.getUTCHours();
  const minutes = wibTime.getUTCMinutes();

  const hhmm = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;

  // Cek apakah hari ini adalah hari terakhir dalam bulan tersebut
  const tomorrow = new Date(wibTime.getTime() + 24 * 3600 * 1000);
  const isEndOfMonth = tomorrow.getUTCMonth() + 1 !== month;

  return { year, month, day, dayOfWeek, hours, minutes, hhmm, isEndOfMonth };
}

/**
 * Bangkitkan periodKey untuk idempoten
 */
export function generatePeriodKey(reportType: ReportType, date = new Date()): string {
  const { year, month, day } = getWibComponents(date);
  const mStr = String(month).padStart(2, '0');
  const dStr = String(day).padStart(2, '0');

  if (reportType === ReportType.RINGKAS_HARIAN) {
    return `${year}-${mStr}-${dStr}`;
  } else if (reportType === ReportType.MINGGUAN) {
    // Nomor minggu ISO
    const wibTime = new Date(date.getTime() + 7 * 3600 * 1000);
    const startOfYear = new Date(Date.UTC(year, 0, 1));
    const weekNum = Math.ceil(((wibTime.getTime() - startOfYear.getTime()) / 86400000 + 1) / 7);
    return `${year}-W${String(weekNum).padStart(2, '0')}`;
  } else {
    // BULANAN
    return `${year}-${mStr}`;
  }
}

/**
 * Evaluasi apakah suatu langganan jatuh tempo untuk dikirim
 * cronToleranceMinutes: toleransi rentang menit untuk eksekusi cron (bawaan 30 menit)
 */
export function isSubscriptionDue(
  subscription: {
    reportType: ReportType;
    sendTime: string; // "HH:mm" WIB
    dayOfWeek?: number | null; // 0-6
    dayOfMonth?: number | null; // 1-31
    isActive: boolean;
    lastSentPeriodKey?: string | null;
  },
  now = new Date(),
  cronToleranceMinutes = 30
): DueEvaluationResult {
  if (!subscription.isActive) {
    return { isDue: false, periodKey: '', reason: 'Langganan tidak aktif.' };
  }

  const { dayOfWeek, day, hours, minutes, hhmm, isEndOfMonth } = getWibComponents(now);
  const periodKey = generatePeriodKey(subscription.reportType, now);

  // 1. Cek Idempoten: Apakah sudah pernah terkirim di periode ini?
  if (subscription.lastSentPeriodKey === periodKey) {
    return {
      isDue: false,
      periodKey,
      reason: `Laporan periode ${periodKey} sudah pernah dikirim sebelumnya.`,
    };
  }

  // 2. Parsir waktu target kirim (HH:mm)
  const [targetH, targetM] = (subscription.sendTime || '08:00').split(':').map((s) => parseInt(s, 10));
  const targetTotalMinutes = targetH * 60 + targetM;
  const currentTotalMinutes = hours * 60 + minutes;

  // Cek apakah waktu saat ini berada di dalam jendela kirim (current >= target && current <= target + tolerance)
  const diffMinutes = currentTotalMinutes - targetTotalMinutes;
  const isTimeWindow = diffMinutes >= 0 && diffMinutes <= cronToleranceMinutes;

  if (!isTimeWindow) {
    return {
      isDue: false,
      periodKey,
      reason: `Belum/lewat waktu kirim: target ${subscription.sendTime} WIB, saat ini ${hhmm} WIB.`,
    };
  }

  // 3. Cek spesifikasi hari untuk MINGGUAN dan BULANAN
  if (subscription.reportType === ReportType.MINGGUAN) {
    if (subscription.dayOfWeek !== null && subscription.dayOfWeek !== undefined) {
      if (dayOfWeek !== subscription.dayOfWeek) {
        return {
          isDue: false,
          periodKey,
          reason: `Bukan hari pengiriman mingguan (target: ${subscription.dayOfWeek}, saat ini: ${dayOfWeek}).`,
        };
      }
    }
  } else if (subscription.reportType === ReportType.BULANAN) {
    if (subscription.dayOfMonth !== null && subscription.dayOfMonth !== undefined) {
      // Jika target tanggal > 28 dan hari ini adalah akhir bulan (misal tgl 31 di bulan Februari), anggap jatuh tempo
      const isTargetDay = day === subscription.dayOfMonth || (subscription.dayOfMonth > day && isEndOfMonth);
      if (!isTargetDay) {
        return {
          isDue: false,
          periodKey,
          reason: `Bukan tanggal pengiriman bulanan (target: ${subscription.dayOfMonth}, saat ini: ${day}).`,
        };
      }
    }
  }

  return { isDue: true, periodKey };
}

