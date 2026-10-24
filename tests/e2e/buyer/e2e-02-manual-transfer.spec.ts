// tests/e2e/buyer/e2e-02-manual-transfer.spec.ts
import { test, expect } from '@playwright/test';
import { prisma } from '@/lib/db';
import { OrderStatus, PaymentMethod } from '@prisma/client';

test.describe('E2E-02: Pembeli Bayar Transfer Manual 2 Rekening Resmi -> Unggah Bukti', () => {
  test('Alur transfer manual dengan verifikasi nomor rekening asli & unggah bukti', async ({ request }) => {
    const variant = await prisma.productVariant.findFirst({
      include: { product: true },
    });
    expect(variant).toBeDefined();

    // 1. Buat pesanan dengan metode transfer manual
    const orderRes = await request.post('/api/orders', {
      data: {
        customerName: 'Aisyah Putri',
        customerPhone: '085711223344',
        destination: {
          provinceName: 'Jawa Barat',
          cityName: 'Kota Depok',
          street: 'Jl. Margonda Raya No. 45',
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

    expect(orderRes.ok()).toBe(true);
    const orderData = await orderRes.json();
    expect(orderData.success).toBe(true);
    expect(orderData.order.paymentMethod).toBe(PaymentMethod.MANUAL_TRANSFER);

    // 2. Verifikasi 2 rekening resmi Luvira dikembalikan
    const accounts = orderData.paymentAccounts;
    expect(accounts.length).toBeGreaterThanOrEqual(2);
    expect(accounts.some((a: any) => a.bankName.includes('Jago Syariah') && a.accountNumber === '509366156008')).toBe(true);
    expect(accounts.some((a: any) => a.bankName.includes('BSI') && a.accountNumber === '7239477938')).toBe(true);

    const orderCode = orderData.order.code;

    // 3. Pembeli mengunggah bukti transfer
    const proofRes = await request.post('/api/payments/manual-proof', {
      data: {
        orderCode,
        proofUrl: 'https://ik.imagekit.io/luvira/proofs/test-proof-bsi.jpg',
        notes: 'Transfer via BSI Mobile a.n. Aisyah',
      },
    });

    expect(proofRes.ok()).toBe(true);
    const proofData = await proofRes.json();
    expect(proofData.success).toBe(true);
    expect(proofData.order.status).toBe(OrderStatus.MENUNGGU_VERIFIKASI);

    // 4. Verifikasi di database
    const dbOrder = await prisma.order.findUnique({
      where: { code: orderCode },
      include: { payments: true, statusLogs: true },
    });

    expect(dbOrder!.status).toBe(OrderStatus.MENUNGGU_VERIFIKASI);
    expect(dbOrder!.payments.length).toBeGreaterThan(0);
    expect(dbOrder!.payments[0].proofUrl).toBe('https://ik.imagekit.io/luvira/proofs/test-proof-bsi.jpg');
  });
});
