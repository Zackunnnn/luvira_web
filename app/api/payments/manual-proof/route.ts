// app/api/payments/manual-proof/route.ts
// ============================================================================
// API Unggah / Unggah Ulang Bukti Transfer Manual
// Sesuai docs/LUVIRA_2_PLAN.md Bagian 5.3, E2E-02, E2E-03
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { OrderStatus, PaymentVerificationStatus, PaymentMethod, Role } from '@prisma/client';
import { audit } from '@/lib/audit';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { orderCode, orderId, proofUrl, notes } = body;

    const identifier = orderCode || orderId;
    if (!identifier) {
      return NextResponse.json({ error: 'Kode pesanan wajib disertakan.' }, { status: 400 });
    }

    if (!proofUrl || typeof proofUrl !== 'string') {
      return NextResponse.json({ error: 'Bukti transfer wajib diunggah.' }, { status: 400 });
    }

    // 1. Cari pesanan
    const order = await prisma.order.findFirst({
      where: {
        OR: [{ code: identifier }, { id: identifier }],
      },
      include: {
        region: true,
        payments: true,
      },
    });

    if (!order) {
      return NextResponse.json({ error: 'Pesanan tidak ditemukan.' }, { status: 404 });
    }

    // 2. Validasi status pesanan: hanya boleh jika MENUNGGU_PEMBAYARAN atau MENUNGGU_VERIFIKASI (re-upload E2E-03)
    if (
      order.status !== OrderStatus.MENUNGGU_PEMBAYARAN &&
      order.status !== OrderStatus.MENUNGGU_VERIFIKASI
    ) {
      return NextResponse.json(
        {
          error: `Pesanan dengan status "${order.status}" tidak dapat menerima unggahan bukti transfer.`,
        },
        { status: 400 }
      );
    }

    const previousStatus = order.status;

    // 3. Simpan atau perbarui data Payment
    await prisma.$transaction(async (tx) => {
      const existingPayment = await tx.payment.findFirst({
        where: {
          orderId: order.id,
          method: PaymentMethod.MANUAL_TRANSFER,
        },
      });

      if (existingPayment) {
        await tx.payment.update({
          where: { id: existingPayment.id },
          data: {
            proofUrl,
            status: PaymentVerificationStatus.PENDING,
            amount: order.totalPrice,
          },
        });
      } else {
        await tx.payment.create({
          data: {
            orderId: order.id,
            method: PaymentMethod.MANUAL_TRANSFER,
            amount: order.totalPrice,
            proofUrl,
            status: PaymentVerificationStatus.PENDING,
          },
        });
      }

      // Update status pesanan
      await tx.order.update({
        where: { id: order.id },
        data: {
          status: OrderStatus.MENUNGGU_VERIFIKASI,
        },
      });

      // Catat riwayat status
      await tx.orderStatusLog.create({
        data: {
          orderId: order.id,
          fromStatus: previousStatus,
          toStatus: OrderStatus.MENUNGGU_VERIFIKASI,
          note: notes || 'Pembeli mengunggah bukti transfer manual.',
          actorRole: 'BUYER',
        },
      });

      // Kirim notifikasi ke Admin Wilayah / Pusat penangan
      await tx.notification.create({
        data: {
          targetRole: order.region?.type === 'PUSAT' ? Role.ADMIN_PUSAT : Role.ADMIN_WILAYAH,
          targetRegionId: order.regionId,
          title: `Bukti Transfer Baru #${order.code}`,
          message: `Pembeli ${order.customerName} telah mengunggah bukti transfer. Silakan verifikasi.`,
          linkUrl: `/dashboard/admin?orderId=${order.id}`,
        },
      });
    });

    // Audit log
    await audit({
      action: 'UPLOAD_PAYMENT_PROOF',
      entity: 'Order',
      entityId: order.id,
      before: { status: previousStatus },
      after: { status: OrderStatus.MENUNGGU_VERIFIKASI, proofUrl },
    });

    return NextResponse.json({
      success: true,
      message: 'Bukti transfer berhasil diunggah. Menunggu verifikasi admin.',
      order: {
        id: order.id,
        code: order.code,
        status: OrderStatus.MENUNGGU_VERIFIKASI,
        proofUrl,
      },
    });
  } catch (error: any) {
    console.error('[API Manual Proof Upload Error]', error);
    return NextResponse.json(
      { error: error.message || 'Gagal memproses bukti transfer.' },
      { status: 500 }
    );
  }
}
