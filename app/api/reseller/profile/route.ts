// app/api/reseller/profile/route.ts
// ============================================================================
// Endpoint Profil Reseller: Informasi Akun, Nomor HP, & Verifikasi Pesan Uji (FT-4)
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { enqueueWhatsAppNotification } from '@/lib/notify/queue';
import { normalizeWhatsAppNumber } from '@/lib/whatsapp';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 });
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        createdAt: true,
        region: {
          select: { id: true, name: true, code: true },
        },
      },
    });

    if (!dbUser) {
      return NextResponse.json({ error: 'Pengguna tidak ditemukan' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: dbUser });
  } catch (error) {
    console.error('[Reseller Profile GET Error]', error);
    return NextResponse.json({ error: 'Terjadi kesalahan sistem' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 });
    }

    const body = await request.json();
    const { name, phone, sendTestWa } = body;

    const dataToUpdate: any = {};
    if (typeof name === 'string' && name.trim()) {
      dataToUpdate.name = name.trim();
    }

    let normalizedPhone: string | null = null;
    if (phone !== undefined) {
      if (phone && phone.trim()) {
        normalizedPhone = normalizeWhatsAppNumber(phone.trim());
        dataToUpdate.phone = normalizedPhone;
      } else {
        dataToUpdate.phone = null;
      }
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: dataToUpdate,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        region: { select: { id: true, name: true } },
      },
    });

    // Kirim pesan uji WhatsApp bila diminta
    let waQueued = false;
    if (sendTestWa && updated.phone) {
      try {
        await enqueueWhatsAppNotification({
          target: updated.phone,
          message: `👋 Halo *${updated.name}*!\n\nNomor WhatsApp Anda telah *berhasil terhubung* dan terverifikasi di akun Reseller Luvira 2.0.\n\nAnda akan menerima informasi dan update pesanan langsung ke nomor ini. Terima kasih! 🌸`,
          idempotencyKey: `wa:test_profile:${updated.id}:${Date.now()}`,
          relatedType: 'User',
          relatedId: updated.id,
        });
        waQueued = true;
      } catch (err) {
        console.error('[Reseller Test WA Queue Error]', err);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Profil berhasil diperbarui.' + (waQueued ? ' Pesan uji WhatsApp telah dikirim.' : ''),
      data: updated,
      waQueued,
    });
  } catch (error: any) {
    console.error('[Reseller Profile PUT Error]', error);
    return NextResponse.json({ error: error.message || 'Gagal memperbarui profil.' }, { status: 400 });
  }
}
