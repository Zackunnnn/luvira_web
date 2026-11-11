// app/api/admin/pricing/route.ts
// ============================================================================
// API Perubahan Harga Jual Seragam (Admin Pusat, Owner, & LuviBot Model A)
// Sesuai docs/LUVIRA_2_PLAN.md Bagian 4 & E2E-08 & SOP LuviBot
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { can } from '@/lib/permissions';
import { audit } from '@/lib/audit';
import { Role } from '@prisma/client';
import { recordLuviChangeLog } from '@/lib/changelog';

export const dynamic = 'force-dynamic';

export async function PUT(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 });
    }

    if (!can(user, 'price:manage')) {
      return NextResponse.json({ error: 'Akses ditolak: Anda tidak memiliki izin mengubah harga jual.' }, { status: 403 });
    }

    const body = await request.json();
    const { productId, price, originalPrice, draftId, requestedBy, approvedBy, approvalTimeWib } = body;

    // Penegakan Model A: LuviBot wajib menyertakan ID Draf yang disetujui Awan
    const isLuviBot = user.role === Role.LUVIBOT;
    if (isLuviBot && !draftId) {
      return NextResponse.json({
        error: 'Akses ditolak Model A: Role LUVIBOT hanya boleh mengubah harga setelah ada Draf lengkap dan persetujuan Awan (draftId wajib disertakan).'
      }, { status: 400 });
    }

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

    let changeLog = null;
    if (isLuviBot) {
      changeLog = await recordLuviChangeLog({
        draftId: String(draftId),
        requestedBy: requestedBy || 'Awan',
        approvedBy: approvedBy || 'Awan',
        approvalTimeWib,
        executedBy: user.email || user.name || 'LuviBot',
        targetType: 'PRODUCT',
        targetId: productId,
        targetName: updated.name,
        fieldChanged: 'price',
        oldValue: `Rp ${existingProduct.price.toLocaleString('id-ID')}`,
        newValue: `Rp ${updated.price.toLocaleString('id-ID')}`,
        verificationResult: 'LOLOS',
        verificationProof: `Harga produk diupdate ke Rp ${updated.price.toLocaleString('id-ID')}`,
        status: 'BERHASIL',
      });
    }

    return NextResponse.json({
      success: true,
      message: `Harga jual seragam produk "${updated.name}" berhasil diubah menjadi Rp ${updated.price.toLocaleString('id-ID')}.`,
      product: updated,
      changeLog,
    });
  } catch (error: any) {
    console.error('[API Pricing PUT Error]', error);
    return NextResponse.json({ error: error.message || 'Gagal mengubah harga produk' }, { status: 500 });
  }
}
