// app/api/admin/advice/route.ts
// ============================================================================
// API Manajemen Nasihat / Artikel (Asumsi A3)
// Admin Pusat mengelola semua, Admin Wilayah hanya miliknya
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { can } from '@/lib/permissions';
import { audit } from '@/lib/audit';
import { Role } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 });
    }

    const where: any = {};
    if (user.role === Role.ADMIN_WILAYAH) {
      where.authorId = user.id;
    }

    const advices = await prisma.advice.findMany({
      where,
      include: {
        author: { select: { id: true, name: true, role: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ advices });
  } catch (error: any) {
    console.error('[API Admin Advice GET Error]', error);
    return NextResponse.json({ error: error.message || 'Gagal memuat artikel nasihat' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 });
    }

    if (!can(user, 'advice:manage')) {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
    }

    const body = await request.json();
    const { title, content, isPublished } = body;

    if (!title?.trim() || !content?.trim()) {
      return NextResponse.json({ error: 'Judul dan isi artikel nasihat wajib diisi.' }, { status: 400 });
    }

    const baseSlug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
    let slug = baseSlug;
    let counter = 1;
    while (await prisma.advice.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    const newAdvice = await prisma.advice.create({
      data: {
        title: title.trim(),
        slug,
        content: content.trim(),
        isPublished: Boolean(isPublished),
        publishedAt: isPublished ? new Date() : null,
        authorId: user.id,
      },
    });

    await audit({
      actor: { id: user.id, name: user.name, role: user.role },
      action: 'CREATE_ADVICE',
      entity: 'Advice',
      entityId: newAdvice.id,
      after: { title: newAdvice.title, slug, isPublished },
    });

    return NextResponse.json({
      success: true,
      message: 'Artikel nasihat berhasil disimpan.',
      advice: newAdvice,
    });
  } catch (error: any) {
    console.error('[API Admin Advice POST Error]', error);
    return NextResponse.json({ error: error.message || 'Gagal membuat artikel nasihat' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 });
    }

    const body = await request.json();
    const { id, title, content, isPublished } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID artikel wajib disertakan' }, { status: 400 });
    }

    const existing = await prisma.advice.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Artikel tidak ditemukan' }, { status: 404 });
    }

    // Otorisasi & Kepemilikan (Asumsi A3)
    if (!can(user, 'advice:manage', { authorId: existing.authorId })) {
      return NextResponse.json({ error: 'Akses ditolak: Anda hanya dapat mengubah artikel milik Anda sendiri.' }, { status: 403 });
    }

    const updateData: any = {};
    if (title !== undefined) updateData.title = title.trim();
    if (content !== undefined) updateData.content = content.trim();
    if (isPublished !== undefined) {
      updateData.isPublished = Boolean(isPublished);
      if (isPublished && !existing.publishedAt) {
        updateData.publishedAt = new Date();
      }
    }

    const updated = await prisma.advice.update({
      where: { id },
      data: updateData,
    });

    await audit({
      actor: { id: user.id, name: user.name, role: user.role },
      action: 'UPDATE_ADVICE',
      entity: 'Advice',
      entityId: id,
      before: { title: existing.title, isPublished: existing.isPublished },
      after: { title: updated.title, isPublished: updated.isPublished },
    });

    return NextResponse.json({
      success: true,
      message: 'Artikel berhasil diperbarui.',
      advice: updated,
    });
  } catch (error: any) {
    console.error('[API Admin Advice PUT Error]', error);
    return NextResponse.json({ error: error.message || 'Gagal memperbarui artikel' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID artikel wajib disertakan' }, { status: 400 });
    }

    const existing = await prisma.advice.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Artikel tidak ditemukan' }, { status: 404 });
    }

    if (!can(user, 'advice:manage', { authorId: existing.authorId })) {
      return NextResponse.json({ error: 'Akses ditolak: Anda hanya dapat menghapus artikel milik Anda sendiri.' }, { status: 403 });
    }

    await prisma.advice.delete({ where: { id } });

    await audit({
      actor: { id: user.id, name: user.name, role: user.role },
      action: 'DELETE_ADVICE',
      entity: 'Advice',
      entityId: id,
      before: { title: existing.title },
    });

    return NextResponse.json({ success: true, message: 'Artikel berhasil dihapus.' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Gagal menghapus artikel' }, { status: 500 });
  }
}
