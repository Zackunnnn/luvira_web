// tests/e2e/buyer/e2e-01-checkout-midtrans.spec.ts
import { test, expect } from '@playwright/test';
import { prisma } from '@/lib/db';
import { midtransAdapter } from '@/lib/payments/midtrans-adapter';
import { OrderStatus } from '@prisma/client';

test.describe('E2E-01: Pembeli Belanja dari Katalog sampai Bayar Midtrans', () => {
  test('Alur checkout dengan Midtrans Snap dan webhook settlement otomatis', async ({ request }) => {
    // 1. Ambil produk dan varian yang ada di database
    const variant = await prisma.productVariant.findFirst({
      include: { product: true },
    });
    expect(variant).toBeDefined();

    // 2. Pembeli membuat pesanan via API Orders
    const orderRes = await request.post('/api/orders', {
      data: {
        customerName: 'Siti Khadijah',
        customerPhone: '081234567890',
        customerEmail: 'siti@example.com',
        destination: {
          provinceName: 'Jawa Barat',
          cityName: 'Kota Depok',
          districtName: 'Beji',
          subDistrictName: 'Kemirimuka',
          postalCode: '16423',
          street: 'Jl. Margonda Raya No. 100',
        },
        items: [
          {
            productId: variant!.productId,
            variantId: variant!.id,
            quantity: 2,
          },
        ],
        paymentMethod: 'MIDTRANS_SNAP',
      },
    });

    expect(orderRes.ok()).toBe(true);
    const orderData = await orderRes.json();
    expect(orderData.success).toBe(true);
    expect(orderData.order.code).toMatch(/^LVR-\d{8}-\d{4}$/);
    expect(orderData.order.status).toBe(OrderStatus.MENUNGGU_PEMBAYARAN);
    expect(orderData.token).toBeDefined();

    const orderCode = orderData.order.code;
    const grossAmount = orderData.order.totalPrice;

    // 3. Simulasikan Webhook Settlement resmi dari Midtrans
    const webhookPayload = midtransAdapter.createMockWebhookPayload(
      orderCode,
      grossAmount,
      'settlement'
    );

    const webhookRes = await request.post('/api/midtrans/notification', {
      data: webhookPayload,
    });

    expect(webhookRes.ok()).toBe(true);
    const webhookJson = await webhookRes.json();
    expect(webhookJson.status).toBe('ok');

    // 4. Verifikasi status pesanan di database berubah menjadi DIPROSES (Lunas)
    const updatedOrder = await prisma.order.findUnique({
      where: { code: orderCode },
      include: { statusLogs: true },
    });

    expect(updatedOrder).toBeDefined();
    expect(updatedOrder!.status).toBe(OrderStatus.DIPROSES);
  });
});
