import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { calculateOrderPricing } from '@/lib/pricing';
import { Order as ClientOrder, OrderStatus } from '@/types/order';
import { CartItem } from '@/types/product';
import { OrderStatus as DbOrderStatus, PaymentMethod as DbPaymentMethod } from '@prisma/client';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const midtransClient = require('midtrans-client');

 
// Helper to map DB Order to Client Order format to maintain backward compatibility with UI
async function mapDbOrderToClientOrder(dbOrder: any, allProducts: any[]): Promise<ClientOrder> {
  const items: CartItem[] = dbOrder.items.map((item: any) => {
    const product = allProducts.find(p => p.id === item.productId) || {
      id: item.productId,
      name: 'Unknown Product',
      price: item.priceEach,
      model: 'unknown',
      rating: 0,
      reviewsCount: 0,
      description: '',
      features: [],
      variants: []
    };
    
    const variant = product.variants?.find((v: any) => v.id === item.variantId) || {
      id: item.variantId,
      name: 'Unknown Variant',
      hex: '#000000',
      image: '',
      stock: 0
    };

    return {
      product,
      selectedVariant: variant,
      quantity: item.quantity
    };
  });

  const totalPrice = dbOrder.items.reduce((acc: number, item: any) => acc + (item.priceEach * item.quantity), 0) 
                     + (dbOrder.shippingCost || 0) + (dbOrder.ppnAmount || 0);

  return {
    id: dbOrder.id,
    invoiceNumber: dbOrder.id.toUpperCase().substring(0, 10), // Fallback
    customerInfo: {
      name: dbOrder.customerName,
      phone: dbOrder.customerPhone,
      address: dbOrder.customerAddress,
    },
    items,
    totalPrice,
    paymentMethod: dbOrder.paymentMethod === 'midtrans' ? 'midtrans' : 'manual',
    status: dbOrder.status as OrderStatus,
    createdAt: dbOrder.createdAt.toISOString(),
    
    // Phase 13 Fields
    promoCodeId: dbOrder.promoCodeId,
    shippingCourier: dbOrder.shippingCourier,
    shippingCost: dbOrder.shippingCost,
    ppnAmount: dbOrder.ppnAmount,
    paymentProofUrl: dbOrder.paymentProofUrl,
    paymentDeadline: dbOrder.paymentDeadline?.toISOString(),
    verifiedBy: dbOrder.verifiedBy,
    verifiedAt: dbOrder.verifiedAt?.toISOString(),
    midtransToken: dbOrder.midtransToken,
  };
}

