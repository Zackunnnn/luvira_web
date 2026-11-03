// app/api/orders/manual/route.ts
// ============================================================================
// Endpoint Pembuatan Pesanan Manual COD (Admin Pusat, Admin Wilayah, Reseller)
// Mematuhi Gerbang FT-2 & Asumsi F1, F3, F7
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { createManualCodOrder } from '@/lib/orders/manual-cod';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Tidak terautentikasi. Silakan login terlebih dahulu.' }, { status: 401 });
    }

    const body = await request.json();
    const {
      customerName,
      customerPhone,
      handoverLocation,
      customerAddress,
      items,
      promoCode,
      secondPromoCode,
      secondaryPromoCode,
      note,
      notes,
      regionId,
    } = body;

    const normalizedItems = Array.isArray(items)
      ? items.map((it: any) => ({
          productId: it.productId,
          variantId: it.variantId,
          quantity: it.quantity ?? it.qty ?? 1,
        }))
      : [];

    const result = await createManualCodOrder({
      creator: user,
      customerName,
      customerPhone,
      handoverLocation: handoverLocation || customerAddress,
      items: normalizedItems,
      promoCode,
      secondPromoCode: secondPromoCode || secondaryPromoCode,
      note: note || notes,
      targetRegionId: regionId,
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Pesanan manual COD berhasil dibuat.',
        order: result.order,
        data: result.order,
        pricing: result.pricing,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('[API Orders Manual POST Error]', error);
    const message = error.message || 'Gagal membuat pesanan manual COD.';
    const status = message.includes('Akses ditolak') || message.includes('tidak memiliki wewenang') || message.includes('tidak memiliki izin')
      ? 403
      : 400;

    return NextResponse.json({ error: message }, { status });
  }
}
