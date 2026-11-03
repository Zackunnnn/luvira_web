// tests/integration/dual-promos.test.ts
// ============================================================================
// Integration Tests: Dual Promo Code Slots (Slot 1 & Slot 2)
// Memverifikasi stacking diskon, kalkulasi server, validasi anti-duplikasi,
// reservasi stok, tracking kuota usedCount ganda, dan agregasi laporan Owner.
// ============================================================================

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '@/lib/db';
import { calculatePricingPure, ProductDataForCalculation, PromoDataForCalculation } from '@/lib/pricing';
import { createManualCodOrder } from '@/lib/orders/manual-cod';
import { calculatePromoUsage, OrderFinancialRecord } from '@/lib/reports/owner-reports';
import { AuthUser } from '@/lib/permissions';
import { Role, OrderStatus, PaymentMethod, DiscountType } from '@prisma/client';

describe('Dual Promo Code Slots (Slot 1 & Slot 2 Stacking)', () => {
  let pusatRegion: any;
  let testProduct: any;
  let testVariant: any;
  let stockPusat: any;
  let adminPusatUser: AuthUser;

  // Promos for testing
  let promo1: any;
  let promo2: any;
  let promoTaxFree: any;
  let promoShippingFree: any;

  beforeAll(async () => {
    // 1. Ambil Gudang Pusat
    pusatRegion = await prisma.region.findFirst({ where: { type: 'PUSAT' } });
    if (!pusatRegion) {
      throw new Error('Gudang Pusat tidak ditemukan di database.');
    }

    // 2. Setup Produk & Varian Uji
    testProduct = await prisma.product.create({
      data: {
        name: 'Kaus Kaki Dual Promo Test',
        slug: `kaus-kaki-dual-promo-${Date.now()}`,
        price: 100000,
        description: 'Produk uji kalkulasi dual promo',
        model: 'ANKLE',
      },
    });

    testVariant = await prisma.productVariant.create({
      data: {
        productId: testProduct.id,
        name: 'Varian Dual Promo',
        hex: '#111111',
        imageUrl: '/socks/test.webp',
        sku: `SKU-DUAL-${Date.now()}`,
      },
    });

    // 3. Setup Stok di Pusat
    stockPusat = await prisma.stock.create({
      data: {
        variantId: testVariant.id,
        regionId: pusatRegion.id,
        qty: 50,
        reserved: 0,
      },
    });

    // 4. Admin User Mock
    adminPusatUser = {
      id: 'mock-admin-pusat-dual-promo',
      email: 'admin.pusat.dual@luvira.id',
      name: 'Admin Pusat Dual Promo',
      role: Role.ADMIN_PUSAT,
      regionId: pusatRegion.id,
    };

    // 5. Buat Promo-Promo Uji
    const rand = Math.floor(1000 + Math.random() * 9000);

    // Promo 1: Persentase 10%
    promo1 = await prisma.promoCode.create({
      data: {
        code: `PROMO1-10PERSEN-${rand}`,
        discountType: DiscountType.PERCENTAGE,
        discountValue: 10,
        quota: 100,
        usedCount: 0,
        isActive: true,
        
      },
    });

    // Promo 2: Nominal Tetap Rp 15.000
    promo2 = await prisma.promoCode.create({
      data: {
        code: `PROMO2-FIXED15K-${rand}`,
        discountType: DiscountType.FIXED,
        discountValue: 15000,
        quota: 100,
        usedCount: 0,
        isActive: true,
        
      },
    });

    // Promo Bebas PPN
    promoTaxFree = await prisma.promoCode.create({
      data: {
        code: `PROMO-TAXFREE-${rand}`,
        discountType: DiscountType.FIXED,
        discountValue: 0,
        isFreeTax: true,
        quota: 100,
        usedCount: 0,
        isActive: true,
        
      },
    });

    // Promo Bebas Ongkir
    promoShippingFree = await prisma.promoCode.create({
      data: {
        code: `PROMO-FREESHIP-${rand}`,
        discountType: DiscountType.FIXED,
        discountValue: 0,
        isFreeShipping: true,
        quota: 100,
        usedCount: 0,
        isActive: true,
        
      },
    });
  });

  afterAll(async () => {
    // Cleanup data uji
    await prisma.orderStatusLog.deleteMany({
      where: { order: { code: { contains: 'LVR-COD-' } } },
    });
    await prisma.orderItem.deleteMany({
      where: { variantId: testVariant.id },
    });
    await prisma.order.deleteMany({
      where: {
        items: { some: { variantId: testVariant.id } },
      },
    });
    if (stockPusat) {
      await prisma.stockMovement.deleteMany({ where: { stockId: stockPusat.id } });
      await prisma.stock.delete({ where: { id: stockPusat.id } });
    }
    if (testVariant) {
      await prisma.productVariant.delete({ where: { id: testVariant.id } });
    }
    if (testProduct) {
      await prisma.product.delete({ where: { id: testProduct.id } });
    }
    const promoIds = [promo1?.id, promo2?.id, promoTaxFree?.id, promoShippingFree?.id].filter(Boolean);
    if (promoIds.length > 0) {
      await prisma.promoCode.deleteMany({ where: { id: { in: promoIds } } });
    }
  });

  describe('1. Pure Engine: calculatePricingPure with Dual Promos', () => {
    it('menggabungkan diskon persentase dan diskon nominal secara tepat', () => {
      const productsMap = new Map<string, ProductDataForCalculation>([
        [testProduct.id, { id: testProduct.id, price: 100000, costPrice: 20000, packingCost: 2000 }],
      ]);

      const items = [{ product: { id: testProduct.id }, selectedVariant: { id: testVariant.id }, quantity: 1 }];

      const p1: PromoDataForCalculation = {
        id: promo1.id,
        code: promo1.code,
        discountType: 'percentage',
        discountValue: 10,
        quota: 10,
        usedCount: 0,
        expiresAt: null,
        isActive: true,
        isFreeShipping: false,
        isFreeTax: false,
      };

      const p2: PromoDataForCalculation = {
        id: promo2.id,
        code: promo2.code,
        discountType: 'fixed',
        discountValue: 15000,
        quota: 10,
        usedCount: 0,
        expiresAt: null,
        isActive: true,
        isFreeShipping: false,
        isFreeTax: false,
      };

      const result = calculatePricingPure({
        items,
        productsMap,
        promo: p1,
        secondPromo: p2,
        shippingCourier: 'JNE - REG',
      });

      // Subtotal = Rp 100.000
      expect(result.subtotal).toBe(100000);
      // Diskon p1 (10%) = Rp 10.000, Diskon p2 = Rp 15.000. Total = Rp 25.000
      expect(result.discountAmount).toBe(25000);
      // Net price = 100.000 - 25.000 = 75.000
      expect(result.netPrice).toBe(75000);
      // PPN 11% dari 75.000 = 8.250
      expect(result.ppnAmount).toBe(8250);
      // Ongkir = 6.000
      expect(result.shippingCost).toBe(6000);
      // Total price = 75.000 + 8.250 + 6.000 = 89.250
      expect(result.totalPrice).toBe(89250);

      // Verifikasi promo metadata
      expect(result.promoApplied?.id).toBe(promo1.id);
      expect(result.secondPromoApplied?.id).toBe(promo2.id);
      expect(result.promosApplied?.length).toBe(2);
    });

    it('menggabungkan fasilitas bebas ongkir dan bebas PPN dari dua promo berbeda', () => {
      const productsMap = new Map<string, ProductDataForCalculation>([
        [testProduct.id, { id: testProduct.id, price: 100000, costPrice: 20000, packingCost: 2000 }],
      ]);

      const items = [{ product: { id: testProduct.id }, selectedVariant: { id: testVariant.id }, quantity: 1 }];

      const pTax: PromoDataForCalculation = {
        id: promoTaxFree.id,
        code: promoTaxFree.code,
        discountType: 'fixed',
        discountValue: 5000,
        quota: 10,
        usedCount: 0,
        expiresAt: null,
        isActive: true,
        isFreeShipping: false,
        isFreeTax: true,
      };

      const pShip: PromoDataForCalculation = {
        id: promoShippingFree.id,
        code: promoShippingFree.code,
        discountType: 'fixed',
        discountValue: 5000,
        quota: 10,
        usedCount: 0,
        expiresAt: null,
        isActive: true,
        isFreeShipping: true,
        isFreeTax: false,
      };

      const result = calculatePricingPure({
        items,
        productsMap,
        promo: pTax,
        secondPromo: pShip,
        shippingCourier: 'JNE - REG',
      });

      expect(result.discountAmount).toBe(10000); // 5.000 + 5.000
      expect(result.netPrice).toBe(90000);
      expect(result.ppnAmount).toBe(0); // Bebas PPN
      expect(result.shippingCost).toBe(0); // Bebas Ongkir
      expect(result.totalPrice).toBe(90000);
    });

    it('mencegah duplikasi jika promo slot 1 dan slot 2 dimasukkan identik', () => {
      const productsMap = new Map<string, ProductDataForCalculation>([
        [testProduct.id, { id: testProduct.id, price: 100000, costPrice: 20000, packingCost: 2000 }],
      ]);

      const items = [{ product: { id: testProduct.id }, selectedVariant: { id: testVariant.id }, quantity: 1 }];

      const p1: PromoDataForCalculation = {
        id: promo1.id,
        code: promo1.code,
        discountType: 'percentage',
        discountValue: 10,
        quota: 10,
        usedCount: 0,
        expiresAt: null,
        isActive: true,
        isFreeShipping: false,
        isFreeTax: false,
      };

      const result = calculatePricingPure({
        items,
        productsMap,
        promo: p1,
        secondPromo: p1, // Duplikat
      });

      // Hanya dihitung 1 kali
      expect(result.discountAmount).toBe(10000);
      expect(result.promosApplied?.length).toBe(1);
    });
  });

  describe('2. Database & API: createManualCodOrder dengan Dual Promo', () => {
    it('menolak pesanan manual jika kode promo slot 2 sama persis dengan slot 1', async () => {
      await expect(
        createManualCodOrder({
          creator: adminPusatUser,
          customerName: 'Budi Test Duplikat',
          customerPhone: '081234567890',
          items: [{ productId: testProduct.id, variantId: testVariant.id, quantity: 1 }],
          promoCode: promo1.code,
          secondPromoCode: promo1.code, // Kode sama
        })
      ).rejects.toThrow('Kode promo slot 2 tidak boleh sama dengan kode promo slot 1.');
    });

    it('berhasil membuat pesanan manual COD dengan 2 kode promo dan menambah usedCount kedua promo', async () => {
      const initialPromo1 = await prisma.promoCode.findUnique({ where: { id: promo1.id } });
      const initialPromo2 = await prisma.promoCode.findUnique({ where: { id: promo2.id } });

      const result = await createManualCodOrder({
        creator: adminPusatUser,
        customerName: 'Pelanggan Dual Promo COD',
        customerPhone: '081298765432',
        handoverLocation: 'Kantor Cabang Pusat',
        items: [{ productId: testProduct.id, variantId: testVariant.id, quantity: 2 }], // 2 x 100k = 200k
        promoCode: promo1.code, // 10% dari 200k = 20k
        secondPromoCode: promo2.code, // 15k
        note: 'Tes pesanan COD dual promo',
      });

      expect(result.success).toBe(true);
      expect(result.order).toBeDefined();
      expect(result.order.promoCodeId).toBe(promo1.id);
      expect(result.order.secondPromoCodeId).toBe(promo2.id);
      expect(result.order.paymentMethod).toBe(PaymentMethod.COD);
      expect(result.order.shippingCost).toBe(0); // F1 mutlak ongkir 0

      // Subtotal = 200.000, Total Diskon = 20.000 + 15.000 = 35.000
      expect(result.order.subtotal).toBe(200000);
      expect(result.order.discountAmount).toBe(35000);
      expect(result.order.netPrice).toBe(165000);
      // PPN 11% dari 165.000 = 18.150
      expect(result.order.ppnAmount).toBe(18150);
      expect(result.order.totalPrice).toBe(165000 + 18150);

      // Verifikasi usedCount di database naik +1 untuk kedua kode promo
      const updatedPromo1 = await prisma.promoCode.findUnique({ where: { id: promo1.id } });
      const updatedPromo2 = await prisma.promoCode.findUnique({ where: { id: promo2.id } });

      expect(updatedPromo1?.usedCount).toBe((initialPromo1?.usedCount || 0) + 1);
      expect(updatedPromo2?.usedCount).toBe((initialPromo2?.usedCount || 0) + 1);
    });
  });

  describe('3. Owner Reporting: calculatePromoUsage dengan Dual Promos', () => {
    it('menghitung pemakaian kedua kode promo pada pesanan yang selesai', () => {
      const mockOrders: OrderFinancialRecord[] = [
        {
          id: 'ord-dual-1',
          code: 'LVR-DUAL-001',
          regionId: pusatRegion.id,
          status: OrderStatus.SELESAI,
          paymentMethod: PaymentMethod.COD,
          createdAt: new Date(),
          subtotal: 200000,
          discountAmount: 35000,
          netPrice: 165000,
          ppnAmount: 18150,
          shippingCost: 0,
          totalPrice: 183150,
          promoCode: promo1.code,
          secondPromoCode: promo2.code,
          promoCodesCombined: `${promo1.code} + ${promo2.code}`,
          items: [],
        },
      ];

      const stats = calculatePromoUsage(mockOrders);
      expect(stats.length).toBe(2);

      const stat1 = stats.find((s) => s.code === promo1.code);
      const stat2 = stats.find((s) => s.code === promo2.code);

      expect(stat1).toBeDefined();
      expect(stat1?.timesUsed).toBe(1);
      expect(stat2).toBeDefined();
      expect(stat2?.timesUsed).toBe(1);
      // Diskon terbagi proporsional
      expect(stat1!.totalDiscountGiven + stat2!.totalDiscountGiven).toBe(35000);
    });
  });
});
