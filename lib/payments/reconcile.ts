// lib/payments/reconcile.ts
// ============================================================================
// Service: Active Reconciliation Status Pembayaran Midtrans
// Memeriksa status riil ke API Midtrans & mengupdate database secara atomik.
// Dapat dipanggil dari Webhook, Status Polling, Pelacakan Pesanan (/track),
// maupun Admin Order Sync.
// ============================================================================

import { prisma } from '@/lib/db';
import { midtransAdapter } from '@/lib/payments/midtrans-adapter';
import { OrderStatus, PaymentVerificationStatus, StockMovementType, Role } from '@prisma/client';
import { notifyPaymentConfirmed } from '@/lib/notify/order-events';

export interface ReconcileResult {
  found: boolean;
  orderCode?: string;
  orderId?: string;
  status: OrderStatus;
  isPaid: boolean;
  updated: boolean;
  message: string;
}

export async function reconcileMidtransOrder(orderIdOrCode: string): Promise<ReconcileResult> {
  const cleanId = orderIdOrCode.trim();

  // 1. Cari pesanan di database
  const order = await prisma.order.findFirst({
    where: {
      OR: [{ code: cleanId }, { id: cleanId }],
    },
    include: {
      items: true,
      region: true,
      payments: true,
    },
  });

  if (!order) {
    return {
      found: false,
      status: OrderStatus.MENUNGGU_PEMBAYARAN,
      isPaid: false,
      updated: false,
      message: 'Pesanan tidak ditemukan.',
    };
  }

  // 2. Jika status sudah lunas / diproses / selesai
  if (
    order.status === OrderStatus.DIPROSES ||
    order.status === OrderStatus.DIKIRIM ||
    order.status === OrderStatus.SELESAI
  ) {
    return {
      found: true,
      orderCode: order.code,
      orderId: order.id,
      status: order.status,
      isPaid: true,
      updated: false,
      message: 'Pembayaran telah dikonfirmasi dan pesanan sedang diproses.',
    };
  }

  // 3. Jika status sudah dibatalkan
  if (order.status === OrderStatus.DIBATALKAN) {
    return {
      found: true,
      orderCode: order.code,
      orderId: order.id,
      status: order.status,
      isPaid: false,
      updated: false,
      message: 'Pesanan telah dibatalkan.',
    };
  }

  // 4. Jika bukan metode Midtrans Snap, biarkan status apa adanya
  if (order.paymentMethod !== 'MIDTRANS_SNAP') {
    return {
      found: true,
      orderCode: order.code,
      orderId: order.id,
      status: order.status,
      isPaid: false,
      updated: false,
      message: 'Pesanan menggunakan metode non-Midtrans.',
    };
  }

  // 5. Cek status riil ke API Midtrans
  const midtransRes = await midtransAdapter.getTransactionStatus(order.code);

  if (midtransRes) {
    const transactionStatus = (midtransRes.transaction_status || '').toLowerCase();
    const fraudStatus = (midtransRes.fraud_status || '').toLowerCase();

    const isSettled =
      transactionStatus === 'settlement' ||
      (transactionStatus === 'capture' && fraudStatus === 'accept');

    // JIKA LUNAS: Lakukan pembaruan atomik
    if (isSettled) {
      const previousStatus = order.status;
      const targetStatus = OrderStatus.DIPROSES;

      await prisma.$transaction(async (tx) => {
        // A. Kurangi stok fisik dan lepas reservasi
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
                reason: `Pembayaran Midtrans lunas (Sync) #${order.code}`,
              },
            });
          }
        }

        // B. Catat Pembayaran Terverifikasi
        const existingPayment = await tx.payment.findFirst({
          where: { orderId: order.id },
        });

        if (existingPayment) {
          await tx.payment.update({
            where: { id: existingPayment.id },
            data: {
              status: PaymentVerificationStatus.VERIFIED,
              midtransTransactionId: midtransRes.transaction_id || `sync-${order.code}`,
              midtransStatus: transactionStatus,
              rawNotification: midtransRes,
            },
          });
        } else {
          await tx.payment.create({
            data: {
              orderId: order.id,
              amount: order.totalPrice,
              method: order.paymentMethod,
              status: PaymentVerificationStatus.VERIFIED,
              midtransTransactionId: midtransRes.transaction_id || `sync-${order.code}`,
              midtransStatus: transactionStatus,
              rawNotification: midtransRes,
            },
          });
        }

        // C. Notifikasi Admin
        await tx.notification.create({
          data: {
            targetRole: order.region?.type === 'PUSAT' ? Role.ADMIN_PUSAT : Role.ADMIN_WILAYAH,
            targetRegionId: order.regionId,
            title: `Pesanan Lunas #${order.code}`,
            message: `Pembayaran Midtrans sebesar Rp ${order.totalPrice.toLocaleString('id-ID')} telah dikonfirmasi via sinkronisasi live. Siap dikemas.`,
            linkUrl: `/dashboard/admin?orderId=${order.id}`,
          },
        });

        // D. Update status pesanan
        await tx.order.update({
          where: { id: order.id },
          data: {
            status: targetStatus,
            paidAt: new Date(),
          },
        });

        // E. Catat riwayat status pesanan
        await tx.orderStatusLog.create({
          data: {
            orderId: order.id,
            fromStatus: previousStatus,
            toStatus: targetStatus,
            note: `Sinkronisasi Midtrans: ${transactionStatus} (${midtransRes.payment_type || 'online'})`,
            actorRole: 'SYSTEM',
          },
        });
      });

      // Trigger notifikasi WhatsApp ke pembeli jika waConsent aktif
      try {
        await notifyPaymentConfirmed({
          id: order.id,
          code: order.code,
          customerPhone: order.customerPhone,
          customerName: order.customerName,
          totalPrice: order.totalPrice,
          waConsent: order.waConsent,
          isTest: order.isTest,
        });
      } catch {
        // Abaikan kegagalan notifikasi background
      }

      return {
        found: true,
        orderCode: order.code,
        orderId: order.id,
        status: OrderStatus.DIPROSES,
        isPaid: true,
        updated: true,
        message: 'Pembayaran berhasil diverifikasi secara langsung dari Midtrans!',
      };
    }

    // JIKA KEDALUWARSA ATAU DIBATALKAN
    if (['expire', 'cancel', 'deny'].includes(transactionStatus)) {
      await prisma.$transaction(async (tx) => {
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
          }
        }

        await tx.order.update({
          where: { id: order.id },
          data: { status: OrderStatus.DIBATALKAN },
        });

        await tx.orderStatusLog.create({
          data: {
            orderId: order.id,
            fromStatus: order.status,
            toStatus: OrderStatus.DIBATALKAN,
            note: `Pembayaran Midtrans kedaluwarsa/gagal (${transactionStatus})`,
            actorRole: 'SYSTEM',
          },
        });
      });

      return {
        found: true,
        orderCode: order.code,
        orderId: order.id,
        status: OrderStatus.DIBATALKAN,
        isPaid: false,
        updated: true,
        message: 'Pembayaran telah kedaluwarsa atau dibatalkan di Midtrans.',
      };
    }
  }

  // Masih menunggu pembayaran
  return {
    found: true,
    orderCode: order.code,
    orderId: order.id,
    status: order.status,
    isPaid: false,
    updated: false,
    message: 'Menunggu transfer pembayaran dari pembeli.',
  };
}
