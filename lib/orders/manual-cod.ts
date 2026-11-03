// lib/orders/manual-cod.ts
// ============================================================================
// Pembuatan Pesanan Manual COD (Cash on Delivery) Luvira 2.0
// Sesuai Aturan FT-2 & Asumsi F1, F2, F3, F7 di docs/DECISIONS.md:
// - F1: COD hanya lewat pesanan manual buatan Admin/Reseller, ongkir dipaksa 0 oleh server.
// - F2: Pendapatan COD dihitung saat status selesai.
// - F3: Reseller menandai "diserahkan"; Admin wilayah penangan menandai "uang diterima" dan menyelesaikan.
// - F7: Wilayah pemenuhan COD reseller = wilayah pada akun reseller (bawaan Pusat).
// ============================================================================

import { prisma } from '@/lib/db';
import { AuthUser, can } from '@/lib/permissions';
import { calculatePricingPure, ProductDataForCalculation, PromoDataForCalculation } from '@/lib/pricing';
import { audit } from '@/lib/audit';
import { enqueueWhatsAppNotification } from '@/lib/notify/queue';
import { OrderStatus, PaymentMethod, Role, StockMovementType } from '@prisma/client';

export interface CreateManualCodOrderInput {
  creator: AuthUser;
  customerName: string;
  customerPhone: string;
  handoverLocation?: string;
  items: Array<{
    productId: string;
    variantId: string;
    quantity: number;
  }>;
  promoCode?: string;
  secondPromoCode?: string;
  note?: string;
  targetRegionId?: string;
}

