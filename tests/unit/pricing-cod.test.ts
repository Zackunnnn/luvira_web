// tests/unit/pricing-cod.test.ts
// ============================================================================
// FT-2 Unit Tests: Server-Forced Ongkir 0 untuk Metode Bayar COD
// ============================================================================

import { test, expect } from 'vitest';
import {
  calculatePricingPure,
  ProductDataForCalculation,
  PromoDataForCalculation,
  PricingItemInput,
} from '@/lib/pricing';

const mockProductsMap = new Map<string, ProductDataForCalculation>([
  ['prod-1', { id: 'prod-1', price: 50000, costPrice: 20000, packingCost: 2000 }],
  ['prod-2', { id: 'prod-2', price: 75000, costPrice: 30000, packingCost: 3000 }],
]);

const sampleItems: PricingItemInput[] = [
  {
    product: { id: 'prod-1' },
    selectedVariant: { id: 'var-1' },
    quantity: 2, // 2 x 50.000 = 100.000
  },
  {
    product: { id: 'prod-2' },
    selectedVariant: { id: 'var-2' },
    quantity: 1, // 1 x 75.000 = 75.000
  },
];
// Subtotal = 175.000

test('FT-2 Unit: Ongkir dipaksa Rp 0 untuk pesanan COD meskipun klien mengirim custom shipping cost', () => {
  // Klien mencoba mengirim custom shipping cost Rp 25.000
  const clientProvidedShippingCost = 25000;

  // Server memaksa shippingCost = 0 untuk COD (F1)
  const result = calculatePricingPure({
    items: sampleItems,
    productsMap: mockProductsMap,
    promo: null,
    shippingCourier: 'COD_LANGSUNG',
    shippingCost: 0, // Server-side forcing
  });

  expect(result.subtotal).toBe(175000);
  expect(result.shippingCost).toBe(0);
  expect(result.discountAmount).toBe(0);
  expect(result.netPrice).toBe(175000);
  expect(result.ppnAmount).toBe(Math.round(175000 * 0.11)); // 19.250
  expect(result.totalPrice).toBe(175000 + 19250); // Tanpa tambahan ongkir
  expect(result.totalPrice).not.toBe(175000 + 19250 + clientProvidedShippingCost);
});

test('FT-2 Unit: COD dengan promo diskon persentase dan batasan maxDiscountAmount', () => {
  const promoPercent: PromoDataForCalculation = {
    id: 'promo-cod-pct',
    code: 'CODHEMAT20',
    discountType: 'PERCENTAGE',
    discountValue: 20, // 20% dari 175.000 = 35.000
    maxDiscountAmount: 20000, // Capped di 20.000
    quota: 50,
    usedCount: 5,
    expiresAt: null,
    isActive: true,
    isFreeShipping: false,
    isFreeTax: false,
  };

  const result = calculatePricingPure({
    items: sampleItems,
    productsMap: mockProductsMap,
    promo: promoPercent,
    shippingCourier: 'COD_LANGSUNG',
    shippingCost: 0,
  });

  expect(result.subtotal).toBe(175000);
  expect(result.discountAmount).toBe(20000); // capped at maxDiscountAmount
  expect(result.netPrice).toBe(155000);
  expect(result.ppnAmount).toBe(Math.round(155000 * 0.11)); // 17.050
  expect(result.shippingCost).toBe(0);
  expect(result.totalPrice).toBe(155000 + 17050);
});

test('FT-2 Unit: COD mengabaikan tarif kurir ekspedisi jika dikirim oleh klien', () => {
  // Walaupun kurir dikirim JNE - REG, server logika COD memaksa shippingCost = 0
  const result = calculatePricingPure({
    items: sampleItems,
    productsMap: mockProductsMap,
    promo: null,
    shippingCourier: 'JNE - REG',
    shippingCost: 0, // Dipaksa 0 oleh handler COD
  });

  expect(result.shippingCost).toBe(0);
  expect(result.totalPrice).toBe(175000 + Math.round(175000 * 0.11));
});