export async function GET() {
  try {
    const dbOrders = await prisma.order.findMany({
      include: { items: true },
      orderBy: { createdAt: 'desc' }
    });

    const allProducts = await prisma.product.findMany({
      include: { variants: true }
    });

    const clientOrders = await Promise.all(
      dbOrders.map(o => mapDbOrderToClientOrder(o, allProducts))
    );

    return NextResponse.json(clientOrders);
  } catch (error) {
    console.error('[API Orders GET] Error:', error);
    return NextResponse.json({ error: 'Failed to read orders' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const newOrder: ClientOrder = await request.json();
    
    if (!newOrder || !newOrder.id || !newOrder.customerInfo) {
      return NextResponse.json({ error: 'Invalid order data' }, { status: 400 });
    }

    // ========================================================================
    // SERVER-SIDE PRICING VALIDATION (HOTFIX KEAMANAN)
    // Server menghitung ulang harga dari DB resmi dan mengabaikan manipulasi klien
    // ========================================================================
    const pricing = await calculateOrderPricing(
      prisma,
      newOrder.items,
      newOrder.promoCodeId,
      newOrder.shippingCourier
    );

    // Deteksi jika klien mengirimkan angka yang berbeda dari kalkulasi server
    if (newOrder.totalPrice && newOrder.totalPrice !== pricing.totalPrice) {
      console.warn(
        `[Pricing Security Warning] Client totalPrice (${newOrder.totalPrice}) mismatch with server totalPrice (${pricing.totalPrice}). Overriding with server price.`
      );
    }

    const allProducts = await prisma.product.findMany({ include: { variants: true } });
    const defaultRegion = (await prisma.region.findFirst({ where: { code: 'PUSAT' } })) || (await prisma.region.findFirst());

    const createdOrder = await prisma.order.create({
      data: {
        id: newOrder.id,
        code: newOrder.id,
        regionId: defaultRegion?.id || 'region-pusat',
        customerName: newOrder.customerInfo.name,
        customerPhone: newOrder.customerInfo.phone,
        shippingAddress:
          typeof newOrder.customerInfo.address === 'string'
            ? { street: newOrder.customerInfo.address }
            : newOrder.customerInfo.address,
        status: DbOrderStatus.MENUNGGU_PEMBAYARAN,
        paymentMethod:
          newOrder.paymentMethod === 'midtrans'
            ? DbPaymentMethod.MIDTRANS_SNAP
            : DbPaymentMethod.MANUAL_TRANSFER,
        subtotal: pricing.subtotal,
        discountAmount: pricing.discountAmount,
        netPrice: pricing.netPrice,
        ppnAmount: pricing.ppnAmount,
        shippingCost: pricing.shippingCost,
        totalPrice: pricing.totalPrice,
        courierCode: newOrder.shippingCourier || null,
        promoCodeId: pricing.promoApplied?.id || null,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        createdAt: new Date(),

        items: {
          create: pricing.itemsBreakdown.map((item) => {
            const prod = allProducts.find((p) => p.id === item.productId);
            const variant = prod?.variants.find((v) => v.id === item.variantId);
            return {
              variantId: item.variantId,
              productName: prod?.name || 'Kaus Kaki Luvira',
              variantName: variant?.name || 'Varian',
              quantity: item.quantity,
              priceEach: item.priceEach,
              costEach: item.costEach || 0,
              packingEach: item.packingEach || 0,
              subtotal: item.priceEach * item.quantity,
            };
          }),
        },
      },
      include: { items: true },
    });

    // Update kuota promo jika promo berhasil digunakan
    if (pricing.promoApplied) {
      try {
        await prisma.promoCode.update({
          where: { id: pricing.promoApplied.id },
          data: { usedCount: { increment: 1 } }
        });
      } catch (err) {
        console.error('[Promo Usage Increment Error]', err);
      }
    }

    let snapToken = undefined;
    if (newOrder.paymentMethod === 'midtrans') {
      try {
        const snap = new midtransClient.Snap({
          isProduction: process.env.NEXT_PUBLIC_MIDTRANS_ENV === 'production',
          serverKey: process.env.MIDTRANS_SERVER_KEY,
          clientKey: process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY
        });

        // gross_amount MUTLAK menggunakan kalkulasi server
        const parameter = {
          transaction_details: {
            order_id: createdOrder.id,
            gross_amount: pricing.totalPrice
          },
          customer_details: {
            first_name: newOrder.customerInfo.name,
            phone: newOrder.customerInfo.phone,
            billing_address: {
              address: newOrder.customerInfo.address
            }
          }
        };

        const transaction = await snap.createTransaction(parameter);
        snapToken = transaction.token;

        await prisma.order.update({
          where: { id: createdOrder.id },
          data: { midtransToken: snapToken }
        });
        
        createdOrder.midtransToken = snapToken;
      } catch (err) {
        console.error('[Midtrans Create Error]', err);
      }
    }

    const mapped = await mapDbOrderToClientOrder(createdOrder, allProducts);
    mapped.totalPrice = pricing.totalPrice; // Kembalikan harga resmi server
    
    return NextResponse.json({ success: true, order: mapped, token: snapToken }, { status: 201 });
  } catch (error) {
    console.error('[API Orders POST] Error:', error);
    return NextResponse.json({ error: 'Failed to save order' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { id, status, paymentProofUrl }: { id: string; status: string, paymentProofUrl?: string } = await request.json();
    
    if (!id || !status) {
      return NextResponse.json({ error: 'id and status are required' }, { status: 400 });
    }

    const dataToUpdate: any = { status };
    if (paymentProofUrl) dataToUpdate.paymentProofUrl = paymentProofUrl;

    await prisma.order.update({
      where: { id },
      data: dataToUpdate
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('[API Orders PUT] Error:', error);
    return NextResponse.json({ error: 'Failed to update order status' }, { status: 500 });
  }
}
