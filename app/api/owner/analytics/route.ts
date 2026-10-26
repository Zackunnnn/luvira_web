import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { isOwner } from '@/lib/auth';
import { OrderStatus, PaymentMethod } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const isUserOwner = await isOwner();
    if (!isUserOwner) {
      return NextResponse.json({ error: 'Unauthorized. Owner access required.' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const filter = searchParams.get('filter') || 'all'; // 'all', 'this_month', 'this_year'
    const payment = searchParams.get('payment') || 'all'; // 'all', 'manual', 'midtrans'

    // Buat filter tanggal
    let dateFilter = {};
    const now = new Date();
    if (filter === 'this_month') {
      dateFilter = {
        gte: new Date(now.getFullYear(), now.getMonth(), 1),
      };
    } else if (filter === 'this_year') {
      dateFilter = {
        gte: new Date(now.getFullYear(), 0, 1),
      };
    }

    // 1. Ambil transaksi yang masuk hitungan omzet (DIPROSES, DIKIRIM, SELESAI)
    const validStatuses: OrderStatus[] = [
      OrderStatus.DIPROSES,
      OrderStatus.DIKIRIM,
      OrderStatus.SELESAI,
    ];
    
    const whereClause: any = {
      status: { in: validStatuses },
      ...(Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {}),
    };
    
    if (payment !== 'all') {
      if (payment === 'manual' || payment === PaymentMethod.MANUAL_TRANSFER) {
        whereClause.paymentMethod = PaymentMethod.MANUAL_TRANSFER;
      } else if (payment === 'midtrans' || payment === PaymentMethod.MIDTRANS_SNAP) {
        whereClause.paymentMethod = PaymentMethod.MIDTRANS_SNAP;
      }
    }
    
    const orders = await prisma.order.findMany({
      where: whereClause,
      include: {
        items: true,
        region: { select: { id: true, name: true, code: true } },
        promoCode: { select: { code: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    let totalGrossRevenue = 0;
    let totalNetSales = 0;
    let totalPpn = 0;
    let totalCost = 0;
    let totalShipping = 0;

    orders.forEach((order) => {
      let orderCost = 0;
      order.items.forEach((item) => {
        orderCost += ((item.costEach + item.packingEach) * item.quantity);
      });

      const netSale = (order.netPrice !== undefined && order.netPrice !== null)
        ? order.netPrice
        : (order.subtotal - (order.discountAmount || 0));

      totalGrossRevenue += order.totalPrice;
      totalNetSales += netSale;
      totalPpn += (order.ppnAmount || 0);
      totalShipping += (order.shippingCost || 0);
      totalCost += orderCost;
    });

    const netProfit = totalNetSales - totalCost;

    // 2. Ambil produk dengan stok menipis (threshold < 10)
    const lowStockThreshold = 10;
    const lowStocks = await prisma.stock.findMany({
      where: {
        qty: { lt: lowStockThreshold },
      },
      include: {
        variant: {
          include: {
            product: { select: { name: true } },
          },
        },
        region: { select: { name: true } },
      },
    });

    const lowStockVariants = lowStocks.map((s) => ({
      id: s.variantId,
      name: s.variant.name,
      stock: s.qty,
      product: s.variant.product,
      regionName: s.region.name,
    }));

    return NextResponse.json({
      success: true,
      summary: {
        totalOrders: orders.length,
        actualRevenue: totalGrossRevenue, // Total omzet transaksi kotor (cocok dengan sum total akhir)
        netSales: totalNetSales, // Total penjualan produk bersih setelah diskon
        totalCost, // Total HPP & packing
        totalPpn, // Total PPN 11%
        totalShipping, // Total Ongkir
        netProfit, // Laba bersih riil (netSales - totalCost)
      },
      transactions: orders, // Untuk kebutuhan tabel & export CSV
      lowStock: lowStockVariants,
    });

  } catch (error) {
    console.error('[Owner Analytics API] Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
