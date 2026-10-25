// app/api/admin/locations/route.ts
// ============================================================================
// API Manajemen Lokasi & Titik Asal RajaOngkir
// Sesuai docs/LUVIRA_2_PLAN.md Bagian 4 & 5.1
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { can } from '@/lib/permissions';
import { audit } from '@/lib/audit';
import { Role } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 });
    }

    const where: any = {};
    if (user.role === Role.ADMIN_WILAYAH) {
      where.id = user.regionId;
    }

    const regions = await prisma.region.findMany({
      where,
      include: {
        coverages: true,
      },
      orderBy: { type: 'asc' },
    });

    return NextResponse.json({ regions });
  } catch (error: any) {
    console.error('[API Admin Locations GET Error]', error);
    return NextResponse.json({ error: error.message || 'Gagal memuat data wilayah' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 });
    }

    const body = await request.json();
    const { id, address, phone, email, originId, postalCode, district, subDistrict } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID wilayah wajib disertakan.' }, { status: 400 });
    }

    // Otorisasi & Isolasi Wilayah
    if (!can(user, 'location:manage', { regionId: id })) {
      return NextResponse.json({ error: 'Akses ditolak: Anda hanya berhak mengelola wilayah Anda sendiri.' }, { status: 403 });
    }

    const targetRegion = await prisma.region.findUnique({ where: { id } });
    if (!targetRegion) {
      return NextResponse.json({ error: 'Wilayah tidak ditemukan.' }, { status: 404 });
    }

    const updateData: any = {};
    if (address !== undefined) updateData.address = address.trim();
    if (phone !== undefined) updateData.phone = phone.trim();
    if (email !== undefined) updateData.email = email.trim();
    if (originId !== undefined) updateData.originId = originId.trim();
    if (postalCode !== undefined) updateData.postalCode = postalCode.trim();
    if (district !== undefined) updateData.district = district.trim();
    if (subDistrict !== undefined) updateData.subDistrict = subDistrict.trim();

    const updated = await prisma.region.update({
      where: { id },
      data: updateData,
    });

    await audit({
      actor: { id: user.id, name: user.name, role: user.role },
      action: 'UPDATE_REGION',
      entity: 'Region',
      entityId: id,
      before: { address: targetRegion.address, originId: targetRegion.originId, phone: targetRegion.phone },
      after: { address: updated.address, originId: updated.originId, phone: updated.phone },
    });

    return NextResponse.json({
      success: true,
      message: `Profil wilayah "${updated.name}" berhasil diperbarui.`,
      region: updated,
    });
  } catch (error: any) {
    console.error('[API Admin Locations PUT Error]', error);
    return NextResponse.json({ error: error.message || 'Gagal memperbarui profil wilayah' }, { status: 500 });
  }
}
