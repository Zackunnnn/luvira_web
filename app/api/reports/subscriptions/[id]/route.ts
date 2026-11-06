// app/api/reports/subscriptions/[id]/route.ts
// ============================================================================
// Endpoint Ubah & Hapus Langganan Laporan WhatsApp (FT-6)
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { Role } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(_request);
    if (!user) {
      return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 });
    }

    const { id } = await params;
    const sub = await prisma.reportSubscription.findUnique({
      where: { id },
    });

    if (!sub) {
      return NextResponse.json({ error: 'Langganan tidak ditemukan' }, { status: 404 });
    }

    if (sub.userId !== user.id && user.role !== Role.OWNER && user.role !== Role.DEVELOPER) {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
    }

    await prisma.reportSubscription.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: 'Langganan laporan berhasil dihapus.' });
  } catch (error: any) {
    console.error('[Subscription DELETE Error]', error);
    return NextResponse.json({ error: 'Terjadi kesalahan sistem' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 });
    }

    const { id } = await params;
    const sub = await prisma.reportSubscription.findUnique({
      where: { id },
    });

    if (!sub) {
      return NextResponse.json({ error: 'Langganan tidak ditemukan' }, { status: 404 });
    }

    if (sub.userId !== user.id && user.role !== Role.OWNER && user.role !== Role.DEVELOPER) {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const updated = await prisma.reportSubscription.update({
      where: { id },
      data: {
        isActive: body.isActive !== undefined ? Boolean(body.isActive) : sub.isActive,
        includeSheetLink: body.includeSheetLink !== undefined ? Boolean(body.includeSheetLink) : sub.includeSheetLink,
        includeFile: body.includeFile !== undefined ? Boolean(body.includeFile) : sub.includeFile,
        sendTime: body.sendTime || sub.sendTime,
      },
    });

    return NextResponse.json({ success: true, subscription: updated });
  } catch (error: any) {
    console.error('[Subscription PATCH Error]', error);
    return NextResponse.json({ error: 'Terjadi kesalahan sistem' }, { status: 500 });
  }
}

