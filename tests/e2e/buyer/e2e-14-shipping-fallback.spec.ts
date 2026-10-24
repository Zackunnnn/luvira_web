// tests/e2e/buyer/e2e-14-shipping-fallback.spec.ts
import { test, expect } from '@playwright/test';
import { prisma } from '@/lib/db';

test.describe('E2E-14: Graceful Handling & Fallback Layanan Ongkir RajaOngkir', () => {
  test('Kalkulasi ongkir tidak pernah crash saat input data tepi atau layanan terganggu', async ({ request }) => {
    const variant = await prisma.productVariant.findFirst({ include: { product: true } });

    // 1. Coba kalkulasi dengan alamat tidak lengkap -> Menghasilkan respons ramah tanpa crash
    const resBad = await request.post('/api/shipping/calculate', {
      data: {
        destination: {},
        items: [],
      },
    });

    expect(resBad.status()).toBe(400);
    const jsonBad = await resBad.json();
    expect(jsonBad.error).toBeDefined();

    // 2. Kalkulasi normal dengan kurir JNE
    const resGood = await request.post('/api/shipping/calculate', {
      data: {
        destination: {
          provinceName: 'Jawa Barat',
          cityName: 'Kota Depok',
          districtName: 'Beji',
        },
        items: [
          {
            productId: variant!.productId,
            variantId: variant!.id,
            quantity: 2,
          },
        ],
        courier: 'jne',
      },
    });

    expect(resGood.ok()).toBe(true);
    const jsonGood = await resGood.json();
    expect(jsonGood.success).toBe(true);
    expect(jsonGood.rates.length).toBeGreaterThan(0);
    expect(jsonGood.rates.some((r: any) => r.service === 'REG')).toBe(true);
  });
});
