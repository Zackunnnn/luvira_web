// app/api/owner/test-orders/reset/route.ts
// ============================================================================
// Endpoint Reset Data Pesanan Uji (Khusus Owner - test_orders:reset)
// Menghapus/mengarsipkan pesanan uji (isTest = true) tanpa menyentuh pesanan sungguhan
// Sesuai FT-3 dan Asumsi F5
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { can } from '@/lib/permissions';
import { audit } from '@/lib/audit';
import { OrderStatus, StockMovementType } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Tidak terautentikasi.' }, { status: 401 });
    }

    if (!can(user, 'test_orders:reset')) {
      return NextResponse.json(
        { error: 'Akses ditolak: Hanya Owner yang berhak mereset data pesanan uji coba.' },
        { status: 403 }
      );
    }

    // 1. Ambil semua pesanan uji coba
    const testOrders = await prisma.order.findMany({
      where: { isTest: true },
      include: {
        items: true,
      },
    });

    if (testOrders.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Tidak ada data pesanan uji coba yang perlu di-reset.',
        deletedCount: 0,
      });
    }

    const testOrderIds = testOrders.map((o) => o.id);

    // 2. Transaksi penghapusan bersih data uji
    await prisma.$transaction(async (tx) => {
      // A. Lepaskan reserved stock pesanan uji yang belum selesai
      for (const order of testOrders) {
        if (
          order.status === OrderStatus.MENUNGGU_PEMBAYARAN ||
          order.status === OrderStatus.MENUNGGU_VERIFIKASI ||
          order.status === OrderStatus.DIPROSES
        ) {
          for (const item of order.items) {
            const stockRecord = await tx.stock.findUnique({
              where: {
                variantId_regionId: {
                  variantId: item.variantId,
                  regionId: order.regionId,
                },
              },
            });

            if (stockRecord && stockRecord.reserved > 0) {
              const releaseQty = Math.min(stockRecord.reserved, item.quantity);
              const updatedStock = await tx.stock.update({
                where: { id: stockRecord.id },
                data: { reserved: { decrement: releaseQty } },
              });

              await tx.stockMovement.create({
                data: {
                  stockId: stockRecord.id,
                  type: StockMovementType.RELEASE,
                  qtyChange: -releaseQty,
                  balanceAfter: updatedStock.qty,
                  reason: `Pelepasan stok reservasi reset data uji #${order.code}`,
                  actorId: user.id,
                },
              });
            }
          }
        }
      }

      // B. Hapus logs, items, dan orders uji coba
      await tx.orderStatusLog.deleteMany({
        where: { orderId: { in: testOrderIds } },
      });

      await tx.orderItem.deleteMany({
        where: { orderId: { in: testOrderIds } },
      });

      await tx.order.deleteMany({
        where: { id: { in: testOrderIds } },
      });
    }, { timeout: 25000, maxWait: 15000 });

    // 3. Catat Audit Log
    await audit({
      actor: { id: user.id, name: user.name, role: user.role },
      action: 'RESET_TEST_ORDERS',
      entity: 'Order',
      entityId: 'BATCH_RESET',
      before: { testOrderCount: testOrders.length },
      after: { testOrderCount: 0 },
    });

    return NextResponse.json({
      success: true,
      message: `Berhasil mereset dan menghapus ${testOrders.length} data pesanan uji coba. Data pesanan riil tetap utuh.`,
      deletedCount: testOrders.length,
    });
  } catch (error: any) {
    console.error('[Reset Test Orders Error]', error);
    return NextResponse.json(
      { error: error.message || 'Gagal mereset data pesanan uji coba.' },
      { status: 500 }
    );
  }
}
