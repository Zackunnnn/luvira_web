// lib/logging/error-logger.ts
import { prisma } from '@/lib/db';

interface ServerErrorLogPayload {
  message: string;
  stackTrace?: string;
  route?: string;
  method?: string;
  statusCode?: number;
  payload?: any;
}

// In-memory rate limiting to prevent database flooding from cascading errors
// Max 30 errors per route per 60 seconds
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const MAX_ERRORS_PER_WINDOW = 30;
const errorCounts = new Map<string, { count: number; resetAt: number }>();

/**
 * Mencatat error sisi server ke tabel ErrorLog dengan proteksi pembatasan laju (rate limiting).
 */
export async function logServerError(data: ServerErrorLogPayload): Promise<boolean> {
  try {
    const routeKey = `${data.method || 'GET'}:${data.route || 'unknown'}`;
    const now = Date.now();

    const rateInfo = errorCounts.get(routeKey);
    if (rateInfo) {
      if (now < rateInfo.resetAt) {
        if (rateInfo.count >= MAX_ERRORS_PER_WINDOW) {
          // Melewati pencatatan ke DB karena batas laju terlampaui
          return false;
        }
        rateInfo.count++;
      } else {
        errorCounts.set(routeKey, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
      }
    } else {
      errorCounts.set(routeKey, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    }

    await prisma.errorLog.create({
      data: {
        message: data.message.slice(0, 5000), // Batasi panjang pesan
        stackTrace: data.stackTrace ? data.stackTrace.slice(0, 10000) : null,
        route: data.route ? data.route.slice(0, 255) : null,
        method: data.method ? data.method.slice(0, 10) : null,
        statusCode: data.statusCode || 500,
        payload: data.payload ? (typeof data.payload === 'object' ? data.payload : { raw: data.payload }) : undefined,
      },
    });

    return true;
  } catch (err) {
    // Fail-safe: jika pencatatan ke DB gagal, jangan pernah melempar unhandled exception
    console.error('⚠️ [ErrorLogger] Gagal menyimpan error ke database:', err);
    return false;
  }
}
