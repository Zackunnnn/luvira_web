// app/api/admin/orders/[id]/status/route.ts
// ============================================================================
// Pembaruan Status Pesanan oleh Admin
// Aturan: Resi & Kurir WAJIB sebelum DIKIRIM, pelepasan stok jika DIBATALKAN
// Sesuai docs/LUVIRA_2_PLAN.md Bagian 5.3 & docs/PHASE_PROMPTS.md Bagian 3
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { can } from '@/lib/permissions';
import { audit } from '@/lib/audit';
import { OrderStatus, StockMovementType } from '@prisma/client';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { toStatus, note, courierCode, courierService, trackingNumber } = body;

    if (!toStatus || !Object.values(OrderStatus).includes(toStatus as OrderStatus)) {
      return NextResponse.json({ error: 'Status pesanan tujuan tidak valid' }, { status: 400 });
    }

    const order = await prisma.order.findFirst({
      where: {
        OR: [{ id }, { code: id }],
      },
      include: {
        items: true,
      },
    });

    if (!order) {
      return NextResponse.json({ error: 'Pesanan tidak ditemukan' }, { status: 404 });
    }

    // Otorisasi & Isolasi Wilayah
    if (!can(user, 'order:manage', { regionId: order.regionId })) {
      return NextResponse.json({ error: 'Akses ditolak: Anda tidak memiliki wewenang mengelola pesanan wilayah ini.' }, { status: 403 });
    }

    // Validasi Wajib Resi sebelum DIKIRIM
    if (toStatus === OrderStatus.DIKIRIM) {
      const finalTrackingNumber = trackingNumber || order.trackingNumber;
      const finalCourier = courierCode || order.courierCode;

      if (!finalTrackingNumber?.trim() || !finalCourier?.trim()) {
        return NextResponse.json(
          { error: 'Nomor resi dan kurir pengiriman wajib diisi sebelum status diubah menjadi DIKIRIM.' },
          { status: 400 }
        );
      }
    }

    const previousStatus = order.status;
    const now = new Date();

    const updated = await prisma.$transaction(async (tx) => {
      const updateData: any = {
        status: toStatus,
      };

      if (courierCode) updateData.courierCode = courierCode;
      if (courierService) updateData.courierService = courierService;
      if (trackingNumber) updateData.trackingNumber = trackingNumber.trim();

      if (toStatus === OrderStatus.DIBATALKAN) {
        updateData.cancelledAt = now;
        updateData.cancellationReason = note || 'Dibatalkan oleh Admin.';

        // Jika pesanan belum selesai/dikirim dan memegang stok reserved, lepaskan stok
        if (
          previousStatus === OrderStatus.MENUNGGU_PEMBAYARAN ||
          previousStatus === OrderStatus.MENUNGGU_VERIFIKASI ||
          previousStatus === OrderStatus.DIPROSES
        ) {
          for (const item of order.items) {
            const stockRecord = await tx.stock.findUnique({
              where: {
                variantId_regionId: {
                  variantId: item.variantId,
                  regionId: order.regionId,
                },
              },
            });

            if (stockRecord && stockRecord.reserved > 0) {
              const releaseQty = Math.min(stockRecord.reserved, item.quantity);
              const updatedStock = await tx.stock.update({
                where: { id: stockRecord.id },
                data: {
                  reserved: { decrement: releaseQty },
                },
              });

              await tx.stockMovement.create({
                data: {
                  stockId: stockRecord.id,
                  type: StockMovementType.RELEASE,
                  qtyChange: -releaseQty,
                  balanceAfter: updatedStock.qty,
                  reason: `Pembatalan pesanan #${order.code}`,
                  actorId: user.id,
                },
              });
            }
          }

          // Kembalikan kuota promo jika ada
          if (order.promoCodeId) {
            await tx.promoCode.update({
              where: { id: order.promoCodeId },
              data: { usedCount: { decrement: 1 } },
            });
          }
        }
      }

      // Jika berpindah dari DIPROSES ke DIKIRIM: Kurangi stok fisik riil
      if (
        toStatus === OrderStatus.DIKIRIM &&
        (previousStatus === OrderStatus.DIPROSES || previousStatus === OrderStatus.MENUNGGU_VERIFIKASI)
      ) {
        for (const item of order.items) {
          const stockRecord = await tx.stock.findUnique({
            where: {
              variantId_regionId: {
                variantId: item.variantId,
                regionId: order.regionId,
              },
            },
          });

          if (stockRecord) {
            const deductQty = item.quantity;
            const updatedStock = await tx.stock.update({
              where: { id: stockRecord.id },
              data: {
                qty: { decrement: deductQty },
                reserved: { decrement: Math.min(stockRecord.reserved, deductQty) },
              },
            });

            await tx.stockMovement.create({
              data: {
                stockId: stockRecord.id,
                type: StockMovementType.OUT,
                qtyChange: -deductQty,
                balanceAfter: updatedStock.qty,
                reason: `Pengiriman pesanan #${order.code}`,
                actorId: user.id,
              },
            });
          }
        }
      }

      const updatedOrder = await tx.order.update({
        where: { id: order.id },
        data: updateData,
      });

      // Catat OrderStatusLog
      await tx.orderStatusLog.create({
        data: {
          orderId: order.id,
          fromStatus: previousStatus,
          toStatus,
          note: note || `Status diperbarui menjadi ${toStatus}`,
          actorId: user.id,
          actorRole: user.role,
        },
      });

      return updatedOrder;
    });

    // Audit Log
    await audit({
      actor: { id: user.id, name: user.name, role: user.role },
      action: 'UPDATE_ORDER_STATUS',
      entity: 'Order',
      entityId: order.id,
      before: { status: previousStatus },
      after: {
        status: toStatus,
        courierCode: body.courierCode || order.courierCode,
        trackingNumber: body.trackingNumber || order.trackingNumber,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Status pesanan berhasil diubah menjadi ${toStatus}.`,
      order: updated,
    });
  } catch (error: any) {
    console.error('[API Admin Update Order Status Error]', error);
    return NextResponse.json({ error: error.message || 'Gagal memperbarui status pesanan' }, { status: 500 });
  }
}
