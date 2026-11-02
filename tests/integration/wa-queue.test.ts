// tests/integration/wa-queue.test.ts
// ============================================================================
// Integration Test: WhatsApp Queue, Idempotency, Daily Cap & waConsent (FT-1)
// ============================================================================

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { enqueueWhatsAppNotification, dispatchWaQueue } from '@/lib/notify/queue';
import {
  notifyPaymentConfirmed,
  notifyOrderShipped,
  notifyOrderExpired,
} from '@/lib/notify/order-events';
import { prisma } from '@/lib/db';
import * as whatsappAdapter from '@/lib/notify/whatsapp';
import { WaOutboxStatus } from '@prisma/client';

// Mock database prisma
vi.mock('@/lib/db', () => {
  const store = new Map<string, any>();
  return {
    prisma: {
      waOutbox: {
        findUnique: vi.fn(async ({ where }) => {
          if (where.idempotencyKey) {
            for (const item of store.values()) {
              if (item.idempotencyKey === where.idempotencyKey) return item;
            }
          }
          if (where.id) return store.get(where.id) || null;
          return null;
        }),
        findMany: vi.fn(async () => Array.from(store.values()).filter(x => x.status === WaOutboxStatus.PENDING)),
        create: vi.fn(async ({ data }) => {
          const id = `outbox-${Date.now()}-${Math.random()}`;
          const record = { id, ...data, createdAt: new Date() };
          store.set(id, record);
          return record;
        }),
        update: vi.fn(async ({ where, data }) => {
          const item = store.get(where.id);
          if (item) {
            Object.assign(item, data);
            return item;
          }
          return { id: where.id, ...data };
        }),
        count: vi.fn(async ({ where }) => {
          if (where?.status === WaOutboxStatus.SENT) return 0;
          return store.size;
        }),
      },
      user: {
        findFirst: vi.fn(async () => ({ phone: '6281299990000' })),
      },
    },
  };
});

