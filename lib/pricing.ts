// lib/pricing.ts
// ============================================================================
// Server-Side Pricing & Promotion Calculation Engine
//
// KEAMANAN KRUSIAL:
// Seluruh total belanja, PPN 11%, diskon promo, dan ongkir WAJIB dihitung ulang
// secara mutlak di sisi server menggunakan data resmi dari Database.
// Nilai totalPrice dari payload client TIDAK BOLEH dipercaya secara mentah.
// ============================================================================

import { PrismaClient } from '@prisma/client';

export const PPN_PERCENTAGE = 11;

export interface PricingItemInput {
  product: { id: string };
  selectedVariant: { id: string };
  quantity: number;
}

export interface ServerPricingResult {
  subtotal: number;
  discountAmount: number;
  netPrice: number;
  ppnAmount: number;
  shippingCost: number;
  totalPrice: number;
  promoApplied: {
    id: string;
    code: string;
    discountType: string;
    discountValue: number;
    isFreeShipping: boolean;
    isFreeTax: boolean;
  } | null;
  itemsBreakdown: {
    productId: string;
    variantId: string;
    quantity: number;
    priceEach: number;
    costEach: number;
    packingEach: number;
  }[];
}

export interface PromoDataForCalculation {
  id: string;
  code: string;
  discountType: string; // 'percentage' | 'fixed'
  discountValue: number;
  quota: number;
  usedCount: number;
  expiresAt: Date | null;
  isActive: boolean;
  isFreeShipping: boolean;
  isFreeTax: boolean;
}

export interface ProductDataForCalculation {
  id: string;
  price: number;
  costPrice: number;
  packingCost: number;
}

/**
 * Pemetaan tarif kurir server (sesuai simulasi / integrasi)
 */
export const SERVER_COURIER_RATES: Record<string, number> = {
  'JNE - REG': 6000,
  'JNE - YES': 9000,
  'Sicepat - REG': 6500,
  'Sicepat - BEST': 8500,
  'JNE REG': 6000,
  'JNE YES': 9000,
  'Sicepat REG': 6500,
  'Sicepat BEST': 8500,
};

export const DEFAULT_SHIPPING_COST = 6000;

/**
 * Fungsi kalkulasi murni (Pure Function) untuk kalkulasi harga server & unit testing
 */
export function calculatePricingPure({
  items,
  productsMap,
  promo,
  shippingCourier,
  now = new Date(),
}: {
  items: PricingItemInput[];
  productsMap: Map<string, ProductDataForCalculation>;
  promo: PromoDataForCalculation | null;
  shippingCourier?: string | null;
  now?: Date;
}): ServerPricingResult {
  // 1. Hitung Subtotal berdasarkan harga database resmi
  let subtotal = 0;
  const itemsBreakdown = items.map((item) => {
    const qty = Math.max(1, Math.floor(item.quantity || 1));
    const dbProduct = productsMap.get(item.product.id);
    if (!dbProduct) {
      throw new Error(`Produk dengan ID ${item.product.id} tidak ditemukan.`);
    }

    const priceEach = dbProduct.price;
    subtotal += priceEach * qty;

    return {
      productId: item.product.id,
      variantId: item.selectedVariant.id,
      quantity: qty,
      priceEach: priceEach,
      costEach: dbProduct.costPrice || 0,
      packingEach: dbProduct.packingCost || 0,
    };
  });

  // 2. Validasi Kode Promo
  let discountAmount = 0;
  let promoApplied: ServerPricingResult['promoApplied'] = null;

  if (promo) {
    const isNotExpired = !promo.expiresAt || new Date(promo.expiresAt).getTime() > now.getTime();
    const hasQuota = promo.quota <= 0 || promo.usedCount < promo.quota;

    if (promo.isActive && isNotExpired && hasQuota) {
      if (promo.discountType === 'percentage') {
        discountAmount = Math.round((subtotal * promo.discountValue) / 100);
      } else {
        discountAmount = promo.discountValue;
      }

      // Diskon tidak boleh melebihi subtotal
      discountAmount = Math.min(discountAmount, subtotal);

      promoApplied = {
        id: promo.id,
        code: promo.code,
        discountType: promo.discountType,
        discountValue: promo.discountValue,
        isFreeShipping: promo.isFreeShipping,
        isFreeTax: promo.isFreeTax,
      };
    }
  }

  // 3. Hitung Net Price
  const netPrice = Math.max(0, subtotal - discountAmount);

  // 4. Hitung PPN 11% dari Net
  const isFreeTax = promoApplied?.isFreeTax || false;
  const ppnAmount = isFreeTax ? 0 : Math.round((netPrice * PPN_PERCENTAGE) / 100);

  // 5. Hitung Ongkir
  const isFreeShipping = promoApplied?.isFreeShipping || false;
  let shippingCost = 0;
  if (!isFreeShipping && shippingCourier) {
    shippingCost = SERVER_COURIER_RATES[shippingCourier] ?? DEFAULT_SHIPPING_COST;
  }

  // 6. Total Akhir
  const totalPrice = netPrice + ppnAmount + shippingCost;

  return {
    subtotal,
    discountAmount,
    netPrice,
    ppnAmount,
    shippingCost,
    totalPrice,
    promoApplied,
    itemsBreakdown,
  };
}

/**
 * Menghitung harga pesanan resmi di server dengan membaca database
 */
export async function calculateOrderPricing(
  prisma: PrismaClient,
  items: PricingItemInput[],
  promoCodeId?: string | null,
  shippingCourier?: string | null
): Promise<ServerPricingResult> {
  if (!items || items.length === 0) {
    throw new Error('Keranjang belanja kosong.');
  }

  // 1. Fetch seluruh produk yang ada di order dari Database
  const productIds = items.map((i) => i.product.id);
  const dbProducts = await prisma.product.findMany({
    where: { id: { in: productIds } },
  });

  const productsMap = new Map<string, ProductDataForCalculation>();
  dbProducts.forEach((p) => {
    productsMap.set(p.id, {
      id: p.id,
      price: p.price,
      costPrice: p.costPrice,
      packingCost: p.packingCost,
    });
  });

  // 2. Fetch promo jika ada
  let promoData: PromoDataForCalculation | null = null;
  if (promoCodeId) {
    const dbPromo = await prisma.promoCode.findUnique({
      where: { id: promoCodeId },
    });
    if (dbPromo) {
      promoData = {
        id: dbPromo.id,
        code: dbPromo.code,
        discountType: dbPromo.discountType,
        discountValue: dbPromo.discountValue,
        quota: dbPromo.quota,
        usedCount: dbPromo.usedCount,
        expiresAt: dbPromo.expiresAt,
        isActive: dbPromo.isActive,
        isFreeShipping: dbPromo.isFreeShipping,
        isFreeTax: dbPromo.isFreeTax,
      };
    }
  }

  return calculatePricingPure({
    items,
    productsMap,
    promo: promoData,
    shippingCourier,
  });
}
