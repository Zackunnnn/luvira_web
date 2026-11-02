// app/api/admin/promos/route.ts
// ============================================================================
// API Manajemen Kode Promo (Reseller & Wilayah)
// Sesuai docs/LUVIRA_2_PLAN.md Bagian 4 & 5.2 (Asumsi A4)
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { can } from '@/lib/permissions';
import { audit } from '@/lib/audit';
import { PromoType, DiscountType, Role } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 });
    }

    if (!can(user, 'promo:view')) {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const regionParam = searchParams.get('regionId');

    const where: any = {};
    if (user.role === Role.ADMIN_WILAYAH) {
      // Admin Wilayah melihat promo nasional dan promo khusus wilayahnya
      where.OR = [
        { type: PromoType.RESELLER },
        { regionId: user.regionId },
      ];
    } else if (regionParam) {
      where.regionId = regionParam;
    }

    const promos = await prisma.promoCode.findMany({
      where,
      include: {
        region: { select: { id: true, name: true, code: true } },
        _count: { select: { orders: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const thresholdSetting = await prisma.setting.findUnique({
      where: { key: 'maxDiscountPercent' },
    });
    const maxDiscountPercent = typeof thresholdSetting?.value === 'number' ? thresholdSetting.value : 50;

    return NextResponse.json({
      promos,
      maxDiscountPercent,
    });
  } catch (error: any) {
    console.error('[API Admin Promos GET Error]', error);
    return NextResponse.json({ error: error.message || 'Gagal memuat kode promo' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 });
    }

    const body = await request.json();
    const {
      code,
      type,
      kind,
      regionId,
      discountType,
      discountValue,
      maxDiscountAmount,
      minOrderAmount,
      quota,
      expiresAt,
      resellerName,
      resellerWaNumber,
    } = body;

    const effectiveQuota = quota !== undefined ? quota : body.maxUses;
    const isTestingKind = kind === 'TESTING';

    if (isTestingKind) {
      // 1. Khusus Owner (promo:test_manage)
      if (!can(user, 'promo:test_manage')) {
        return NextResponse.json(
          { error: 'Akses ditolak: Hanya Owner yang dapat membuat kode promo uji (TESTING).' },
          { status: 403 }
        );
      }

      // 2. Setting testPromoEnabled
      const testSetting = await prisma.setting.findUnique({ where: { key: 'testPromoEnabled' } });
      const isTestPromoActive = testSetting ? Boolean(testSetting.value) : (process.env.TEST_PROMO_DEFAULT_ENABLED === 'true' || process.env.NODE_ENV !== 'production');
      if (!isTestPromoActive) {
        return NextResponse.json(
          { error: 'Fitur kode promo uji (TESTING) sedang dinonaktifkan di pengaturan sistem.' },
          { status: 400 }
        );
      }

      // 3. Wajib masa berlaku maksimal 7 hari
      if (!expiresAt) {
        return NextResponse.json(
          { error: 'Kode promo uji wajib menyertakan tanggal kedaluwarsa (maksimal 7 hari).' },
          { status: 400 }
        );
      }
      const expDate = new Date(expiresAt);
      const maxExpDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 60000);
      if (expDate > maxExpDate || expDate <= new Date()) {
        return NextResponse.json(
          { error: 'Masa berlaku kode promo uji tidak boleh lebih dari 7 hari dari sekarang.' },
          { status: 400 }
        );
      }

      // 4. Kuota kecil maksimal 20
      const testQuota = effectiveQuota !== undefined ? parseInt(effectiveQuota, 10) : 20;
      if (testQuota <= 0 || testQuota > 20) {
        return NextResponse.json(
          { error: 'Kuota kode promo uji maksimal 20 pemakaian.' },
          { status: 400 }
        );
      }
    }

    if (!code?.trim() || !discountType || discountValue === undefined) {
      return NextResponse.json({ error: 'Kode, tipe diskon, dan nilai diskon wajib diisi.' }, { status: 400 });
    }

    const cleanCode = code.trim().toUpperCase();

    // Cek duplikasi kode
    const existing = await prisma.promoCode.findUnique({ where: { code: cleanCode } });
    if (existing) {
      return NextResponse.json({ error: `Kode promo "${cleanCode}" sudah digunakan.` }, { status: 400 });
    }

    const promoType = type === 'WILAYAH' ? PromoType.WILAYAH : PromoType.RESELLER;
    const targetRegionId = promoType === PromoType.WILAYAH ? (regionId || user.regionId) : null;

    // Validasi Otorisasi
    if (promoType === PromoType.RESELLER) {
      if (!can(user, 'promo_reseller:manage')) {
        return NextResponse.json({ error: 'Akses ditolak: Hanya Admin Pusat dan Owner yang dapat membuat promo reseller.' }, { status: 403 });
      }
    } else {
      if (!can(user, 'promo_region:manage', { regionId: targetRegionId })) {
        return NextResponse.json({ error: 'Akses ditolak: Anda hanya dapat membuat promo untuk wilayah wewenang Anda.' }, { status: 403 });
      }
    }

    // Validasi batas diskon dari Setting (Asumsi A4)
    const thresholdSetting = await prisma.setting.findUnique({
      where: { key: 'maxDiscountPercent' },
    });
    const maxDiscountPercent = typeof thresholdSetting?.value === 'number' ? thresholdSetting.value : 50;

    const val = parseInt(discountValue, 10);
    if (discountType === DiscountType.PERCENTAGE && val > maxDiscountPercent) {
      return NextResponse.json({
        error: `Diskon persentase (${val}%) melebihi batas maksimum yang diizinkan sistem (${maxDiscountPercent}%).`,
      }, { status: 400 });
    }

    const newPromo = await prisma.promoCode.create({
      data: {
        code: cleanCode,
        type: promoType,
        regionId: targetRegionId,
        discountType: discountType as DiscountType,
        discountValue: val,
        maxDiscountAmount: maxDiscountAmount ? parseInt(maxDiscountAmount, 10) : null,
        minOrderAmount: minOrderAmount ? Math.max(0, parseInt(minOrderAmount, 10)) : 0,
        quota: effectiveQuota !== undefined ? Math.max(0, parseInt(effectiveQuota, 10)) : 100,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        resellerName: resellerName?.trim() || null,
        resellerWaNumber: resellerWaNumber?.trim() || null,
        kind: isTestingKind ? ('TESTING' as any) : ('REGULAR' as any),
        createdById: user.id,
      },
    });

    await audit({
      actor: { id: user.id, name: user.name, role: user.role },
      action: 'CREATE_PROMO',
      entity: 'PromoCode',
      entityId: newPromo.id,
      after: { code: cleanCode, type: promoType, discountType, discountValue: val },
    });

    return NextResponse.json({
      success: true,
      message: `Kode promo "${cleanCode}" berhasil dibuat.`,
      promo: newPromo,
    }, { status: 201 });
  } catch (error: any) {
    console.error('[API Admin Promos POST Error]', error);
    return NextResponse.json({ error: error.message || 'Gagal membuat kode promo' }, { status: 500 });
  }
}
