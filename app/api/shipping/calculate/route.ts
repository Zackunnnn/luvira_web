// app/api/shipping/calculate/route.ts
// ============================================================================
// API Perhitungan Tarif Ongkir Cerdas dengan Order Routing Luvira 2.0
// Sesuai docs/LUVIRA_2_PLAN.md Bagian 5.2, 8.1, A6, A10
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { rajaOngkirService } from '@/lib/shipping/rajaongkir';
import { determineHandlingRegion } from '@/lib/orders/order-routing';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { destination, items, courier = 'jne' } = body;

    if (!destination || !destination.provinceName) {
      return NextResponse.json(
        { error: 'Provinsi tujuan wajib diisi.' },
        { status: 400 }
      );
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'Item belanja tidak boleh kosong.' },
        { status: 400 }
      );
    }

    // 1. Tentukan wilayah gudang penangan (Pusat / Cabang Yogyakarta + Cek Stok)
    const routeResult = await determineHandlingRegion({
      destination: {
        provinceName: destination.provinceName,
        cityName: destination.cityName,
      },
      items: items.map((i: any) => ({
        productId: i.productId,
        variantId: i.variantId || i.selectedVariant?.id,
        quantity: i.quantity || 1,
      })),
    });

    const handlingRegion = routeResult.handlingRegion;
    // Asal pengiriman ditentukan dari wilayah gudang penangan (A10)
    const originId = handlingRegion.originId || '115'; // Default Depok

    // 2. Tentukan ID tujuan pengiriman (subDistrictId / cityId)
    const destinationId =
      destination.subDistrictId || destination.districtId || destination.cityId || '501';

    // 3. Hitung total berat dalam gram (Default 35 gram per varian kaus kaki)
    let totalWeightGram = 0;
    const variantIds = items.map((i: any) => i.variantId || i.selectedVariant?.id).filter(Boolean);
    const dbVariants = await prisma.productVariant.findMany({
      where: { id: { in: variantIds } },
      select: { id: true, weightGram: true },
    });
    const weightMap = new Map(dbVariants.map((v) => [v.id, v.weightGram || 35]));

    for (const item of items) {
      const vId = item.variantId || item.selectedVariant?.id;
      const weightPerItem = weightMap.get(vId) || 35;
      totalWeightGram += weightPerItem * (item.quantity || 1);
    }

    // Minimum berat ekspedisi 1000 gram (1 kg)
    const effectiveWeight = Math.max(35, totalWeightGram);

    // 4. Panggil layanan RajaOngkir
    const rates = await rajaOngkirService.calculateCost({
      originId,
      destinationId,
      weightGram: effectiveWeight,
      courier,
    });

    return NextResponse.json({
      success: true,
      originRegion: {
        id: handlingRegion.id,
        name: handlingRegion.name,
        code: handlingRegion.code,
        city: handlingRegion.city,
      },
      isFallbackToPusat: routeResult.isFallbackToPusat,
      fallbackReason: routeResult.reason,
      totalWeightGram: effectiveWeight,
      rates,
    });
  } catch (err: any) {
    console.error('[API Shipping Calculate Error]', err);
    // Graceful handling jika RajaOngkir bermasalah (E2E-14)
    return NextResponse.json(
      {
        success: false,
        error: 'Gagal menghitung ongkos kirim. Silakan periksa kembali alamat atau pilih kurir lain.',
        message: err.message,
        rates: [],
      },
      { status: 200 }
    );
  }
}
