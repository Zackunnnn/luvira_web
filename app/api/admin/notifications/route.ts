// app/api/admin/notifications/route.ts
// ============================================================================
// API Notifikasi Admin (Polling ~30 detik & Badge Unread)
// Sesuai docs/LUVIRA_2_PLAN.md Bagian 8.4 & docs/PHASE_PROMPTS.md Bagian 3
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 });
    }

    const whereOr: any[] = [{ userId: user.id }];

    if (user.role) {
      if (user.regionId) {
        whereOr.push({
          targetRole: user.role,
          targetRegionId: user.regionId,
        });
      }
      // Notifikasi umum untuk perannya tanpa batasan wilayah
      whereOr.push({
        targetRole: user.role,
        targetRegionId: null,
      });
    }

    const where = { OR: whereOr };

    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: 30,
      }),
      prisma.notification.count({
        where: {
          ...where,
          isRead: false,
        },
      }),
    ]);

    return NextResponse.json({
      notifications,
      unreadCount,
    });
  } catch (error: any) {
    console.error('[API Admin Notifications GET Error]', error);
    return NextResponse.json({ error: error.message || 'Gagal mengambil notifikasi' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 });
    }

    const body = await request.json();
    const { id, markAllRead } = body;

    if (markAllRead) {
      await prisma.notification.updateMany({
        where: {
          OR: [
            { userId: user.id },
            { targetRole: user.role as any, targetRegionId: user.regionId },
            { targetRole: user.role as any, targetRegionId: null },
          ],
          isRead: false,
        },
        data: { isRead: true },
      });

      return NextResponse.json({ success: true, message: 'Semua notifikasi ditandai telah dibaca.' });
    }

    if (!id) {
      return NextResponse.json({ error: 'ID notifikasi wajib disertakan' }, { status: 400 });
    }

    const updated = await prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });

    return NextResponse.json({ success: true, notification: updated });
  } catch (error: any) {
    console.error('[API Admin Notifications PUT Error]', error);
    return NextResponse.json({ error: error.message || 'Gagal memperbarui notifikasi' }, { status: 500 });
  }
}
