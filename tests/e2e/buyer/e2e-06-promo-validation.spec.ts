// tests/e2e/buyer/e2e-06-promo-validation.spec.ts
import { test, expect } from '@playwright/test';
import { prisma } from '@/lib/db';
import { DiscountType, PromoType } from '@prisma/client';

test.describe('E2E-06: Validasi Kode Promo Reseller & Wilayah', () => {
  test('Validasi promo: valid, expired, kuota habis, dan di luar wilayah', async ({ request }) => {
    const jogjaRegion = await prisma.region.findFirst({ where: { code: 'YOGYAKARTA' } });
    const now = new Date();

    // 1. Promo Valid Reseller
    const promoValid = await prisma.promoCode.create({
      data: {
        code: `PROMOVALID-${Date.now()}`,
        type: PromoType.RESELLER,
        discountType: DiscountType.FIXED,
        discountValue: 5000,
        quota: 100,
        usedCount: 0,
        isActive: true,
      },
    });

    const resValid = await request.post('/api/promos/validate', {
      data: { code: promoValid.code },
    });
    expect(resValid.ok()).toBe(true);
    const dataValid = await resValid.json();
    expect(dataValid.success).toBe(true);
    expect(dataValid.data.discountValue).toBe(5000);

    // 2. Promo Kedaluwarsa
    const promoExpired = await prisma.promoCode.create({
      data: {
        code: `PROMOEXP-${Date.now()}`,
        type: PromoType.RESELLER,
        discountType: DiscountType.FIXED,
        discountValue: 5000,
        expiresAt: new Date(now.getTime() - 24 * 60 * 60 * 1000), // Kemarin
        isActive: true,
      },
    });

    const resExpired = await request.post('/api/promos/validate', {
      data: { code: promoExpired.code },
    });
    expect(resExpired.status()).toBe(400);
    const dataExpired = await resExpired.json();
    expect(dataExpired.error).toContain('kedaluwarsa');

    // 3. Promo Kuota Habis
    const promoQuotaFull = await prisma.promoCode.create({
      data: {
        code: `PROMOFULL-${Date.now()}`,
        type: PromoType.RESELLER,
        discountType: DiscountType.FIXED,
        discountValue: 5000,
        quota: 5,
        usedCount: 5,
        isActive: true,
      },
    });

    const resQuota = await request.post('/api/promos/validate', {
      data: { code: promoQuotaFull.code },
    });
    expect(resQuota.status()).toBe(400);
    const dataQuota = await resQuota.json();
    expect(dataQuota.error).toContain('habis');

    // 4. Promo Khusus Wilayah Yogyakarta Dipakai di Luar DIY (DKI Jakarta) (A4)
    const promoJogjaOnly = await prisma.promoCode.create({
      data: {
        code: `JOGJAONLY-${Date.now()}`,
        type: PromoType.WILAYAH,
        regionId: jogjaRegion!.id,
        discountType: DiscountType.FIXED,
        discountValue: 10000,
        quota: 50,
        usedCount: 0,
        isActive: true,
      },
    });

    // Coba validasi untuk alamat DKI Jakarta
    const resWilayahDenied = await request.post('/api/promos/validate', {
      data: {
        code: promoJogjaOnly.code,
        destinationProvince: 'DKI Jakarta',
      },
    });
    expect(resWilayahDenied.status()).toBe(400);
    const dataWilayahDenied = await resWilayahDenied.json();
    expect(dataWilayahDenied.error).toContain('khusus untuk pengiriman wilayah');

    // Coba validasi untuk alamat DI Yogyakarta -> Harus BERHASIL
    const resWilayahAllowed = await request.post('/api/promos/validate', {
      data: {
        code: promoJogjaOnly.code,
        destinationProvince: 'DI Yogyakarta',
      },
    });
    expect(resWilayahAllowed.ok()).toBe(true);

    // Cleanup
    await prisma.promoCode.deleteMany({
      where: {
        id: {
          in: [promoValid.id, promoExpired.id, promoQuotaFull.id, promoJogjaOnly.id],
        },
      },
    });
  });
});
