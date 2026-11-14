// app/api/midtrans/order-status/[orderId]/route.ts
// ============================================================================
// API Route: GET /api/midtrans/order-status/[orderId]
//
// Endpoint aktif sinkronisasi status pembayaran Midtrans (Active Reconciliation)
// Memeriksa status riil ke Database & API Midtrans langsung via reconcileMidtransOrder.
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { reconcileMidtransOrder } from '@/lib/payments/reconcile';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params;

    if (!orderId) {
      return NextResponse.json(
        { error: 'Parameter orderId wajib disertakan.' },
        { status: 400 }
      );
    }

    const result = await reconcileMidtransOrder(orderId);

    if (!result.found) {
      return NextResponse.json(
        { error: result.message },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      isPaid: result.isPaid,
      orderCode: result.orderCode,
      orderId: result.orderId,
      status: result.status,
      updated: result.updated,
      message: result.message,
    });
  } catch (error: any) {
    console.error('[API Midtrans Order Status Error]', error);
    return NextResponse.json(
      { error: error.message || 'Gagal memeriksa status pembayaran' },
      { status: 500 }
    );
  }
}
