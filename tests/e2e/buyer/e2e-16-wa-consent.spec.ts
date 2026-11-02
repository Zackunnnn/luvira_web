// tests/e2e/buyer/e2e-16-wa-consent.spec.ts
// ============================================================================
// E2E-16: Pembeli Memilih Persetujuan WhatsApp & Notifikasi Masuk Antrean WaOutbox (FT-1)
// ============================================================================

import { test, expect } from '@playwright/test';
import { prisma } from '@/lib/db';
import { midtransAdapter } from '@/lib/payments/midtrans-adapter';
import { OrderStatus } from '@prisma/client';

test.describe('E2E-16: Persetujuan WhatsApp (waConsent) & Antrean Outbox (FT-1)', () => {
  test('Pesanan dengan waConsent=true memasukkan notifikasi ke WaOutbox saat pembayaran lunas', async ({ request }) => {
    const variant = await prisma.productVariant.findFirst({
      include: { product: true },
    });
    if (!variant) return;

    // 1. Buat pesanan dengan mencentang waConsent: true
    const orderRes = await request.post('/api/orders', {
      data: {
        customerName: 'Aisyah WA Consent',
        customerPhone: '081298765432',
        customerEmail: 'aisyah@example.com',
        destination: {
          provinceName: 'Jawa Barat',
          cityName: 'Kota Depok',
          districtName: 'Cinere',
          subDistrictName: 'Cinere',
          postalCode: '16514',
          street: 'Jl. Cinere Raya No. 12',
        },
        items: [
          {
            productId: variant.productId,
            variantId: variant.id,
            quantity: 1,
          },
        ],
        paymentMethod: 'MIDTRANS_SNAP',
        waConsent: true,
      },
    });

    expect(orderRes.ok()).toBe(true);
    const orderData = await orderRes.json();
    const orderId = orderData.order.id;
    const orderCode = orderData.order.code;

    // 2. Simulasikan Webhook Settlement Midtrans resmi via Adapter
    const webhookPayload = midtransAdapter.createMockWebhookPayload(
      orderCode,
      orderData.order.totalPrice,
      'settlement'
    );

    const webhookRes = await request.post('/api/midtrans/notification', {
      data: webhookPayload,
    });

    expect(webhookRes.ok()).toBe(true);

    // 3. Verifikasi: Pesanan menjadi DIPROSES dan ada antrean WaOutbox untuk nomor pembeli
    const dbOrder = await prisma.order.findUnique({
      where: { id: orderId },
    });
    expect(dbOrder?.status).toBe(OrderStatus.DIPROSES);
    expect(dbOrder?.waConsent).toBe(true);

    const outboxMessage = await prisma.waOutbox.findFirst({
      where: {
        relatedId: orderId,
        target: '6281298765432',
      },
    });

    expect(outboxMessage).toBeDefined();
    expect(outboxMessage?.message).toContain(orderCode);
    expect(outboxMessage?.message).toContain('PEMBAYARAN DITERIMA');
  });

  test('Pesanan dengan waConsent=false TIDAK mengirim notifikasi ke WaOutbox pembeli saat lunas', async ({ request }) => {
    const variant = await prisma.productVariant.findFirst({
      include: { product: true },
    });
    if (!variant) return;

    // 1. Buat pesanan dengan tidak mencentang waConsent (waConsent: false)
    const orderRes = await request.post('/api/orders', {
      data: {
        customerName: 'Budi No Consent',
        customerPhone: '081211112222',
        customerEmail: 'budi.noconsent@example.com',
        destination: {
          provinceName: 'Jawa Barat',
          cityName: 'Kota Depok',
          districtName: 'Beji',
          subDistrictName: 'Beji',
          postalCode: '16421',
          street: 'Jl. Nusantara No. 5',
        },
        items: [
          {
            productId: variant.productId,
            variantId: variant.id,
            quantity: 1,
          },
        ],
        paymentMethod: 'MIDTRANS_SNAP',
        waConsent: false,
      },
    });

    expect(orderRes.ok()).toBe(true);
    const orderData = await orderRes.json();
    const orderId = orderData.order.id;
    const orderCode = orderData.order.code;

    // 2. Simulasikan Webhook Settlement
    const webhookPayload = midtransAdapter.createMockWebhookPayload(
      orderCode,
      orderData.order.totalPrice,
      'settlement'
    );

    await request.post('/api/midtrans/notification', {
      data: webhookPayload,
    });

    // 3. Verifikasi: TIDAK ADA entri outbox untuk nomor pembeli ini
    const outboxMessage = await prisma.waOutbox.findFirst({
      where: {
        relatedId: orderId,
        target: '6281211112222',
      },
    });

    expect(outboxMessage).toBeNull();
  });
});
