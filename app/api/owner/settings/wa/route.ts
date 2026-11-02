// app/api/owner/settings/wa/route.ts
// ============================================================================
// API Pengaturan & Monitoring WhatsApp Gateway Fonnte - FT-1
// Hak Akses: wa:settings (Owner Only)
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { can } from '@/lib/permissions';
import { checkFonnteDeviceStatus, sendWhatsAppMessage } from '@/lib/notify/whatsapp';
import { WaOutboxStatus } from '@prisma/client';
import { audit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 });
    }

    if (!can(user, 'wa:settings')) {
      return NextResponse.json({ error: 'Akses ditolak: Hanya Owner yang berhak mengakses pengaturan WhatsApp.' }, { status: 403 });
    }

    // 1. Status perangkat Fonnte
    const deviceStatus = await checkFonnteDeviceStatus();

    // 2. Statistik Antrean WaOutbox
    const [pendingCount, sendingCount, sentTodayCount, failedCount] = await Promise.all([
      prisma.waOutbox.count({ where: { status: WaOutboxStatus.PENDING } }),
      prisma.waOutbox.count({ where: { status: WaOutboxStatus.SENDING } }),
      prisma.waOutbox.count({
        where: {
          status: WaOutboxStatus.SENT,
          sentAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
        },
      }),
      prisma.waOutbox.count({ where: { status: WaOutboxStatus.FAILED } }),
    ]);

    // 3. Daftar 30 pesan antrean terbaru
    const recentOutbox = await prisma.waOutbox.findMany({
      orderBy: { createdAt: 'desc' },
      take: 30,
      select: {
        id: true,
        target: true,
        message: true,
        fileUrl: true,
        status: true,
        attempts: true,
        lastError: true,
        providerMessageId: true,
        relatedType: true,
        relatedId: true,
        createdAt: true,
        sentAt: true,
      },
    });

    const dailyCap = parseInt(process.env.FONNTE_DAILY_CAP || '1000', 10);
    const minIntervalMs = parseInt(process.env.FONNTE_MIN_INTERVAL_MS || '4000', 10);
    const waMode = process.env.WA_MODE || 'mock';

    return NextResponse.json({
      deviceStatus,
      stats: {
        pending: pendingCount,
        sending: sendingCount,
        sentToday: sentTodayCount,
        failed: failedCount,
        dailyCap,
        minIntervalMs,
        waMode,
      },
      outbox: recentOutbox,
    });
  } catch (error: any) {
    console.error('[API Owner WA Settings GET Error]', error);
    return NextResponse.json({ error: error.message || 'Gagal memuat pengaturan WhatsApp' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 });
    }

    if (!can(user, 'wa:settings')) {
      return NextResponse.json({ error: 'Akses ditolak: Hanya Owner yang berhak mengirim uji coba WhatsApp.' }, { status: 403 });
    }

    const body = await request.json();
    const { action, target, testMessage, outboxId } = body;

    // Aksi 1: Coba ulang pesan outbox yang gagal secara manual
    if (action === 'RETRY' && outboxId) {
      const record = await prisma.waOutbox.findUnique({ where: { id: outboxId } });
      if (!record) {
        return NextResponse.json({ error: 'Pesan antrean tidak ditemukan' }, { status: 404 });
      }

      const updated = await prisma.waOutbox.update({
        where: { id: outboxId },
        data: {
          status: WaOutboxStatus.PENDING,
          attempts: 0,
          lastError: null,
        },
      });

      await audit({
        actor: { id: user.id, name: user.name, role: user.role },
        action: 'RETRY_WA_OUTBOX',
        entity: 'WaOutbox',
        entityId: outboxId,
      });

      return NextResponse.json({ success: true, message: 'Pesan berhasil dimasukkan kembali ke antrean PENDING.', outbox: updated });
    }

    // Aksi 2: Kirim Pesan Uji Coba Langsung
    if (action === 'SEND_TEST') {
      if (!target?.trim()) {
        return NextResponse.json({ error: 'Nomor WhatsApp tujuan uji coba wajib diisi.' }, { status: 400 });
      }

      const res = await sendWhatsAppMessage({
        target: target.trim(),
        message: testMessage || 'Halo! Ini adalah pesan uji coba integrasi WhatsApp gateway Fonnte dari Luvira 2.0.',
      });

      await audit({
        actor: { id: user.id, name: user.name, role: user.role },
        action: 'SEND_TEST_WA',
        entity: 'WaOutbox',
        entityId: res.providerMessageId || 'direct-test',
        after: { target, success: res.success, reason: res.reason },
      });

      return NextResponse.json({
        success: res.success,
        message: res.success ? 'Pesan uji coba berhasil dikirim/disimulasikan!' : `Gagal: ${res.reason}`,
        providerMessageId: res.providerMessageId,
      });
    }

    return NextResponse.json({ error: 'Aksi tidak dikenali.' }, { status: 400 });
  } catch (error: any) {
    console.error('[API Owner WA Settings POST Error]', error);
    return NextResponse.json({ error: error.message || 'Gagal memproses aksi WhatsApp' }, { status: 500 });
  }
}

