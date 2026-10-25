// app/api/admin/pricing/route.ts
// ============================================================================
// API Perubahan Harga Jual Seragam (Admin Pusat & Owner)
// Sesuai docs/LUVIRA_2_PLAN.md Bagian 4 & E2E-08
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { can } from '@/lib/permissions';
import { audit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function PUT(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 });
    }

    if (!can(user, 'price:manage')) {
      return NextResponse.json({ error: 'Akses ditolak: Hanya Admin Pusat dan Owner yang dapat mengubah harga jual seragam.' }, { status: 403 });
    }

    const body = await request.json();
    const { productId, price, originalPrice } = body;

    if (!productId || price === undefined) {
      return NextResponse.json({ error: 'ID produk dan harga jual baru wajib disertakan.' }, { status: 400 });
    }

    const newPrice = Math.max(0, parseInt(price, 10));
    const newOriginalPrice = originalPrice !== undefined ? (originalPrice ? Math.max(0, parseInt(originalPrice, 10)) : null) : undefined;

    const existingProduct = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!existingProduct) {
      return NextResponse.json({ error: 'Produk tidak ditemukan.' }, { status: 404 });
    }

    const updateData: any = { price: newPrice };
    if (newOriginalPrice !== undefined) updateData.originalPrice = newOriginalPrice;

    const updated = await prisma.product.update({
      where: { id: productId },
      data: updateData,
    });

    await audit({
      actor: { id: user.id, name: user.name, role: user.role },
      action: 'UPDATE_UNIFORM_PRICE',
      entity: 'Product',
      entityId: productId,
      before: { price: existingProduct.price, originalPrice: existingProduct.originalPrice },
      after: { price: updated.price, originalPrice: updated.originalPrice },
    });

    return NextResponse.json({
      success: true,
      message: `Harga jual seragam produk "${updated.name}" berhasil diubah menjadi Rp ${updated.price.toLocaleString('id-ID')}.`,
      product: updated,
    });
  } catch (error: any) {
    console.error('[API Pricing PUT Error]', error);
    return NextResponse.json({ error: error.message || 'Gagal mengubah harga produk' }, { status: 500 });
  }
}
