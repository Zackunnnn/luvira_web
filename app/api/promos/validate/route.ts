import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json();

    if (!code) {
      return NextResponse.json({ error: 'Promo code is required' }, { status: 400 });
    }

    const promo = await prisma.promoCode.findUnique({
      where: { code },
    });

    if (!promo) {
      return NextResponse.json({ error: 'Kode promo tidak valid' }, { status: 404 });
    }

    if (!promo.isActive) {
      return NextResponse.json({ error: 'Kode promo sudah tidak aktif' }, { status: 400 });
    }

    if (promo.expiresAt && promo.expiresAt < new Date()) {
      return NextResponse.json({ error: 'Kode promo sudah kedaluwarsa' }, { status: 400 });
    }

    if (promo.quota > 0 && promo.usedCount >= promo.quota) {
      return NextResponse.json({ error: 'Kuota promo sudah habis' }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      data: {
        id: promo.id,
        code: promo.code,
        discountType: promo.discountType,
        discountValue: promo.discountValue,
      },
    }, { status: 200 });
  } catch (error) {
    console.error('[Promo Validate API] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
