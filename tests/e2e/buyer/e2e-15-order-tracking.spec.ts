// tests/e2e/buyer/e2e-15-order-tracking.spec.ts
import { test, expect } from '@playwright/test';
import { prisma } from '@/lib/db';
import { OrderStatus } from '@prisma/client';

test.describe('E2E-15: Pelacakan Pesanan Terproteksi (Kode Pesanan + 4 Digit Terakhir WA)', () => {
  test('Otentikasi 4 digit terakhir nomor WhatsApp: tolak digit salah, izinkan digit benar', async ({ request }) => {
    const variant = await prisma.productVariant.findFirst({ include: { product: true } });

    // 1. Buat pesanan dengan nomor WhatsApp spesifik
    const orderRes = await request.post('/api/orders', {
      data: {
        customerName: 'Nurul Hidayah',
        customerPhone: '081298765432', // 4 digit terakhir: 5432
        destination: {
          provinceName: 'Jawa Barat',
          cityName: 'Kota Depok',
          street: 'Jl. Margonda Raya No. 88',
        },
        items: [{ productId: variant!.productId, variantId: variant!.id, quantity: 1 }],
        paymentMethod: 'MANUAL_TRANSFER',
      },
    });

    const { order } = await orderRes.json();
    const orderCode = order.code;

    // Tambahkan nomor resi simulasi oleh admin
    await prisma.order.update({
      where: { code: orderCode },
      data: {
        status: OrderStatus.DIKIRIM,
        courierCode: 'JNE',
        trackingNumber: 'JNELDX9988112233',
      },
    });

    // 2. Coba lacak dengan 4 digit nomor WA yang SALAH -> DITOLAK 403 (E2E-15)
    const trackWrongRes = await request.post(`/api/orders/${orderCode}/track`, {
      data: { phoneLast4: '0000' }, // Salah
    });
    expect(trackWrongRes.status()).toBe(403);
    const wrongData = await trackWrongRes.json();
    expect(wrongData.error).toContain('tidak cocok');

    // 3. Lacak dengan 4 digit nomor WA yang BENAR (5432) -> BERHASIL 200 (E2E-15)
    const trackRightRes = await request.post(`/api/orders/${orderCode}/track`, {
      data: { phoneLast4: '5432' }, // Benar
    });
    expect(trackRightRes.ok()).toBe(true);
    const rightData = await trackRightRes.json();
    expect(rightData.success).toBe(true);

    const tracking = rightData.order;
    expect(tracking.code).toBe(orderCode);
    expect(tracking.status).toBe(OrderStatus.DIKIRIM);
    expect(tracking.trackingNumber).toBe('JNELDX9988112233');
    expect(tracking.courierCode).toBe('JNE');
    expect(tracking.items.length).toBeGreaterThan(0);
    expect(tracking.timeline.length).toBeGreaterThan(0);
    expect(tracking.whatsappHelpUrl).toContain('https://wa.me/');
  });
});
