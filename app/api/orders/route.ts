// app/api/orders/route.ts
// ============================================================================
// API Pembuatan & Pengambilan Pesanan Luvira 2.0
// Sesuai docs/LUVIRA_2_PLAN.md Bagian 5.2, 8.2, A6, A10
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createOrderWithAtomicReservation } from '@/lib/orders/order-routing';
import { midtransAdapter } from '@/lib/payments/midtrans-adapter';
import { PaymentMethod } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const regionId = searchParams.get('regionId');
    const status = searchParams.get('status');

    const where: any = {};
    if (regionId) where.regionId = regionId;
    if (status) where.status = status;

    const orders = await prisma.order.findMany({
      where,
      include: {
        items: true,
        region: true,
        promoCode: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return NextResponse.json({ success: true, data: orders });
  } catch (error: any) {
    console.error('[API Orders GET Error]', error);
    return NextResponse.json({ error: 'Gagal mengambil data pesanan' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      customerName,
      customerPhone,
      customerEmail,
      destination,
      items,
      paymentMethod = 'MIDTRANS_SNAP',
      promoCodeId,
      shippingCourier,
      shippingCost,
    } = body;

    // 1. Validasi Input Dasar
    if (!customerName || !customerPhone) {
      return NextResponse.json(
        { error: 'Nama dan nomor WhatsApp pemesan wajib diisi.' },
        { status: 400 }
      );
    }

    if (!destination || !destination.provinceName || !destination.street) {
      return NextResponse.json(
        { error: 'Alamat tujuan pengiriman belum lengkap (provinsi dan jalan wajib).' },
        { status: 400 }
      );
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'Keranjang belanja tidak boleh kosong.' },
        { status: 400 }
      );
    }

    // Normalisasi enum payment method
    let resolvedPaymentMethod: PaymentMethod = PaymentMethod.MIDTRANS_SNAP;
    if (
      paymentMethod === 'manual' ||
      paymentMethod === 'MANUAL_TRANSFER' ||
      paymentMethod === 'TRANSFER_MANUAL'
    ) {
      resolvedPaymentMethod = PaymentMethod.MANUAL_TRANSFER;
    }

    // 2. Buat Pesanan dengan Reservasi Stok Atomik & Server-side Pricing
    const result = await createOrderWithAtomicReservation({
      customerName,
      customerPhone,
      customerEmail,
      destination,
      items: items.map((i: any) => ({
        productId: i.productId || i.product?.id,
        variantId: i.variantId || i.selectedVariant?.id,
        quantity: i.quantity || 1,
      })),
      paymentMethod: resolvedPaymentMethod,
      promoCodeId,
      shippingCourier,
      shippingCost,
    });

    const { order, pricing, routeResult } = result;

    let snapToken: string | undefined = undefined;
    let snapRedirectUrl: string | undefined = undefined;
    let paymentAccounts: any[] = [];

    // 3. Penanganan Metode Pembayaran
    if (resolvedPaymentMethod === PaymentMethod.MIDTRANS_SNAP) {
      try {
        const snapRes = await midtransAdapter.createSnapToken({
          orderId: order.code,
          grossAmount: pricing.totalPrice,
          customerDetails: {
            first_name: customerName,
            email: customerEmail || 'customer@luvira.id',
            phone: customerPhone,
          },
          itemDetails: order.items.map((item) => ({
            id: item.variantId,
            price: item.priceEach,
            quantity: item.quantity,
            name: `${item.productName} (${item.variantName})`.slice(0, 50),
          })),
        });

        snapToken = snapRes.token;
        snapRedirectUrl = snapRes.redirect_url;

        // Simpan snap token di order
        await prisma.order.update({
          where: { id: order.id },
          data: { midtransToken: snapToken },
        });
      } catch (snapErr) {
        console.error('[Midtrans Token Creation Error]', snapErr);
      }
    } else {
      // Ambil rekening transfer aktif
      paymentAccounts = await prisma.paymentAccount.findMany({
        where: { isActive: true },
        orderBy: { createdAt: 'asc' },
      });
    }

    return NextResponse.json(
      {
        success: true,
        order: {
          id: order.id,
          code: order.code,
          status: order.status,
          totalPrice: order.totalPrice,
          subtotal: order.subtotal,
          discountAmount: order.discountAmount,
          ppnAmount: order.ppnAmount,
          shippingCost: order.shippingCost,
          paymentMethod: order.paymentMethod,
          expiresAt: order.expiresAt,
          regionId: order.regionId,
          isFallbackToPusat: routeResult.isFallbackToPusat,
          fallbackReason: routeResult.reason,
        },
        token: snapToken,
        redirectUrl: snapRedirectUrl,
        paymentAccounts,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('[API Orders POST Error]', error);
    return NextResponse.json(
      {
        error: error.message || 'Terjadi kesalahan saat memproses pesanan.',
      },
      { status: 400 }
    );
  }
}
