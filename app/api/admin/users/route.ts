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
import { validateAndNormalizeWhatsAppNumber, maskPhoneNumber } from '@/lib/whatsapp';

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
    const { id } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID pengguna wajib disertakan' }, { status: 400 });
    }

    const targetUser = await prisma.user.findUnique({ where: { id } });
    if (!targetUser) {
      return NextResponse.json({ error: 'Pengguna tidak ditemukan' }, { status: 404 });
    }

    // ------------------------------------------------------------------------
    // KONTROL AKSES & PENCEGAHAN ESKALASI HAK AKSES (Koreksi 1)
    // ------------------------------------------------------------------------
    const isOwner = user.role === Role.OWNER;
    const isAdminPusat = user.role === Role.ADMIN_PUSAT;
    const isSelf = targetUser.id === user.id;

    // 1. Validasi Izin Akses Dasar
    if (!isOwner && !isSelf) {
      if (!isAdminPusat) {
        return NextResponse.json({ error: 'Akses ditolak: Anda tidak memiliki wewenang mengedit akun ini.' }, { status: 403 });
      }
      // Admin Pusat HANYA boleh mengelola Admin Wilayah dan Reseller
      if (targetUser.role !== Role.ADMIN_WILAYAH && targetUser.role !== Role.RESELLER) {
        return NextResponse.json({ error: 'Akses ditolak: Admin Pusat hanya dapat mengelola Admin Wilayah dan Reseller.' }, { status: 403 });
      }
    }

    // 2. Proteksi Anti-Eskalasi:
    // Edit nomor oleh diri sendiri, dan oleh Admin Pusat terhadap Admin Wilayah/Reseller, HANYA boleh mengubah field phone.
    // Field lain di payload (role, isActive, regionId, password, dll.) harus ditolak 400.
    if (isSelf || (isAdminPusat && body.phone !== undefined)) {
      const forbiddenFields = ['role', 'isActive', 'regionId', 'password', 'passwordHash', 'email', 'name', 'permissions'];
      const attempted = forbiddenFields.filter((f) => body[f] !== undefined);
      if (attempted.length > 0) {
        return NextResponse.json(
          { error: `Eskalasi hak akses dicegah: Field [${attempted.join(', ')}] tidak diizinkan pada pembaruan ini.` },
          { status: 400 }
        );
      }
    }

    // Jika self-update tanpa field phone, tolak karena self-update hanya untuk nomor
    if (isSelf && body.phone === undefined) {
      return NextResponse.json({ error: 'Pengguna hanya diizinkan memperbarui nomor WhatsApp mandiri.' }, { status: 400 });
    }

    // 3. Validasi & Normalisasi Nomor WhatsApp jika ada
    let validatedPhone: string | null = null;
    let isPhoneUpdate = false;

    if (body.phone !== undefined) {
      isPhoneUpdate = true;
      if (body.phone === null || body.phone === '') {
        validatedPhone = null;
      } else {
        const validation = validateAndNormalizeWhatsAppNumber(String(body.phone));
        if (!validation.valid) {
          return NextResponse.json({ error: validation.error }, { status: 400 });
        }
        validatedPhone = validation.normalized!;
      }
    }

    const updateData: any = {};
    if (isPhoneUpdate) {
      updateData.phone = validatedPhone;
    }

    // Jika bukan self-update dan bukan request murni edit phone, izinkan field administratif yang sah:
    if (!isSelf && !isPhoneUpdate) {
      if (isAdminPusat && targetUser.role === Role.ADMIN_WILAYAH) {
        if (body.isActive !== undefined) updateData.isActive = Boolean(body.isActive);
        if (body.regionId) updateData.regionId = body.regionId;
        if (body.name) updateData.name = body.name.trim();
        if (body.password && body.password.length >= 8) {
          updateData.passwordHash = await bcrypt.hash(body.password, 10);
        }
      } else if (isOwner) {
        if (body.isActive !== undefined) updateData.isActive = Boolean(body.isActive);
        if (body.regionId !== undefined) updateData.regionId = body.regionId;
        if (body.name) updateData.name = body.name.trim();
        if (body.password && body.password.length >= 8) {
          updateData.passwordHash = await bcrypt.hash(body.password, 10);
        }
      }
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
        phone: true,
        isActive: true,
      },
    });

    await audit({
      actor: { id: user.id, name: user.name, role: user.role },
      action: isPhoneUpdate ? 'UPDATE_USER_PHONE' : 'UPDATE_REGIONAL_ADMIN',
      entity: 'User',
      entityId: id,
      before: {
        ...(isPhoneUpdate ? { phone: maskPhoneNumber(targetUser.phone) } : {}),
        isActive: targetUser.isActive,
        regionId: targetUser.regionId,
      },
      after: {
        ...(isPhoneUpdate ? { phone: maskPhoneNumber(updated.phone) } : {}),
        isActive: updated.isActive,
        regionId: updated.regionId,
      },
    });

    return NextResponse.json({
      success: true,
      message: isPhoneUpdate
        ? `Nomor WhatsApp ${updated.name} berhasil diperbarui.`
        : `Data akun ${updated.name} berhasil diperbarui.`,
      user: updated,
    });
  } catch (error: any) {
    console.error('[API Admin Users PUT Error]', error);
    return NextResponse.json({ error: error.message || 'Gagal memperbarui akun pengguna' }, { status: 500 });
  }
}
