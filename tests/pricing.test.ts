// tests/pricing.test.ts
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculatePricingPure,
  ProductDataForCalculation,
  PromoDataForCalculation,
  PricingItemInput,
} from '../lib/pricing';

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

  assert.equal(result.subtotal, 120000, 'Subtotal harus 120.000');
  assert.equal(result.discountAmount, 0, 'Diskon tanpa promo harus 0');
  assert.equal(result.netPrice, 120000, 'Net price harus 120.000');
  assert.equal(result.ppnAmount, Math.round(120000 * 0.11), 'PPN harus 11% dari net = 13.200');
  assert.equal(result.shippingCost, 6000, 'Ongkir JNE REG harus 6.000');
  assert.equal(result.totalPrice, 120000 + 13200 + 6000, 'Total harus 139.200');
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
  assert.equal(result.subtotal, 120000);
  assert.equal(result.discountAmount, 60000);
  assert.equal(result.netPrice, 60000);
  assert.equal(result.ppnAmount, 6600);
  assert.equal(result.shippingCost, 6000);
  assert.equal(result.totalPrice, 72600);
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
  assert.equal(result.subtotal, 120000);
  assert.equal(result.discountAmount, 50000);
  assert.equal(result.netPrice, 70000);
  assert.equal(result.ppnAmount, 7700);
  assert.equal(result.shippingCost, 6000);
  assert.equal(result.totalPrice, 83700);
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

  assert.equal(result.discountAmount, 0, 'Promo kedaluwarsa tidak boleh menghasilkan diskon');
  assert.equal(result.promoApplied, null, 'Promo applied harus null');
  assert.equal(result.totalPrice, 139200);
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

  assert.equal(result.discountAmount, 0, 'Promo kuota habis tidak boleh menghasilkan diskon');
  assert.equal(result.promoApplied, null);
  assert.equal(result.totalPrice, 139200);
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

  assert.equal(result.shippingCost, 0, 'Ongkir harus 0 jika promo gratis ongkir');
  assert.equal(result.totalPrice, 120000 + 13200 + 0, 'Total tanpa ongkir = 133.200');
});

test('Pricing: manipulasi client totalPrice dikoreksi ke angka server resmi', () => {
  // Simulasi skenario serangan:
  // Klien memanipulasi payload dengan totalPrice = 1.000 padahal nilai riil = 139.200
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

  // Verifikasi bahwa server mendeteksi dan menggunakan nilai kalkulasi server yang sah
  assert.notEqual(clientManipulatedPayload.totalPrice, serverResult.totalPrice);
  assert.equal(serverResult.totalPrice, 139200, 'Server harus mutlak menggunakan total 139.200');
  assert.equal(serverResult.ppnAmount, 13200, 'Server harus mutlak menggunakan PPN 13.200');
  assert.equal(serverResult.shippingCost, 6000, 'Server harus mutlak menggunakan ongkir 6.000');
});
