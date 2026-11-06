// lib/reports/report-token.ts
// ============================================================================
// Tokenized Short-Lived Link Engine Luvira 2.0 (FT-6, Asumsi F9)
// Menghasilkan token acak berumur 15 menit, sekali pakai / dibatasi waktu,
// untuk mengunduh laporan tanpa mengekspos data keuangan di URL publik permanen.
// ============================================================================

import crypto from 'crypto';

interface EphemeralReportToken {
  token: string;
  userId: string;
  scopeType: 'GLOBAL' | 'REGION' | 'RESELLER';
  scopeId?: string | null;
  reportType: 'RINGKAS_HARIAN' | 'MINGGUAN' | 'BULANAN';
  createdAt: number;
  expiresAt: number;
  used: boolean;
}

// In-Memory Token Store dengan pembersihan otomatis
const tokenStore = new Map<string, EphemeralReportToken>();

const TOKEN_LIFETIME_MS = 15 * 60 * 1000; // 15 menit (Asumsi F9)

/**
 * Buat token unduhan jangka pendek (15 menit)
 */
export function createReportDownloadToken(params: {
  userId: string;
  scopeType: 'GLOBAL' | 'REGION' | 'RESELLER';
  scopeId?: string | null;
  reportType: 'RINGKAS_HARIAN' | 'MINGGUAN' | 'BULANAN';
}): string {
  // Bersihkan token yang kedaluwarsa
  cleanupExpiredTokens();

  const token = crypto.randomBytes(24).toString('hex');
  const now = Date.now();

  tokenStore.set(token, {
    token,
    userId: params.userId,
    scopeType: params.scopeType,
    scopeId: params.scopeId,
    reportType: params.reportType,
    createdAt: now,
    expiresAt: now + TOKEN_LIFETIME_MS,
    used: false,
  });

  return token;
}

/**
 * Validasi dan gunakan token unduhan (sekali pakai atau batas 15 menit)
 */
export function consumeReportDownloadToken(token: string): EphemeralReportToken | null {
  if (!token || typeof token !== 'string') return null;

  const data = tokenStore.get(token);
  if (!data) return null;

  // Periksa apakah sudah kedaluwarsa
  if (Date.now() > data.expiresAt) {
    tokenStore.delete(token);
    return null;
  }

  // Tandai sudah dipakai (sekali pakai)
  data.used = true;
  tokenStore.delete(token);

  return data;
}

/**
 * Periksa status token tanpa mengonsumsinya (untuk pengujian)
 */
export function peekReportDownloadToken(token: string): EphemeralReportToken | null {
  const data = tokenStore.get(token);
  if (!data) return null;
  if (Date.now() > data.expiresAt) return null;
  return data;
}

/**
 * Bersihkan seluruh token lama
 */
function cleanupExpiredTokens(): void {
  const now = Date.now();
  for (const [key, val] of tokenStore.entries()) {
    if (now > val.expiresAt) {
      tokenStore.delete(key);
    }
  }
}

