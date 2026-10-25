// app/api/owner/coverage/route.ts
// ============================================================================
// API Manajemen Cakupan Layanan Wilayah (Provinsi / Kota -> Wilayah)
// Sesuai docs/LUVIRA_2_PLAN.md Bagian 4 & 5.1 & E2E-10
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { can } from '@/lib/permissions';
import { audit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 });
    }

    if (!can(user, 'coverage:manage')) {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
    }

    const coverages = await prisma.regionCoverage.findMany({
      include: {
        region: { select: { id: true, name: true, code: true, type: true } },
      },
      orderBy: [{ regionId: 'asc' }, { provinceName: 'asc' }],
    });

    const regions = await prisma.region.findMany({
      where: { isActive: true },
      select: { id: true, name: true, code: true, type: true },
    });

    return NextResponse.json({ coverages, regions });
  } catch (error: any) {
    console.error('[API Owner Coverage GET Error]', error);
    return NextResponse.json({ error: error.message || 'Gagal memuat cakupan wilayah' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 });
    }

    if (!can(user, 'coverage:manage')) {
      return NextResponse.json({ error: 'Akses ditolak: Hanya Owner yang dapat mengelola cakupan wilayah.' }, { status: 403 });
    }

    const body = await request.json();
    const { regionId, provinceName, provinceId, cityName, cityId, isDefault } = body;

    if (!regionId || !provinceName?.trim()) {
      return NextResponse.json({ error: 'Wilayah tujuan dan nama provinsi wajib diisi.' }, { status: 400 });
    }

    const newCoverage = await prisma.regionCoverage.create({
      data: {
        regionId,
        provinceName: provinceName.trim(),
        provinceId: provinceId || null,
        cityName: cityName?.trim() || null,
        cityId: cityId || null,
        isDefault: Boolean(isDefault),
      },
      include: { region: true },
    });

    await audit({
      actor: { id: user.id, name: user.name, role: user.role },
      action: 'CREATE_REGION_COVERAGE',
      entity: 'RegionCoverage',
      entityId: newCoverage.id,
      after: { regionId, provinceName, cityName },
    });

    return NextResponse.json({
      success: true,
      message: `Cakupan "${provinceName}" berhasil ditetapkan ke ${newCoverage.region.name}.`,
      coverage: newCoverage,
    });
  } catch (error: any) {
    console.error('[API Owner Coverage POST Error]', error);
    return NextResponse.json({ error: error.message || 'Gagal menambahkan cakupan wilayah' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 });
    }

    if (!can(user, 'coverage:manage')) {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID cakupan wajib disertakan' }, { status: 400 });
    }

    const existing = await prisma.regionCoverage.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Cakupan tidak ditemukan' }, { status: 404 });
    }

    await prisma.regionCoverage.delete({ where: { id } });

    await audit({
      actor: { id: user.id, name: user.name, role: user.role },
      action: 'DELETE_REGION_COVERAGE',
      entity: 'RegionCoverage',
      entityId: id,
      before: { provinceName: existing.provinceName, cityName: existing.cityName },
    });

    return NextResponse.json({ success: true, message: 'Cakupan wilayah berhasil dihapus.' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Gagal menghapus cakupan wilayah' }, { status: 500 });
  }
}
