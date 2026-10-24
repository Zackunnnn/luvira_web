// app/api/midtrans/notification/route.ts
// ============================================================================
// Midtrans Webhook Notification Endpoint Luvira 2.0
// Sesuai docs/LUVIRA_2_PLAN.md Bagian 5.3, 8.2 & Aturan Autopilot
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import {
  verifyMidtransSignature,
  mapMidtransStatusToOrderStatus,
  evaluateStatusTransition,
} from '@/lib/midtrans-webhook';
import { midtransAdapter } from '@/lib/payments/midtrans-adapter';
import { OrderStatus, PaymentVerificationStatus, StockMovementType, Role } from '@prisma/client';
import { audit } from '@/lib/audit';

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();

    const orderId = payload.order_id;
    const statusCode = payload.status_code;
    const grossAmount = payload.gross_amount;
    const signatureKey = payload.signature_key;
    const transactionStatus = payload.transaction_status;
    const fraudStatus = payload.fraud_status;

    if (!orderId || !statusCode || !grossAmount) {
      return NextResponse.json(
        { error: 'Payload tidak lengkap' },
        { status: 400 }
      );
    }

    // 1. Verifikasi Signature Key (Wajib demi keamanan webhook)
    const serverKey = midtransAdapter.getServerKey();
    const isValidSignature = verifyMidtransSignature(
      {
        order_id: orderId,
        status_code: statusCode,
        gross_amount: grossAmount,
        signature_key: signatureKey,
      },
      serverKey
    );

    if (!isValidSignature) {
      console.warn(`[Midtrans Webhook] Invalid Signature Key untuk order: ${orderId}`);
      return NextResponse.json(
        { error: 'Invalid signature key' },
        { status: 403 }
      );
    }

    // 2. Cari pesanan di DB
    const order = await prisma.order.findFirst({
      where: {
        OR: [{ code: orderId }, { id: orderId }],
      },
      include: {
        items: true,
        region: true,
      },
    });

    if (!order) {
      console.warn(`[Midtrans Webhook] Pesanan tidak ditemukan: ${orderId}`);
      // Return 200 agar Midtrans tidak terus mengulang pengiriman
      return NextResponse.json({ status: 'ok', message: 'Order not found, ignored' });
    }

    // 3. Petakan Status
    const targetStatus = mapMidtransStatusToOrderStatus(transactionStatus, fraudStatus);
    if (targetStatus === 'UNKNOWN') {
      return NextResponse.json({ status: 'ok', message: 'Unknown status ignored' });
    }

    // 4. Evaluasi Transisi Status (Guard Idempotency & Anti-Downgrade)
    const transition = evaluateStatusTransition(order.status, targetStatus);
    if (!transition.shouldUpdate) {
      console.log(`[Midtrans Webhook Idempotency] ${transition.reason}`);
      return NextResponse.json({
        status: 'ok',
        message: transition.reason,
        currentStatus: order.status,
      });
    }

    // 5. Eksekusi Perubahan Status & Mutasi Stok dalam Transaksi Atomik
    const previousStatus = order.status;

    await prisma.$transaction(async (tx) => {
      // A. Jika transaksi LUNAS (berubah jadi DIPROSES)
      if (targetStatus === OrderStatus.DIPROSES) {
        // Kurangi stok fisik riil dan lepas reserved (Stok reservasi menjadi stok terjual)
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
            const newQty = Math.max(0, stock.qty - item.quantity);
            const newReserved = Math.max(0, stock.reserved - item.quantity);

            await tx.stock.update({
              where: { id: stock.id },
              data: {
                qty: newQty,
                reserved: newReserved,
              },
            });

            await tx.stockMovement.create({
              data: {
                stockId: stock.id,
                type: StockMovementType.OUT,
                qtyChange: -item.quantity,
                balanceAfter: newQty,
                reason: `Pembayaran Midtrans lunas #${order.code}`,
              },
            });
          }
        }

        // Catat Payment Lunas
        await tx.payment.create({
          data: {
            orderId: order.id,
            amount: order.totalPrice,
            method: order.paymentMethod,
            status: PaymentVerificationStatus.VERIFIED,
            midtransTransactionId: payload.transaction_id || `midtrans-${order.code}`,
            midtransStatus: transactionStatus,
            rawNotification: payload,
          },
        });

        // Notifikasi ke Admin Wilayah / Pusat
        await tx.notification.create({
          data: {
            targetRole: order.region?.type === 'PUSAT' ? Role.ADMIN_PUSAT : Role.ADMIN_WILAYAH,
            targetRegionId: order.regionId,
            title: `Pesanan Lunas #${order.code}`,
            message: `Pembayaran Midtrans sebesar Rp ${order.totalPrice.toLocaleString('id-ID')} telah diterima. Siap dikemas.`,
            linkUrl: `/dashboard/admin?orderId=${order.id}`,
          },
        });
      }

      // B. Jika transaksi GAGAL / KEDALUWARSA / DIBATALKAN
      if (targetStatus === OrderStatus.DIBATALKAN) {
        // Lepas reserved stock kembali ke stok tersedia
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
              data: {
                reserved: newReserved,
              },
            });

            await tx.stockMovement.create({
              data: {
                stockId: stock.id,
                type: StockMovementType.RELEASE,
                qtyChange: item.quantity,
                balanceAfter: stock.qty,
                reason: `Pesanan dibatalkan / gagal bayar Midtrans #${order.code}`,
              },
            });
          }
        }

        // Kembalikan kuota promo jika pesanan menggunakan promo
        if (order.promoCodeId) {
          await tx.promoCode.update({
            where: { id: order.promoCodeId },
            data: {
              usedCount: { decrement: 1 },
            },
          });
        }
      }

      // Update status pesanan
      await tx.order.update({
        where: { id: order.id },
        data: { status: targetStatus },
      });

      // Catat riwayat status pesanan
      await tx.orderStatusLog.create({
        data: {
          orderId: order.id,
          fromStatus: previousStatus,
          toStatus: targetStatus,
          note: `Webhook Midtrans: ${transactionStatus} (${payload.payment_type || 'online'})`,
          actorRole: 'SYSTEM',
        },
      });
    });

    // Audit log
    await audit({
      action: 'MIDTRANS_WEBHOOK_UPDATE',
      entity: 'Order',
      entityId: order.id,
      before: { status: previousStatus },
      after: { status: targetStatus, transactionStatus },
    });

    console.log(`[Midtrans Webhook] Order ${order.code} updated: ${previousStatus} -> ${targetStatus}`);
    return NextResponse.json({ status: 'ok', newStatus: targetStatus });
  } catch (error: any) {
    console.error('[Midtrans Webhook Error]', error);
    return NextResponse.json({ error: error.message || 'Internal error' }, { status: 500 });
  }
}
