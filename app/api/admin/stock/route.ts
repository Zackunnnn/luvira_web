// app/api/admin/stock/route.ts
// ============================================================================
// API Manajemen Stok Wilayah & Riwayat Mutasi (StockMovement)
// Sesuai docs/LUVIRA_2_PLAN.md Bagian 4 & 7 & Isolasi Wilayah
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { can } from '@/lib/permissions';
import { audit } from '@/lib/audit';
import { Role, StockMovementType } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 });
    }

    if (!can(user, 'stock:view')) {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const regionParam = searchParams.get('regionId');

    const where: any = {};
    if (user.role === Role.ADMIN_WILAYAH) {
      where.regionId = user.regionId;
    } else if (regionParam) {
      where.regionId = regionParam;
    }

    // Ambil ambang batas stok menipis dari Setting
    const thresholdSetting = await prisma.setting.findUnique({
      where: { key: 'lowStockThreshold' },
    });
    const lowStockThreshold = typeof thresholdSetting?.value === 'number' ? thresholdSetting.value : 10;

    const stocks = await prisma.stock.findMany({
      where,
      include: {
        region: { select: { id: true, name: true, code: true, type: true } },
        variant: {
          include: {
            product: { select: { id: true, name: true, slug: true, model: true } },
          },
        },
        movements: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
      orderBy: [{ regionId: 'asc' }, { variant: { name: 'asc' } }],
    });

    const mapped = stocks.map((s) => {
      const available = s.qty - s.reserved;
      return {
        id: s.id,
        variantId: s.variantId,
        variantName: s.variant.name,
        productName: s.variant.product.name,
        sku: s.variant.sku,
        imageUrl: s.variant.imageUrl,
        weightGram: s.variant.weightGram,
        regionId: s.regionId,
        regionName: s.region.name,
        regionCode: s.region.code,
        qty: s.qty,
        reserved: s.reserved,
        available,
        isLowStock: available <= lowStockThreshold,
        recentMovements: s.movements,
      };
    });

    const lowStockCount = mapped.filter((s) => s.isLowStock).length;

    return NextResponse.json({
      stocks: mapped,
      lowStockThreshold,
      summary: {
        totalItems: mapped.length,
        lowStockCount,
      },
    });
  } catch (error: any) {
    console.error('[API Admin Stock GET Error]', error);
    return NextResponse.json({ error: error.message || 'Gagal memuat data stok' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 });
    }

    const body = await request.json();
    const { variantId, regionId, qty, reason } = body;

    if (!variantId || !regionId || qty === undefined) {
      return NextResponse.json({ error: 'ID varian, ID wilayah, dan jumlah stok wajib disertakan.' }, { status: 400 });
    }

    // Otorisasi & Isolasi Wilayah
    if (!can(user, 'stock:manage', { regionId })) {
      return NextResponse.json({ error: 'Akses ditolak: Anda tidak memiliki izin mengelola stok wilayah ini.' }, { status: 403 });
    }

    const newQty = Math.max(0, parseInt(qty, 10));

    // Cari atau buat record Stock jika belum ada
    let stock = await prisma.stock.findUnique({
      where: {
        variantId_regionId: { variantId, regionId },
      },
    });

    const previousQty = stock ? stock.qty : 0;
    const qtyChange = newQty - previousQty;

    const result = await prisma.$transaction(async (tx) => {
      if (!stock) {
        stock = await tx.stock.create({
          data: {
            variantId,
            regionId,
            qty: newQty,
            reserved: 0,
          },
        });
      } else {
        stock = await tx.stock.update({
          where: { id: stock.id },
          data: { qty: newQty },
        });
      }

      // Catat mutasi StockMovement
      await tx.stockMovement.create({
        data: {
          stockId: stock.id,
          type: StockMovementType.ADJUSTMENT,
          qtyChange,
          balanceAfter: newQty,
          reason: reason?.trim() || 'Penyesuaian stok manual oleh Admin.',
          actorId: user.id,
        },
      });

      return stock;
    });

    await audit({
      actor: { id: user.id, name: user.name, role: user.role },
      action: 'ADJUST_STOCK',
      entity: 'Stock',
      entityId: result.id,
      before: { qty: previousQty },
      after: { qty: newQty, reason },
    });

    return NextResponse.json({
      success: true,
      message: `Stok berhasil diperbarui menjadi ${newQty} pasang.`,
      stock: result,
    });
  } catch (error: any) {
    console.error('[API Admin Stock PUT Error]', error);
    return NextResponse.json({ error: error.message || 'Gagal mengubah stok' }, { status: 500 });
  }
}
