// app/api/owner/users/route.ts
// ============================================================================
// API Kelola Seluruh Admin oleh Owner (Admin Pusat & Admin Wilayah)
// Sesuai docs/LUVIRA_2_PLAN.md Bagian 4 & E2E-10
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

    if (!can(user, 'users:manage_all_admins')) {
      return NextResponse.json({ error: 'Akses ditolak: Hanya Owner yang dapat mengelola seluruh akun admin.' }, { status: 403 });
    }

    const users = await prisma.user.findMany({
      where: {
        role: { in: [Role.ADMIN_PUSAT, Role.ADMIN_WILAYAH] },
      },
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
      orderBy: [{ role: 'asc' }, { createdAt: 'desc' }],
    });

    const regions = await prisma.region.findMany({
      where: { isActive: true },
      select: { id: true, name: true, code: true, type: true },
    });

    return NextResponse.json({ users, regions });
  } catch (error: any) {
    console.error('[API Owner Users GET Error]', error);
    return NextResponse.json({ error: error.message || 'Gagal memuat akun admin' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 });
    }

    if (!can(user, 'users:manage_all_admins')) {
      return NextResponse.json({ error: 'Akses ditolak: Hanya Owner yang dapat membuat akun admin.' }, { status: 403 });
    }

    const body = await request.json();
    const { name, email, password, role, regionId } = body;

    if (!name?.trim() || !email?.trim() || !password || !role) {
      return NextResponse.json({ error: 'Nama, email, kata sandi, dan peran wajib disertakan.' }, { status: 400 });
    }

    if (role !== Role.ADMIN_PUSAT && role !== Role.ADMIN_WILAYAH) {
      return NextResponse.json({ error: 'Peran tidak valid (pilih ADMIN_PUSAT atau ADMIN_WILAYAH).' }, { status: 400 });
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
        role,
        regionId: regionId || null,
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
      action: 'CREATE_ADMIN_ACCOUNT',
      entity: 'User',
      entityId: newUser.id,
      after: { name: newUser.name, email: newUser.email, role, regionId },
    });

    return NextResponse.json({
      success: true,
      message: `Akun ${role} untuk ${newUser.name} berhasil dibuat.`,
      user: newUser,
    });
  } catch (error: any) {
    console.error('[API Owner Users POST Error]', error);
    return NextResponse.json({ error: error.message || 'Gagal membuat akun admin' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 });
    }

    if (!can(user, 'users:manage_all_admins')) {
      return NextResponse.json({ error: 'Akses ditolak: Hanya Owner yang dapat mengedit akun admin.' }, { status: 403 });
    }

    const body = await request.json();
    const { id, isActive, regionId, name, password, role } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID pengguna wajib disertakan' }, { status: 400 });
    }

    const targetUser = await prisma.user.findUnique({ where: { id } });
    if (!targetUser) {
      return NextResponse.json({ error: 'Pengguna tidak ditemukan' }, { status: 404 });
    }

    const updateData: any = {};
    if (isActive !== undefined) updateData.isActive = Boolean(isActive);
    if (regionId !== undefined) updateData.regionId = regionId;
    if (name) updateData.name = name.trim();
    if (role && (role === Role.ADMIN_PUSAT || role === Role.ADMIN_WILAYAH)) {
      updateData.role = role;
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
        role: true,
        regionId: true,
        isActive: true,
      },
    });

    await audit({
      actor: { id: user.id, name: user.name, role: user.role },
      action: 'UPDATE_ADMIN_ACCOUNT',
      entity: 'User',
      entityId: id,
      before: { isActive: targetUser.isActive, role: targetUser.role, regionId: targetUser.regionId },
      after: { isActive: updated.isActive, role: updated.role, regionId: updated.regionId },
    });

    return NextResponse.json({
      success: true,
      message: `Data akun ${updated.name} berhasil diperbarui.`,
      user: updated,
    });
  } catch (error: any) {
    console.error('[API Owner Users PUT Error]', error);
    return NextResponse.json({ error: error.message || 'Gagal memperbarui akun admin' }, { status: 500 });
  }
}
