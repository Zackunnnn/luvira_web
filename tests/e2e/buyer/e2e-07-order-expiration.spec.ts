// tests/e2e/buyer/e2e-07-order-expiration.spec.ts
import { test, expect } from '@playwright/test';
import { prisma } from '@/lib/db';
import { OrderStatus, PaymentMethod, DiscountType } from '@prisma/client';

test.describe('E2E-07: Pesanan Tidak Dibayar 24 Jam -> Kedaluwarsa & Stok Dilepas', () => {
  test('Cron expire-orders membatalkan pesanan kedaluwarsa & melepas stok', async ({ request }) => {
    const variant = await prisma.productVariant.findFirst({ include: { product: true } });
    const region = await prisma.region.findFirst({ where: { code: 'PUSAT' } });

    // 1. Buat promo uji
    const promo = await prisma.promoCode.create({
      data: {
        code: `CRONEXP-${Date.now()}`,
        discountType: DiscountType.FIXED,
        discountValue: 10000,
        quota: 10,
        usedCount: 0,
        isActive: true,
      },
    });

    // 2. Buat pesanan
    const orderRes = await request.post('/api/orders', {
      data: {
        customerName: 'Pembeli Telat Bayar',
        customerPhone: '081255554444',
        destination: {
          provinceName: 'Jawa Barat',
          cityName: 'Kota Depok',
          street: 'Jl. Margonda No. 1',
        },
        items: [{ productId: variant!.productId, variantId: variant!.id, quantity: 2 }],
        paymentMethod: 'MANUAL_TRANSFER',
        promoCodeId: promo.id,
      },
    });

    const { order } = await orderRes.json();
    const orderId = order.id;

    // 3. Set expiresAt menjadi 2 jam lalu (simulasi lewat 24 jam)
    await prisma.order.update({
      where: { id: orderId },
      data: { expiresAt: new Date(Date.now() - 2 * 60 * 60 * 1000) },
    });

    // 4. Jalankan cron job expire-orders
    const cronRes = await request.post('/api/cron/expire-orders', {
      headers: {
        Authorization: `Bearer ${process.env.CRON_SECRET || 'dev-cron-secret-123'}`,
      },
    });

    expect(cronRes.ok()).toBe(true);
    const cronData = await cronRes.json();
    expect(cronData.success).toBe(true);
    expect(cronData.processedCount).toBeGreaterThanOrEqual(1);

    // 5. Verifikasi pesanan berubah menjadi DIBATALKAN
    const updated = await prisma.order.findUnique({ where: { id: orderId } });
    expect(updated!.status).toBe(OrderStatus.DIBATALKAN);

    // 6. Verifikasi kuota promo kembali ke 0
    const updatedPromo = await prisma.promoCode.findUnique({ where: { id: promo.id } });
    expect(updatedPromo!.usedCount).toBe(0);

    // Cleanup
    await prisma.promoCode.delete({ where: { id: promo.id } }).catch(() => {});
  });
});
