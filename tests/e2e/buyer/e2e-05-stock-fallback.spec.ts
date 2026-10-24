// tests/e2e/buyer/e2e-05-stock-fallback.spec.ts
import { test, expect } from '@playwright/test';
import { prisma } from '@/lib/db';

test.describe('E2E-05: Fallback Stok Regional ke Pusat (A6)', () => {
  test('Ketika stok cabang Yogyakarta habis, pesanan otomatis dialihkan ke Pusat', async ({ request }) => {
    const jogjaRegion = await prisma.region.findFirst({ where: { code: 'YOGYAKARTA' } });
    const pusatRegion = await prisma.region.findFirst({ where: { code: 'PUSAT' } });

    // Buat produk uji khusus fallback
    const fallbackProduct = await prisma.product.create({
      data: {
        name: `Produk Fallback ${Date.now()}`,
        slug: `fallback-product-${Date.now()}`,
        model: 'fallback-test',
        description: 'Test stock fallback',
        price: 35000,
        variants: {
          create: {
            name: 'Varian Habis di Jogja',
            sku: `FB-SKU-${Date.now()}`,
            hex: '#111111',
            imageUrl: '/socks/as1.webp',
            weightGram: 35,
          },
        },
      },
      include: { variants: true },
    });

    const fallbackVariant = fallbackProduct.variants[0];

    // Set stok di Jogja = 0 (habis)
    await prisma.stock.create({
      data: {
        variantId: fallbackVariant.id,
        regionId: jogjaRegion!.id,
        qty: 0,
        reserved: 0,
      },
    });

    // Set stok di Pusat = 50 (tersedia)
    await prisma.stock.create({
      data: {
        variantId: fallbackVariant.id,
        regionId: pusatRegion!.id,
        qty: 50,
        reserved: 0,
      },
    });

    // Pembeli beralamat di DI Yogyakarta membeli produk ini
    const orderRes = await request.post('/api/orders', {
      data: {
        customerName: 'Pembeli Sleman',
        customerPhone: '081233445566',
        destination: {
          provinceName: 'DI Yogyakarta',
          cityName: 'Kabupaten Sleman',
          street: 'Jl. Kaliurang KM 5',
        },
        items: [
          {
            productId: fallbackProduct.id,
            variantId: fallbackVariant.id,
            quantity: 2,
          },
        ],
        paymentMethod: 'MANUAL_TRANSFER',
      },
    });

    expect(orderRes.ok()).toBe(true);
    const orderData = await orderRes.json();
    expect(orderData.success).toBe(true);

    // Verifikasi dialihkan ke Pusat karena stok Jogja habis (A6)
    expect(orderData.order.isFallbackToPusat).toBe(true);
    expect(orderData.order.regionId).toBe(pusatRegion!.id);

    // Cleanup
    await prisma.stockMovement.deleteMany({
      where: { stock: { variantId: fallbackVariant.id } },
    });
    await prisma.stock.deleteMany({ where: { variantId: fallbackVariant.id } });
    await prisma.orderItem.deleteMany({ where: { variantId: fallbackVariant.id } });
    await prisma.product.delete({ where: { id: fallbackProduct.id } });
  });
});
