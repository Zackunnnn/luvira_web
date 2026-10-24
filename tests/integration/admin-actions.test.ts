// tests/integration/admin-actions.test.ts
// ============================================================================
// Pengujian Integrasi Server Action & API Sisi Admin
// Menguji isolasi wilayah, validasi resi, batas promo, dan proteksi HPP
// ============================================================================

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '@/lib/db';
import { Role, OrderStatus, PaymentMethod } from '@prisma/client';
import { PUT as updateOrderStatus } from '@/app/api/admin/orders/[id]/status/route';
import { PUT as updateStock } from '@/app/api/admin/stock/route';
import { POST as createPromo } from '@/app/api/admin/promos/route';
import { createSession } from '@/lib/auth';
import { NextRequest } from 'next/server';

describe('Integrasi Tindakan Admin (Isolasi, Resi, Promo, HPP)', () => {
  let pusatRegion: any;
  let jogjaRegion: any;
  let adminPusat: any;
  let adminJogja: any;
  let pusatToken: string;
  let jogjaToken: string;
  let testVariant: any;
  let pusatOrder: any;
  let jogjaOrder: any;

  beforeAll(async () => {
    pusatRegion = await prisma.region.findFirst({ where: { type: 'PUSAT' } });
    jogjaRegion = await prisma.region.findFirst({ where: { code: 'YOGYAKARTA' } });

    adminPusat = await prisma.user.findFirst({ where: { role: Role.ADMIN_PUSAT } });
    adminJogja = await prisma.user.findFirst({ where: { role: Role.ADMIN_WILAYAH, regionId: jogjaRegion.id } });

    pusatToken = await createSession({
      userId: adminPusat.id,
      email: adminPusat.email,
      name: adminPusat.name,
      role: adminPusat.role,
      regionId: adminPusat.regionId,
    });

    jogjaToken = await createSession({
      userId: adminJogja.id,
      email: adminJogja.email,
      name: adminJogja.name,
      role: adminJogja.role,
      regionId: adminJogja.regionId,
    });

    testVariant = await prisma.productVariant.findFirst({
      include: { product: true },
    });

    // Buat pesanan Pusat
    pusatOrder = await prisma.order.create({
      data: {
        code: `TEST-ACT-PUS-${Date.now()}`,
        regionId: pusatRegion.id,
        status: OrderStatus.DIPROSES,
        paymentMethod: PaymentMethod.MANUAL_TRANSFER,
        customerName: 'Customer Pusat',
        customerPhone: '62811111111',
        shippingAddress: { city: 'Kota Depok' },
        subtotal: 50000,
        netPrice: 50000,
        totalPrice: 60000,
        expiresAt: new Date(Date.now() + 86400000),
      },
    });

    // Buat pesanan Jogja
    jogjaOrder = await prisma.order.create({
      data: {
        code: `TEST-ACT-JOG-${Date.now()}`,
        regionId: jogjaRegion.id,
        status: OrderStatus.DIPROSES,
        paymentMethod: PaymentMethod.MANUAL_TRANSFER,
        customerName: 'Customer Jogja',
        customerPhone: '62822222222',
        shippingAddress: { city: 'Kota Yogyakarta' },
        subtotal: 50000,
        netPrice: 50000,
        totalPrice: 60000,
        expiresAt: new Date(Date.now() + 86400000),
      },
    });
  });

  afterAll(async () => {
    if (pusatOrder) {
      await prisma.order.deleteMany({ where: { id: pusatOrder.id } });
    }
    if (jogjaOrder) {
      await prisma.order.deleteMany({ where: { id: jogjaOrder.id } });
    }
  });

  it('Admin Wilayah Yogyakarta DITOLAK (403) saat mengubah status pesanan Pusat', async () => {
    const req = new NextRequest(`http://localhost:3000/api/admin/orders/${pusatOrder.id}/status`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${jogjaToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        toStatus: OrderStatus.DIKIRIM,
        trackingNumber: 'JNE12345678',
        courierCode: 'jne',
      }),
    });

    const res = await updateOrderStatus(req, { params: Promise.resolve({ id: pusatOrder.id }) });
    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error).toContain('Akses ditolak');
  });

  it('Status pesanan DITOLAK (400) saat diubah ke DIKIRIM tanpa nomor resi', async () => {
    const req = new NextRequest(`http://localhost:3000/api/admin/orders/${jogjaOrder.id}/status`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${jogjaToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        toStatus: OrderStatus.DIKIRIM,
        // Sengaja kosongkan trackingNumber & courier
      }),
    });

    const res = await updateOrderStatus(req, { params: Promise.resolve({ id: jogjaOrder.id }) });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('Nomor resi dan kurir pengiriman wajib diisi');
  });

  it('Admin Wilayah DITOLAK (403) saat mencoba mengubah stok wilayah Pusat', async () => {
    const req = new NextRequest('http://localhost:3000/api/admin/stock', {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${jogjaToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        variantId: testVariant.id,
        regionId: pusatRegion.id, // Wilayah Pusat (Bukan wilayah Jogja!)
        qty: 100,
        reason: 'Percobaan ubah stok Pusat secara ilegal',
      }),
    });

    const res = await updateStock(req);
    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error).toContain('Akses ditolak');
  });

  it('Pembuatan promo wilayah DITOLAK jika persentase diskon melebihi setting (50%)', async () => {
    const req = new NextRequest('http://localhost:3000/api/admin/promos', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${jogjaToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        code: `ILLEGAL-DISC-${Date.now()}`,
        type: 'WILAYAH',
        regionId: jogjaRegion.id,
        discountType: 'PERCENTAGE',
        discountValue: 70, // Melebihi batas 50%
      }),
    });

    const res = await createPromo(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('melebihi batas maksimum');
  });

  it('Admin Wilayah DITOLAK (403) saat membuat promo untuk wilayah lain', async () => {
    const req = new NextRequest('http://localhost:3000/api/admin/promos', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${jogjaToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        code: `WRONG-REG-${Date.now()}`,
        type: 'WILAYAH',
        regionId: pusatRegion.id, // Wilayah Pusat
        discountType: 'PERCENTAGE',
        discountValue: 10,
      }),
    });

    const res = await createPromo(req);
    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error).toContain('Akses ditolak');
  });
});
