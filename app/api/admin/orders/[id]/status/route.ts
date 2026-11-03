// app/api/admin/orders/[id]/status/route.ts
// ============================================================================
// Pembaruan Status Pesanan oleh Admin & Reseller
// Aturan: Resi & Kurir WAJIB sebelum DIKIRIM (non-COD)
// Alur Status COD (FT-2 & F3):
// - menunggu_serah_terima -> diserahkan (Reseller atau Admin) -> selesai (Uang diterima, HANYA Admin penangan)
// - Reseller DITOLAK menyelesaikan / uang diterima (403)
// - Admin wilayah lain DITOLAK menyelesaikan COD wilayah ini (403)
// - Pelepasan stok reservasi jika DIBATALKAN
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { can } from '@/lib/permissions';
import { audit } from '@/lib/audit';
import { notifyOrderShipped } from '@/lib/notify/order-events';
import { OrderStatus, PaymentMethod, Role, StockMovementType } from '@prisma/client';

export const dynamic = 'force-dynamic';

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
    const { courierCode, courierService, trackingNumber } = body;
    const note = body.note || body.notes;
    let rawStatus = body.toStatus || body.status;

    // Normalisasi alias status ramah COD
    if (rawStatus === 'diserahkan' || rawStatus === 'DISERAHKAN') {
      rawStatus = OrderStatus.DIKIRIM;
    } else if (rawStatus === 'selesai' || rawStatus === 'SELESAI' || rawStatus === 'uang_diterima') {
      rawStatus = OrderStatus.SELESAI;
    } else if (rawStatus === 'dibatalkan' || rawStatus === 'DIBATALKAN') {
      rawStatus = OrderStatus.DIBATALKAN;
    }

    const toStatus = rawStatus as OrderStatus;

    if (!toStatus || !Object.values(OrderStatus).includes(toStatus)) {
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

    const isCod = order.paymentMethod === PaymentMethod.COD;

    // ========================================================================
    // ATURAN OTORISASI & ISOLASI KHUSUS COD (FT-2 & Asumsi F3)
    // ========================================================================
    if (isCod) {
      // 1. Reseller mencoba menandai "uang diterima" / menyelesaikan pesanan -> MUTLAK DITOLAK
      if (toStatus === OrderStatus.SELESAI && user.role === Role.RESELLER) {
        return NextResponse.json(
          {
            error: 'Akses ditolak: Reseller tidak memiliki wewenang menandai uang diterima atau menyelesaikan pesanan COD. Wewenang ini khusus Admin Wilayah penangan.',
          },
          { status: 403 }
        );
      }

      // 2. Admin Wilayah lain mencoba menyelesaikan pesanan COD di luar wilayahnya -> MUTLAK DITOLAK
      if (
        user.role === Role.ADMIN_WILAYAH &&
        order.regionId !== user.regionId
      ) {
        return NextResponse.json(
          {
            error: 'Akses ditolak: Admin wilayah lain tidak dapat menyelesaikan atau mengelola pesanan COD wilayah ini.',
          },
          { status: 403 }
        );
      }

      // 3. Reseller menandai "diserahkan" atau membatalkan pesanan buatannya
      if (user.role === Role.RESELLER) {
        const isOwnOrder = order.createdByUserId === user.id || (order as any).resellerId === user.id;
        if (!isOwnOrder) {
          return NextResponse.json(
            { error: 'Akses ditolak: Reseller hanya dapat memperbarui pesanan COD buatannya sendiri.' },
            { status: 403 }
          );
        }
      } else if (user.role === Role.DEVELOPER) {
        // Developer dilarang menulis mutasi bisnis
        return NextResponse.json(
          { error: 'Akses ditolak: Peran Developer dilarang mengubah status pesanan.' },
          { status: 403 }
        );
      }
    } else {
      // Otorisasi standar non-COD
      if (!can(user, 'order:manage', { regionId: order.regionId })) {
        return NextResponse.json(
          { error: 'Akses ditolak: Anda tidak memiliki wewenang mengelola pesanan wilayah ini.' },
          { status: 403 }
        );
      }

      // Validasi Wajib Resi sebelum DIKIRIM untuk non-COD
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

      // Penanganan COD Khusus
      if (isCod) {
        if (toStatus === OrderStatus.DIKIRIM) {
          updateData.codHandedOverAt = now;
          updateData.codHandedOverBy = user.id;
        } else if (toStatus === OrderStatus.SELESAI) {
          updateData.codCashConfirmedAt = now;
          updateData.codCashConfirmedBy = user.id;

          // Pengurangan stok fisik riil saat kas COD diterima & pesanan selesai (F2)
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
                  reason: `Penyelesaian pesanan COD #${order.code} (uang diterima)`,
                  actorId: user.id,
                },
              });
            }
          }
        }
      }

      // Penanganan Pembatalan (COD maupun Non-COD)
      if (toStatus === OrderStatus.DIBATALKAN) {
        updateData.cancelledAt = now;
        updateData.cancellationReason = note || 'Dibatalkan.';

        // Lepas stok reserved jika pesanan belum selesai
        if (
          previousStatus === OrderStatus.MENUNGGU_PEMBAYARAN ||
          previousStatus === OrderStatus.MENUNGGU_VERIFIKASI ||
          previousStatus === OrderStatus.DIPROSES ||
          (isCod && previousStatus === OrderStatus.DIKIRIM) // COD diserahkan tapi dibatalkan sebelum uang diterima
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
                  reason: `Pelepasan stok reservasi pembatalan pesanan #${order.code}`,
                  actorId: user.id,
                },
              });
            }
          }

          // Kembalikan kuota promo jika ada (Slot 1 & Slot 2)
          if (order.promoCodeId) {
            await tx.promoCode.update({
              where: { id: order.promoCodeId },
              data: { usedCount: { decrement: 1 } },
            });
          }
          if (order.secondPromoCodeId) {
            await tx.promoCode.update({
              where: { id: order.secondPromoCodeId },
              data: { usedCount: { decrement: 1 } },
            });
          }
        }
      }

      // Pengurangan stok fisik riil untuk NON-COD saat berpindah ke DIKIRIM
      if (
        !isCod &&
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
      const logNote = isCod
        ? toStatus === OrderStatus.DIKIRIM
          ? 'Pesanan COD telah diserahkan kepada pelanggan.'
          : toStatus === OrderStatus.SELESAI
          ? `Kas COD diterima sebesar Rp ${order.totalPrice.toLocaleString('id-ID')} dan pesanan diselesaikan.`
          : note || `Status diperbarui menjadi ${toStatus}`
        : note || `Status diperbarui menjadi ${toStatus}`;

      await tx.orderStatusLog.create({
        data: {
          orderId: order.id,
          fromStatus: previousStatus,
          toStatus,
          note: logNote,
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
        paymentMethod: order.paymentMethod,
        courierCode: body.courierCode || order.courierCode,
        trackingNumber: body.trackingNumber || order.trackingNumber,
      },
    });

    // Notifikasi WA bila pengiriman non-COD
    if (!isCod && toStatus === OrderStatus.DIKIRIM) {
      notifyOrderShipped(updated, body.courierCode || order.courierCode || 'Kurir', body.trackingNumber || order.trackingNumber || '-').catch((err) =>
        console.error('[Notification Order Shipped Error]', err)
      );
    }

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
