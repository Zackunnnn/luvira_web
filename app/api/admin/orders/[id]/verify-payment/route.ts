// app/api/admin/orders/[id]/verify-payment/route.ts
// ============================================================================
// Verifikasi Bukti Transfer Manual oleh Admin
// Mendukung Konfirmasi (-> DIPROSES) atau Penolakan (-> MENUNGGU_PEMBAYARAN)
// Sesuai docs/LUVIRA_2_PLAN.md Bagian 5.3 & E2E-02, E2E-03
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { can } from '@/lib/permissions';
import { audit } from '@/lib/audit';
import { OrderStatus, PaymentVerificationStatus, PaymentMethod } from '@prisma/client';

export async function POST(
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
    const { action, rejectionReason } = body; // action: 'CONFIRM' | 'REJECT'

    if (!['CONFIRM', 'REJECT'].includes(action)) {
      return NextResponse.json({ error: 'Aksi verifikasi tidak valid (pilih CONFIRM atau REJECT)' }, { status: 400 });
    }

    if (action === 'REJECT' && !rejectionReason?.trim()) {
      return NextResponse.json({ error: 'Alasan penolakan bukti transfer wajib diisi' }, { status: 400 });
    }

    const order = await prisma.order.findFirst({
      where: {
        OR: [{ id }, { code: id }],
      },
      include: {
        payments: {
          where: { method: PaymentMethod.MANUAL_TRANSFER },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!order) {
      return NextResponse.json({ error: 'Pesanan tidak ditemukan' }, { status: 404 });
    }

    // Otorisasi & Isolasi Wilayah
    if (!can(user, 'order:manage', { regionId: order.regionId })) {
      return NextResponse.json({ error: 'Akses ditolak: Anda tidak memiliki wewenang mengelola pesanan wilayah ini.' }, { status: 403 });
    }

    const currentPayment = order.payments[0];
    if (!currentPayment) {
      return NextResponse.json({ error: 'Tidak ada data pembayaran transfer manual untuk pesanan ini' }, { status: 400 });
    }

    const previousStatus = order.status;
    let targetStatus: OrderStatus;
    let paymentStatus: PaymentVerificationStatus;
    let statusNote: string;

    if (action === 'CONFIRM') {
      targetStatus = OrderStatus.DIPROSES;
      paymentStatus = PaymentVerificationStatus.VERIFIED;
      statusNote = 'Bukti pembayaran transfer manual diverifikasi dan disetujui.';
    } else {
      targetStatus = OrderStatus.MENUNGGU_PEMBAYARAN;
      paymentStatus = PaymentVerificationStatus.REJECTED;
      statusNote = `Bukti transfer ditolak: ${rejectionReason.trim()}`;
    }

    const now = new Date();

    const updated = await prisma.$transaction(async (tx) => {
      // 1. Update Payment
      await tx.payment.update({
        where: { id: currentPayment.id },
        data: {
          status: paymentStatus,
          rejectionReason: action === 'REJECT' ? rejectionReason.trim() : null,
          verifiedBy: user.name || user.email,
          verifiedAt: now,
        },
      });

      // 2. Update Order
      const updatedOrder = await tx.order.update({
        where: { id: order.id },
        data: {
          status: targetStatus,
          paidAt: action === 'CONFIRM' ? now : order.paidAt,
        },
      });

      // 3. Catat OrderStatusLog
      await tx.orderStatusLog.create({
        data: {
          orderId: order.id,
          fromStatus: previousStatus,
          toStatus: targetStatus,
          note: statusNote,
          actorId: user.id,
          actorRole: user.role,
        },
      });

      return updatedOrder;
    });

    // 4. Audit Log
    await audit({
      actor: { id: user.id, name: user.name, role: user.role },
      action: action === 'CONFIRM' ? 'VERIFY_PAYMENT_CONFIRM' : 'VERIFY_PAYMENT_REJECT',
      entity: 'Order',
      entityId: order.id,
      before: { status: previousStatus, paymentStatus: currentPayment.status },
      after: { status: targetStatus, paymentStatus, reason: rejectionReason || null },
    });

    return NextResponse.json({
      success: true,
      message: action === 'CONFIRM' ? 'Pembayaran berhasil diverifikasi. Status pesanan berubah menjadi DIPROSES.' : 'Bukti transfer ditolak. Pembeli dapat mengunggah ulang bukti baru.',
      order: updated,
    });
  } catch (error: any) {
    console.error('[API Admin Verify Payment Error]', error);
    return NextResponse.json({ error: error.message || 'Gagal memverifikasi pembayaran' }, { status: 500 });
  }
}
