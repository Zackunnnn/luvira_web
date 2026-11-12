// lib/pricing.ts
// ============================================================================
// Server-Side Pricing & Promotion Calculation Engine
//
// KEAMANAN KRUSIAL:
// Seluruh total belanja, PPN 11%, diskon promo, dan ongkir WAJIB dihitung ulang
// secara mutlak di sisi server menggunakan data resmi dari Database.
// Nilai totalPrice dari payload client TIDAK BOLEH dipercaya secara mentah.
// Mendukung dual-promo: Promo 1 (Reseller/Umum) + Promo 2 (Diskon Tambahan/Voucher).
// ============================================================================

import { PrismaClient } from '@prisma/client';

export const PPN_PERCENTAGE = 11;

export interface PricingItemInput {
  product: { id: string };
  selectedVariant: { id: string };
  quantity: number;
}

export interface PromoAppliedSummary {
  id: string;
  code: string;
  discountType: string;
  discountValue: number;
  discountAmount?: number;
  isFreeShipping: boolean;
  isFreeTax: boolean;
}

export interface ServerPricingResult {
  subtotal: number;
  discountAmount: number;
  netPrice: number;
  ppnAmount: number;
  shippingCost: number;
  totalPrice: number;
  promoApplied: PromoAppliedSummary | null;
  secondPromoApplied?: PromoAppliedSummary | null;
  promosApplied?: PromoAppliedSummary[];
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
  discountType: string; // 'PERCENTAGE' | 'FIXED' | 'percentage' | 'fixed'
  discountValue: number;
  maxDiscountAmount?: number | null;
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
 * Mendukung slot promo tunggal maupun ganda (dual-promo: promo & secondPromo, atau array promos)
 */
export function calculatePricingPure({
  items,
  productsMap,
  promo = null,
  secondPromo = null,
  promos = null,
  shippingCourier,
  shippingCost: customShippingCost,
  maxDiscountPercentSetting,
  ppnRateSetting,
  now = new Date(),
}: {
  items: PricingItemInput[];
  productsMap: Map<string, ProductDataForCalculation>;
  promo?: PromoDataForCalculation | null;
  secondPromo?: PromoDataForCalculation | null;
  promos?: PromoDataForCalculation[] | null;
  shippingCourier?: string | null;
  shippingCost?: number | null;
  maxDiscountPercentSetting?: number | null;
  ppnRateSetting?: number | null;
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

  // 2. Validasi & Kalkulasi Kode Promo (Mendukung Slot 1 & Slot 2)
  let discountAmount = 0;
  const promoList: PromoDataForCalculation[] = [];
  if (Array.isArray(promos)) {
    for (const p of promos) {
      if (p && !promoList.some((existing) => existing.id === p.id || existing.code === p.code)) {
        promoList.push(p);
      }
    }
  } else {
    if (promo) promoList.push(promo);
    if (secondPromo && (!promo || (secondPromo.id !== promo.id && secondPromo.code.toUpperCase() !== promo.code.toUpperCase()))) {
      promoList.push(secondPromo);
    }
  }

  const appliedPromos: PromoAppliedSummary[] = [];
  let isFreeShipping = false;
  let isFreeTax = false;

  for (const p of promoList) {
    const isNotExpired = !p.expiresAt || new Date(p.expiresAt).getTime() > now.getTime();
    const hasQuota = p.quota <= 0 || p.usedCount < p.quota;

    if (p.isActive && isNotExpired && hasQuota) {
      let promoDisc = 0;
      const dType = (p.discountType || '').toLowerCase();
      if (dType === 'percentage' || dType === 'persen') {
        promoDisc = Math.round((subtotal * p.discountValue) / 100);
        if (p.maxDiscountAmount && p.maxDiscountAmount > 0 && promoDisc > p.maxDiscountAmount) {
          promoDisc = p.maxDiscountAmount;
        }
      } else {
        promoDisc = p.discountValue;
      }

      discountAmount += promoDisc;
      if (p.isFreeShipping) isFreeShipping = true;
      if (p.isFreeTax) isFreeTax = true;

      appliedPromos.push({
        id: p.id,
        code: p.code,
        discountType: p.discountType,
        discountValue: p.discountValue,
        discountAmount: promoDisc,
        isFreeShipping: p.isFreeShipping,
        isFreeTax: p.isFreeTax,
      });
    }
  }

  // Cap maksimum diskon persentase dari setting sistem jika diatur
  if (typeof maxDiscountPercentSetting === 'number' && maxDiscountPercentSetting > 0) {
    const maxAllowedDiscount = Math.round((subtotal * maxDiscountPercentSetting) / 100);
    discountAmount = Math.min(discountAmount, maxAllowedDiscount);
  }

  // Diskon akumulasi tidak boleh melebihi subtotal
  discountAmount = Math.min(discountAmount, subtotal);

  const promoApplied = appliedPromos[0] || null;
  const secondPromoApplied = appliedPromos[1] || null;

  // 3. Hitung Net Price
  const netPrice = Math.max(0, subtotal - discountAmount);

  // 4. Hitung PPN dari Net (dinamis sesuai pengaturan ppnRateSetting, default 11%)
  const activePpnPercentage = typeof ppnRateSetting === 'number' && ppnRateSetting >= 0
    ? ppnRateSetting
    : PPN_PERCENTAGE;

  const ppnAmount = isFreeTax || activePpnPercentage <= 0
    ? 0
    : Math.round((netPrice * activePpnPercentage) / 100);

  // 5. Hitung Ongkir
  let shippingCost = 0;
  if (!isFreeShipping) {
    if (typeof customShippingCost === 'number' && customShippingCost >= 0) {
      shippingCost = customShippingCost;
    } else if (shippingCourier) {
      shippingCost = SERVER_COURIER_RATES[shippingCourier] ?? DEFAULT_SHIPPING_COST;
    }
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
    secondPromoApplied,
    promosApplied: appliedPromos,
    itemsBreakdown,
  };
}

/**
 * Menghitung harga pesanan resmi di server dengan membaca database
 * Mendukung dual promo (promoCodeId dan secondPromoCodeId)
 */
export async function calculateOrderPricing(
  prisma: PrismaClient,
  items: PricingItemInput[],
  promoCodeId?: string | null,
  shippingCourier?: string | null,
  secondPromoCodeId?: string | null
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
      costPrice: 0,
      packingCost: 0,
    });
  });

  // 2. Fetch promo 1 jika ada
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
        maxDiscountAmount: dbPromo.maxDiscountAmount,
        quota: dbPromo.quota,
        usedCount: dbPromo.usedCount,
        expiresAt: dbPromo.expiresAt,
        isActive: dbPromo.isActive,
        isFreeShipping: dbPromo.isFreeShipping,
        isFreeTax: dbPromo.isFreeTax,
      };
    }
  }

  // 3. Fetch promo 2 jika ada
  let secondPromoData: PromoDataForCalculation | null = null;
  if (secondPromoCodeId && secondPromoCodeId !== promoCodeId) {
    const dbSecondPromo = await prisma.promoCode.findUnique({
      where: { id: secondPromoCodeId },
    });
    if (dbSecondPromo) {
      secondPromoData = {
        id: dbSecondPromo.id,
        code: dbSecondPromo.code,
        discountType: dbSecondPromo.discountType,
        discountValue: dbSecondPromo.discountValue,
        maxDiscountAmount: dbSecondPromo.maxDiscountAmount,
        quota: dbSecondPromo.quota,
        usedCount: dbSecondPromo.usedCount,
        expiresAt: dbSecondPromo.expiresAt,
        isActive: dbSecondPromo.isActive,
        isFreeShipping: dbSecondPromo.isFreeShipping,
        isFreeTax: dbSecondPromo.isFreeTax,
      };
    }
  }

  // 4. Fetch PPN rate dari Setting jika ada
  let ppnRateSetting: number | null = null;
  try {
    const settingPpn = await prisma.setting.findUnique({ where: { key: 'ppnRate' } });
    if (settingPpn && settingPpn.value !== undefined && settingPpn.value !== null) {
      if (typeof settingPpn.value === 'number') {
        ppnRateSetting = settingPpn.value;
      } else if (typeof settingPpn.value === 'object') {
        ppnRateSetting = (settingPpn.value as any).rate ?? (settingPpn.value as any).value ?? 11;
      }
    }
  } catch (e) {
    // Fallback default
  }

  return calculatePricingPure({
    items,
    productsMap,
    promo: promoData,
    secondPromo: secondPromoData,
    shippingCourier,
    ppnRateSetting,
  });
}
