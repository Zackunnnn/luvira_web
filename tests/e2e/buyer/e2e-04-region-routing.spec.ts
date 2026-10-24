// tests/e2e/buyer/e2e-04-region-routing.spec.ts
import { test, expect } from '@playwright/test';
import { prisma } from '@/lib/db';

test.describe('E2E-04: Routing Wilayah Berdasarkan Alamat Tujuan (A10)', () => {
  test('Alamat DIY diarahkan ke Yogyakarta, alamat luar DIY diarahkan ke Pusat', async ({ request }) => {
    const variant = await prisma.productVariant.findFirst({
      include: { product: true },
    });
    expect(variant).toBeDefined();

    // 1. Pesanan dengan Alamat DIY (Yogyakarta)
    const jogjaRes = await request.post('/api/orders', {
      data: {
        customerName: 'Hana Yogyakarta',
        customerPhone: '081234567801',
        destination: {
          provinceName: 'DI Yogyakarta',
          cityName: 'Kota Yogyakarta',
          street: 'Jl. Malioboro No. 10',
        },
        items: [{ productId: variant!.productId, variantId: variant!.id, quantity: 1 }],
        paymentMethod: 'MANUAL_TRANSFER',
      },
    });

    expect(jogjaRes.ok()).toBe(true);
    const jogjaData = await jogjaRes.json();
    expect(jogjaData.success).toBe(true);

    const jogjaRegion = await prisma.region.findUnique({
      where: { id: jogjaData.order.regionId },
    });
    expect(jogjaRegion!.code).toBe('YOGYAKARTA');

    // 2. Pesanan dengan Alamat Luar DIY (DKI Jakarta -> Pusat)
    const jakartaRes = await request.post('/api/orders', {
      data: {
        customerName: 'Zahra Jakarta',
        customerPhone: '081234567802',
        destination: {
          provinceName: 'DKI Jakarta',
          cityName: 'Kota Jakarta Selatan',
          street: 'Jl. Sudirman No. 50',
        },
        items: [{ productId: variant!.productId, variantId: variant!.id, quantity: 1 }],
        paymentMethod: 'MANUAL_TRANSFER',
      },
    });

    expect(jakartaRes.ok()).toBe(true);
    const jakartaData = await jakartaRes.json();
    expect(jakartaData.success).toBe(true);

    const jakartaRegion = await prisma.region.findUnique({
      where: { id: jakartaData.order.regionId },
    });
    expect(jakartaRegion!.code).toBe('PUSAT');
  });
});
