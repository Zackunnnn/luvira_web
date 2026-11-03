// app/api/test/orders/[id]/simulate-payment/route.ts
// ============================================================================
// Endpoint Simulasi Pembayaran Pesanan Promo Uji (FT-3 & Asumsi F5)
// Khusus untuk pesanan dengan isTest = true / paymentMethod = TEST_SIMULATION
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { audit } from '@/lib/audit';
import { OrderStatus, PaymentMethod } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const order = await prisma.order.findFirst({
      where: {
        OR: [{ id }, { code: id }],
      },
      include: {
        items: true,
      },
    });

    if (!order) {
      return NextResponse.json({ error: 'Pesanan tidak ditemukan.' }, { status: 404 });
    }

    if (!order.isTest && order.paymentMethod !== PaymentMethod.TEST_SIMULATION) {
      return NextResponse.json(
        { error: 'Akses ditolak: Hanya pesanan uji coba (isTest) yang dapat disimulasikan pembayarannya.' },
        { status: 400 }
      );
    }

    if (order.status !== OrderStatus.MENUNGGU_PEMBAYARAN && order.status !== OrderStatus.MENUNGGU_VERIFIKASI) {
      return NextResponse.json(
        { error: `Pesanan sudah berada dalam status ${order.status}. Simulasi pembayaran tidak diperlukan.` },
        { status: 400 }
      );
    }

    const previousStatus = order.status;
    const now = new Date();

    const updated = await prisma.$transaction(async (tx) => {
      const updatedOrder = await tx.order.update({
        where: { id: order.id },
        data: {
          status: OrderStatus.DIPROSES,
        },
      });

      await tx.orderStatusLog.create({
        data: {
          orderId: order.id,
          fromStatus: previousStatus,
          toStatus: OrderStatus.DIPROSES,
          note: 'Simulasi pembayaran promo uji (berhasil diverifikasi di sandbox/testing)',
          actorId: 'system-test-simulator',
          actorRole: 'BUYER',
        },
      });

      return updatedOrder;
    });

    await audit({
      actor: { id: 'test-simulator', name: 'Buyer Test Simulator', role: 'BUYER' as any },
      action: 'SIMULATE_TEST_ORDER_PAYMENT',
      entity: 'Order',
      entityId: order.id,
      before: { status: previousStatus },
      after: { status: OrderStatus.DIPROSES, isTest: true },
    });

    return NextResponse.json({
      success: true,
      message: 'Simulasi pembayaran pesanan uji berhasil dikonfirmasi. Status pesanan kini DIPROSES.',
      order: updated,
    });
  } catch (error: any) {
    console.error('[Simulate Payment Error]', error);
    return NextResponse.json(
      { error: error.message || 'Gagal memproses simulasi pembayaran.' },
      { status: 500 }
    );
  }
}

