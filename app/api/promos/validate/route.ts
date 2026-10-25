// app/api/promos/validate/route.ts
// ============================================================================
// API Validasi Kode Promo Luvira 2.0 (Reseller & Wilayah)
// Sesuai docs/LUVIRA_2_PLAN.md Bagian 5.2, 7.3, A4 & E2E-06
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { resolveTargetRegion } from '@/lib/orders/order-routing';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { code, regionId, destinationProvince, subtotal = 0 } = await request.json();

    if (!code || typeof code !== 'string') {
      return NextResponse.json({ error: 'Kode promo wajib diisi' }, { status: 400 });
    }

    const promo = await prisma.promoCode.findUnique({
      where: { code: code.trim().toUpperCase() },
      include: { region: true },
    });

    if (!promo) {
      return NextResponse.json({ error: 'Kode promo tidak ditemukan' }, { status: 404 });
    }

    // 1. Cek status aktif
    if (!promo.isActive) {
      return NextResponse.json({ error: 'Kode promo sudah tidak aktif' }, { status: 400 });
    }

    const now = new Date();

    // 2. Cek tanggal mulai
    if (promo.startDate && promo.startDate > now) {
      return NextResponse.json({ error: 'Kode promo belum dapat digunakan' }, { status: 400 });
    }

    // 3. Cek tanggal kedaluwarsa
    if (promo.expiresAt && promo.expiresAt < now) {
      return NextResponse.json({ error: 'Kode promo sudah kedaluwarsa' }, { status: 400 });
    }

    // 4. Cek kuota pemakaian
    if (promo.quota > 0 && promo.usedCount >= promo.quota) {
      return NextResponse.json({ error: 'Kuota promo sudah habis' }, { status: 400 });
    }

    // 5. Cek minimal belanja (minOrderAmount)
    if (promo.minOrderAmount && subtotal < promo.minOrderAmount) {
      return NextResponse.json(
        {
          error: `Minimal pembelanjaan untuk kode ini adalah Rp ${promo.minOrderAmount.toLocaleString('id-ID')}`,
        },
        { status: 400 }
      );
    }

    // 6. Validasi Promo Wilayah (A4 / E2E-06)
    if (promo.type === 'WILAYAH' && promo.regionId) {
      let targetRegionId = regionId;

      // Jika regionId belum dikirim langsung, coba deteksi dari nama provinsi tujuan
      if (!targetRegionId && destinationProvince) {
        const resolved = await resolveTargetRegion({ provinceName: destinationProvince });
        targetRegionId = resolved.id;
      }

      if (targetRegionId && targetRegionId !== promo.regionId) {
        return NextResponse.json(
          {
            error: `Kode promo wilayah ini khusus untuk pengiriman wilayah ${promo.region?.name || 'tertentu'}.`,
          },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          id: promo.id,
          code: promo.code,
          type: promo.type,
          discountType: promo.discountType,
          discountValue: promo.discountValue,
          maxDiscount: promo.maxDiscountAmount,
          isFreeShipping: promo.isFreeShipping,
          isFreeTax: promo.isFreeTax,
          regionId: promo.regionId,
          regionName: promo.region?.name || null,
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('[Promo Validate API Error]', error);
    return NextResponse.json({ error: 'Internal server error', message: error.message }, { status: 500 });
  }
}
