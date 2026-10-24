// tests/e2e/buyer/e2e-03-proof-reupload.spec.ts
import { test, expect } from '@playwright/test';
import { prisma } from '@/lib/db';
import { OrderStatus, PaymentMethod } from '@prisma/client';

test.describe('E2E-03: Pembeli Mengunggah Ulang Bukti Transfer Baru', () => {
  test('Pembeli dapat mengunggah ulang bukti transfer saat perlu perbaikan bukti', async ({ request }) => {
    const variant = await prisma.productVariant.findFirst({
      include: { product: true },
    });

    // 1. Buat pesanan manual
    const orderRes = await request.post('/api/orders', {
      data: {
        customerName: 'Maryam',
        customerPhone: '081288887777',
        destination: {
          provinceName: 'Jawa Barat',
          cityName: 'Kota Depok',
          street: 'Jl. Margonda Raya No. 12',
        },
        items: [
          {
            productId: variant!.productId,
            variantId: variant!.id,
            quantity: 1,
          },
        ],
        paymentMethod: 'MANUAL_TRANSFER',
      },
    });

    const { order } = await orderRes.json();
    const orderCode = order.code;

    // 2. Unggah bukti pertama (struk buram / salah)
    await request.post('/api/payments/manual-proof', {
      data: {
        orderCode,
        proofUrl: 'https://ik.imagekit.io/luvira/proofs/proof-first.jpg',
      },
    });

    // 3. Pembeli mengunggah ulang bukti kedua yang benar (E2E-03)
    const reuploadRes = await request.post('/api/payments/manual-proof', {
      data: {
        orderCode,
        proofUrl: 'https://ik.imagekit.io/luvira/proofs/proof-second-clear.jpg',
        notes: 'Unggah ulang bukti transfer yang lebih jelas',
      },
    });

    expect(reuploadRes.ok()).toBe(true);

    // 4. Verifikasi bahwa URL bukti terbaru tersimpan
    const dbOrder = await prisma.order.findUnique({
      where: { code: orderCode },
      include: { payments: true, statusLogs: true },
    });

    expect(dbOrder!.status).toBe(OrderStatus.MENUNGGU_VERIFIKASI);
    expect(dbOrder!.payments[0].proofUrl).toBe(
      'https://ik.imagekit.io/luvira/proofs/proof-second-clear.jpg'
    );
  });
});
