import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    // Basic Security: Check Authorization Header
    const authHeader = request.headers.get('authorization');
    const expectedToken = process.env.CRON_SECRET || 'fallback_secret_for_cron';
    
    if (authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Cari order yang menunggu_transfer dan sudah lewat deadline
    const expiredOrders = await prisma.order.findMany({
      where: {
        status: 'menunggu_transfer',
        paymentDeadline: {
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

    // Proses pembatalan menggunakan Prisma Transaction untuk integritas data
    const canceledOrders = [];

    for (const order of expiredOrders) {
      await prisma.$transaction(async (tx) => {
        // 1. Ubah status order menjadi 'dibatalkan'
        await tx.order.update({
          where: { id: order.id },
          data: { status: 'dibatalkan' },
        });

        // 2. Kembalikan stok setiap item ke ColorVariant
        for (const item of order.items) {
          await tx.colorVariant.update({
            where: { id: item.variantId },
            data: {
              stock: { increment: item.quantity },
            },
          });
        }
      });
      
      canceledOrders.push(order.id);
    }

    return NextResponse.json({ 
      success: true, 
      message: `Successfully canceled ${canceledOrders.length} order(s).`,
      canceledOrders 
    });
  } catch (error: any) {
    console.error('[Cron Cancel Orders Error]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
