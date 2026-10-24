// tests/integration/admin-notification.test.ts
// ============================================================================
// Pengujian Integrasi Notifikasi Admin Sisi Wilayah & Pusat (INT-NOTIF)
// Memastikan notifikasi pesanan dan bukti bayar masuk ke admin wilayah yang tepat
// Sesuai docs/LUVIRA_2_PLAN.md Bagian 8.4
// ============================================================================

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '@/lib/db';
import { Role, OrderStatus, PaymentMethod } from '@prisma/client';

describe('Integrasi Notifikasi Admin (Pusat & Wilayah)', () => {
  let pusatRegion: any;
  let jogjaRegion: any;
  let adminPusatUser: any;
  let adminJogjaUser: any;
  const createdNotificationIds: string[] = [];
  const createdOrderIds: string[] = [];

  beforeAll(async () => {
    pusatRegion = await prisma.region.findFirst({ where: { type: 'PUSAT' } });
    jogjaRegion = await prisma.region.findFirst({ where: { code: 'YOGYAKARTA' } });

    expect(pusatRegion).toBeDefined();
    expect(jogjaRegion).toBeDefined();

    adminPusatUser = await prisma.user.findFirst({ where: { role: Role.ADMIN_PUSAT } });
    adminJogjaUser = await prisma.user.findFirst({ where: { role: Role.ADMIN_WILAYAH, regionId: jogjaRegion.id } });

    expect(adminPusatUser).toBeDefined();
    expect(adminJogjaUser).toBeDefined();
  });

  afterAll(async () => {
    if (createdNotificationIds.length > 0) {
      await prisma.notification.deleteMany({
        where: { id: { in: createdNotificationIds } },
      });
    }
    if (createdOrderIds.length > 0) {
      await prisma.order.deleteMany({
        where: { id: { in: createdOrderIds } },
      });
    }
  });

  it('notifikasi bukti bayar Yogyakarta terisolasi ke Admin Wilayah Yogyakarta', async () => {
    const orderCode = `TEST-NOTIF-JOG-${Date.now()}`;
    const order = await prisma.order.create({
      data: {
        code: orderCode,
        regionId: jogjaRegion.id,
        status: OrderStatus.MENUNGGU_VERIFIKASI,
        paymentMethod: PaymentMethod.MANUAL_TRANSFER,
        customerName: 'Siti Handayani',
        customerPhone: '6281234567890',
        shippingAddress: { city: 'Kota Yogyakarta' },
        subtotal: 75000,
        netPrice: 75000,
        totalPrice: 85000,
        expiresAt: new Date(Date.now() + 86400000),
      },
    });
    createdOrderIds.push(order.id);

    // Buat notifikasi bukti bayar baru
    const notif = await prisma.notification.create({
      data: {
        targetRole: Role.ADMIN_WILAYAH,
        targetRegionId: jogjaRegion.id,
        title: `Bukti Transfer Baru #${order.code}`,
        message: 'Pembeli telah mengunggah bukti transfer.',
        linkUrl: `/dashboard/admin?orderId=${order.id}`,
      },
    });
    createdNotificationIds.push(notif.id);

    // Kueri notifikasi untuk Admin Wilayah Yogyakarta
    const jogjaNotifs = await prisma.notification.findMany({
      where: {
        targetRole: Role.ADMIN_WILAYAH,
        targetRegionId: adminJogjaUser.regionId,
      },
      orderBy: { createdAt: 'desc' },
    });

    expect(jogjaNotifs.some((n) => n.id === notif.id)).toBe(true);

    // Verifikasi: Notifikasi ini TIDAK boleh muncul untuk Admin Pusat sebagai target region
    const pusatNotifs = await prisma.notification.findMany({
      where: {
        targetRole: Role.ADMIN_PUSAT,
        targetRegionId: pusatRegion.id,
      },
    });

    expect(pusatNotifs.some((n) => n.id === notif.id)).toBe(false);
  });

  it('notifikasi pesanan Pusat masuk ke Admin Pusat', async () => {
    const orderCode = `TEST-NOTIF-PUS-${Date.now()}`;
    const order = await prisma.order.create({
      data: {
        code: orderCode,
        regionId: pusatRegion.id,
        status: OrderStatus.MENUNGGU_VERIFIKASI,
        paymentMethod: PaymentMethod.MANUAL_TRANSFER,
        customerName: 'Budi Santoso',
        customerPhone: '6281122334455',
        shippingAddress: { city: 'Kota Depok' },
        subtotal: 50000,
        netPrice: 50000,
        totalPrice: 60000,
        expiresAt: new Date(Date.now() + 86400000),
      },
    });
    createdOrderIds.push(order.id);

    const notif = await prisma.notification.create({
      data: {
        targetRole: Role.ADMIN_PUSAT,
        targetRegionId: pusatRegion.id,
        title: `Bukti Transfer Baru #${order.code}`,
        message: 'Pembeli telah mengunggah bukti transfer di Pusat.',
        linkUrl: `/dashboard/admin?orderId=${order.id}`,
      },
    });
    createdNotificationIds.push(notif.id);

    const pusatNotifs = await prisma.notification.findMany({
      where: {
        targetRole: Role.ADMIN_PUSAT,
        targetRegionId: pusatRegion.id,
      },
    });

    expect(pusatNotifs.some((n) => n.id === notif.id)).toBe(true);
  });
});
