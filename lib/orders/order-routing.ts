// lib/orders/order-routing.ts
// ============================================================================
// Order Routing Engine & Atomic Stock Reservation Luvira 2.0
// Sesuai docs/LUVIRA_2_PLAN.md Bagian 5.2, A6, A10
// ============================================================================

import { prisma } from '@/lib/db';
import {
  Region,
  OrderStatus,
  PaymentMethod,
  StockMovementType,
  Role,
} from '@prisma/client';
import { calculatePricingPure, ServerPricingResult, PromoDataForCalculation } from '@/lib/pricing';
import { normalizeWhatsAppNumber } from '@/lib/whatsapp';
import { emailService } from '@/lib/email/email-service';
import { audit } from '@/lib/audit';

export interface RouteOrderDestination {
  provinceName: string;
  cityName?: string;
  districtName?: string;
  subDistrictName?: string;
  postalCode?: string;
  street: string;
}

export interface RouteOrderItemInput {
  productId: string;
  variantId: string;
  quantity: number;
}

export interface RouteOrderResult {
  handlingRegion: Region;
  isFallbackToPusat: boolean;
  reason?: string;
}

/**
 * 1. Menentukan wilayah penangan pesanan berdasarkan alamat tujuan (A10)
 */
export async function resolveTargetRegion(destination: {
  provinceName: string;
  cityName?: string;
}): Promise<Region> {
  const normProvince = destination.provinceName.trim().toLowerCase();

  try {
    // Cari di RegionCoverage
    const coverages = await prisma.regionCoverage.findMany({
      include: { region: true },
    });

    // A. Cari kecocokan provinsi spesifik (misal DI Yogyakarta)
    const matched = coverages.find((c) => {
      if (c.isDefault) return false;
      const covProv = c.provinceName.toLowerCase();
      return normProvince.includes(covProv) || covProv.includes(normProvince);
    });

    if (matched && matched.region && matched.region.isActive) {
      return matched.region;
    }

    // B. Fallback ke Pusat (Default Coverage atau code PUSAT)
    const defaultCoverage = coverages.find((c) => c.isDefault);
    if (defaultCoverage && defaultCoverage.region) {
      return defaultCoverage.region;
    }

    const pusatRegion = await prisma.region.findFirst({
      where: { code: 'PUSAT', isActive: true },
    });

    if (pusatRegion) return pusatRegion;

    const anyRegion = await prisma.region.findFirst({ where: { isActive: true } });
    if (anyRegion) return anyRegion;
  } catch (err) {
    console.warn('[Order Routing] Database unreachable, using deterministic fallback region:', err);
  }

  // Fallback deterministik jika database offline / error
  if (normProvince.includes('yogyakarta')) {
    return {
      id: 'reg-yogyakarta',
      code: 'YOGYAKARTA',
      name: 'Yogyakarta (DIY)',
      type: 'WILAYAH' as any,
      originId: '31405',
      address: 'Jl. Malioboro No. 45, Kota Yogyakarta',
      province: 'DI Yogyakarta',
      city: 'Kota Yogyakarta',
      district: 'Danurejan',
      subDistrict: 'Suryatmajan',
      postalCode: '55213',
      phone: '081298765432',
      email: 'jogja@luvira.id',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  return {
    id: 'reg-pusat',
    code: 'PUSAT',
    name: 'Pusat (Kota Depok)',
    type: 'PUSAT' as any,
    originId: '25976',
    address: 'Jl. Margonda Raya No. 100, Beji, Kota Depok',
    province: 'Jawa Barat',
    city: 'Kota Depok',
    district: 'Beji',
    subDistrict: 'Kemirimuka',
    postalCode: '16423',
    phone: '081234567890',
    email: 'pusat@luvira.id',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

/**
 * 2. Cek ketersediaan stok fisik di wilayah tertentu (stok tersedia = qty - reserved)
 */
export async function checkRegionalStockAvailability(
  regionId: string,
  items: RouteOrderItemInput[]
): Promise<boolean> {
  for (const item of items) {
    const stock = await prisma.stock.findUnique({
      where: {
        variantId_regionId: {
          variantId: item.variantId,
          regionId,
        },
      },
    });

    if (!stock) return false;
    const available = stock.qty - stock.reserved;
    if (available < item.quantity) {
      return false; // Kurang stok
    }
  }
  return true;
}

/**
 * 3. Routing Pesanan Lengkap: Cek wilayah tujuan -> Cek stok -> Fallback Pusat jika kurang (A6)
 */
export async function determineHandlingRegion(params: {
  destination: { provinceName: string; cityName?: string };
  items: RouteOrderItemInput[];
}): Promise<RouteOrderResult> {
  const primaryRegion = await resolveTargetRegion(params.destination);

  // Jika tujuan memang Pusat, langsung tangani di Pusat
  if (primaryRegion.code === 'PUSAT') {
    return {
      handlingRegion: primaryRegion,
      isFallbackToPusat: false,
    };
  }

  // Jika tujuan wilayah cabang (mis. Yogyakarta), periksa stok semua item
  const hasEnoughStock = await checkRegionalStockAvailability(primaryRegion.id, params.items);

  if (hasEnoughStock) {
    return {
      handlingRegion: primaryRegion,
      isFallbackToPusat: false,
    };
  }

  // Jika stok di cabang kurang, seluruh pesanan dialihkan ke Pusat (A6)
  const pusatRegion = (await prisma.region.findFirst({
    where: { code: 'PUSAT', isActive: true },
  })) || (await prisma.region.findFirst({ where: { isActive: true } }));

  if (!pusatRegion) {
    throw new Error('Gudang Pusat tidak ditemukan.');
  }

  return {
    handlingRegion: pusatRegion,
    isFallbackToPusat: true,
    reason: `Stok salah satu item di ${primaryRegion.name} tidak mencukupi, seluruh pesanan dialihkan ke Pusat.`,
  };
}

export interface CreateOrderParams {
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  destination: RouteOrderDestination;
  items: Array<{
    productId: string;
    variantId: string;
    quantity: number;
  }>;
  paymentMethod: PaymentMethod;
  promoCodeId?: string;
  shippingCourier?: string;
  shippingCost?: number;
}

/**
 * 4. Pembuatan Pesanan dengan Reservasi Stok Atomik dalam Satu Transaksi Database
 */
export async function createOrderWithAtomicReservation(params: CreateOrderParams) {
  // A. Routing wilayah penangan
  const routeResult = await determineHandlingRegion({
    destination: params.destination,
    items: params.items,
  });
  const handlingRegion = routeResult.handlingRegion;

  // B. Ambil data produk & varian
  const productIds = Array.from(new Set(params.items.map((i) => i.productId)));
  const dbProducts = await prisma.product.findMany({
    where: { id: { in: productIds } },
    include: {
      variants: {
        include: { cost: true },
      },
    },
  });

  const productsMap = new Map();
  const variantsMap = new Map();
  for (const p of dbProducts) {
    productsMap.set(p.id, {
      id: p.id,
      price: p.price,
      costPrice: 0,
      packingCost: 0,
    });
    for (const v of p.variants) {
      variantsMap.set(v.id, {
        variant: v,
        product: p,
        costPrice: v.cost?.costPrice || 0,
        packingCost: v.cost?.packingCost || 0,
      });
    }
  }

  // C. Validasi promo di server jika ada
  let promoData: PromoDataForCalculation | null = null;
  if (params.promoCodeId) {
    const promo = await prisma.promoCode.findUnique({
      where: { id: params.promoCodeId },
    });
    if (promo) {
      // Validasi promo wilayah (promo wilayah hanya berlaku untuk pesanan wilayah itu)
      if (promo.type === 'WILAYAH' && promo.regionId && promo.regionId !== handlingRegion.id) {
        throw new Error('Kode promo wilayah ini tidak berlaku untuk pengiriman wilayah Anda.');
      }
      promoData = {
        id: promo.id,
        code: promo.code,
        discountType: promo.discountType.toLowerCase(),
        discountValue: promo.discountValue,
        quota: promo.quota,
        usedCount: promo.usedCount,
        expiresAt: promo.expiresAt,
        isActive: promo.isActive,
        isFreeShipping: promo.isFreeShipping,
        isFreeTax: promo.isFreeTax,
      };
    }
  }

  // D. Hitung harga resmi server
  const pricingInputItems = params.items.map((item) => ({
    product: { id: item.productId },
    selectedVariant: { id: item.variantId },
    quantity: item.quantity,
  }));

  const pricing: ServerPricingResult = calculatePricingPure({
    items: pricingInputItems,
    productsMap,
    promo: promoData,
    shippingCourier: params.shippingCourier,
    shippingCost: params.shippingCost,
  });

  // E. Bangkitkan Order Code unik: LVR-YYYYMMDD-XXXX (dengan pengecekan unik agar anti-tabrakan)
  const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  let orderCode = '';
  for (let attempt = 0; attempt < 20; attempt++) {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const candidate = `LVR-${todayStr}-${randomSuffix}`;
    const existing = await prisma.order.findUnique({
      where: { code: candidate },
      select: { id: true },
    });
    if (!existing) {
      orderCode = candidate;
      break;
    }
  }
  if (!orderCode) {
    orderCode = `LVR-${todayStr}-${Math.floor(1000 + Math.random() * 9000)}`;
  }
  const normalizedPhone = normalizeWhatsAppNumber(params.customerPhone);
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 jam batas bayar (A5)

  // F. Transaksi Database Atomik (Anti Oversell)
  const createdOrder = await prisma.$transaction(async (tx) => {
    // 1. Cek & Reserve Stok secara atomik
    for (const item of params.items) {
      // 1. Ambil baris stok dengan Row-Level Lock (FOR UPDATE) untuk mencegah race condition (Anti-Oversell)
      const lockedStocks = await tx.$queryRaw<
        Array<{ id: string; qty: number; reserved: number }>
      >`
        SELECT id, qty, reserved FROM "Stock"
        WHERE "variantId" = ${item.variantId} AND "regionId" = ${handlingRegion.id}
        LIMIT 1
        FOR UPDATE
      `;

      if (!lockedStocks || lockedStocks.length === 0) {
        throw new Error(`Data stok tidak ditemukan untuk varian ${item.variantId} di gudang ${handlingRegion.name}.`);
      }

      const stock = lockedStocks[0];
      const available = stock.qty - stock.reserved;
      if (available < item.quantity) {
        const vInfo = variantsMap.get(item.variantId);
        const vName = vInfo ? `${vInfo.product.name} (${vInfo.variant.name})` : item.variantId;
        throw new Error(`Stok produk "${vName}" tidak mencukupi di gudang ${handlingRegion.name}. Sisa tersedia: ${available}.`);
      }

      // 2. Reserve stok dengan update bersyarat
      const updateResult = await tx.stock.updateMany({
        where: {
          id: stock.id,
          reserved: { lte: stock.qty - item.quantity },
        },
        data: {
          reserved: { increment: item.quantity },
        },
      });

      if (updateResult.count === 0) {
        throw new Error(`Stok produk tidak mencukupi (terambil oleh pesanan lain).`);
      }

      // Catat mutasi stok
      await tx.stockMovement.create({
        data: {
          stockId: stock.id,
          type: StockMovementType.RESERVE,
          qtyChange: item.quantity,
          balanceAfter: stock.qty,
          reason: `Pesanan dibuat #${orderCode} (reserved)`,
        },
      });
    }

    // 2. Potong kuota promo jika promo dipakai
    if (pricing.promoApplied) {
      await tx.promoCode.update({
        where: { id: pricing.promoApplied.id },
        data: { usedCount: { increment: 1 } },
      });
    }

    // 3. Buat pesanan Order
    const order = await tx.order.create({
      data: {
        code: orderCode,
        regionId: handlingRegion.id,
        status: OrderStatus.MENUNGGU_PEMBAYARAN,
        paymentMethod: params.paymentMethod,
        customerName: params.customerName,
        customerPhone: normalizedPhone,
        customerEmail: params.customerEmail || null,
        shippingAddress: params.destination as any,
        subtotal: pricing.subtotal,
        discountAmount: pricing.discountAmount,
        netPrice: pricing.netPrice,
        ppnAmount: pricing.ppnAmount,
        shippingCost: pricing.shippingCost,
        totalPrice: pricing.totalPrice,
        courierCode: params.shippingCourier || null,
        promoCodeId: pricing.promoApplied?.id || null,
        expiresAt,
        items: {
          create: params.items.map((item) => {
            const vInfo = variantsMap.get(item.variantId);
            return {
              variantId: item.variantId,
              productName: vInfo?.product.name || 'Produk Luvira',
              variantName: vInfo?.variant.name || 'Varian',
              quantity: item.quantity,
              priceEach: vInfo?.product.price || 0,
              costEach: vInfo?.costPrice || 0,
              packingEach: vInfo?.packingCost || 0,
              subtotal: (vInfo?.product.price || 0) * item.quantity,
            };
          }),
        },
      },
      include: { items: true },
    });

    // 4. Catat riwayat status pertama
    await tx.orderStatusLog.create({
      data: {
        orderId: order.id,
        fromStatus: null,
        toStatus: OrderStatus.MENUNGGU_PEMBAYARAN,
        note: `Pesanan dibuat diarahkan ke gudang ${handlingRegion.name}${routeResult.isFallbackToPusat ? ' (Fallback Pusat)' : ''}`,
        actorRole: 'BUYER',
      },
    });

    // 5. Buat Notifikasi untuk Admin Wilayah Penangan (A9)
    await tx.notification.create({
      data: {
        targetRole: handlingRegion.type === 'PUSAT' ? Role.ADMIN_PUSAT : Role.ADMIN_WILAYAH,
        targetRegionId: handlingRegion.id,
        title: `Pesanan Baru #${orderCode}`,
        message: `Pesanan baru senilai Rp ${pricing.totalPrice.toLocaleString('id-ID')} masuk dari ${params.customerName}.`,
        linkUrl: `/dashboard/admin?orderId=${order.id}`,
      },
    });

    return order;
  }, {
    maxWait: 15000,
    timeout: 30000,
  });

  // G. Audit Log mutasi bisnis
  await audit({
    action: 'CREATE_ORDER',
    entity: 'Order',
    entityId: createdOrder.id,
    after: {
      code: createdOrder.code,
      totalPrice: createdOrder.totalPrice,
      regionId: createdOrder.regionId,
      isFallbackToPusat: routeResult.isFallbackToPusat,
    },
  });

  // H. Kirim email konfirmasi (asynchronous)
  if (params.customerEmail) {
    emailService
      .sendOrderConfirmationEmail({
        code: createdOrder.code,
        customerName: createdOrder.customerName,
        customerEmail: createdOrder.customerEmail,
        totalPrice: createdOrder.totalPrice,
        paymentMethod: createdOrder.paymentMethod,
      })
      .catch((err) => console.error('[Order Confirmation Email Error]', err));
  }

  return {
    order: createdOrder,
    pricing,
    routeResult,
  };
}
