// app/api/reports/subscriptions/route.ts
// ============================================================================
// Endpoint Pengelolaan Langganan Laporan WhatsApp Pengguna (FT-6)
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { ReportType } from '@prisma/client';
import { can } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 });
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { id: true, name: true, phone: true, role: true },
    });

    const subscriptions = await prisma.reportSubscription.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      success: true,
      user: dbUser,
      subscriptions,
    });
  } catch (error: any) {
    console.error('[Subscriptions GET Error]', error);
    return NextResponse.json({ error: 'Terjadi kesalahan sistem' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 });
    }

    if (!can(user, 'report:subscribe', { userId: user.id })) {
      return NextResponse.json({ error: 'Izin tidak memadai' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const {
      reportType = ReportType.RINGKAS_HARIAN,
      sendTime = '08:00',
      dayOfWeek,
      dayOfMonth,
      includeSheetLink = false,
      includeFile = false,
      isActive = true,
    } = body;

    // Validasi format sendTime "HH:mm"
    if (!/^\d{2}:\d{2}$/.test(sendTime)) {
      return NextResponse.json({ error: 'Format waktu harus HH:mm (contoh: 08:00)' }, { status: 400 });
    }

    // Pastikan nomor HP terdaftar
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { phone: true },
    });

    if (!dbUser?.phone) {
      return NextResponse.json(
        { error: 'Nomor WhatsApp belum terdaftar di profil Anda. Silakan isi nomor WhatsApp terlebih dahulu.' },
        { status: 400 }
      );
    }

    // Upsert langganan untuk tipe laporan yang sama
    const existing = await prisma.reportSubscription.findFirst({
      where: {
        userId: user.id,
        reportType,
      },
    });

    let subscription;
    if (existing) {
      subscription = await prisma.reportSubscription.update({
        where: { id: existing.id },
        data: {
          sendTime,
          dayOfWeek: dayOfWeek !== undefined ? dayOfWeek : existing.dayOfWeek,
          dayOfMonth: dayOfMonth !== undefined ? dayOfMonth : existing.dayOfMonth,
          includeSheetLink: Boolean(includeSheetLink),
          includeFile: Boolean(includeFile),
          isActive: Boolean(isActive),
        },
      });
    } else {
      subscription = await prisma.reportSubscription.create({
        data: {
          userId: user.id,
          reportType,
          sendTime,
          dayOfWeek: dayOfWeek ?? (reportType === ReportType.MINGGUAN ? 1 : null), // Senin bawaan
          dayOfMonth: dayOfMonth ?? (reportType === ReportType.BULANAN ? 1 : null), // Tgl 1 bawaan
          includeSheetLink: Boolean(includeSheetLink),
          includeFile: Boolean(includeFile),
          isActive: Boolean(isActive),
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Langganan laporan WhatsApp berhasil disimpan.',
      subscription,
    });
  } catch (error: any) {
    console.error('[Subscriptions POST Error]', error);
    return NextResponse.json({ error: error.message || 'Terjadi kesalahan sistem' }, { status: 500 });
  }
}

