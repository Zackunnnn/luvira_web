// app/api/admin/promos/assign-reseller/route.ts
// ============================================================================
// API Penautan Kode Promo ke Reseller (FT-0, Asumsi F8)
// Satu kode maksimal satu reseller, satu reseller boleh banyak kode
// Izin: promo:assign_reseller (Owner, Admin Pusat)
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { can } from '@/lib/permissions';
import { audit } from '@/lib/audit';
import { Role } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 });
    }

    if (!can(user, 'promo:assign_reseller')) {
      return NextResponse.json({ error: 'Akses ditolak: Hanya Owner dan Admin Pusat yang dapat menautkan kode promo ke reseller.' }, { status: 403 });
    }

    const body = await request.json();
    const { promoId, promoCode, resellerId } = body;

    if (!promoId && !promoCode) {
      return NextResponse.json({ error: 'ID atau kode promo wajib disertakan.' }, { status: 400 });
    }

    // Cari kode promo
    const promo = await prisma.promoCode.findFirst({
      where: promoId ? { id: promoId } : { code: (promoCode || '').trim().toUpperCase() },
    });

    if (!promo) {
      return NextResponse.json({ error: 'Kode promo tidak ditemukan.' }, { status: 404 });
    }

    // Jika resellerId null atau empty string, lepaskan tautan
    let targetReseller: any = null;
    if (resellerId) {
      targetReseller = await prisma.user.findUnique({
        where: { id: resellerId },
        select: { id: true, name: true, email: true, role: true, isActive: true },
      });

      if (!targetReseller || targetReseller.role !== Role.RESELLER) {
        return NextResponse.json({ error: 'Reseller tujuan tidak valid atau bukan akun Reseller.' }, { status: 400 });
      }
    }

    const updatedPromo = await prisma.promoCode.update({
      where: { id: promo.id },
      data: {
        resellerId: targetReseller ? targetReseller.id : null,
      },
      include: {
        reseller: {
          select: { id: true, name: true, email: true, phone: true },
        },
      },
    });

    await audit({
      actor: { id: user.id, name: user.name, role: user.role },
      action: 'ASSIGN_PROMO_RESELLER',
      entity: 'PromoCode',
      entityId: promo.id,
      before: { resellerId: promo.resellerId },
      after: { resellerId: targetReseller ? targetReseller.id : null, resellerName: targetReseller?.name },
    });

    return NextResponse.json({
      success: true,
      message: targetReseller
        ? `Kode promo "${promo.code}" berhasil ditautkan ke Reseller ${targetReseller.name}.`
        : `Tautan kode promo "${promo.code}" berhasil dicabut.`,
      promo: updatedPromo,
    });
  } catch (error: any) {
    console.error('[API Assign Promo Reseller Error]', error);
    return NextResponse.json({ error: error.message || 'Gagal menautkan kode promo ke reseller' }, { status: 500 });
  }
}
