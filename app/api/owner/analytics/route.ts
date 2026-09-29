import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { isOwner } from '@/lib/auth';

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

    // 1. Ambil transaksi yang masuk hitungan omzet (dikonfirmasi, diproses, selesai)
    const validStatuses = ['dikonfirmasi', 'diproses', 'selesai'];
    
    const whereClause: any = {
      status: { in: validStatuses },
      ...(Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {}),
    };
    
    if (payment !== 'all') {
      whereClause.paymentMethod = payment;
    }
    
    const orders = await prisma.order.findMany({
      where: whereClause,
      include: {
        items: true
      },
      orderBy: { createdAt: 'desc' }
    });

    let totalRevenue = 0;
    let totalPpn = 0;
    let totalCost = 0;

    orders.forEach(order => {
      let orderProductRevenue = 0;
      let orderCost = 0;

      order.items.forEach(item => {
        orderProductRevenue += (item.priceEach * item.quantity);
        orderCost += ((item.costEach + item.packingEach) * item.quantity);
      });

      totalPpn += (order.ppnAmount || 0);
      totalRevenue += orderProductRevenue;
      totalCost += orderCost;
    });
    
    let netProfit = 0;
    let actualRevenue = 0; 

    orders.forEach(order => {
      let itemsTotal = 0;
      order.items.forEach(item => {
        itemsTotal += (item.priceEach * item.quantity);
      });
      
      // Harga bersih yang dibayar untuk produk (tanpa ongkir & ppn, blm dikurangi diskon krn tdk tersimpan)
      const netProductPaid = itemsTotal;
      
      actualRevenue += netProductPaid;

      // Cost untuk order ini
      let orderCost = 0;
      order.items.forEach(item => {
        orderCost += ((item.costEach + item.packingEach) * item.quantity);
      });

      netProfit += (netProductPaid - orderCost);
    });

    // 2. Ambil produk dengan stok menipis (threshold < 10)
    const lowStockThreshold = 10;
    const lowStockVariants = await prisma.colorVariant.findMany({
      where: {
        stock: { lt: lowStockThreshold }
      },
      include: {
        product: { select: { name: true } }
      }
    });

    return NextResponse.json({
      success: true,
      summary: {
        totalOrders: orders.length,
        actualRevenue, // Omzet setelah diskon
        totalPpn,
        netProfit,
      },
      transactions: orders, // Untuk kebutuhan tabel & export CSV
      lowStock: lowStockVariants
    });

  } catch (error) {
    console.error('[Owner Analytics API] Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
