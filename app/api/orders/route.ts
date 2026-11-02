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

export const dynamic = 'force-dynamic';

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
      destination,
      items,
      paymentMethod = 'MIDTRANS_SNAP',
    } = body;

    const customerName = body.customerName || body.customer?.name;
    const customerPhone = body.customerPhone || body.customer?.phone || body.customer?.whatsapp;
    const customerEmail = body.customerEmail || body.customer?.email;
    const shippingCourier = body.shippingCourier || body.shipping?.courier;
    const shippingCost = body.shippingCost !== undefined ? body.shippingCost : (body.shipping?.cost ?? 0);
    let promoCodeId = body.promoCodeId || body.promoCode || body.code;

    // Validasi penolakan COD di checkout publik (Asumsi F1)
    if (paymentMethod === 'COD' || paymentMethod === PaymentMethod.COD) {
      return NextResponse.json(
        { error: 'Metode pembayaran COD hanya dapat dibuat melalui Pesanan Manual oleh Admin atau Reseller.' },
        { status: 403 }
      );
    }

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

    // Normalisasi enum payment method & FT-3 Deteksi Promo Uji (TESTING)
    let resolvedPaymentMethod: PaymentMethod = PaymentMethod.MIDTRANS_SNAP;
    let isTestPromo = false;

    if (promoCodeId) {
      const promoRecord = await prisma.promoCode.findFirst({
        where: {
          OR: [
            { id: promoCodeId },
            { code: String(promoCodeId).trim().toUpperCase() }
          ]
        },
      });
      if (promoRecord) {
        promoCodeId = promoRecord.id;
        if (promoRecord.kind === 'TESTING') {
          const testSetting = await prisma.setting.findUnique({ where: { key: 'testPromoEnabled' } });
          const isTestPromoActive = testSetting ? Boolean(testSetting.value) : (process.env.TEST_PROMO_DEFAULT_ENABLED === 'true' || process.env.NODE_ENV !== 'production');
          if (!isTestPromoActive) {
            return NextResponse.json(
              { error: 'Kode promo uji coba (TESTING) sedang dinonaktifkan oleh sistem.' },
              { status: 400 }
            );
          }
          isTestPromo = true;
          resolvedPaymentMethod = PaymentMethod.TEST_SIMULATION;
        }
      }
    }

    if (
      !isTestPromo &&
      (paymentMethod === 'manual' ||
      paymentMethod === 'MANUAL_TRANSFER' ||
      paymentMethod === 'TRANSFER_MANUAL')
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
      isTest: isTestPromo,
    });

    const { order, pricing, routeResult } = result;

    let snapToken: string | undefined = undefined;
    let snapRedirectUrl: string | undefined = undefined;
    let isSandbox = false;
    let paymentAccounts: any[] = [];

    // 3. Penanganan Metode Pembayaran
    if (resolvedPaymentMethod === PaymentMethod.TEST_SIMULATION || order.isTest) {
      // FT-3: Lewati Midtrans Snap sepenuhnya (F5)
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
            isTest: true,
            isFallbackToPusat: routeResult.isFallbackToPusat,
            fallbackReason: routeResult.reason,
          },
          isTest: true,
          simulationQrPayload: `LUVIRA-UJI:${order.code}`,
          paymentUrl: `/order/${order.id}/payment`,
        },
        { status: 201 }
      );
    }

    if (resolvedPaymentMethod === PaymentMethod.MIDTRANS_SNAP) {
      try {
        // Susun rincian item secara presisi (Produk + Diskon + PPN + Ongkir)
        // Midtrans mewajibkan sum(item_details) === gross_amount
        const midtransItems: Array<{ id: string; price: number; quantity: number; name: string }> = (order as any).items.map((item: any) => ({
          id: item.variantId.slice(0, 50),
          price: Math.round(item.priceEach),
          quantity: item.quantity,
          name: `${item.productName} (${item.variantName})`.slice(0, 50),
        }));

        if (order.discountAmount > 0) {
          midtransItems.push({
            id: 'PROMO_DISCOUNT',
            price: -Math.round(order.discountAmount),
            quantity: 1,
            name: 'Diskon Promo',
          });
        }

        if (order.ppnAmount > 0) {
          midtransItems.push({
            id: 'PPN_11',
            price: Math.round(order.ppnAmount),
            quantity: 1,
            name: 'PPN 11%',
          });
        }

        if (order.shippingCost > 0) {
          midtransItems.push({
            id: 'SHIPPING_FEE',
            price: Math.round(order.shippingCost),
            quantity: 1,
            name: `Ongkir (${shippingCourier || 'Ekspedisi'})`.slice(0, 50),
          });
        }

        const snapRes = await midtransAdapter.createSnapToken({
          orderId: order.code,
          grossAmount: pricing.totalPrice,
          customerDetails: {
            first_name: customerName,
            email: customerEmail || 'customer@luvira.id',
            phone: customerPhone,
          },
          itemDetails: midtransItems,
        });

        snapToken = snapRes.token;
        snapRedirectUrl = snapRes.redirect_url;
        isSandbox = Boolean(snapRes.isSandbox);

        // Simpan snap token di order
        await prisma.order.update({
          where: { id: order.id },
          data: { midtransToken: snapToken },
        });
      } catch (snapErr: any) {
        console.error('[Midtrans Token Creation Error]', snapErr);
        return NextResponse.json(
          {
            error: `Gagal memproses pembayaran Midtrans: ${snapErr?.message || 'Koneksi ke gateway pembayaran gagal'}`,
          },
          { status: 400 }
        );
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
        isSandbox,
        clientKey: midtransAdapter.getClientKey(),
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
