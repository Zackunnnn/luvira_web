import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { OrderStatus, StockMovementType } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    // Basic Security: Check Authorization Header
    const authHeader = request.headers.get('authorization');
    const expectedToken = process.env.CRON_SECRET || 'fallback_secret_for_cron';

    if (authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Cari order yang menunggu pembayaran dan sudah melewati expiresAt
    const expiredOrders = await prisma.order.findMany({
      where: {
        status: OrderStatus.MENUNGGU_PEMBAYARAN,
        expiresAt: {
          lt: new Date(),
        },
      },
      include: {
        items: true,
      },
    });

    if (expiredOrders.length === 0) {
      return NextResponse.json({ message: 'No expired orders to cancel.' });
    }

    const canceledOrders: string[] = [];

    for (const order of expiredOrders) {
      await prisma.$transaction(async (tx) => {
        // 1. Ubah status order menjadi KEDALUWARSA
        await tx.order.update({
          where: { id: order.id },
          data: { status: OrderStatus.KEDALUWARSA },
        });

        // 2. Lepas reserved stock di region terkait
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
                reason: `Pelepasan stok order kedaluwarsa #${order.code}`,
              },
            });
          }
        }

        // 3. Catat OrderStatusLog
        await tx.orderStatusLog.create({
          data: {
            orderId: order.id,
            fromStatus: OrderStatus.MENUNGGU_PEMBAYARAN,
            toStatus: OrderStatus.KEDALUWARSA,
            note: 'Otomatis kedaluwarsa setelah 24 jam tidak dibayar',
            actorRole: 'SYSTEM_CRON',
          },
        });
      });

      canceledOrders.push(order.id);
    }

    return NextResponse.json({
      success: true,
      message: `Successfully canceled ${canceledOrders.length} order(s).`,
      canceledOrders,
    });
  } catch (error) {
    console.error('[Cron Cancel Orders Error]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
