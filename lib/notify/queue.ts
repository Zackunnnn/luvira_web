// lib/notify/queue.ts
// ============================================================================
// WhatsApp Outbox Queue & Dispatcher - FT-1
// Mengelola antrean WaOutbox, kunci idempoten, jeda minimal, dan batas harian
// ============================================================================

import { prisma } from '@/lib/db';
import { normalizeWhatsAppNumber } from '@/lib/whatsapp';
import { sendWhatsAppMessage } from '@/lib/notify/whatsapp';
import { WaOutboxStatus } from '@prisma/client';

export interface EnqueueWhatsAppParams {
  target: string;
  message: string;
  fileUrl?: string;
  filename?: string;
  relatedType?: string; // e.g. "ORDER", "REPORT", "STOCK", "COD"
  relatedId?: string;
  idempotencyKey?: string;
  scheduledAt?: Date;
}

export interface DispatchQueueOptions {
  limit?: number;
  minIntervalMs?: number;
  dailyCap?: number;
}

export interface DispatchResult {
  processed: number;
  sent: number;
  failed: number;
  retried: number;
  dailyCapReached: boolean;
  errors: Array<{ id: string; target: string; error: string }>;
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Memasukkan pesan ke antrean WaOutbox dengan proteksi kunci idempoten.
 * Jangan pernah mengirim pesan WA secara langsung dari request pengguna!
 */
export async function enqueueWhatsAppNotification(
  params: EnqueueWhatsAppParams
): Promise<{ success: boolean; outboxId?: string; isDuplicate?: boolean; error?: string }> {
  try {
    const cleanTarget = normalizeWhatsAppNumber(params.target);
    if (!cleanTarget) {
      return { success: false, error: 'Nomor WhatsApp tujuan kosong atau tidak valid.' };
    }

    // 1. Pemeriksaan Kunci Idempoten (mencegah pengiriman ganda untuk peristiwa yang sama)
    if (params.idempotencyKey) {
      const existing = await prisma.waOutbox.findUnique({
        where: { idempotencyKey: params.idempotencyKey },
      });

      if (existing) {
        return {
          success: true,
          outboxId: existing.id,
          isDuplicate: true,
        };
      }
    }

    // 2. Buat entri antrean baru dengan status PENDING
    const record = await prisma.waOutbox.create({
      data: {
        target: cleanTarget,
        message: params.message,
        fileUrl: params.fileUrl || null,
        filename: params.filename || null,
        status: WaOutboxStatus.PENDING,
        attempts: 0,
        idempotencyKey: params.idempotencyKey || null,
        scheduledAt: params.scheduledAt || null,
        relatedType: params.relatedType || null,
        relatedId: params.relatedId || null,
      },
    });

    return {
      success: true,
      outboxId: record.id,
      isDuplicate: false,
    };
  } catch (error: any) {
    console.error('[Enqueue WA Error]', error);
    return { success: false, error: error.message || 'Gagal memasukkan pesan ke antrean outbox.' };
  }
}

/**
 * Memproses dan mendispatch pesan dari antrean WaOutbox.
 * Dipanggil oleh route cron /api/cron/wa-dispatch secara berkala.
 */
export async function dispatchWaQueue(options?: DispatchQueueOptions): Promise<DispatchResult> {
  const minInterval = options?.minIntervalMs ?? parseInt(process.env.FONNTE_MIN_INTERVAL_MS || '4000', 10);
  const dailyCap = options?.dailyCap ?? parseInt(process.env.FONNTE_DAILY_CAP || '1000', 10);
  const batchLimit = options?.limit ?? 25;

  const result: DispatchResult = {
    processed: 0,
    sent: 0,
    failed: 0,
    retried: 0,
    dailyCapReached: false,
    errors: [],
  };

  try {
    // 1. Cek Kuota Pengiriman Hari Ini
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const sentTodayCount = await prisma.waOutbox.count({
      where: {
        status: WaOutboxStatus.SENT,
        sentAt: { gte: todayStart },
      },
    });

    if (sentTodayCount >= dailyCap) {
      result.dailyCapReached = true;
      console.warn(`[WA Dispatcher] Batas harian (${dailyCap}) tercapai. Pengiriman ditunda.`);
      return result;
    }

    const availableQuota = dailyCap - sentTodayCount;
    const fetchLimit = Math.min(batchLimit, availableQuota);

    // 2. Ambil Pesanan PENDING yang siap dikirim
    const now = new Date();
    const pendingMessages = await prisma.waOutbox.findMany({
      where: {
        status: WaOutboxStatus.PENDING,
        attempts: { lt: 3 },
        OR: [
          { scheduledAt: null },
          { scheduledAt: { lte: now } },
        ],
      },
      orderBy: { createdAt: 'asc' },
      take: fetchLimit,
    });

    if (pendingMessages.length === 0) {
      return result;
    }

    // 3. Eksekusi Pengiriman Berurutan dengan Jeda Antar Pesan
    for (let i = 0; i < pendingMessages.length; i++) {
      const item = pendingMessages[i];

      // Berikan jeda FONNTE_MIN_INTERVAL_MS antar pesan (kecuali pesan pertama)
      if (i > 0 && minInterval > 0) {
        await sleep(minInterval);
      }

      // Tandai SENDING
      await prisma.waOutbox.update({
        where: { id: item.id },
        data: { status: WaOutboxStatus.SENDING },
      });

      result.processed++;

      // Kirim lewat adapter
      const sendRes = await sendWhatsAppMessage({
        target: item.target,
        message: item.message,
        url: item.fileUrl || undefined,
        filename: item.filename || undefined,
      });

      if (sendRes.success) {
        // Berhasil dikirim
        await prisma.waOutbox.update({
          where: { id: item.id },
          data: {
            status: WaOutboxStatus.SENT,
            sentAt: new Date(),
            providerMessageId: sendRes.providerMessageId || null,
            lastError: null,
          },
        });
        result.sent++;
      } else {
        // Gagal dikirim
        const nextAttempts = item.attempts + 1;
        const isTemporary = Boolean(sendRes.isTemporary);

        // Jika galat sementara dan attempts < 3 -> coba lagi nanti (kembalikan ke PENDING)
        // Jika galat permanen atau sudah 3 kali gagal -> tandai FAILED
        const nextStatus = (isTemporary && nextAttempts < 3) ? WaOutboxStatus.PENDING : WaOutboxStatus.FAILED;

        await prisma.waOutbox.update({
          where: { id: item.id },
          data: {
            status: nextStatus,
            attempts: nextAttempts,
            lastError: sendRes.reason || 'Pengiriman gagal',
          },
        });

        if (nextStatus === WaOutboxStatus.PENDING) {
          result.retried++;
        } else {
          result.failed++;
        }

        result.errors.push({
          id: item.id,
          target: item.target,
          error: sendRes.reason || 'Galat tidak diketahui',
        });
      }
    }

    return result;
  } catch (error: any) {
    console.error('[WA Dispatcher Loop Error]', error);
    return result;
  }
}

