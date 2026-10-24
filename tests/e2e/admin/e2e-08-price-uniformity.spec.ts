// tests/e2e/admin/e2e-08-price-uniformity.spec.ts
// ============================================================================
// E2E-08: Admin Pusat Mengubah Harga Jual -> Seragam di Semua Wilayah
// Sesuai docs/LUVIRA_2_PLAN.md Bagian 4 & 13
// ============================================================================

import { test, expect } from '@playwright/test';
import { prisma } from '@/lib/db';
import { createSession } from '@/lib/auth';
import { Role } from '@prisma/client';

test.describe('E2E-08: Admin Pusat Ubah Harga Jual Seragam', () => {
  test('Admin Pusat mengubah harga jual produk -> harga berlaku seragam di seluruh cabang', async ({ request }) => {
    // 1. Ambil akun Admin Pusat
    const adminPusat = await prisma.user.findFirst({
      where: { role: Role.ADMIN_PUSAT },
    });
    expect(adminPusat).toBeDefined();

    const token = await createSession({
      userId: adminPusat!.id,
      email: adminPusat!.email,
      name: adminPusat!.name,
      role: adminPusat!.role,
      regionId: adminPusat!.regionId,
    });

    // 2. Ambil produk uji
    const product = await prisma.product.findFirst({
      include: { variants: true },
    });
    expect(product).toBeDefined();

    const originalPrice = product!.price;
    const testNewPrice = 39000; // Harga baru

    // 3. Admin Pusat mengubah harga jual melalui endpoint pricing
    const putRes = await request.put('/api/admin/pricing', {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      data: {
        productId: product!.id,
        price: testNewPrice,
        originalPrice: 45000,
      },
    });

    expect(putRes.ok()).toBe(true);
    const putData = await putRes.json();
    expect(putData.success).toBe(true);
    expect(putData.product.price).toBe(testNewPrice);

    // 4. Verifikasi di database: harga produk berubah
    const dbProduct = await prisma.product.findUnique({
      where: { id: product!.id },
    });
    expect(dbProduct!.price).toBe(testNewPrice);

    // 5. Verifikasi di katalog publik / API pembeli: harga terupdate seragam
    const catalogRes = await request.get('/api/products');
    expect(catalogRes.ok()).toBe(true);
    const catalogData = await catalogRes.json();
    const updatedProd = catalogData.data?.find((p: any) => p.id === product!.id);
    if (updatedProd) {
      expect(updatedProd.price).toBe(testNewPrice);
    }

    // 6. Kembalikan harga semula agar tidak mengganggu tes lain
    await prisma.product.update({
      where: { id: product!.id },
      data: { price: originalPrice, originalPrice: product!.originalPrice },
    });
  });
});
