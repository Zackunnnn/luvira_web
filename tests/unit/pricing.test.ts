// tests/pricing.test.ts
import { test, expect } from 'vitest';
import {
  calculatePricingPure,
  ProductDataForCalculation,
  PromoDataForCalculation,
  PricingItemInput,
} from '@/lib/pricing';

const mockProductsMap = new Map<string, ProductDataForCalculation>([
  ['prod-1', { id: 'prod-1', price: 35000, costPrice: 15000, packingCost: 2000 }],
  ['prod-2', { id: 'prod-2', price: 50000, costPrice: 20000, packingCost: 2000 }],
]);

const sampleItems: PricingItemInput[] = [
  {
    product: { id: 'prod-1' },
    selectedVariant: { id: 'var-1' },
    quantity: 2, // 2 x 35.000 = 70.000
  },
  {
    product: { id: 'prod-2' },
    selectedVariant: { id: 'var-2' },
    quantity: 1, // 1 x 50.000 = 50.000
  },
];
// Total subtotal sebelum promo = 120.000

test('Pricing: kalkulasi subtotal resmi dari harga database (tanpa promo)', () => {
  const result = calculatePricingPure({
    items: sampleItems,
    productsMap: mockProductsMap,
    promo: null,
    shippingCourier: 'JNE - REG', // 6.000
  });

  expect(result.subtotal).toBe(120000);
  expect(result.discountAmount).toBe(0);
  expect(result.netPrice).toBe(120000);
  expect(result.ppnAmount).toBe(Math.round(120000 * 0.11));
  expect(result.shippingCost).toBe(6000);
  expect(result.totalPrice).toBe(120000 + 13200 + 6000);
});

test('Pricing: promo diskon persentase (50%)', () => {
  const promoPercent: PromoDataForCalculation = {
    id: 'promo-pct',
    code: 'DISKON50',
    discountType: 'percentage',
    discountValue: 50,
    quota: 100,
    usedCount: 0,
    expiresAt: null,
    isActive: true,
    isFreeShipping: false,
    isFreeTax: false,
  };

  const result = calculatePricingPure({
    items: sampleItems,
    productsMap: mockProductsMap,
    promo: promoPercent,
    shippingCourier: 'JNE - REG',
  });

  // Subtotal: 120.000, Diskon 50% = 60.000, Net = 60.000, PPN = 6.600, Ongkir = 6.000 -> Total = 72.600
  expect(result.subtotal).toBe(120000);
  expect(result.discountAmount).toBe(60000);
  expect(result.netPrice).toBe(60000);
  expect(result.ppnAmount).toBe(6600);
  expect(result.shippingCost).toBe(6000);
  expect(result.totalPrice).toBe(72600);
});

test('Pricing: promo diskon nominal tetap (potongan Rp 50.000)', () => {
  const promoFixed: PromoDataForCalculation = {
    id: 'promo-fixed',
    code: 'POTONG50K',
    discountType: 'fixed',
    discountValue: 50000,
    quota: 50,
    usedCount: 10,
    expiresAt: null,
    isActive: true,
    isFreeShipping: false,
    isFreeTax: false,
  };

  const result = calculatePricingPure({
    items: sampleItems,
    productsMap: mockProductsMap,
    promo: promoFixed,
    shippingCourier: 'JNE - REG',
  });

  // Subtotal: 120.000, Diskon: 50.000, Net: 70.000, PPN (11% of 70k): 7.700, Ongkir: 6.000 -> Total: 83.700
  expect(result.subtotal).toBe(120000);
  expect(result.discountAmount).toBe(50000);
  expect(result.netPrice).toBe(70000);
  expect(result.ppnAmount).toBe(7700);
  expect(result.shippingCost).toBe(6000);
  expect(result.totalPrice).toBe(83700);
});

test('Pricing: promo kedaluwarsa harus ditolak (diskon 0)', () => {
  const expiredPromo: PromoDataForCalculation = {
    id: 'promo-exp',
    code: 'EXPIRED10',
    discountType: 'percentage',
    discountValue: 10,
    quota: 100,
    usedCount: 0,
    expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // Kemarin
    isActive: true,
    isFreeShipping: false,
    isFreeTax: false,
  };

  const result = calculatePricingPure({
    items: sampleItems,
    productsMap: mockProductsMap,
    promo: expiredPromo,
    shippingCourier: 'JNE - REG',
  });

  expect(result.discountAmount).toBe(0);
  expect(result.promoApplied).toBeNull();
  expect(result.totalPrice).toBe(139200);
});

test('Pricing: promo kuota habis harus ditolak (diskon 0)', () => {
  const exhaustedPromo: PromoDataForCalculation = {
    id: 'promo-exhausted',
    code: 'HABIS10',
    discountType: 'fixed',
    discountValue: 20000,
    quota: 10,
    usedCount: 10, // Kuota pas habis
    expiresAt: null,
    isActive: true,
    isFreeShipping: false,
    isFreeTax: false,
  };

  const result = calculatePricingPure({
    items: sampleItems,
    productsMap: mockProductsMap,
    promo: exhaustedPromo,
    shippingCourier: 'JNE - REG',
  });

  expect(result.discountAmount).toBe(0);
  expect(result.promoApplied).toBeNull();
  expect(result.totalPrice).toBe(139200);
});

test('Pricing: promo gratis ongkir (isFreeShipping: true)', () => {
  const freeShippingPromo: PromoDataForCalculation = {
    id: 'promo-freeship',
    code: 'ONGKIRGRATIS',
    discountType: 'fixed',
    discountValue: 0,
    quota: 100,
    usedCount: 0,
    expiresAt: null,
    isActive: true,
    isFreeShipping: true,
    isFreeTax: false,
  };

  const result = calculatePricingPure({
    items: sampleItems,
    productsMap: mockProductsMap,
    promo: freeShippingPromo,
    shippingCourier: 'JNE - REG',
  });

  expect(result.shippingCost).toBe(0);
  expect(result.totalPrice).toBe(120000 + 13200 + 0);
});

test('Pricing: manipulasi client totalPrice dikoreksi ke angka server resmi', () => {
  const clientManipulatedPayload = {
    items: sampleItems,
    totalPrice: 1000, // Manipulasi harga
    shippingCost: 0,   // Manipulasi ongkir
    ppnAmount: 0,      // Manipulasi PPN
  };

  const serverResult = calculatePricingPure({
    items: clientManipulatedPayload.items,
    productsMap: mockProductsMap,
    promo: null,
    shippingCourier: 'JNE - REG',
  });

  expect(clientManipulatedPayload.totalPrice).not.toBe(serverResult.totalPrice);
  expect(serverResult.totalPrice).toBe(139200);
  expect(serverResult.ppnAmount).toBe(13200);
  expect(serverResult.shippingCost).toBe(6000);
});
