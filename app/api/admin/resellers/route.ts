// app/api/admin/resellers/route.ts
// ============================================================================
// API Kelola Akun Reseller (FT-0, Asumsi F4, F7, F8)
// Hanya dapat diakses oleh Owner dan Admin Pusat (izin reseller:manage)
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { can } from '@/lib/permissions';
import { audit } from '@/lib/audit';
import { Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 });
    }

    const canManage = can(user, 'reseller:manage', { targetRole: Role.RESELLER });
    const canViewMasked = can(user, 'reseller:view_list_masked');
    if (!canManage && !canViewMasked) {
      return NextResponse.json({ error: 'Akses ditolak: Anda tidak memiliki izin melihat daftar reseller.' }, { status: 403 });
    }

    const resellers = await prisma.user.findMany({
      where: { role: Role.RESELLER },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        regionId: true,
        isActive: true,
        createdAt: true,
        lastLoginAt: true,
        region: {
          select: { id: true, name: true, code: true },
        },
        resellerPromos: {
          select: { id: true, code: true, discountType: true, discountValue: true, isActive: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const regions = await prisma.region.findMany({
      where: { isActive: true },
      select: { id: true, name: true, code: true, type: true },
      orderBy: { name: 'asc' },
    });

    let outputResellers = resellers;
    if (user.role === Role.LUVIBOT) {
      outputResellers = resellers.map((r: any) => ({
        ...r,
        name: r.name ? `${r.name[0]}*** ${r.name.split(' ').slice(-1)[0]?.[0] || ''}***` : 'R***',
        phone: r.phone ? `••••${r.phone.slice(-4)}` : '••••',
        email: r.email ? `${r.email[0]}***@***` : '***@***',
      }));
    }

    return NextResponse.json({ resellers: outputResellers, regions });
  } catch (error: any) {
    console.error('[API Admin Resellers GET Error]', error);
    return NextResponse.json({ error: error.message || 'Gagal memuat daftar reseller' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 });
    }

    if (!can(user, 'reseller:manage', { targetRole: Role.RESELLER })) {
      return NextResponse.json({ error: 'Akses ditolak: Anda tidak memiliki izin mengelola reseller.' }, { status: 403 });
    }

    const body = await request.json();
    const { name, email, password, phone, regionId } = body;

    if (!name?.trim() || !email?.trim() || !password) {
      return NextResponse.json({ error: 'Nama, email, dan kata sandi wajib diisi.' }, { status: 400 });
    }

    // Normalisasi nomor telepon ke format 62...
    let cleanPhone = (phone || '').replace(/[^0-9]/g, '');
    if (cleanPhone.startsWith('0')) {
      cleanPhone = '62' + cleanPhone.slice(1);
    } else if (cleanPhone.startsWith('+62')) {
      cleanPhone = cleanPhone.slice(1);
    }

    // Default wilayah pemenuhan reseller = Pusat bila tidak diisi (F7)
    let targetRegionId = regionId;
    if (!targetRegionId) {
      const pusatRegion = await prisma.region.findFirst({
        where: { type: 'PUSAT', isActive: true },
      });
      targetRegionId = pusatRegion?.id || null;
    }

    const cleanEmail = email.trim().toLowerCase();
    const existing = await prisma.user.findUnique({ where: { email: cleanEmail } });
    if (existing) {
      return NextResponse.json({ error: `Pengguna dengan email "${cleanEmail}" sudah terdaftar.` }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const newReseller = await prisma.user.create({
      data: {
        name: name.trim(),
        email: cleanEmail,
        passwordHash,
        phone: cleanPhone || null,
        role: Role.RESELLER,
        regionId: targetRegionId,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        regionId: true,
        isActive: true,
        createdAt: true,
      },
    });

    await audit({
      actor: { id: user.id, name: user.name, role: user.role },
      action: 'CREATE_RESELLER',
      entity: 'User',
      entityId: newReseller.id,
      after: { name: newReseller.name, email: newReseller.email, regionId: targetRegionId, phone: cleanPhone },
    });

    return NextResponse.json({
      success: true,
      message: `Akun Reseller "${newReseller.name}" berhasil dibuat.`,
      reseller: newReseller,
    });
  } catch (error: any) {
    console.error('[API Admin Resellers POST Error]', error);
    return NextResponse.json({ error: error.message || 'Gagal membuat akun reseller' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 });
    }

    if (!can(user, 'reseller:manage', { targetRole: Role.RESELLER })) {
      return NextResponse.json({ error: 'Akses ditolak: Anda tidak memiliki izin mengelola reseller.' }, { status: 403 });
    }

    const body = await request.json();
    const { id, isActive, regionId, name, phone, password } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID reseller wajib disertakan.' }, { status: 400 });
    }

    const targetUser = await prisma.user.findUnique({ where: { id } });
    if (!targetUser) {
      return NextResponse.json({ error: 'Akun reseller tidak ditemukan.' }, { status: 404 });
    }

    if (targetUser.role !== Role.RESELLER) {
      return NextResponse.json({ error: 'Akses ditolak: Endpoint ini khusus akun Reseller.' }, { status: 403 });
    }

    const updateData: any = {};
    if (isActive !== undefined) updateData.isActive = Boolean(isActive);
    if (regionId) updateData.regionId = regionId;
    if (name) updateData.name = name.trim();
    if (phone !== undefined) {
      let cleanPhone = (phone || '').replace(/[^0-9]/g, '');
      if (cleanPhone.startsWith('0')) cleanPhone = '62' + cleanPhone.slice(1);
      updateData.phone = cleanPhone || null;
    }
    if (password && password.length >= 8) {
      updateData.passwordHash = await bcrypt.hash(password, 10);
    }

    const updated = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        regionId: true,
        isActive: true,
      },
    });

    await audit({
      actor: { id: user.id, name: user.name, role: user.role },
      action: 'UPDATE_RESELLER',
      entity: 'User',
      entityId: id,
      before: { isActive: targetUser.isActive, regionId: targetUser.regionId, phone: targetUser.phone },
      after: { isActive: updated.isActive, regionId: updated.regionId, phone: updated.phone },
    });

    return NextResponse.json({
      success: true,
      message: `Akun reseller "${updated.name}" berhasil diperbarui.`,
      reseller: updated,
    });
  } catch (error: any) {
    console.error('[API Admin Resellers PUT Error]', error);
    return NextResponse.json({ error: error.message || 'Gagal memperbarui akun reseller' }, { status: 500 });
  }
}
