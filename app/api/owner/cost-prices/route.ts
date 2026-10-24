// app/api/owner/cost-prices/route.ts
// ============================================================================
// API Manajemen Harga Modal (HPP) & Biaya Kemasan (Khusus Owner)
// Sesuai docs/LUVIRA_2_PLAN.md Bagian 4 & 7
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { can } from '@/lib/permissions';
import { audit } from '@/lib/audit';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 });
    }

    if (!can(user, 'cost_price:view')) {
      return NextResponse.json({ error: 'Akses ditolak: Hanya Owner yang berhak melihat harga modal (HPP).' }, { status: 403 });
    }

    const variants = await prisma.productVariant.findMany({
      include: {
        product: { select: { id: true, name: true, model: true, price: true } },
        cost: true,
      },
      orderBy: [{ product: { name: 'asc' } }, { name: 'asc' }],
    });

    const mapped = variants.map((v) => ({
      variantId: v.id,
      variantName: v.name,
      productId: v.productId,
      productName: v.product.name,
      sellingPrice: v.product.price,
      sku: v.sku,
      imageUrl: v.imageUrl,
      costPrice: v.cost?.costPrice || 0,
      packingCost: v.cost?.packingCost || 0,
      totalCost: (v.cost?.costPrice || 0) + (v.cost?.packingCost || 0),
      grossMargin: v.product.price - ((v.cost?.costPrice || 0) + (v.cost?.packingCost || 0)),
    }));

    return NextResponse.json({ costPrices: mapped });
  } catch (error: any) {
    console.error('[API Owner Cost Prices GET Error]', error);
    return NextResponse.json({ error: error.message || 'Gagal memuat harga modal' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 });
    }

    if (!can(user, 'cost_price:manage')) {
      return NextResponse.json({ error: 'Akses ditolak: Hanya Owner yang dapat mengelola harga modal (HPP).' }, { status: 403 });
    }

    const body = await request.json();
    const { items } = body; // Array of { variantId, costPrice, packingCost }

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Daftar harga modal varian wajib disertakan.' }, { status: 400 });
    }

    await prisma.$transaction(async (tx) => {
      for (const item of items) {
        if (!item.variantId) continue;
        const costPrice = Math.max(0, parseInt(item.costPrice || '0', 10));
        const packingCost = Math.max(0, parseInt(item.packingCost || '0', 10));

        await tx.productCost.upsert({
          where: { variantId: item.variantId },
          update: { costPrice, packingCost },
          create: { variantId: item.variantId, costPrice, packingCost },
        });
      }
    });

    await audit({
      actor: { id: user.id, name: user.name, role: user.role },
      action: 'UPDATE_COST_PRICES',
      entity: 'ProductCost',
      after: { updatedItemsCount: items.length },
    });

    return NextResponse.json({
      success: true,
      message: `Harga modal untuk ${items.length} varian berhasil diperbarui.`,
    });
  } catch (error: any) {
    console.error('[API Owner Cost Prices PUT Error]', error);
    return NextResponse.json({ error: error.message || 'Gagal menyimpan harga modal' }, { status: 500 });
  }
}
