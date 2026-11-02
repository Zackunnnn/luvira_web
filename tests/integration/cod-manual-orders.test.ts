// tests/integration/cod-manual-orders.test.ts
// ============================================================================
// FT-2 Integration Tests: Pesanan Manual COD, Isolasi Wilayah, & Transisi Status
// ============================================================================

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '@/lib/db';
import { createManualCodOrder } from '@/lib/orders/manual-cod';
import { AuthUser } from '@/lib/permissions';
import { Role, OrderStatus, PaymentMethod, StockMovementType, DiscountType } from '@prisma/client';

describe('FT-2: Integrasi Pesanan Manual COD & State Machine Transisi Status', () => {
  let pusatRegion: any;
  let jogjaRegion: any;
  let testProduct: any;
  let testVariant: any;
  let stockPusat: any;
  let stockJogja: any;

  // Mock Actors
  let adminPusatUser: AuthUser;
  let adminJogjaUser: AuthUser;
  let resellerJogjaUser: AuthUser;
  let resellerPusatUser: AuthUser;
  let developerUser: AuthUser;

  beforeAll(async () => {
    // 1. Setup Regions
    pusatRegion = await prisma.region.findFirst({ where: { type: 'PUSAT' } });
    jogjaRegion = await prisma.region.findFirst({ where: { code: 'YOGYAKARTA' } });

    if (!pusatRegion || !jogjaRegion) {
      throw new Error('Wilayah Pusat atau Yogyakarta tidak ditemukan di database dev/test.');
    }

    // 2. Setup Test Product & Variant
    testProduct = await prisma.product.create({
      data: {
        name: 'Kaus Kaki Uji COD FT-2',
        slug: `kaus-kaki-uji-cod-${Date.now()}`,
        price: 50000,
        description: 'Deskripsi kaus kaki uji COD',
        model: 'ANKLE',
      },
    });

    testVariant = await prisma.productVariant.create({
      data: {
        productId: testProduct.id,
        name: 'Hitam Jetblack',
        hex: '#000000',
        imageUrl: '/socks/placeholder.webp',
        sku: `SKU-COD-${Date.now()}`,
      },
    });

    // 3. Setup Stocks (Qty: 20, Reserved: 0)
    stockPusat = await prisma.stock.create({
      data: {
        variantId: testVariant.id,
        regionId: pusatRegion.id,
        qty: 20,
        reserved: 0,
      },
    });

    stockJogja = await prisma.stock.create({
      data: {
        variantId: testVariant.id,
        regionId: jogjaRegion.id,
        qty: 15,
        reserved: 0,
      },
    });

    // 4. Setup Mock Auth Users
    adminPusatUser = {
      id: 'usr-admin-pusat-cod',
      email: 'admin.pusat@luvira.test',
      name: 'Admin Pusat Luvira',
      role: Role.ADMIN_PUSAT,
      regionId: pusatRegion.id,
      isActive: true,
    };

    adminJogjaUser = {
      id: 'usr-admin-jogja-cod',
      email: 'admin.jogja@luvira.test',
      name: 'Admin Jogja Luvira',
      role: Role.ADMIN_WILAYAH,
      regionId: jogjaRegion.id,
      isActive: true,
    };

    resellerJogjaUser = {
      id: 'usr-reseller-jogja-cod',
      email: 'reseller.jogja@luvira.test',
      name: 'Reseller Jogja Cantik',
      role: Role.RESELLER,
      regionId: jogjaRegion.id,
      isActive: true,
    };

    resellerPusatUser = {
      id: 'usr-reseller-pusat-cod',
      email: 'reseller.pusat@luvira.test',
      name: 'Reseller Pusat Hebat',
      role: Role.RESELLER,
      regionId: null, // default Pusat per F7
      isActive: true,
    };

    developerUser = {
      id: 'usr-dev-cod',
      email: 'dev@luvira.test',
      name: 'Developer Luvira',
      role: Role.DEVELOPER,
      regionId: null,
      isActive: true,
    };
  });

  afterAll(async () => {
    // Cleanup
    if (testVariant) {
      await prisma.stockMovement.deleteMany({
        where: { stock: { variantId: testVariant.id } },
      });
      await prisma.stock.deleteMany({
        where: { variantId: testVariant.id },
      });
      await prisma.orderItem.deleteMany({
        where: { variantId: testVariant.id },
      });
      await prisma.productVariant.delete({
        where: { id: testVariant.id },
      });
    }
    if (testProduct) {
      await prisma.product.delete({
        where: { id: testProduct.id },
      });
    }
  });

  it('1. Peran tanpa izin (DEVELOPER) ditolak saat membuat pesanan manual COD', async () => {
    await expect(
      createManualCodOrder({
        creator: developerUser,
        customerName: 'Budi Santoso',
        customerPhone: '081234567890',
        items: [{ productId: testProduct.id, variantId: testVariant.id, quantity: 2 }],
      })
    ).rejects.toThrow(/tidak memiliki wewenang/);
  });

  it('2. Admin Wilayah membuat pesanan manual COD: stok ter-reserve, ongkir Rp 0 dipaksa server', async () => {
    const res = await createManualCodOrder({
      creator: adminJogjaUser,
      customerName: 'Dewi Lestari',
      customerPhone: '081987654321',
      handoverLocation: 'COD Depan Kantor Pos Jogja',
      items: [{ productId: testProduct.id, variantId: testVariant.id, quantity: 3 }],
    });

    expect(res.success).toBe(true);
    expect(res.order.paymentMethod).toBe(PaymentMethod.COD);
    expect(res.order.isManual).toBe(true);
    expect(res.order.createdByRole).toBe(Role.ADMIN_WILAYAH);
    expect(res.order.regionId).toBe(jogjaRegion.id);
    expect(res.order.shippingCost).toBe(0);
    expect(res.order.subtotal).toBe(150000); // 3 x 50.000
    expect(res.order.totalPrice).toBe(150000 + Math.round(150000 * 0.11)); // + PPN 11%

    // Verifikasi stok Jogja ter-reserve +3
    const stockAfter = await prisma.stock.findUnique({
      where: { id: stockJogja.id },
    });
    expect(stockAfter!.reserved).toBe(3);
    expect(stockAfter!.qty).toBe(15); // Qty fisik belum berkurang
  });

  it('3. Admin Wilayah mencoba membuat pesanan COD di luar wilayahnya -> Ditolak', async () => {
    await expect(
      createManualCodOrder({
        creator: adminJogjaUser,
        customerName: 'Ahmad Dani',
        customerPhone: '081234567890',
        targetRegionId: pusatRegion.id, // Wilayah lain
        items: [{ productId: testProduct.id, variantId: testVariant.id, quantity: 1 }],
      })
    ).rejects.toThrow(/hanya boleh membuat pesanan COD di wilayah tugasnya/);
  });

  it('4. Reseller membuat pesanan COD di wilayah akunnya (F7): stok ter-reserve', async () => {
    const res = await createManualCodOrder({
      creator: resellerJogjaUser,
      customerName: 'Maya Sari',
      customerPhone: '085678901234',
      items: [{ productId: testProduct.id, variantId: testVariant.id, quantity: 2 }],
    });

    expect(res.success).toBe(true);
    expect(res.order.paymentMethod).toBe(PaymentMethod.COD);
    expect(res.order.createdByRole).toBe(Role.RESELLER);
    expect(res.order.regionId).toBe(jogjaRegion.id);

    // Stok Jogja reserved bertambah dari 3 menjadi 5
    const stockAfter = await prisma.stock.findUnique({
      where: { id: stockJogja.id },
    });
    expect(stockAfter!.reserved).toBe(5);
  });

  it('5. Reseller dengan regionId null otomatis memakai Gudang Pusat (F7)', async () => {
    const res = await createManualCodOrder({
      creator: resellerPusatUser,
      customerName: 'Bambang Sudarto',
      customerPhone: '081122334455',
      items: [{ productId: testProduct.id, variantId: testVariant.id, quantity: 1 }],
    });

    expect(res.success).toBe(true);
    expect(res.order.regionId).toBe(pusatRegion.id);

    const stockPusatAfter = await prisma.stock.findUnique({
      where: { id: stockPusat.id },
    });
    expect(stockPusatAfter!.reserved).toBe(1);
  });

  it('6. Transisi Status COD: Reseller menandai "diserahkan" -> Sukses', async () => {
    const res = await createManualCodOrder({
      creator: resellerJogjaUser,
      customerName: 'Indah Permata',
      customerPhone: '087788990011',
      items: [{ productId: testProduct.id, variantId: testVariant.id, quantity: 1 }],
    });

    const orderId = res.order.id;

    // Simulate calling status update by Reseller (marking diserahkan)
    const now = new Date();
    const updated = await prisma.order.update({
      where: { id: orderId },
      data: {
        status: OrderStatus.DIKIRIM,
        codHandedOverAt: now,
        codHandedOverBy: resellerJogjaUser.id,
      },
    });

    expect(updated.status).toBe(OrderStatus.DIKIRIM);
    expect(updated.codHandedOverAt).toBeDefined();
    expect(updated.codHandedOverBy).toBe(resellerJogjaUser.id);
  });

  it('7. Transisi Status COD: Admin wilayah penangan menandai "uang diterima" -> Selesai & stok fisik berkurang', async () => {
    const res = await createManualCodOrder({
      creator: resellerJogjaUser,
      customerName: 'Hendra Gunawan',
      customerPhone: '081299887766',
      items: [{ productId: testProduct.id, variantId: testVariant.id, quantity: 2 }],
    });

    const orderId = res.order.id;
    const initialStock = await prisma.stock.findUnique({ where: { id: stockJogja.id } });

    // Selesaikan pesanan COD oleh Admin Jogja
    const now = new Date();
    await prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: orderId },
        data: {
          status: OrderStatus.SELESAI,
          codCashConfirmedAt: now,
          codCashConfirmedBy: adminJogjaUser.id,
        },
      });

      // Deduct stock physically
      await tx.stock.update({
        where: { id: stockJogja.id },
        data: {
          qty: { decrement: 2 },
          reserved: { decrement: 2 },
        },
      });

      await tx.stockMovement.create({
        data: {
          stockId: stockJogja.id,
          type: StockMovementType.OUT,
          qtyChange: -2,
          balanceAfter: initialStock!.qty - 2,
          reason: `Penyelesaian pesanan COD #${res.order.code}`,
          actorId: adminJogjaUser.id,
        },
      });
    });

    const finalStock = await prisma.stock.findUnique({ where: { id: stockJogja.id } });
    expect(finalStock!.qty).toBe(initialStock!.qty - 2);
    expect(finalStock!.reserved).toBe(initialStock!.reserved - 2);
  });

  it('8. Pembatalan pesanan COD: stok ter-reserve dilepas kembali (RELEASE)', async () => {
    const res = await createManualCodOrder({
      creator: adminPusatUser,
      customerName: 'Agus Salim',
      customerPhone: '081334455667',
      items: [{ productId: testProduct.id, variantId: testVariant.id, quantity: 2 }],
    });

    const stockBeforeCancel = await prisma.stock.findUnique({ where: { id: stockPusat.id } });

    // Batalkan pesanan
    await prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: res.order.id },
        data: {
          status: OrderStatus.DIBATALKAN,
          cancelledAt: new Date(),
          cancellationReason: 'Pelanggan membatalkan serah terima.',
        },
      });

      await tx.stock.update({
        where: { id: stockPusat.id },
        data: {
          reserved: { decrement: 2 },
        },
      });

      await tx.stockMovement.create({
        data: {
          stockId: stockPusat.id,
          type: StockMovementType.RELEASE,
          qtyChange: -2,
          balanceAfter: stockBeforeCancel!.qty,
          reason: `Pelepasan stok pembatalan COD #${res.order.code}`,
          actorId: adminPusatUser.id,
        },
      });
    });

    const stockAfterCancel = await prisma.stock.findUnique({ where: { id: stockPusat.id } });
    expect(stockAfterCancel!.reserved).toBe(stockBeforeCancel!.reserved - 2);
    expect(stockAfterCancel!.qty).toBe(stockBeforeCancel!.qty); // Qty fisik tidak berubah
  });
});
