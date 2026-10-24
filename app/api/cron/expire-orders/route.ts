// app/api/cron/expire-orders/route.ts
// ============================================================================
// Cron Job: Pembatalan Pesanan Kedaluwarsa 24 Jam & Pelepasan Stok Otomatis
// Sesuai docs/LUVIRA_2_PLAN.md Bagian 5.3, 8.4, A5, E2E-07
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { OrderStatus, StockMovementType } from '@prisma/client';
import { audit } from '@/lib/audit';

async function handleExpireOrders(request: NextRequest) {
  try {
    // 1. Verifikasi Token Keamanan Cron
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET || 'dev-cron-secret-123';

    // Di lingkungan dev / testing izinkan jalan jika token cocok atau jika cronSecret dev
    const token = authHeader?.replace('Bearer ', '');
    if (token !== cronSecret && request.headers.get('x-cron-secret') !== cronSecret) {
      // Tolak jika bukan secret yang sah
      return NextResponse.json(
        { error: 'Unauthorized: Invalid cron secret' },
        { status: 401 }
      );
    }

    const now = new Date();

    // 2. Ambil semua pesanan MENUNGGU_PEMBAYARAN yang sudah melewati batas expiresAt
    const expiredOrders = await prisma.order.findMany({
      where: {
        status: OrderStatus.MENUNGGU_PEMBAYARAN,
        expiresAt: { lte: now },
      },
      include: {
        items: true,
      },
    });

    const results = [];

    // 3. Batalkan tiap pesanan & lepas reservasi stok dalam transaksi terpisah
    for (const order of expiredOrders) {
      await prisma.$transaction(async (tx) => {
        // A. Lepaskan reserved stok
        for (const item of order.items) {
          const stock = await tx.stock.findUnique({
            where: {
              variantId_regionId: {
                variantId: item.variantId,
                regionId: order.regionId,
              },
            },
          });

          if (stock) {
            const newReserved = Math.max(0, stock.reserved - item.quantity);
            await tx.stock.update({
              where: { id: stock.id },
              data: { reserved: newReserved },
            });

            await tx.stockMovement.create({
              data: {
                stockId: stock.id,
                type: StockMovementType.RELEASE,
                qtyChange: item.quantity,
                balanceAfter: stock.qty,
                reason: `Pesanan kadaluwarsa 24 jam #${order.code}`,
              },
            });
          }
        }

        // B. Kembalikan kuota promo
        if (order.promoCodeId) {
          await tx.promoCode.update({
            where: { id: order.promoCodeId },
            data: { usedCount: { decrement: 1 } },
          });
        }

        // C. Update status pesanan
        await tx.order.update({
          where: { id: order.id },
          data: { status: OrderStatus.DIBATALKAN },
        });

        // D. Catat riwayat status
        await tx.orderStatusLog.create({
          data: {
            orderId: order.id,
            fromStatus: order.status,
            toStatus: OrderStatus.DIBATALKAN,
            note: 'Pesanan kedaluwarsa otomatis (melebihi batas waktu 24 jam).',
            actorRole: 'SYSTEM',
          },
        });
      }, {
        maxWait: 10000,
        timeout: 25000,
      });

      await audit({
        action: 'ORDER_EXPIRED_CRON',
        entity: 'Order',
        entityId: order.id,
        before: { status: order.status },
        after: { status: OrderStatus.DIBATALKAN },
      });

      results.push({ orderId: order.id, code: order.code });
    }

    return NextResponse.json({
      success: true,
      timestamp: now.toISOString(),
      processedCount: results.length,
      expiredOrders: results,
    });
  } catch (error: any) {
    console.error('[Cron Expire Orders Error]', error);
    return NextResponse.json(
      { error: error.message || 'Gagal memproses kedaluwarsa pesanan' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  return handleExpireOrders(request);
}

export async function GET(request: NextRequest) {
  return handleExpireOrders(request);
}
