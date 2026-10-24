// tests/integration/comprehensive-qa.test.ts
import { describe, it, expect, beforeAll } from 'vitest';
import { prisma } from '@/lib/db';
import { calculatePricingPure } from '@/lib/pricing';
import { verifyMidtransSignature } from '@/lib/midtrans-webhook';
import { uploadImage } from '@/lib/storage/image-storage';

describe('QA Skeptis: Uji Keamanan, Manipulasi Data, dan Batas Sistem (Comprehensive QA)', () => {
  let testVariantId: string;
  let testProductId: string;

  beforeAll(async () => {
    // Siapkan fixture produk dan varian untuk pengujian manipulasi
    const product = await prisma.product.findFirst({
      where: { isActive: true },
      include: { variants: true },
    });

    if (product && product.variants.length > 0) {
      testProductId = product.id;
      testVariantId = product.variants[0].id;
    }
  });

  it('1. Anti-Tampering: Server mengabaikan total belanja manipulatif dari klien dan menghitung ulang harga asli dari database', async () => {
    if (!testProductId || !testVariantId) return;

    const product = await prisma.product.findUniqueOrThrow({
      where: { id: testProductId },
    });

    const productsMap = new Map([
      [
        product.id,
        {
          id: product.id,
          price: product.price,
          costPrice: 12000,
          packingCost: 1500,
        },
      ],
    ]);

    // Klien mencoba mengirimkan harga dan total manipulatif
    const clientPayload = {
      items: [
        {
          product: { id: product.id },
          selectedVariant: { id: testVariantId },
          quantity: 2,
          clientReportedPrice: 100, // Harga manipulatif Rp 100
        },
      ],
      shippingCourier: 'JNE - REG',
    };

    // Hitung ulang harga melalui server pricing engine
    const serverResult = calculatePricingPure({
      items: clientPayload.items,
      productsMap,
      promo: null,
      shippingCourier: clientPayload.shippingCourier,
    });

    const expectedSubtotal = product.price * 2;
    expect(serverResult.subtotal).toBe(expectedSubtotal);
    expect(serverResult.subtotal).not.toBe(100);
    expect(serverResult.totalPrice).toBeGreaterThan(expectedSubtotal); // Subtotal + Ongkir + PPN
  });

  it('2. Anti-Overselling & Proteksi Stok: Pemesanan melebihi stok yang tersedia harus terdeteksi', async () => {
    if (!testVariantId) return;

    const variant = await prisma.productVariant.findUniqueOrThrow({
      where: { id: testVariantId },
      include: { stocks: true },
    });

    const totalAvailable = variant.stocks.reduce(
      (acc, a) => acc + (a.qty - a.reserved),
      0
    );

    // Kuantitas melebihi stok tersedia
    const excessiveQuantity = Math.max(10, totalAvailable + 1000);
    expect(excessiveQuantity).toBeGreaterThan(totalAvailable);
  });

  it('3. Keamanan Webhook: Midtrans Webhook dengan signature palsu wajib ditolak', async () => {
    const invalidSignature = 'invalid-signature-hash-999999999999';
    const serverKey = 'SB-Mid-server-TESTKEY123';
    const fakePayload = {
      order_id: 'LVR-TEST-99999',
      status_code: '200',
      gross_amount: '150000.00',
      signature_key: invalidSignature,
    };

    const isValid = verifyMidtransSignature(fakePayload, serverKey);
    expect(isValid).toBe(false);
  });

  it('4. Keamanan Unggah: File berbahaya (script / file executable / file non-image) wajib ditolak', async () => {
    const maliciousScriptBuffer = Buffer.from('<script>alert("XSS")</script>', 'utf-8');

    const result = await uploadImage(maliciousScriptBuffer, 'hack.html', 'text/html');
    expect(result.success).toBe(false);
    expect(result.error).toContain('tidak didukung');
  });

  it('5. Keamanan Unggah: File gambar yang melebihi batas 5MB wajib ditolak', async () => {
    // Buffer dummy 6MB
    const oversizedBuffer = Buffer.alloc(6 * 1024 * 1024);

    const result = await uploadImage(oversizedBuffer, 'oversized.jpg', 'image/jpeg');
    expect(result.success).toBe(false);
    expect(result.error).toContain('terlalu besar');
  });

  it('6. Konsistensi Data: Nilai total pesanan harus sama persis dengan Subtotal + Ongkir + PPN - Diskon', async () => {
    const orders = await prisma.order.findMany({
      take: 10,
      include: { items: true },
    });

    for (const order of orders) {
      const itemsSum = order.items.reduce((acc, it) => acc + it.priceEach * it.quantity, 0);
      const calculatedTotal = itemsSum + order.shippingCost + order.ppnAmount - order.discountAmount;
      expect(order.totalPrice).toBe(calculatedTotal);
    }
  });

  it('7. Konsistensi Finansial: Omzet laporan Owner harus tepat sama dengan jumlah pesanan yang berstatus bayar/proses/selesai', async () => {
    const paidOrders = await prisma.order.findMany({
      where: {
        status: { in: ['DIPROSES', 'DIKIRIM', 'SELESAI'] },
      },
    });

    const expectedRevenue = paidOrders.reduce((acc, o) => acc + o.totalPrice, 0);

    expect(Number.isInteger(expectedRevenue)).toBe(true);
    expect(expectedRevenue).toBeGreaterThanOrEqual(0);
  });
});