describe('Integrasi: Antrean WhatsApp WaOutbox & Kebijakan FT-1', () => {
  beforeEach(() => {
    process.env.WA_MODE = 'mock';
    vi.clearAllMocks();
  });

  describe('1. Kunci Idempoten (Idempotency Key)', () => {
    it('Mencegah duplikasi: Enqueue dengan kunci idempoten yang sama tidak membuat pesan baru', async () => {
      const payload = {
        target: '081234567890',
        message: 'Halo, pesanan Anda dikonfirmasi!',
        idempotencyKey: 'idemp-order-12345',
        relatedType: 'ORDER',
        relatedId: 'ord-12345',
      };

      // Panggilan 1 -> Sukses dibuat
      const res1 = await enqueueWhatsAppNotification(payload);
      expect(res1.success).toBe(true);
      expect(res1.isDuplicate).toBe(false);
      expect(res1.outboxId).toBeDefined();

      // Panggilan 2 dengan kunci idempoten yang persis sama -> Dikembalikan entri yang sama
      const res2 = await enqueueWhatsAppNotification(payload);
      expect(res2.success).toBe(true);
      expect(res2.isDuplicate).toBe(true);
      expect(res2.outboxId).toBe(res1.outboxId);
    });
  });

  describe('2. Aturan Mutlak waConsent Pembeli (HANYA kirim jika pembeli mencentang)', () => {
    const mockOrderNoConsent = {
      id: 'ord-noconsent-1',
      code: 'LVR-NOCONSENT-001',
      customerName: 'Budi Pembeli',
      customerPhone: '081234567890',
      totalPrice: 150000,
      waConsent: false, // Pembeli TIDAK mencentang WA
    };

    const mockOrderWithConsent = {
      id: 'ord-withconsent-1',
      code: 'LVR-WITHCONSENT-001',
      customerName: 'Siti Pembeli',
      customerPhone: '081234567891',
      totalPrice: 200000,
      waConsent: true, // Pembeli mencentang WA
    };

    it('notifyPaymentConfirmed MENOLAK mengirim WA jika waConsent=false', async () => {
      const res = await notifyPaymentConfirmed(mockOrderNoConsent);
      expect(res).toBeDefined();
      expect((res as any).skipped).toBe(true);
      expect((res as any).reason).toContain('waConsent=false');
    });

    it('notifyOrderShipped MENOLAK mengirim WA jika waConsent=false', async () => {
      const res = await notifyOrderShipped(mockOrderNoConsent, 'JNE', 'RESI-123');
      expect((res as any).skipped).toBe(true);
    });

    it('notifyOrderExpired MENOLAK mengirim WA jika waConsent=false', async () => {
      const res = await notifyOrderExpired(mockOrderNoConsent);
      expect((res as any).skipped).toBe(true);
    });

    it('notifyPaymentConfirmed BERHASIL memasukkan pesan ke outbox jika waConsent=true', async () => {
      const res = await notifyPaymentConfirmed(mockOrderWithConsent);
      expect(res).toBeDefined();
      expect((res as any)?.success).toBe(true);
      expect((res as any)?.outboxId).toBeDefined();
    });
  });

  describe('3. Batas Harian (Daily Cap) Dispatcher', () => {
    it('Hentikan pengiriman jika jumlah pesan terkirim hari ini telah mencapai batas harian', async () => {
      // Mock count SENT today >= dailyCap
      vi.mocked(prisma.waOutbox.count).mockResolvedValueOnce(100);

      const res = await dispatchWaQueue({ dailyCap: 100, limit: 10 });
      expect(res.dailyCapReached).toBe(true);
      expect(res.processed).toBe(0);
      expect(res.sent).toBe(0);
    });
  });

  describe('4. Mekanisme Retry & Penanganan Galat Sementara vs Permanen', () => {
    it('Galat sementara (misal server timeout) mempertahankan status PENDING dan menaikkan attempts', async () => {
      vi.mocked(prisma.waOutbox.count).mockResolvedValueOnce(0);
      vi.mocked(prisma.waOutbox.findMany).mockResolvedValueOnce([
        {
          id: 'outbox-temp-1',
          target: '6281234567890',
          message: 'Pesan uji coba',
          fileUrl: null,
          filename: null,
          status: WaOutboxStatus.PENDING,
          attempts: 0,
          idempotencyKey: null,
          scheduledAt: null,
          relatedType: null,
          relatedId: null,
          lastError: null,
          providerMessageId: null,
          createdAt: new Date(),
          sentAt: null,
        },
      ]);

      // Mock adapter gagal sementara
      vi.spyOn(whatsappAdapter, 'sendWhatsAppMessage').mockResolvedValueOnce({
        success: false,
        reason: 'Perangkat WhatsApp pada Fonnte terputus.',
        isTemporary: true,
      });

      const res = await dispatchWaQueue({ minIntervalMs: 0 });
      expect(res.processed).toBe(1);
      expect(res.sent).toBe(0);
      expect(res.retried).toBe(1); // Dijadwalkan coba ulang
      expect(res.failed).toBe(0);
    });

    it('Galat permanen (nomor tidak valid) langsung mengubah status menjadi FAILED', async () => {
      vi.mocked(prisma.waOutbox.count).mockResolvedValueOnce(0);
      vi.mocked(prisma.waOutbox.findMany).mockResolvedValueOnce([
        {
          id: 'outbox-perm-1',
          target: '6281234567890',
          message: 'Pesan uji coba',
          fileUrl: null,
          filename: null,
          status: WaOutboxStatus.PENDING,
          attempts: 0,
          idempotencyKey: null,
          scheduledAt: null,
          relatedType: null,
          relatedId: null,
          lastError: null,
          providerMessageId: null,
          createdAt: new Date(),
          sentAt: null,
        },
      ]);

      // Mock adapter gagal permanen
      vi.spyOn(whatsappAdapter, 'sendWhatsAppMessage').mockResolvedValueOnce({
        success: false,
        reason: 'Nomor WhatsApp tujuan tidak valid.',
        isTemporary: false,
      });

      const res = await dispatchWaQueue({ minIntervalMs: 0 });
      expect(res.processed).toBe(1);
      expect(res.sent).toBe(0);
      expect(res.failed).toBe(1); // Gagal permanen
      expect(res.retried).toBe(0);
    });
  });
});