export async function createManualCodOrder(params: CreateManualCodOrderInput) {
  const { creator, customerName, customerPhone, handoverLocation, items, promoCode, secondPromoCode, note, targetRegionId } = params;

  // 1. Validasi Input Dasar
  if (!customerName?.trim() || !customerPhone?.trim()) {
    throw new Error('Nama dan nomor WhatsApp pelanggan wajib diisi.');
  }

  if (!items || !Array.isArray(items) || items.length === 0) {
    throw new Error('Daftar produk pesanan manual tidak boleh kosong.');
  }

  // 2. Tentukan Wilayah Pemenuhan (Fulfillment Region) Sesuai F7
  let fulfillmentRegionId: string;

  // Cari gudang Pusat sebagai default fallback
  const pusatRegion = await prisma.region.findFirst({
    where: { type: 'PUSAT' },
  });
  if (!pusatRegion) {
    throw new Error('Gudang Pusat belum terkonfigurasi di sistem.');
  }

  if (creator.role === Role.ADMIN_WILAYAH) {
    // Admin wilayah mutlak hanya boleh di wilayahnya sendiri
    if (!creator.regionId) {
      throw new Error('Akun Admin Wilayah tidak memiliki penugasan wilayah yang valid.');
    }
    if (targetRegionId && targetRegionId !== creator.regionId) {
      throw new Error('Akses ditolak: Admin Wilayah hanya boleh membuat pesanan COD di wilayah tugasnya.');
    }
    fulfillmentRegionId = creator.regionId;
  } else if (creator.role === Role.RESELLER) {
    // F7: Wilayah pemenuhan COD reseller = wilayah pada akun reseller (bawaan Pusat)
    const assignedRegionId = creator.regionId || pusatRegion.id;
    if (targetRegionId && targetRegionId !== assignedRegionId) {
      throw new Error('Akses ditolak: Reseller hanya dapat membuat pesanan COD di wilayah akunnya.');
    }
    fulfillmentRegionId = assignedRegionId;
  } else if (creator.role === Role.ADMIN_PUSAT || creator.role === Role.OWNER) {
    fulfillmentRegionId = targetRegionId || pusatRegion.id;
  } else {
    throw new Error('Peran Anda tidak memiliki wewenang membuat pesanan manual COD.');
  }

  // 3. Verifikasi Izin RBAC
  const hasPermission = can(creator, 'order:create_cod', { regionId: fulfillmentRegionId });
  if (!hasPermission) {
    throw new Error('Anda tidak memiliki izin (order:create_cod) untuk wilayah pemenuhan ini.');
  }

  const fulfillmentRegion = await prisma.region.findUnique({
    where: { id: fulfillmentRegionId },
  });
  if (!fulfillmentRegion) {
    throw new Error('Wilayah pemenuhan tidak ditemukan.');
  }

  // 4. Ambil Data Produk, Varian, dan Cek Stok
  const variantIds = Array.from(new Set(items.map((i) => i.variantId)));
  const dbVariants = await prisma.productVariant.findMany({
    where: { id: { in: variantIds } },
    include: {
      product: true,
      cost: true,
    },
  });

  const productsMap = new Map<string, ProductDataForCalculation>();
  const variantsMap = new Map<string, any>();

  for (const v of dbVariants) {
    const p = v.product;
    if (p && !productsMap.has(p.id)) {
      productsMap.set(p.id, {
        id: p.id,
        price: p.price,
        costPrice: 0,
        packingCost: 0,
      });
    }
    variantsMap.set(v.id, {
      variant: v,
      product: p,
      costPrice: v.cost?.costPrice || 0,
      packingCost: v.cost?.packingCost || 0,
    });
  }

  // Validasi ketersediaan stok fisik di gudang pemenuhan
  for (const item of items) {
    const vInfo = variantsMap.get(item.variantId);
    if (!vInfo) {
      throw new Error(`Varian dengan ID ${item.variantId} tidak ditemukan.`);
    }

    const stockRecord = await prisma.stock.findUnique({
      where: {
        variantId_regionId: {
          variantId: item.variantId,
          regionId: fulfillmentRegionId,
        },
      },
    });

    const availableStock = stockRecord ? stockRecord.qty - stockRecord.reserved : 0;
    if (availableStock < item.quantity) {
      throw new Error(
        `Stok varian "${vInfo.variant.name}" di gudang ${fulfillmentRegion.name} tidak mencukupi (tersedia: ${availableStock}, diminta: ${item.quantity}).`
      );
    }
  }

  // 5. Validasi Kode Promo (Mendukung Slot 1 & Slot 2)
  let promoData: PromoDataForCalculation | null = null;
  let secondPromoData: PromoDataForCalculation | null = null;
  const now = new Date();

  // Validasi Promo 1
  if (promoCode && promoCode.trim().length > 0) {
    const dbPromo = await prisma.promoCode.findUnique({
      where: { code: promoCode.trim().toUpperCase() },
    });

    if (!dbPromo) {
      throw new Error(`Kode promo "${promoCode}" tidak ditemukan.`);
    }
    if (!dbPromo.isActive) {
      throw new Error('Kode promo sudah tidak aktif.');
    }
    if (dbPromo.expiresAt && dbPromo.expiresAt < now) {
      throw new Error('Kode promo sudah kedaluwarsa.');
    }
    if (dbPromo.quota > 0 && dbPromo.usedCount >= dbPromo.quota) {
      throw new Error('Kuota kode promo sudah habis.');
    }
    if (dbPromo.type === 'WILAYAH' && dbPromo.regionId && dbPromo.regionId !== fulfillmentRegionId) {
      throw new Error('Kode promo wilayah ini tidak berlaku untuk wilayah pemenuhan pesanan ini.');
    }
    if (creator.role === Role.RESELLER && dbPromo.resellerId && dbPromo.resellerId !== creator.id) {
      throw new Error('Reseller tidak dapat menggunakan kode promo milik reseller lain.');
    }

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

  // Validasi Promo 2 (Diskon Tambahan / Voucher)
  if (secondPromoCode && secondPromoCode.trim().length > 0) {
    const cleanSecondCode = secondPromoCode.trim().toUpperCase();
    if (promoData && promoData.code === cleanSecondCode) {
      throw new Error('Kode promo slot 2 tidak boleh sama dengan kode promo slot 1.');
    }

    const dbSecond = await prisma.promoCode.findUnique({
      where: { code: cleanSecondCode },
    });

    if (!dbSecond) {
      throw new Error(`Kode promo tambahan "${secondPromoCode}" tidak ditemukan.`);
    }
    if (!dbSecond.isActive) {
      throw new Error('Kode promo tambahan sudah tidak aktif.');
    }
    if (dbSecond.expiresAt && dbSecond.expiresAt < now) {
      throw new Error('Kode promo tambahan sudah kedaluwarsa.');
    }
    if (dbSecond.quota > 0 && dbSecond.usedCount >= dbSecond.quota) {
      throw new Error('Kuota kode promo tambahan sudah habis.');
    }
    if (dbSecond.type === 'WILAYAH' && dbSecond.regionId && dbSecond.regionId !== fulfillmentRegionId) {
      throw new Error('Kode promo tambahan wilayah ini tidak berlaku untuk wilayah pemenuhan pesanan ini.');
    }
    if (creator.role === Role.RESELLER && dbSecond.resellerId && dbSecond.resellerId !== creator.id) {
      throw new Error('Reseller tidak dapat menggunakan kode promo milik reseller lain.');
    }

    secondPromoData = {
      id: dbSecond.id,
      code: dbSecond.code,
      discountType: dbSecond.discountType,
      discountValue: dbSecond.discountValue,
      maxDiscountAmount: dbSecond.maxDiscountAmount,
      quota: dbSecond.quota,
      usedCount: dbSecond.usedCount,
      expiresAt: dbSecond.expiresAt,
      isActive: dbSecond.isActive,
      isFreeShipping: dbSecond.isFreeShipping,
      isFreeTax: dbSecond.isFreeTax,
    };
  }

  // 6. Kalkulasi Harga Server Resmi (Ongkir DIPAKSA 0 secara mutlak)
  const pricingInputItems = items.map((i) => {
    const vInfo = variantsMap.get(i.variantId);
    return {
      product: { id: vInfo?.product?.id || i.productId || '' },
      selectedVariant: { id: i.variantId },
      quantity: i.quantity,
    };
  });

  const pricing = calculatePricingPure({
    items: pricingInputItems,
    productsMap,
    promo: promoData,
    secondPromo: secondPromoData,
    shippingCourier: 'COD_LANGSUNG',
    shippingCost: 0, // Server-forced 0 (F1)
  });

  // Pastikan shippingCost mutlak 0
  pricing.shippingCost = 0;
  pricing.totalPrice = pricing.netPrice + pricing.ppnAmount;

  // 7. Generate Kode Pesanan Anti-Tabrakan
  const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  let orderCode = '';
  for (let attempt = 0; attempt < 20; attempt++) {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const candidate = `LVR-COD-${todayStr}-${randomSuffix}`;
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
    throw new Error('Gagal menghasilkan kode unik pesanan COD. Silakan coba kembali.');
  }

  // Normalisasi nomor telepon
  const cleanPhone = customerPhone.replace(/\D/g, '');
  const normalizedPhone = cleanPhone.startsWith('0') ? `62${cleanPhone.slice(1)}` : cleanPhone;

  // Batas kedaluwarsa COD bawaan 7 hari (bukan 24 jam)
  const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  // 8. Eksekusi Transaksi Database Atomik (Reservasi Stok & Pembuatan Order)
  const createdOrder = await prisma.$transaction(
    async (tx) => {
      // A. Reservasi stok fisik di gudang
      for (const item of items) {
        const stockRecord = await tx.stock.findUnique({
          where: {
            variantId_regionId: {
              variantId: item.variantId,
              regionId: fulfillmentRegionId,
            },
          },
        });

        if (!stockRecord) {
          throw new Error('Data stok tidak ditemukan.');
        }

        await tx.stock.update({
          where: { id: stockRecord.id },
          data: {
            reserved: { increment: item.quantity },
          },
        });

        await tx.stockMovement.create({
          data: {
            stockId: stockRecord.id,
            type: StockMovementType.RESERVE,
            qtyChange: item.quantity,
            balanceAfter: stockRecord.qty,
            reason: `Pesanan manual COD #${orderCode} (reserved)`,
            actorId: creator.id,
          },
        });
      }

      // B. Catat pemakaian promo jika ada (Slot 1 & Slot 2)
      if (pricing.promosApplied && pricing.promosApplied.length > 0) {
        for (const applied of pricing.promosApplied) {
          await tx.promoCode.update({
            where: { id: applied.id },
            data: { usedCount: { increment: 1 } },
          });
        }
      } else if (pricing.promoApplied) {
        await tx.promoCode.update({
          where: { id: pricing.promoApplied.id },
          data: { usedCount: { increment: 1 } },
        });
      }

      // C. Buat Order
      const order = await tx.order.create({
        data: {
          code: orderCode,
          regionId: fulfillmentRegionId,
          status: OrderStatus.DIPROSES, // Awal: Menunggu Serah Terima (F3)
          paymentMethod: PaymentMethod.COD,
          customerName: customerName.trim(),
          customerPhone: normalizedPhone,
          customerEmail: null,
          shippingAddress: {
            type: 'COD',
            handoverLocation: handoverLocation || 'Serah Langsung / COD di Tempat',
            city: fulfillmentRegion.name,
            province: fulfillmentRegion.name,
            postalCode: '00000',
          } as any,
          subtotal: pricing.subtotal,
          discountAmount: pricing.discountAmount,
          netPrice: pricing.netPrice,
          ppnAmount: pricing.ppnAmount,
          shippingCost: 0, // Server-forced 0
          totalPrice: pricing.totalPrice,
          courierCode: 'COD_LANGSUNG',
          waConsent: false,
          isTest: false,
          isManual: true,
          createdByUserId: creator.id,
          createdByRole: creator.role as any,
          codNote: note || null,
          promoCodeId: pricing.promoApplied?.id || null,
          secondPromoCodeId: pricing.secondPromoApplied?.id || null,
          expiresAt,
          items: {
            create: items.map((item) => {
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
        include: {
          items: true,
          region: true,
        },
      });

      // D. Catat Status Log Pertama
      await tx.orderStatusLog.create({
        data: {
          orderId: order.id,
          fromStatus: null,
          toStatus: OrderStatus.DIPROSES,
          note: `Pesanan manual COD dibuat oleh ${creator.name} (${creator.role}) - menunggu serah terima.`,
          actorId: creator.id,
          actorRole: creator.role,
        },
      });

      // E. Buat Notifikasi Internal untuk Admin Wilayah Penangan
      await tx.notification.create({
        data: {
          targetRole: fulfillmentRegion.type === 'PUSAT' ? Role.ADMIN_PUSAT : Role.ADMIN_WILAYAH,
          targetRegionId: fulfillmentRegion.id,
          title: `Pesanan COD Baru #${orderCode}`,
          message: `Pesanan COD baru senilai Rp ${pricing.totalPrice.toLocaleString('id-ID')} dibuat oleh ${creator.name}. Menunggu serah terima dan penyelesaian kas.`,
          linkUrl: `/dashboard/admin?orderId=${order.id}`,
        },
      });

      return order;
    },
    {
      maxWait: 15000,
      timeout: 30000,
    }
  );

  // 9. Catat Audit Log
  await audit({
    actor: { id: creator.id, name: creator.name, role: creator.role },
    action: 'CREATE_MANUAL_COD_ORDER',
    entity: 'Order',
    entityId: createdOrder.id,
    after: {
      code: createdOrder.code,
      totalPrice: createdOrder.totalPrice,
      regionId: createdOrder.regionId,
      createdByRole: createdOrder.createdByRole,
      shippingCost: 0,
    },
  });

  // 10. Enqueue Notifikasi WhatsApp ke Admin Wilayah Penangan (FT-1)
  try {
    // Cari admin penangan untuk nomor WhatsApp
    const adminUser = await prisma.user.findFirst({
      where: {
        role: fulfillmentRegion.type === 'PUSAT' ? Role.ADMIN_PUSAT : Role.ADMIN_WILAYAH,
        regionId: fulfillmentRegion.id,
        phone: { not: null },
      },
    });

    if (adminUser?.phone) {
      await enqueueWhatsAppNotification({
        target: adminUser.phone,
        message: `📢 *PESANAN COD BARU MASUK*\n\nKode: *${createdOrder.code}*\nPelanggan: ${createdOrder.customerName}\nTotal Tagihan Kas: *Rp ${createdOrder.totalPrice.toLocaleString('id-ID')}*\nDibuat oleh: ${creator.name} (${creator.role})\nLokasi Serah: ${handoverLocation || 'Serah Langsung'}\n\nHarap pantau serah terima barang dan konfirmasi penerimaan kas di Dashboard Admin.`,
        idempotencyKey: `wa:cod_new:${createdOrder.id}`,
        relatedType: 'Order',
        relatedId: createdOrder.id,
      });
    }
  } catch (err) {
    console.error('[Manual COD WhatsApp Notification Error]', err);
  }

  return {
    success: true,
    order: createdOrder,
    pricing,
  };
}
