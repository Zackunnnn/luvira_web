// app/api/settings/route.ts
// ============================================================================
// Endpoint Publik untuk Konfigurasi Toko (PPN Rate, dll.)
// ============================================================================

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const ppnSetting = await prisma.setting.findUnique({
      where: { key: 'ppnRate' },
    });

    let ppnRate = 11;
    if (ppnSetting && ppnSetting.value !== undefined && ppnSetting.value !== null) {
      if (typeof ppnSetting.value === 'number') {
        ppnRate = ppnSetting.value;
      } else if (typeof ppnSetting.value === 'object') {
        ppnRate = (ppnSetting.value as any).rate ?? (ppnSetting.value as any).value ?? 11;
      }
    }

    return NextResponse.json(
      {
        ppnRate: Math.max(0, Number(ppnRate)),
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      }
    );
  } catch (error) {
    return NextResponse.json({ ppnRate: 11 });
  }
}

