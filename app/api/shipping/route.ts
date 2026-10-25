// app/api/shipping/route.ts
// ============================================================================
// Endpoint Kompatibilitas Ongkir Luvira
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { rajaOngkirService } from '@/lib/shipping/rajaongkir';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const destination = body.destination || '115';
    const courier = body.courier || 'jne';
    const weightGram = body.weight || 35;

    const rates = await rajaOngkirService.calculateCost({
      originId: '115',
      destinationId: typeof destination === 'string' ? destination : '501',
      weightGram,
      courier,
    });

    return NextResponse.json({
      success: true,
      data: rates,
    });
  } catch (error: any) {
    console.error('[Shipping API Route Error]', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
