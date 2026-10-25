// app/api/track/route.ts
// ============================================================================
// Traffic Analytics Beacon Luvira 2.0
// Sesuai docs/LUVIRA_2_PLAN.md Bagian 7.3 & Fase 2
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

const BOT_PATTERNS = [
  /bot/i,
  /crawler/i,
  /spider/i,
  /googlebot/i,
  /bingbot/i,
  /yandex/i,
  /baiduspider/i,
  /facebookexternalhit/i,
  /headlesschrome/i,
];

function isBot(userAgent: string | null): boolean {
  if (!userAgent) return false;
  return BOT_PATTERNS.some((p) => p.test(userAgent));
}

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const userAgent = request.headers.get('user-agent');
    if (isBot(userAgent)) {
      return NextResponse.json({ ignored: true, reason: 'bot detected' });
    }

    const body = await request.json().catch(() => ({}));
    const rawPath = body.path || '/';
    // Normalisasi path agar tidak ada query parameter
    const cleanPath = rawPath.split('?')[0].slice(0, 100);

    // Ambil tanggal hari ini dalam format string "YYYY-MM-DD"
    const todayStr = new Date().toISOString().slice(0, 10);

    // Upsert ringkasan harian
    await prisma.dailyTraffic.upsert({
      where: {
        date_path: {
          date: todayStr,
          path: cleanPath,
        },
      },
      update: {
        views: { increment: 1 },
      },
      create: {
        date: todayStr,
        path: cleanPath,
        views: 1,
        uniqueVisitors: 1,
      },
    });

    return NextResponse.json({ success: true });
  } catch {
    // Beacon tidak boleh menimbulkan error di browser klien
    return NextResponse.json({ success: false }, { status: 200 });
  }
}
