// app/api/admin/users/route.ts
// ============================================================================
// API Kelola Akun Admin Wilayah oleh Admin Pusat (Asumsi A2)
// DILARANG menyentuh akun Owner, Developer, atau Admin Pusat lain
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

    if (!can(user, 'users:manage_regional_admin')) {
      return NextResponse.json({ error: 'Akses ditolak: Hanya Admin Pusat dan Owner yang dapat melihat daftar admin.' }, { status: 403 });
    }

    // Admin Pusat hanya boleh melihat akun Admin Wilayah
    const where: any = { role: Role.ADMIN_WILAYAH };

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        regionId: true,
        phone: true,
        isActive: true,
        createdAt: true,
        lastLoginAt: true,
        region: {
          select: { id: true, name: true, code: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const regions = await prisma.region.findMany({
      where: { type: 'WILAYAH', isActive: true },
      select: { id: true, name: true, code: true },
    });

    return NextResponse.json({ users, regions });
  } catch (error: any) {
    console.error('[API Admin Users GET Error]', error);
    return NextResponse.json({ error: error.message || 'Gagal memuat daftar admin' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 });
    }

    const body = await request.json();
    const { name, email, password, regionId, targetRole } = body;

    const assignedRole = targetRole || Role.ADMIN_WILAYAH;

    // Asumsi A2 & Matriks: Admin Pusat HANYA boleh membuat/mengelola ADMIN_WILAYAH
    if (user.role === Role.ADMIN_PUSAT && assignedRole !== Role.ADMIN_WILAYAH) {
      return NextResponse.json({ error: 'Akses ditolak: Admin Pusat hanya berhak membuat akun Admin Wilayah.' }, { status: 403 });
    }

    if (!can(user, 'users:manage_regional_admin', { targetRole: assignedRole })) {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
    }

    if (!name?.trim() || !email?.trim() || !password || !regionId) {
      return NextResponse.json({ error: 'Nama, email, kata sandi, dan wilayah wajib diisi.' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    const existing = await prisma.user.findUnique({ where: { email: cleanEmail } });
    if (existing) {
      return NextResponse.json({ error: `Pengguna dengan email "${cleanEmail}" sudah terdaftar.` }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: {
        name: name.trim(),
        email: cleanEmail,
        passwordHash,
        role: Role.ADMIN_WILAYAH,
        regionId,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        regionId: true,
        isActive: true,
      },
    });

    await audit({
      actor: { id: user.id, name: user.name, role: user.role },
      action: 'CREATE_REGIONAL_ADMIN',
      entity: 'User',
      entityId: newUser.id,
      after: { name: newUser.name, email: newUser.email, regionId },
    });

    return NextResponse.json({
      success: true,
      message: `Akun Admin Wilayah untuk ${newUser.name} berhasil dibuat.`,
      user: newUser,
    });
  } catch (error: any) {
    console.error('[API Admin Users POST Error]', error);
    return NextResponse.json({ error: error.message || 'Gagal membuat akun admin' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 });
    }

    const body = await request.json();
    const { id, isActive, regionId, name, password } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID pengguna wajib disertakan' }, { status: 400 });
    }

    const targetUser = await prisma.user.findUnique({ where: { id } });
    if (!targetUser) {
      return NextResponse.json({ error: 'Pengguna tidak ditemukan' }, { status: 404 });
    }

    // Asumsi A2 & Matriks: Dilarang menyentuh Owner, Developer, atau Admin Pusat lain
    if (targetUser.role !== Role.ADMIN_WILAYAH) {
      return NextResponse.json({ error: 'Akses ditolak: Admin Pusat tidak dapat memodifikasi akun peran ini.' }, { status: 403 });
    }

    if (!can(user, 'users:manage_regional_admin', { targetRole: targetUser.role })) {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
    }

    const updateData: any = {};
    if (isActive !== undefined) updateData.isActive = Boolean(isActive);
    if (regionId) updateData.regionId = regionId;
    if (name) updateData.name = name.trim();
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
        role: true,
        regionId: true,
        isActive: true,
      },
    });

    await audit({
      actor: { id: user.id, name: user.name, role: user.role },
      action: 'UPDATE_REGIONAL_ADMIN',
      entity: 'User',
      entityId: id,
      before: { isActive: targetUser.isActive, regionId: targetUser.regionId },
      after: { isActive: updated.isActive, regionId: updated.regionId },
    });

    return NextResponse.json({
      success: true,
      message: `Data akun ${updated.name} berhasil diperbarui.`,
      user: updated,
    });
  } catch (error: any) {
    console.error('[API Admin Users PUT Error]', error);
    return NextResponse.json({ error: error.message || 'Gagal memperbarui akun admin' }, { status: 500 });
  }
}
