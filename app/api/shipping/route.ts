// app/api/shipping/route.ts
// ============================================================================
// SIMULASI ONGKIR (MOCK)
//
// CATATAN PENTING:
// Endpoint ini saat ini mengembalikan data ongkir tiruan (MOCK).
// Pada Luvira 2.0, endpoint ini akan digantikan oleh integrasi API nyata (RajaOngkir).
//
// KENDALI ENVIRONMENT:
// SHIPPING_MODE=mock (default) -> mengembalikan simulasi tarif kurir JNE & Sicepat
// SHIPPING_MODE=live           -> mengembalikan data kurir riil (belum aktif di fase ini)
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';

const SHIPPING_MODE = process.env.SHIPPING_MODE || 'mock';

// Konstanta simulasi tarif ongkir tiruan
const MOCK_COURIER_RATES = [
  {
    courier: 'JNE',
    service: 'REG',
    description: 'Layanan Reguler (MOCK)',
    cost: 6000,
    etd: '2-3 hari',
  },
  {
    courier: 'JNE',
    service: 'YES',
    description: 'Yakin Esok Sampai (MOCK)',
    cost: 9000,
    etd: '1 hari',
  },
  {
    courier: 'Sicepat',
    service: 'REG',
    description: 'Sicepat Reguler (MOCK)',
    cost: 6500,
    etd: '2-3 hari',
  },
  {
    courier: 'Sicepat',
    service: 'BEST',
    description: 'Besok Sampai Tujuan (MOCK)',
    cost: 8500,
    etd: '1 hari',
  }
];

export async function POST(request: NextRequest) {
  try {
    const { destination } = await request.json();

    if (!destination) {
      return NextResponse.json({ error: 'Destination is required' }, { status: 400 });
    }

    // Jika mode live diaktifkan namun agregator riil belum dipasang di fase ini
    if (SHIPPING_MODE !== 'mock') {
      return NextResponse.json({ 
        success: false, 
        message: 'Live courier calculation is not yet configured for this environment.',
        data: [] 
      }, { status: 503 });
    }

    // Simulasi network delay untuk mock
    await new Promise(resolve => setTimeout(resolve, 800));

    return NextResponse.json({ 
      success: true, 
      isMock: true,
      data: MOCK_COURIER_RATES 
    }, { status: 200 });
  } catch (error) {
    console.error('[Shipping API] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
